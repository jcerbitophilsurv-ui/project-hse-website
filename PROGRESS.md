# Progress Log

## Phase 1 — UI/UX Homepage Prototype (2026-08-02)

**Status**: Built, pending client review.

**Done**:
- `CLAUDE.md` project documentation (brand tokens, structure, conventions)
- Static homepage prototype (`index.html`, `assets/css/styles.css`, `assets/js/main.js`)
- Sticky nav, video hero, stats strip, mission, services, process timeline, values grid, gallery, testimonials, CTA banner, footer
- Interactions: scroll-shrink nav, mobile menu toggle, scroll-reveal animations, animated stat counters, hover states
- Brand assets wired in: hero video (`assets/video/horizon-video.mp4`), brand colors/fonts from `Branding/Horizon Solar Energy Corporate and Brand Identity.pdf`
- Logo variants generated from the client's source PNG (which is a 2000x2000 square with the mark occupying a thin horizontal band, unusable directly at nav/footer sizes): `assets/images/horizon-logo-cropped.png` (nav + footer, auto-inverted to white over the video hero per the brand book's reverse-logo guidance, full color once the nav goes solid on scroll) and `assets/images/horizon-favicon.png` (icon mark only, browser tab). Original `assets/images/horizon-logo.png` still used full-size in the About section.
- Verified end-to-end with a headless Chromium pass (Playwright): no console errors, hero video autoplays, stat counters animate, mobile nav opens, testimonial carousel rotates, all sections screenshotted and visually checked against brand colors/fonts.

**Placeholder content pending real client input**:
- Stats strip figures (homes powered, MW installed, CO2 avoided) — currently plausible placeholder numbers
- Gallery section photos — currently placeholder imagery, need real installation photos
- Testimonials — currently placeholder quotes, need real customer quotes
- Services section detail copy — drafted from brand pillars, needs client confirmation on actual service list/pricing
- Contact details (phone, email, address, social links) — currently placeholder

**Update (2026-08-03)**: hero overlay lightened and eyebrow label enlarged per feedback, so the rooftop/skyline horizon in the video reads clearly (reinforces the "Horizon" name) while text stays legible.

## Phase 2 — Multi-page site + git-based CMS admin (2026-08-03)

**Status**: Built locally, pending the manual Netlify/Identity/Git Gateway setup below before the admin panel is fully live.

**Done**:
- Nav restructured across all pages to: Home · About · FAQs · Services · Contact + "Get a Free Quote". "About" stays an anchor to `index.html#about`.
- New pages: `services.html` (services overview + Recent Projects gallery), `faq.html` (How It Works + FAQ accordion + Articles), `contact.html` (form), `thank-you.html` (form redirect target).
- Homepage's old full Services cards-grid and Process timeline sections replaced with compact teasers linking to the new pages; the old placeholder gallery section removed (real gallery now lives on `services.html`).
- Admin content management: `admin/index.html` + `admin/config.yml` (Decap CMS, `git-gateway` backend) let an admin log in and manage two collections — Projects and Articles — including photo/image uploads (saved to `assets/images/uploads/`, committed to the repo).
- Content data model: `content/projects.yml`, `content/articles.yml` — fetched and rendered client-side by `assets/js/content.js` (no build step; see `CLAUDE.md` "Content model" for why single-YAML-file collections were used instead of the more common folder-per-entry Decap pattern).
- Contact form (`contact.html`) wired for Netlify Forms (`data-netlify="true"`, honeypot field, redirects to `thank-you.html`) — works automatically once hosted on Netlify, no backend code.
- `git init` done locally (required for the CMS's git-gateway backend to function at all).
- Pushed to GitHub: https://github.com/jcerbitophilsurv-ui/project-hse-website — `main` branch is live and tracked.

**Outstanding manual steps** — all done as of 2026-08-03:
1. ~~Create a GitHub (or GitLab) repo and push this project.~~ Done — see repo link above.
2. ~~Create a Netlify site from that repo ("New site from Git").~~ Done — site created and connected to the GitHub repo.
3. ~~Enable Netlify Identity and invite the admin's email.~~ Done. Hit one snag: the invite didn't show a "set password" screen because `index.html` didn't have the Netlify Identity widget script loaded (invite links land on the site root, not `/admin/`). Fixed by adding the widget script + init snippet to `index.html`. Confirmed working after that fix.
4. ~~Enable Git Gateway.~~ Done.
5. Netlify Forms — no extra step needed, auto-detected from `contact.html`.

**The admin panel (`/admin/`) is now fully live**: login works end-to-end (Netlify Identity → Git Gateway → GitHub → Netlify auto-redeploy), and the admin can upload project photos and articles for real.

**Placeholder content pending real client input** (carried over + new):
- Stats strip figures, testimonials, contact details — unchanged from phase 1
- `content/projects.yml` — 3 seed entries with real titles/locations but no photos yet (empty `image` fields fall back to a styled placeholder tile)
- `content/articles.yml` — 2 seed placeholder articles, need real content
- FAQ accordion on `faq.html` — 4 placeholder Q&As, not yet CMS-managed (only projects/articles were asked to be admin-editable)

**Next steps**:
- ~~User completes the 4 manual setup steps above, then verify a real login + upload end-to-end~~ Done — confirmed working 2026-08-03.
- Swap in real content as the client supplies it
- Consider whether FAQ Q&A should also become CMS-managed later

## Phase 3 — Instant Solar Savings Calculator (2026-08-03)

**Status**: Built, verified locally (Playwright), and pushed to GitHub/live on Netlify.

**Done**:
- New `quote.html`: a lead-gen calculator — client enters monthly bill (₱), optional kWh, desired bill reduction (%, slider), and whether net metering is required, and gets an instant ballpark estimate (system size, panel count, recommended inverter size, installed cost range, new monthly bill, payback period).
- Every site-wide "Get a Free Quote" link/button (9 occurrences across `index.html`, `services.html`, `faq.html`, `contact.html`, `thank-you.html`) now points to `quote.html` instead of straight to `contact.html`. The results panel's "Request a Formal Quote" button hands off to `contact.html?prefill=...`, which pre-fills the message textarea with a summary of their inputs (small addition to `contact.html`'s inline script).
- Calculation assumptions researched from the current (Aug 2026) Philippine solar market — Meralco electricity rate, real measured PH solar yield data, installed cost per kWp for on-grid vs. hybrid/battery systems, typical panel wattage — sources logged in the plan file. These are estimates, not live distributor pricing (not feasible for a static site), and will drift out of date.
- Assumptions are CMS-editable: new `content/quote-settings.yml` + a third Decap CMS collection (`quote_settings`) in `admin/config.yml`, following the same single-YAML-file pattern as Projects/Articles.
- `assets/js/quote-calculator.js`: fetches the settings YAML, runs the calculation client-side, animates the two hero result numbers using the same count-up pattern as the homepage stats.
- Loading transition between submit and results is a simple ~1.2s spinner for now (isolated in one `playLoadingTransition()` function) — **not** the custom house/panels/inverter animation the user originally wanted, because their Gemini/Veo-generated video (`Video/for savings.mp4`) carries a visible AI-content watermark. Watermark removal was declined (it's there to disclose AI provenance, and Google also embeds an invisible SynthID watermark that removing the visible one wouldn't touch anyway). User is getting a clean export and will provide it later — swapping it in is a contained change to that one function, not a rebuild.

**Verified** (Playwright, local): hand-checked the math for two scenarios (₱4,000 bill, 50% reduction, net metering yes vs. no) against the formula — both matched exactly (1.6 kWp, 3×550W panels, ~3kW inverter, correct on-grid vs. hybrid cost ranges, correct payback years). Also verified: empty-bill validation, the net-metering info accordion, the `contact.html?prefill=` handoff (message textarea pre-fills correctly), and mobile layout. Two real bugs were caught and fixed during this pass:
1. The two hero result numbers (system size, savings) initially showed "NaN" — they shared the `.stat-number` class with the homepage's animated counters, so `main.js`'s generic stat-counter observer also grabbed them and overwrote the correct values (it expects a `data-count` attribute these elements don't have). Fixed by giving them their own `.quote-stat-number` class, decoupling them from that unrelated behavior.
2. The loading spinner was visible on page load instead of staying hidden until submit — `.quote-loading { display: flex; }` in CSS was overriding the `hidden` attribute's default `display: none`. Fixed with an explicit `.quote-loading[hidden] { display: none; }` rule.

(Note: while testing, `npx serve`'s default "clean URLs" redirect stripped the `?prefill=` query string entirely — a local-dev-server-only quirk, not present on Netlify, which serves `.html` files as-is. Confirmed the real behavior using a plain static server instead.)

**Update (2026-08-03): real loading animation wired in.** The user provided a clean, watermark-free video (`Video/for savings.mp4` → working copy at `assets/video/for-savings.mp4`) showing exactly the requested sequence: house sketch → panels + inverter appear → glowing connection lines light up the whole home. Verified frame-by-frame (via a headless-browser video check, since the Playwright-bundled `ffmpeg` binary can't decode MP4 — it's a stripped build with only webm/mjpeg support) — no watermark on any frame.

`playLoadingTransition()` now plays this video (10s) instead of the placeholder spinner, resolving via the video's native `ended` event rather than a fixed timeout, with layered fallbacks: if the video fails to load/play, falls back to the spinner + a timer; a hard 15s timeout regardless in case `ended` never fires; and `prefers-reduced-motion` users skip the video entirely (verified: ~1.8s straight to results, video never shown). All paths verified via Playwright with no console errors.

**Update (2026-08-03): calculator form now hides during/after calculation.** Per feedback, the whole question form (`#quoteFormFields`) hides the moment "Calculate My Estimate" is submitted, leaving only the loading animation visible in its own focused card — form stays hidden through the results view too, rather than sitting above them. Added an "Edit your answers" link in the results panel that re-shows the form (previous inputs retained) and hides results, so users aren't stuck without a way to try different numbers. Verified via Playwright: form hidden during load and after results, reappears correctly on "Edit your answers" with prior values intact, no console errors.

**Update (2026-08-03): loading video widened to fill the card.** It was capped at `max-width: 420px`, leaving visible gray card background on both sides during the loading animation. Now spans the card's full content width edge-to-edge (within the card's normal padding).

**Update (2026-08-20): calculator overhauled into a 3-scenario "energy statement" with lead capture.** The "Desired Bill Reduction" slider is gone — the calculator now always computes all three of 50%/70%/100% bill-reduction scenarios in parallel (`computeEstimate()` reused unchanged, just called 3x with fixed reduction values instead of once with whatever the slider said), each rendered as its own scenario card with system size, panel count, inverter, cost range, new monthly bill, and monthly/annual savings. Added a new 5-year projection per scenario (payback year count + net benefit by year 5, or remaining-cost-to-payback framing if not yet recouped within 5 years). Added required Full Name / Email / Phone fields to the form, each with its own styled error message (kept `novalidate` + reused the existing `#billError` pattern rather than falling back to unstyled native browser validation bubbles, to keep the error UI consistent with the rest of the branded form). Wired the form as a second Netlify Forms form (`name="quote"`, honeypot, following `contact.html`'s exact pattern) and the submit handler now also fires a fire-and-forget AJAX POST (`fetch('/', ...)`) so every calculator submission is captured as a lead immediately — a failed network request only logs to console and never blocks the on-page estimate. Added a new CMS-editable setting, `solar_cost_php_per_kwh`, shown side-by-side against the existing grid electricity rate (relabeled "Grid Electricity Cost" in the CMS for clarity) as a simple cost/kWh comparison in the new statement header. `contact.html`'s prefill script now also reads `?name=`/`?email=`/`?phone=` (in addition to the existing `?prefill=`) so a customer who already gave their contact info to the calculator doesn't retype it when they click through to "Request a Formal Quote".

**Placeholder flagged**: `solar_cost_php_per_kwh` (default `6.5`) is a rough researched estimate, not client-confirmed pricing — same caveat treatment as the original Aug-2026 `quote-settings.yml` figures.

**Outstanding**:
- Confirm the new `quote_settings` collection (including the new "Solar Cost (₱ per kWh)" field) renders correctly in the live `/admin/` panel (can't fully verify the CMS UI locally).
- Confirm the new `quote` Netlify Form is auto-detected and captures test submissions correctly once deployed (can't be verified locally — no Netlify Forms backend in local dev).

**Next steps** (pick up here):
- Log into `/admin/` and confirm the "Quote Calculator Settings" collection edits correctly
- Check the Netlify dashboard (Site → Forms) after deploy for the new `quote` form and a test submission
- Swap in real content as the client supplies it (stats, testimonials, contact details, project photos, articles)
- Decide whether FAQ Q&A should also become CMS-managed
