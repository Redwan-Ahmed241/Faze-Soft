/**
 * api/contact.js - Enterprise-Hardened Vercel Serverless Function
 * Handles form submissions (Contact, Booking, Newsletter) and delivers emails via Resend REST API.
 */

// Comprehensive HTML entity escaping to eliminate XSS / HTML injection in email clients
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;');
}

// Strict RFC 5322-compliant email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Security response helper injecting security headers
function sendSecurityResponse(res, status, data) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  return res.status(status).json(data);
}

module.exports = async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return sendSecurityResponse(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      // DoS check on raw body length (max 30KB)
      if (body.length > 30720) {
        return sendSecurityResponse(res, 413, { success: false, error: 'Payload exceeds maximum allowed size (30KB).' });
      }
      try {
        body = JSON.parse(body);
      } catch (err) {
        return sendSecurityResponse(res, 400, { success: false, error: 'Invalid JSON payload received by server' });
      }
    }
    body = body || {};

    // Anti-spam Honeypot check: reject bots silently with fake 200 OK
    if (body._honey) {
      return sendSecurityResponse(res, 200, { success: true, message: 'Message sent successfully' });
    }

    // Extract fields (supporting both lowercase and capitalized keys from frontend forms)
    const name = (body.name || body.Name || '').trim();
    const email = (body.email || body.Email || '').trim();
    const message = (body.message || body.Message || '').trim();
    const pkg = (body.package || body.Package || '').trim();
    const company = (body.company || body.Company || '').trim();
    const domain = (body.domain || body.Domain || '').trim();
    const phone = (body.phone || body.Phone || '').trim();
    const submittedFrom = (body['Submitted from'] || body.submittedFrom || '').trim();
    const formKind = (body.formKind || body.kind || (pkg ? 'booking' : (message ? 'contact' : 'newsletter'))).toLowerCase();

    // Payload length boundaries (DoS / memory bloat protection)
    if (name.length > 100) return sendSecurityResponse(res, 400, { success: false, error: 'Name exceeds maximum allowed length of 100 characters.' });
    if (email.length > 120) return sendSecurityResponse(res, 400, { success: false, error: 'Email exceeds maximum allowed length of 120 characters.' });
    if (company.length > 120) return sendSecurityResponse(res, 400, { success: false, error: 'Company name exceeds maximum allowed length of 120 characters.' });
    if (domain.length > 150) return sendSecurityResponse(res, 400, { success: false, error: 'Domain exceeds maximum allowed length of 150 characters.' });
    if (phone.length > 50) return sendSecurityResponse(res, 400, { success: false, error: 'Phone exceeds maximum allowed length of 50 characters.' });
    if (pkg.length > 120) return sendSecurityResponse(res, 400, { success: false, error: 'Package name exceeds maximum allowed length of 120 characters.' });
    if (message.length > 5000) return sendSecurityResponse(res, 400, { success: false, error: 'Message exceeds maximum allowed length of 5,000 characters.' });

    // Validation: email is required for all forms
    if (!email) {
      return sendSecurityResponse(res, 400, { success: false, error: 'Email address is required.' });
    }

    // Strict regex validation on email format
    if (!EMAIL_REGEX.test(email)) {
      return sendSecurityResponse(res, 400, { success: false, error: 'Please provide a valid email address.' });
    }

    // Dynamic email subject line
    let subject;
    if (formKind === 'booking') {
      subject = `[Booking Request] ${pkg ? pkg + ' - ' : ''}${name || email}`;
    } else if (formKind === 'newsletter') {
      subject = `[Newsletter Signup] ${email}`;
    } else {
      subject = `[New Website Inquiry] ${name ? 'from ' + name : 'from ' + email}`;
    }

    // Construct clean, styled HTML email table with escaped values
    const rows = [
      { label: 'Form Type', value: formKind.toUpperCase() },
      name ? { label: 'Name', value: escapeHtml(name) } : null,
      { label: 'Email', value: `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` },
      phone ? { label: 'Phone', value: escapeHtml(phone) } : null,
      company ? { label: 'Company', value: escapeHtml(company) } : null,
      domain ? { label: 'Domain', value: escapeHtml(domain) } : null,
      pkg ? { label: 'Requested Package', value: `<strong>${escapeHtml(pkg)}</strong>` } : null,
      message ? { label: 'Message / Details', value: `<p style="margin:0;white-space:pre-wrap;">${escapeHtml(message)}</p>` } : null,
      submittedFrom ? { label: 'Submitted From', value: `<a href="${escapeHtml(submittedFrom)}">${escapeHtml(submittedFrom)}</a>` } : null,
      { label: 'Timestamp (UTC)', value: new Date().toUTCString() }
    ].filter(Boolean);

    const tableRowsHtml = rows
      .map(
        (r) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 16px; font-weight: 600; color: #475569; width: 30%; vertical-align: top; background: #f8fafc;">${r.label}</td>
          <td style="padding: 12px 16px; color: #1e293b; vertical-align: top;">${r.value}</td>
        </tr>`
      )
      .join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="background: #090a0c; padding: 24px; text-align: center; border-bottom: 2px solid #ff9800;">
            <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">FAZESOFT <span style="color: #ff9800;">INQUIRY GATEWAY</span></h2>
            <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">${escapeHtml(subject)}</p>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.5;">
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>
          <div style="padding: 16px 24px; background: #f8fafc; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Delivered directly via FazeSoft Serverless Gateway &bull; <a href="mailto:${escapeHtml(email)}" style="color: #ff9800; font-weight: 600;">Reply to ${escapeHtml(email)}</a>
          </div>
        </div>
      </body>
      </html>
    `;

    // Verify Resend API Key configuration
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY environment variable is not set.');
      return sendSecurityResponse(res, 500, {
        success: false,
        error: 'Missing RESEND_API_KEY in environment variables. Please add it to your Vercel project settings.'
      });
    }

    // Call Resend REST API via native fetch
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FazeSoft Inquiries <onboarding@resend.dev>',
        to: ['fazesoft.2024@gmail.com'],
        reply_to: email,
        subject: subject,
        html: emailHtml
      })
    });

    const resendJson = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      const detailedError = resendJson.message || resendJson.error || ('Resend API responded with status ' + resendResponse.status);
      console.error('Resend API error:', resendResponse.status, detailedError);
      return sendSecurityResponse(res, resendResponse.status, {
        success: false,
        error: `Resend error (${resendResponse.status}): ${detailedError}`
      });
    }

    return sendSecurityResponse(res, 200, {
      success: true,
      message: 'Message sent successfully',
      id: resendJson.id
    });
  } catch (error) {
    console.error('Unexpected handler error in api/contact:', error);
    return sendSecurityResponse(res, 500, {
      success: false,
      error: error.message || 'An internal server error occurred while processing your request.'
    });
  }
};
