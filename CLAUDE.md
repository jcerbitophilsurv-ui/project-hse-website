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

- Source originals: `Branding/horizon logo.png`, `Video/horizon video.mp4`, `Video/for savings.mp4` — treat as read-only client-provided assets, do not overwrite.
- Working copies used by the site:
  - `assets/images/horizon-logo.png` — full-size original (2000x2000 square; the visible mark is a thin horizontal band, not a tight crop). Used in the About section where a square frame is wanted.
  - `assets/images/horizon-logo-cropped.png` — tightly cropped to the logo's content bounding box. Use this anywhere the logo needs to render legibly at a small height (nav, footer). It's auto-inverted to white via CSS filter when shown over the hero video, per the brand book's reverse-white-logo guidance, and switches to full color once the nav goes solid on scroll.
  - `assets/images/horizon-favicon.png` — icon mark only (no wordmark), square, for the browser tab.
  - `assets/video/horizon-video.mp4` — homepage hero background.
  - `assets/video/for-savings.mp4` — plays once during `quote.html`'s loading transition (house → panels → inverter → connections), driven by `assets/js/quote-calculator.js`'s `playLoadingTransition()`. Verified watermark-free before use (Gemini/Veo export) — see `PROGRESS.md` Phase 3.

## Tech stack

Still **plain HTML/CSS/JS — no framework, no build step, no npm dependencies at runtime**. This is intentional and load-bearing: don't introduce a bundler/static-site generator without discussing it first (see "Content model" below for why this matters more than usual here).

The site is **multi-page**: `index.html`, `about.html`, `services.html`, `faq.html`, `contact.html`, `quote.html`, `thank-you.html`. Each page has its own copy of the header/footer markup (no includes/templating) — when changing nav or footer, update it in every page. Every "See What It Costs" link/button site-wide points to `quote.html` (not `contact.html` directly, and note: it's `faq.html`'s file/URL that stays the same even though its nav label and on-page identity are now "How It Works", not "FAQs") — it's the lead-gen funnel entry point; `quote.html`'s own results panel then links to `contact.html` for a formal request.

Copy source of truth: `Branding/Horizon Solar - Website Build Sheet.docx` (43 numbered tasks, client-confirmed final copy) — see `PROGRESS.md` for what's been applied and what's deliberately deferred (the Privacy Policy page/consent copy pending legal sign-off, and the quote calculator's underlying arithmetic/home-vs-business fork, tracked as separate technical work).

## Content model (git-based CMS)

Project photos, articles, and the quote calculator's pricing assumptions are admin-editable via **Decap CMS** (`admin/index.html` + `admin/config.yml`), backed by `git-gateway` (Netlify Identity + Git Gateway — no custom server code). This is fully live: repo pushed to GitHub, deployed on Netlify, Identity + Git Gateway enabled and confirmed working (see `PROGRESS.md`).

To keep this a true zero-build static site (Decap CMS normally pairs with a static-site generator, deliberately avoided here), content lives in single YAML files, edited as "list" fields (or plain fields for single-record settings) so there's never a folder of many files to enumerate (plain static hosting can't do directory listings):

- `content/projects.yml` — `projects: [{ title, location, category, image }]`. **Currently dormant**: `services.html` no longer has a `#projectsGrid` element to render into (its "Recent Projects" gallery was replaced by a static "How we work" section per the Build Sheet's D4 — real project photos may return as a later, separate task per that doc's own note). The CMS collection, YAML file, and `assets/js/content.js`'s `renderProjects()` are intentionally left in place (harmless no-op — `content.js` isn't even loaded by any page right now) rather than deleted, in case the gallery comes back.
- `content/articles.yml` — `articles: [{ title, date, excerpt, body, image }]`. **Also dormant** for the same reason: the Articles section was deleted from `faq.html` (Build Sheet E2 — "Articles will return later with their own navigation item and individual pages"). Same treatment: collection/YAML/`renderArticles()` kept, not deleted.
- `content/quote-settings.yml` — single-record settings (grid electricity rate, solar cost per kWh, solar yield, cost-per-kWp ranges, panel wattage, available inverter sizes) driving the calculator on `quote.html`. Still fully live. These are researched Philippine market estimates (Aug 2026) that will drift out of date — update via `/admin/` (or the raw YAML) every few months. `solar_cost_php_per_kwh` in particular is a rough placeholder estimate, not client-confirmed pricing.

`assets/js/content.js` fetches `projects.yml`/`articles.yml` at runtime and renders them client-side (`js-yaml` to parse, `marked` for article Markdown) — currently unreferenced by any page's `<script>` tags (see dormant note above). `assets/js/quote-calculator.js` fetches `quote-settings.yml` and runs the calculator's math client-side, still active. No build step for any of it. Uploaded images land in `assets/images/uploads/` (Decap's `media_folder`), committed straight into the repo. FAQ Q&A pairs on `faq.html` are hardcoded HTML (not CMS-managed).

If you ever add another editable content type, follow the same "single YAML file, no folder collection" pattern.

## Structure

```
index.html               Homepage (hero, stats, first-year-service teaser, what-we-offer teaser, 4-step process, closing CTA; a "Credentials & Reviews" position is reserved but empty — see PROGRESS.md)
about.html                About Us: mission, vision, credentials, closing CTA
services.html             Services overview (3 cards) + commercial strip + "How we work" (3 static tiles) + closing CTA — no longer has a photo gallery, see Content model above
faq.html                  "How It Works" page (nav label; file/URL is still faq.html): 4-step process (long form) + FAQ accordion (8 Q&As) + closing CTA — no longer has an Articles section
quote.html                Instant solar savings calculator ("See What It Costs" destination site-wide)
contact.html               Contact form (Netlify Forms) with an optional electricity-bill photo attachment
thank-you.html             Contact form post-submit redirect target
admin/index.html            Decap CMS shell (loads CMS via CDN, no custom UI)
admin/config.yml            Decap CMS backend/collections config (projects, articles, quote_settings) — projects/articles collections are dormant, see Content model above
content/projects.yml         CMS-editable project gallery data (dormant — not currently rendered anywhere)
content/articles.yml         CMS-editable articles data (dormant — not currently rendered anywhere)
content/quote-settings.yml   CMS-editable quote calculator assumptions (electricity rate, cost/kWp, etc.)
assets/css/styles.css       All styling (brand tokens + layout + components), shared across pages
assets/js/main.js           Interactions (nav scroll/toggle, scroll-reveal, stat counters, accordion toggle) — shared across pages, safe no-op on pages missing an element
assets/js/content.js         Fetches + renders content/*.yml — dormant, not currently loaded by any page (see Content model above)
assets/js/quote-calculator.js Fetches content/quote-settings.yml, runs the calculator's math, renders results — only loaded on quote.html
assets/images/               Working image assets (+ uploads/ for CMS-uploaded photos)
assets/video/                Working video assets
Branding/                    Client-provided source brand assets (do not edit)
Video/                       Client-provided source video (do not edit)
robots.txt                   Allows crawling, disallows /admin/, points to sitemap.xml
sitemap.xml                  Lists the 6 public pages (excludes thank-you.html and /admin/)
PROGRESS.md                  Phase-by-phase status log
```

Every public page's `<head>` carries a canonical tag, Open Graph/Twitter Card tags, and a `LocalBusiness` JSON-LD block (name/phone/email/service-area/social links) — keep these in sync with the footer contact details and social links since they're duplicated per page the same way. `thank-you.html` and `admin/index.html` are `noindex`, deliberately excluded from `sitemap.xml`.

## Content policy

Where real content isn't available yet (stats, testimonials, FAQ answers, contact details), use clearly plausible placeholder content and track it in `PROGRESS.md` as pending real input from the client. Never let placeholder numbers/claims read as final data in client-facing copy without a flag. Seed data in `content/projects.yml`/`content/articles.yml` is placeholder too (empty `image` fields fall back to a styled gradient tile in the gallery).
