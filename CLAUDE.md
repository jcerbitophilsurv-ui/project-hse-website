# Horizon Solar Energy — Website

Marketing website for Horizon Solar Energy, a residential-focused solar company serving Filipino families, organizations, and communities. See `PROGRESS.md` for current phase status.

## Brand

Full brand book: `Branding/Horizon Solar Energy Corporate and Brand Identity.pdf`

**Positioning**: "Power with Purpose"

**Voice**: Trustworthy, Reliable, Purpose-driven, Enduring. Honest and transparent, calm and measured, benefit-oriented, confident but never boastful. Avoid hype language ("revolutionary", "game-changing") — this brand earns trust through steadiness, not excitement.

**Core values**: Integrity, Reliability, Stewardship, Service, Purpose
**Brand pillars**: Trusted Partnerships, Reliable Solutions, Meaningful Impact

### Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-green` | `#004E2E` | Primary brand color — nav, headings, primary buttons, footer |
| `--color-gold` | `#FFC000` | Accent — CTAs, highlights, icons, stat emphasis. Use sparingly, never as a large background. |
| `--color-gray` | `#7F7F7F` | Secondary text, muted UI, "SOLAR ENERGY" wordmark tone |

Defined as CSS custom properties in `assets/css/styles.css`. Don't hardcode hex values in new markup/CSS — reference the variables.

### Typography

- **Headings**: Manrope (Extra Bold / Regular / Light) — loaded via Google Fonts
- **Body**: Switzer (Black / Regular / Extra Light) — loaded via Fontshare CDN (`api.fontshare.com`)
- **Fallback**: Helvetica, Aptos, sans-serif (for both roles, per brand book)

### Logo & video

- Source originals: `Branding/horizon logo.png`, `Video/horizon video.mp4` — treat as read-only client-provided assets, do not overwrite.
- Working copies used by the site:
  - `assets/images/horizon-logo.png` — full-size original (2000x2000 square; the visible mark is a thin horizontal band, not a tight crop). Used in the About section where a square frame is wanted.
  - `assets/images/horizon-logo-cropped.png` — tightly cropped to the logo's content bounding box. Use this anywhere the logo needs to render legibly at a small height (nav, footer). It's auto-inverted to white via CSS filter when shown over the hero video, per the brand book's reverse-white-logo guidance, and switches to full color once the nav goes solid on scroll.
  - `assets/images/horizon-favicon.png` — icon mark only (no wordmark), square, for the browser tab.
  - `assets/video/horizon-video.mp4`

## Tech stack

Still **plain HTML/CSS/JS — no framework, no build step, no npm dependencies at runtime**. This is intentional and load-bearing: don't introduce a bundler/static-site generator without discussing it first (see "Content model" below for why this matters more than usual here).

The site is now **multi-page**: `index.html`, `services.html`, `faq.html`, `contact.html`, `thank-you.html`. Each page has its own copy of the header/footer markup (no includes/templating) — when changing nav or footer, update it in every page.

## Content model (git-based CMS)

Project photos and articles are admin-editable via **Decap CMS** (`admin/index.html` + `admin/config.yml`), backed by `git-gateway` (Netlify Identity + Git Gateway — no custom server code). This only works once the repo is pushed to GitHub/GitLab, deployed on Netlify, and Netlify Identity + Git Gateway are enabled there (not yet done — see `PROGRESS.md` for the outstanding manual steps).

To keep this a true zero-build static site (Decap CMS normally pairs with a static-site generator, deliberately avoided here), content lives in exactly **two single YAML files**, edited as "list" fields so there's never a folder of many files to enumerate (plain static hosting can't do directory listings):

- `content/projects.yml` — `projects: [{ title, location, category, image }]`, rendered into the gallery on `services.html`
- `content/articles.yml` — `articles: [{ title, date, excerpt, body, image }]`, rendered into the accordion list on `faq.html`

`assets/js/content.js` fetches these at runtime and renders them client-side using two CDN libraries (`js-yaml` to parse, `marked` to render article `body` Markdown) — no build step. Uploaded images land in `assets/images/uploads/` (Decap's `media_folder`), committed straight into the repo. FAQ Q&A pairs on `faq.html` are still hardcoded HTML (not CMS-managed) — only articles/projects were asked to be admin-editable.

If you ever add a third editable content type, follow the same "single YAML file + list field" pattern rather than a folder collection.

## Structure

```
index.html               Homepage (hero, stats, about, teasers, values, testimonials, CTA)
services.html             Services overview + Recent Projects gallery (from content/projects.yml)
faq.html                  How It Works + FAQ accordion + Articles (from content/articles.yml)
contact.html               Contact form (Netlify Forms)
thank-you.html             Contact form post-submit redirect target
admin/index.html            Decap CMS shell (loads CMS via CDN, no custom UI)
admin/config.yml            Decap CMS backend/collections config
content/projects.yml         CMS-editable project gallery data
content/articles.yml         CMS-editable articles data
assets/css/styles.css       All styling (brand tokens + layout + components), shared across pages
assets/js/main.js           Interactions (nav scroll/toggle, scroll-reveal, stat counters, accordion toggle) — shared across pages, safe no-op on pages missing an element
assets/js/content.js         Fetches + renders content/*.yml on services.html/faq.html (needs js-yaml + marked CDN scripts, only loaded on those pages)
assets/images/               Working image assets (+ uploads/ for CMS-uploaded photos)
assets/video/                Working video assets
Branding/                    Client-provided source brand assets (do not edit)
Video/                       Client-provided source video (do not edit)
PROGRESS.md                  Phase-by-phase status log, including pending manual CMS setup steps
```

## Content policy

Where real content isn't available yet (stats, testimonials, FAQ answers, contact details), use clearly plausible placeholder content and track it in `PROGRESS.md` as pending real input from the client. Never let placeholder numbers/claims read as final data in client-facing copy without a flag. Seed data in `content/projects.yml`/`content/articles.yml` is placeholder too (empty `image` fields fall back to a styled gradient tile in the gallery).
