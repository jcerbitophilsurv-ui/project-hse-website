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
- User completes the 4 manual setup steps above, then verify a real login + upload end-to-end
- Swap in real content as the client supplies it
- Consider whether FAQ Q&A should also become CMS-managed later
