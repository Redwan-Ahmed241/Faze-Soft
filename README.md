# FazeSoft — Software Company Website

A multi-page static website for **FazeSoft**, a software development company offering custom web apps, mobile apps, and UI/UX design services.

## 🌐 Live Demo

Deployed on [Vercel](https://vercel.com) — the root URL (`/`) redirects to `home-1.html`.

## 📁 Project Structure

```
Faze-Soft/
├── home-1.html          # Main landing page
├── home-2.html          # Personal / about variant
├── services.html        # Services listing
├── service.html         # Single service detail
├── portfolio-1.html     # Portfolio grid type 1
├── portfolio-2.html     # Portfolio grid type 2
├── portfolio-3.html     # Portfolio slider
├── project-1.html       # Individual project pages (1–6)
├── ...
├── team.html            # Team page
├── contact.html         # Contact form & map
├── blog.html            # Blog listing
├── blog-inner.html      # Single blog post
├── publication.html     # Publication page
├── 404.html             # Error page
├── css/
│   ├── style.css        # Main compiled stylesheet
│   └── plugins/         # Third-party CSS (Bootstrap Grid, Font Awesome, Swiper, Fancybox)
├── js/
│   ├── main.js          # Main JavaScript
│   └── plugins/         # Third-party JS (jQuery, GSAP, Swiper, Swup, etc.)
├── scss/                # Source SCSS files
├── img/                 # Images and assets
├── vercel.json          # Vercel deployment config
└── serve.json           # Local static server config
```

## 🛠️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Markup     | HTML5                               |
| Styling    | CSS3 / SCSS                         |
| Layout     | Bootstrap Grid                      |
| Icons      | Font Awesome                        |
| Animations | GSAP, ScrollTrigger, ScrollTo       |
| Slider     | Swiper.js                           |
| Lightbox   | Fancybox                            |
| Routing    | Swup (page transitions)             |
| Scroll     | Smooth Scroll                       |

## 🚀 Getting Started

This is a purely static site — no build step is required to view it.

### Option 1 — Open directly in a browser

Open any `.html` file directly in your browser.

### Option 2 — Serve locally with a static server

Using [serve](https://github.com/vercel/serve):

```bash
npx serve .
```

Or with Python:

```bash
# Python 3
python -m http.server 8000
```

Then visit `http://localhost:8000/home-1.html`.

### Option 3 — Deploy to Vercel

```bash
npx vercel
```

The `vercel.json` config automatically rewrites `/` to `/home-1.html`.

## 🎨 Customization

- **Styles:** Edit the source SCSS files in the `scss/` directory. Compile with [Prepros](https://prepros.io/) (config: `prepros.config`) or any SCSS compiler.
- **Content:** Update text, images, and links directly in the `.html` files.
- **Images:** Replace placeholder images in the `img/` directory with real project screenshots and team photos.

## 📄 License

© FazeSoft. All rights reserved.
