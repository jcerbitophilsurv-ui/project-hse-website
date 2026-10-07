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
  - `assets/video/for-savings.mp4` — **no longer used.** Previously played once during `quote.html`'s loading transition; that transition was removed when the calculator switched to emailing the estimate instead of showing it on-page (see Phase 8 in `PROGRESS.md`). Kept on disk (not deleted) in case a future loading state wants it. Verified watermark-free before use (Gemini/Veo export) — see `PROGRESS.md` Phase 3.

## Tech stack

Still **plain HTML/CSS/JS — no framework, no build step, no npm dependencies at runtime**, with one narrow, intentional exception: `netlify/functions/send-quote.js`, a single Netlify Function (plain Node, no npm dependencies — uses the runtime's built-in `fetch`) that emails the quote calculator's estimate to the customer via the Resend API. This is the only server-side code in the project. Don't introduce a bundler/static-site generator, or a second backend endpoint, without discussing it first (see "Content model" below for why this matters more than usual here, and "Quote calculator email delivery" below for the function's details).

The site is **multi-page**: `index.html`, `about.html`, `services.html`, `faq.html`, `contact.html`, `quote.html`, `thank-you.html`, `privacy.html`. Each page has its own copy of the header/footer markup (no includes/templating) — when changing nav or footer, update it in every page. Every "See What It Costs" link/button site-wide points to `quote.html` (not `contact.html` directly, and note: it's `faq.html`'s file/URL that stays the same even though its nav label and on-page identity are now "How It Works", not "FAQs") — it's the lead-gen funnel entry point; `quote.html`'s results panel is now a short "Estimate sent!" confirmation (the detailed breakdown is emailed, not shown on-page — see Phase 8), and it links to `contact.html` for a formal request.

Copy source of truth: `Branding/Horizon Solar - Website Build Sheet.docx` (43 numbered tasks, client-confirmed final copy) — see `PROGRESS.md` for what's been applied. Pricing source of truth: `Pricing/Solar-Pricing-Reference-by-Consumption.xlsx`, transcribed into `content/pricing-tables.yml` — see "Content model" below and `PROGRESS.md` Phase 6.

**`privacy.html` is built and its content complete but NOT lawyer-confirmed** (Build Sheet tasks A2/G9) — all `[bracketed placeholders]` have been filled in per explicit user direction (see `PROGRESS.md` Phase 7 for exact values), but the Build Sheet's own instruction was to confirm with Horizon's lawyer before publishing, which is a separate step from content being complete. `noindex` is still set and the page is still out of `sitemap.xml` pending that sign-off and an explicit decision to make it live.

### Quote calculator email delivery (Resend)

`quote.html`'s calculator no longer renders the estimate on the page. Once the customer ticks the required "I agree to share my personal data" consent checkbox and submits, `assets/js/quote-calculator.js` still computes the estimate client-side (unchanged `computeEstimate()`/pricing-table lookup logic), but instead of rendering it, it POSTs the computed numbers as JSON to `/.netlify/functions/send-quote`, which emails the customer their estimate via the **Resend** API and shows a short "Estimate sent!" confirmation in place of the old detailed results panel. The separate fire-and-forget Netlify Forms submission (`submitLead()`) is unchanged — it still notifies Horizon internally of every calculator lead, independent of whether the customer's email send succeeds.

Requires, outside this repo:
- A Resend account with `horizonsolar.net` added and DNS-verified as a sending domain (SPF/DKIM records at the registrar) — without this, `send-quote.js` will 502 or emails will land in spam.
- A `RESEND_API_KEY` environment variable set in Netlify (Site configuration → Environment variables), scoped to the production (and any preview) deploy context.

The function sends from `quotes@horizonsolar.net` with `reply_to: sales@horizonsolar.net`, so replies still land in the inbox Horizon already monitors. See `PROGRESS.md` Phase 8 for the full build notes and setup checklist.

## Content model (git-based CMS)

Project photos, articles, and the quote calculator's pricing assumptions are admin-editable via **Decap CMS** (`admin/index.html` + `admin/config.yml`), backed by `git-gateway` (Netlify Identity + Git Gateway — no custom server code). This is fully live: repo pushed to GitHub, deployed on Netlify, Identity + Git Gateway enabled and confirmed working (see `PROGRESS.md`).

To keep this a true zero-build static site (Decap CMS normally pairs with a static-site generator, deliberately avoided here), content lives in single YAML files, edited as "list" fields (or plain fields for single-record settings) so there's never a folder of many files to enumerate (plain static hosting can't do directory listings):

- `content/projects.yml` — `projects: [{ title, location, category, image }]`. **Currently dormant**: `services.html` no longer has a `#projectsGrid` element to render into (its "Recent Projects" gallery was replaced by a static "How we work" section per the Build Sheet's D4 — real project photos may return as a later, separate task per that doc's own note). The CMS collection, YAML file, and `assets/js/content.js`'s `renderProjects()` are intentionally left in place (harmless no-op — `content.js` isn't even loaded by any page right now) rather than deleted, in case the gallery comes back.
- `content/articles.yml` — `articles: [{ title, date, excerpt, body, image }]`. **Also dormant** for the same reason: the Articles section was deleted from `faq.html` (Build Sheet E2 — "Articles will return later with their own navigation item and individual pages"). Same treatment: collection/YAML/`renderArticles()` kept, not deleted.
- `content/quote-settings.yml` — down to one field, `solar_cost_php_per_kwh` (still a rough placeholder, not client-confirmed — used only for the "Grid vs Solar Cost" comparison bar at the top of the results, since the pricing reference below has no equivalent ₱/kWh generation-cost figure). Still CMS-editable via `/admin/`.
- `content/pricing-tables.yml` — **the real pricing data**, transcribed from `Pricing/Solar-Pricing-Reference-by-Consumption.xlsx` (client-provided, dated 2026-09). A top-level `electricity_rate_php_per_kwh` (₱15.50) and `export_credit_php_per_kwh` (₱7.00), plus `tiers: [{ kwh, hybrid: {...}, ongrid: {...}, ongrid_nm: {...} }]` — 31 consumption tiers from 300-2,000 kWh (irregular steps: 100 kWh up to 700, then 50 kWh), each with all three product options' `pv_kwp`/`price`/`savings_per_year` (`battery_kwh`/`coverage` too, hybrid only has the former). `roi_years` is deliberately NOT stored — `quote-calculator.js` derives it as `price / savings_per_year` so it can never drift out of sync with the other two figures if either is edited. **Not yet CMS-editable** (see Outstanding in PROGRESS.md Phase 6) — edit the raw YAML (or ask Claude) for now, verify any edit against the source spreadsheet.

`assets/js/content.js` fetches `projects.yml`/`articles.yml` at runtime and renders them client-side (`js-yaml` to parse, `marked` for article Markdown) — currently unreferenced by any page's `<script>` tags (see dormant note above). `assets/js/quote-calculator.js` fetches both `quote-settings.yml` and `pricing-tables.yml`, looks up the tier at or above the customer's usage (`findTier()` — rounds up, never interpolates), and picks one of three products based on their net-metering + battery-backup answers (`pickProductKey()`: net metering "yes" → `ongrid_nm`; otherwise `hybrid` if they want battery backup, else `ongrid`). No build step for any of it. Uploaded images land in `assets/images/uploads/` (Decap's `media_folder`), committed straight into the repo. FAQ Q&A pairs on `faq.html` are hardcoded HTML (not CMS-managed).

If you ever add another editable content type, follow the same "single YAML file, no folder collection" pattern.

## Structure

```
index.html               Homepage (hero, stats, first-year-service teaser, what-we-offer teaser, 4-step process, closing CTA; a "Credentials & Reviews" position is reserved but empty — see PROGRESS.md)
about.html                About Us: mission, vision, credentials, closing CTA
services.html             Services overview (3 cards) + commercial strip + "How we work" (3 static tiles) + closing CTA — no longer has a photo gallery, see Content model above
faq.html                  "How It Works" page (nav label; file/URL is still faq.html): 4-step process (long form) + FAQ accordion (8 Q&As) + closing CTA — no longer has an Articles section
quote.html                Instant solar savings calculator ("See What It Costs" destination site-wide) — one recommended system (Hybrid / Ongrid / Ongrid w/ Net Metering) looked up from content/pricing-tables.yml; computed estimate is emailed to the customer (see Quote calculator email delivery above), on-page result is just a "sent" confirmation
netlify.toml                 Points Netlify at netlify/functions/ for send-quote.js; doesn't touch build/publish settings (those stay dashboard-configured)
netlify/functions/send-quote.js  The one Netlify Function in the project — emails the quote estimate via Resend. See "Quote calculator email delivery" above and PROGRESS.md Phase 8
contact.html               Contact form (Netlify Forms) with an optional electricity-bill photo attachment
thank-you.html             Contact form post-submit redirect target
privacy.html               Privacy Policy — content complete (brackets filled per user direction), NOT yet lawyer-confirmed, still noindex. See Tech stack note above and PROGRESS.md Phase 7.
admin/index.html            Decap CMS shell (loads CMS via CDN, no custom UI)
admin/config.yml            Decap CMS backend/collections config (projects, articles, quote_settings) — projects/articles collections are dormant, see Content model above
content/projects.yml         CMS-editable project gallery data (dormant — not currently rendered anywhere)
content/articles.yml         CMS-editable articles data (dormant — not currently rendered anywhere)
content/quote-settings.yml   CMS-editable: just solar_cost_php_per_kwh now (comparison-bar placeholder)
content/pricing-tables.yml   The real quote calculator data — 31 consumption tiers x 3 products, see Content model above. Not CMS-editable yet.
assets/css/styles.css       All styling (brand tokens + layout + components), shared across pages
assets/js/main.js           Interactions (nav scroll/toggle, scroll-reveal, stat counters, accordion toggle) — shared across pages, safe no-op on pages missing an element
assets/js/content.js         Fetches + renders content/*.yml — dormant, not currently loaded by any page (see Content model above)
assets/js/quote-calculator.js Fetches quote-settings.yml + pricing-tables.yml, looks up the matching tier/product, POSTs the computed estimate to the send-quote function — only loaded on quote.html
assets/images/               Working image assets (+ uploads/ for CMS-uploaded photos)
assets/video/                Working video assets
Branding/                    Client-provided source brand assets (do not edit)
Video/                       Client-provided source video (do not edit)
Pricing/                     Client-provided source pricing spreadsheet (do not edit) — see content/pricing-tables.yml for the transcribed, runtime-usable version
robots.txt                   Allows crawling, disallows /admin/, points to sitemap.xml
sitemap.xml                  Lists the 6 public pages (excludes thank-you.html, privacy.html, and /admin/ — privacy.html stays out until it's lawyer-confirmed and noindex is removed)
PROGRESS.md                  Phase-by-phase status log
```

Every public page's `<head>` carries a canonical tag, Open Graph/Twitter Card tags, and a `LocalBusiness` JSON-LD block (name/phone/email/service-area/social links) — keep these in sync with the footer contact details and social links since they're duplicated per page the same way. `thank-you.html` and `admin/index.html` are `noindex`, deliberately excluded from `sitemap.xml`.

## Content policy

Where real content isn't available yet (stats, testimonials, FAQ answers, contact details), use clearly plausible placeholder content and track it in `PROGRESS.md` as pending real input from the client. Never let placeholder numbers/claims read as final data in client-facing copy without a flag. Seed data in `content/projects.yml`/`content/articles.yml` is placeholder too (empty `image` fields fall back to a styled gradient tile in the gallery).
