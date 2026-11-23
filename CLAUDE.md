# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **static GitHub Pages site** for TadbirLabs, hosting legal compliance pages for the Tadbir mobile app (an Arabic-first, offline-first expense tracker). The site is published at `tadbirlabs.net` (the old `tadbirlabs.github.io` addresses redirect).

**Core purpose:** Provide bilingual (English/Arabic) legal documentation including Privacy Policy, Terms of Use, and Delete Account information required for mobile app store compliance.

## Architecture

### Bilingual Structure
The site mirrors all content in English and Arabic using a simple directory convention:
- **English pages:** `/privacy/`, `/terms/`, `/delete-account/`, `/support/`
- **Arabic pages:** `/ar/privacy/`, `/ar/terms/`, `/ar/delete-account/`, `/ar/support/`

Each HTML file specifies its language attributes:
- English: `<html lang="en" dir="ltr">`
- Arabic: `<html lang="ar" dir="rtl">`

The stylesheets (`/assets/css/home.css` for the two home pages, `/assets/css/pages.css` for every other page) use logical properties, so Arabic pages mirror through `dir="rtl"`.

### File Structure
```
/
├── index.html                     # English landing page
├── ar/index.html                  # Arabic landing page
├── privacy/index.html             # English privacy policy
├── ar/privacy/index.html          # Arabic privacy policy
├── terms/index.html               # English terms
├── ar/terms/index.html            # Arabic terms
├── delete-account/index.html      # English "Delete Your Data" page
├── ar/delete-account/index.html   # Arabic "Delete Your Data" page
├── support/index.html             # English support page (App Store Support URL)
├── ar/support/index.html          # Arabic support page
├── assets/
│   ├── css/home.css              # The two home pages
│   ├── css/pages.css             # Every other page (legal, support, download)
│   ├── js/app.js                 # Shared script (year updater)
│   └── js/home.js                # Home pages only: phone menu and download bar
├── .nojekyll                      # Disables Jekyll processing
├── robots.txt                     # Search engine directives
├── sitemap.xml                    # Site structure for search engines
└── SECURITY.md                    # Security policy
```

### Shared Assets
- **CSS:** The home pages use `/assets/css/home.css`; every other page uses `/assets/css/pages.css`, with absolute paths
- **JavaScript:** All pages use `/assets/js/app.js` which updates copyright year via `.year` class
- **Design:** The Tadbir Labs brand: navy and gold from the app icon, Cairo and Jost served from `/assets/fonts/`, one navy band with the site bar and the page title, light and dark by the visitor's system setting. The reference is `docs/brand/BRAND_SHEET.md` in the app repository

## Guides and calculators (since November 2026)

- `/ar/guides/` holds Arabic guides with an index page. Two of them carry a
  calculator (`/assets/js/calc.js`) that runs in the browser and sends nothing.
- The guide pages are generated. Their content, the generator, the home page
  texts and the calculator tests live outside this repository, in the owner's
  marketing folder (`site/`: `guides_ar*.py`, `content_ar.py`,
  `build_guides.py`, `home_text.py`, `apply_home.py`, `tests/calc.test.js`,
  `og/build_og.py` for the share pictures). Change a guide there and rebuild;
  a hand edit of the HTML is lost at the next build.
- Rules for a guide: one distinct task, an example whose numbers are checked
  by hand, only what the shipped app does, labels in «» equal to the app's own
  strings, no vowel marks, no dialect, no other app named.
- Run `node tests/calc.test.js <this folder>` after any change to `calc.js`.
- Guides exist in Arabic only, so they carry no hreflang. Inner page pairs
  carry `ar`, `en` and `x-default` (the English page).
- `sitemap.xml` gives every entry a `lastmod`: the day of the page's last real
  change, not of a head-only edit.
- `95c4d17f9b6793e7a7d4a6802edc7829.txt` at the root is the IndexNow key; keep it. After a publish, new
  or changed addresses can be sent to `https://api.indexnow.org/indexnow`.
- `/app/`, `/ar/app/` and `/get/` are link pages that send phones to the
  stores; they are `noindex` and stay out of the sitemap.

## Development Workflow

### Editing Content
Since there is no build process, directly edit HTML files. When updating legal pages:

1. **Update the content** in the relevant HTML file
2. **Update "Last updated" date** in the meta section (`<p class='meta'>`)
3. **Update BOTH language versions** (English and Arabic) to keep them in sync
4. **Verify links** work correctly (use absolute paths starting with `/`)

### Previewing Changes
No local server is required for simple edits. To preview:
```bash
# Option 1: Simple HTTP server with Python
python -m http.server 8000

# Option 2: Use Node.js http-server if available
npx http-server -p 8000
```
Then navigate to `http://localhost:8000`

### Deploying
This site auto-deploys via GitHub Pages when changes are pushed to the `main` branch. No manual deployment step needed.

```bash
git add .
git commit -m "Update privacy policy"
git push origin main
```

Changes typically go live within 1-2 minutes.

## Key Conventions

### Language Switching
The landing pages include language switcher links:
```html
<div class="lang-switch">
  <strong>Languages:</strong>
  <a href="/en/privacy/">EN</a> · <a href="/ar/privacy/">AR</a>
</div>
```

Note: The `/en/` path is a misnomer; English pages are at root (`/privacy/`), not `/en/privacy/`.

### Last Updated Dates
Format: `Oct 9, 2025` (abbreviated month, day, full year). Update this whenever making substantial content changes to legal documents.

### Copyright Year
Dynamically updated by JavaScript. Use `<span class="year"></span>` anywhere you need the current year.

### RTL Support
The stylesheet automatically handles RTL layout. Key patterns:
- Use `[dir="rtl"]` selectors for Arabic-specific styles
- Padding/margin adjustments happen automatically (e.g., `ul` padding)
- Text direction is set via `dir="rtl"` on the `<html>` tag

### URL Structure
All internal links use absolute paths starting with `/`:
```html
<a href="/privacy/">Privacy Policy</a>
<a href="/ar/privacy/">سياسة الخصوصية</a>
```

### Breadcrumbs
Format: `<nav class='breadcrumbs'><a href='/'>Home</a> / Page Title</nav>`

## Content Guidelines

### Legal Page Structure
Each legal page follows this pattern:
1. Breadcrumb navigation
2. H1 title with optional badge (e.g., `<span class='badge'>Offline-first</span>`)
3. Last updated date in `.meta` paragraph
4. Content sections with H2 headings
5. Contact information
6. Footer with copyright and email

### Offline-First Emphasis
The app's core feature is offline operation. Legal pages emphasize:
- Data stored locally on device by default
- No backend/servers operated by TadbirLabs
- Optional cloud features clearly disclosed before activation
- User control over their data

### Store Compliance
These pages exist primarily for App Store and Google Play compliance. They address:
- GDPR/privacy requirements
- Terms of service
- Account deletion procedures (even though no accounts exist yet)
- Contact information for user support

## Important Notes

- **Everything here is public:** the repository is public and GitHub Pages serves its files, including `.md` files. Keep plans, reviews and competitor notes out of this folder.
- **No build tools:** This is pure HTML/CSS/JS with no compilation or bundling
- **No package.json:** No npm dependencies or scripts
- **GitHub Pages only:** Not designed to run elsewhere
- **Static content:** No dynamic data fetching or server-side logic
- **SEO configured:** Meta tags, canonical URLs, and Open Graph tags are present
- **Mobile-optimized:** Responsive design with `viewport` meta tag

## Testing Checklist

When making changes:
- [ ] Check both English and Arabic versions are updated
- [ ] Verify "Last updated" dates match across language pairs
- [ ] Test links work (especially cross-language navigation)
- [ ] Confirm RTL layout displays correctly for Arabic
- [ ] Validate HTML structure if making structural changes
- [ ] Check mobile viewport on small screens
- [ ] Verify copyright year updates automatically
