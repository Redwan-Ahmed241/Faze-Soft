import http.server
import json
import os
import socketserver
import sys
import urllib.parse
import urllib.request

PORT = 8080
if len(sys.argv) > 1 and sys.argv[1].isdigit():
    PORT = int(sys.argv[1])

DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Prevent caching of dynamic/html files during development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        # Full CORS support for cross-port local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/contact':
            content_length = int(self.headers.get('Content-Length', 0))
            body_bytes = self.rfile.read(content_length) if content_length > 0 else b'{}'
            try:
                data = json.loads(body_bytes.decode('utf-8'))
            except Exception as e:
                print(f"[POST /api/contact] JSON Parse Error: {e}")
                data = {}

            client_ip = self.client_address[0]
            form_kind = data.get('formKind') or ('booking' if data.get('Package') or data.get('package') else ('newsletter' if not data.get('Message') and not data.get('message') else 'contact'))
            name = data.get('Name') or data.get('name') or '(No name)'
            email = data.get('Email') or data.get('email') or '(No email)'
            print(f"\n>>> [POST /api/contact] Received submission from {client_ip}")
            print(f"    Kind: {form_kind.upper()} | Submitter: {name} <{email}>")
            if data.get('Package') or data.get('package'):
                print(f"    Package: {data.get('Package') or data.get('package')}")
            if data.get('Message') or data.get('message'):
                print(f"    Message: {data.get('Message') or data.get('message')}")

            # Anti-spam honeypot
            if data.get('_honey'):
                print("    [Honeypot Triggered] Silent 200 OK returned.")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'message': 'Message sent successfully'}).encode('utf-8'))
                return

            api_key = os.environ.get('RESEND_API_KEY')
            if api_key and (data.get('email') or data.get('Email')):
                try:
                    sub = f"[Local Dev - {form_kind.upper()}] from {name} ({email})"
                    payload = json.dumps({
                        'from': 'FazeSoft Inquiries <onboarding@resend.dev>',
                        'to': ['fazesoft.2024@gmail.com'],
                        'reply_to': email,
                        'subject': sub,
                        'html': f'<p><strong>From:</strong> {name} ({email})</p><p><strong>Form:</strong> {form_kind}</p><p><strong>Data:</strong> {json.dumps(data, indent=2)}</p>'
                    }).encode('utf-8')
                    req = urllib.request.Request(
                        'https://api.resend.com/emails',
                        data=payload,
                        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
                        method='POST'
                    )
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        res_json = json.loads(resp.read().decode('utf-8'))
                        print(f"    [Resend API Live Dispatch] Success! Resend ID: {res_json.get('id')}")
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({'success': True, 'message': 'Message sent successfully via Resend', 'id': res_json.get('id')}).encode('utf-8'))
                        return
                except urllib.error.HTTPError as he:
                    err_body = he.read().decode('utf-8', errors='ignore')
                    print(f"    [Resend API Error HTTP {he.code}]: {err_body}")
                except Exception as e:
                    print(f"    [Resend Dispatch Error]: {e}")

            # Return success in local dev simulation mode
            print("    [Local Dev Simulation] 200 OK returned to client.")
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': True,
                'message': 'Message received (Local Dev Simulation Mode - dev_server.py)'
            }).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        clean_path = parsed.path.rstrip('/')

        # Root rewrite to home-1.html
        if not clean_path or clean_path == '':
            self.path = '/home-1.html' + (f'?{parsed.query}' if parsed.query else '')
            return super().do_GET()

        # If URL has .html extension, redirect to clean URL without .html
        if parsed.path.endswith('.html') and not parsed.path.startswith(('/img', '/css', '/js', '/fonts')):
            redirect_url = parsed.path[:-5]
            if parsed.query:
                redirect_url += f'?{parsed.query}'
            self.send_response(301)
            self.send_header('Location', redirect_url)
            self.end_headers()
            return

        # Check if corresponding .html file exists on disk
        # e.g., /client-portal -> client-portal.html
        local_rel = clean_path.lstrip('/')
        potential_html = os.path.join(DIRECTORY, local_rel + '.html')
        if os.path.isfile(potential_html):
            self.path = '/' + local_rel + '.html' + (f'?{parsed.query}' if parsed.query else '')
            return super().do_GET()

        # Alias /portal -> client-portal.html
        if clean_path in ['/portal']:
            self.path = '/client-portal.html' + (f'?{parsed.query}' if parsed.query else '')
            return super().do_GET()

        return super().do_GET()

if __name__ == '__main__':
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), CleanURLHandler) as httpd:
        print("=" * 60)
        print("  FazeSoft Local Development Server")
        print(f"  URL: http://localhost:{PORT}")
        print("  Clean URLs: Enabled (e.g., /contact, /services, /careers)")
        print("  Endpoint: POST /api/contact (Active with CORS)")
        print("  Press Ctrl+C to stop")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down dev server.")
