# ASOT Refresh & Launch — Design

Date: 2026-06-04
Status: Approved

## Goal

Get Austin Small Office Tech production-grade and live at **austinsmallofficetech.com**.
Two substantive changes plus deploy:

1. Precompile Tailwind (drop the CDN — standing rule).
2. Replace the Tally contact form with the Cloudflare email-relay pattern (Worker + `send_email` + Turnstile).
3. Deploy to Cloudflare Pages (preview → production) and attach the custom domain.

This also unblocks the live `/work` link on tagbrown.com, which points at austinsmallofficetech.com.

## Discovered context

- Pages project **`austin-small-office-tech` already exists**, GitHub-connected, currently serving the
  **old** domain `atxtechservices.com` (+ www) and `austin-small-office-tech.pages.dev`.
- The target zone **austinsmallofficetech.com** is on Cloudflare (same nameservers as atxtechservices.com →
  Browntag account). Apex has **no record** (NXDOMAIN in browser); `www` already has a CNAME.
- Cloudflare account: **Browntag** `51a8da47fd9cf86dece22773be076efb`. Token has `pages`, `email_routing`,
  `email_sending`, `zone (read)` scopes.
- Tooling present: node 25, wrangler 4.98, Google Chrome (headless screenshots).
- All 7 content pages share an identical inline Tailwind config (404.html differs slightly).
- Reference implementations: `~/Projects/tagbrown-com/worker/` (validate.js + index.js + tests + dist build),
  Fadya `~/Projects/sweet-havoc/brands/asot/clients/fadya/fadya-therapy/worker/` and its `production/`
  Tailwind build. Note: tagbrown hand-writes CSS (not Tailwind); Fadya used Tailwind **v4**. ASOT uses **v3**.

## Decisions (confirmed with Tag)

- **Lead destination:** `browntag@gmail.com` (verified Email Routing destination + worker `TO_ADDRESS`).
- **Deploy method:** direct `wrangler pages deploy dist/` (preview → production); **disconnect the project's
  GitHub auto-build** so a stray push can't publish the repo root (missing compiled CSS + exposed `worker/`).
- **Old domain:** 301 redirect `atxtechservices.com` + www → `austinsmallofficetech.com` (Cloudflare redirect rule).

## Change 1 — Precompile Tailwind (v3)

**Why v3, not v4:** ASOT's CDN config is a v3 JS object whose color keys are camelCase
(`atx.tealLight`, `atx.tealDark`, `atx.orangeLight`). v3 preserves keys 1:1 → classes like `atx-tealLight`
keep working with a literal copy of the config. v4 would force kebab CSS-var renames (`--color-atx-teal-light`)
across all 7 pages and risk the cascade-layer gotcha (unlayered inline CSS beating `@layer utilities`).
Confirmed: ASOT pages have **no inline `<style>` universal resets**, so no cascade conflict.

**New files:**
- `package.json` — devDep `tailwindcss@^3.4`; scripts:
  - `build:css` → `tailwindcss -i ./src/input.css -o ./css/tailwind.css --minify`
  - `build` → `npm run build:css && bash scripts/build-dist.sh`
  - `test` → `node --test worker/contact.test.mjs`
- `tailwind.config.js` — `content: ['./*.html']`; `theme.extend.colors` = exact `atx` + `warm` palette;
  `theme.extend.fontFamily.sans = ['Inter','system-ui','sans-serif']`.
- `src/input.css` — `@tailwind base; @tailwind components; @tailwind utilities;`

**Generated (gitignored):** `css/tailwind.css` (rebuilt on demand).

**Edit all 7 HTML pages** (`index, about, services, contact, faq, testimonials, 404`):
- Remove `<script src="https://cdn.tailwindcss.com"></script>` and the inline `<script>tailwind.config = {…}</script>`.
- Add `<link rel="stylesheet" href="/css/tailwind.css">`.
- Keep the Google Fonts `<link>` and the inline mobile-menu `<script>` at the bottom.

**Verify:** headless-Chrome screenshots of every page **before vs after** — must render identically.

## Change 2 — Cloudflare email-relay contact form

**New `worker/`** (mirrors tagbrown.com):
- `validate.js` — pure, node-testable (no `cloudflare:email` import). `validateContact` (name/email/business/message,
  honeypot `nickname`, email regex `^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$`) + `buildRawEmail` (header-injection-safe,
  strips `\r\n<>,;`).
- `index.js` — `export default { fetch }`; `POST /api/contact` only; validates, verifies Turnstile, sends via
  `env.SEND_EMAIL.send(new EmailMessage(...))`. Brand strings: `FROM noreply@austinsmallofficetech.com`,
  `TO browntag@gmail.com`, subject `austinsmallofficetech.com: <name>`.
- `contact.test.mjs` — `node --test` covering required-field, invalid-email, header-injection, honeypot,
  short-message, valid-input, and raw-header-build cases (brand strings adjusted).
- `wrangler.toml` — `name = "asot-contact"`, `account_id = 51a8da47fd9cf86dece22773be076efb`,
  `[[send_email]] destination_address = "browntag@gmail.com"`, routes `austinsmallofficetech.com/api/*`
  + `www.austinsmallofficetech.com/api/*` with `zone_id` (filled at deploy).

**contact.html:** replace the Tally `<iframe>` + Tally loader `<script>` with a styled native `<form>`
(Name*, Email*, Business, Message*, hidden honeypot `nickname`, Turnstile widget + script) in the existing
warm/atx card design; add JS to POST JSON to `/api/contact` and render inline success/error. Turnstile site
key placeholder `REPLACE_WITH_TURNSTILE_SITE_KEY` until the widget is created. The "Or reach out directly" /
"What to expect" sidebar is unchanged.

## Change 3 — Deploy (direct upload, preview → production)

- `scripts/build-dist.sh` — `rm -rf dist && mkdir dist`; copy `css js images` + `*.html favicon.svg _headers
  _redirects robots.txt sitemap.xml` into `dist/`. Excludes `worker/`, `src/`, `scripts/`, `node_modules/`, `docs/`.
- `.gitignore` — `node_modules/`, `dist/`, `css/tailwind.css`, `.wrangler/`, `.DS_Store`.
- `scripts/check-ready.sh` — fails on launch-blocking placeholders (`REPLACE_WITH_TURNSTILE_SITE_KEY` in
  contact.html, `zone_id` unfilled in wrangler.toml).
- `README.md` — architecture + deploy runbook.

**Deploy steps (after Tag confirms — outward-facing):**
1. Disconnect GitHub auto-build on the `austin-small-office-tech` Pages project (dashboard or API).
2. One-time CF: enable Email Routing + verify `browntag@gmail.com`; create Turnstile widget (site key →
   contact.html, secret → `wrangler secret put TURNSTILE_SECRET`); fill worker `zone_id`; `cd worker && wrangler deploy`.
3. `npm run build` → `wrangler pages deploy dist --project-name=austin-small-office-tech --branch=preview` →
   review preview URL → `--branch=production`.
4. Attach `austinsmallofficetech.com` + `www` custom domains (apex record created on attach).
5. Add Cloudflare redirect rule `atxtechservices.com` + www → `austinsmallofficetech.com` (301).
6. Smoke test: every page renders, mobile menu works, contact form sends a real email end-to-end.

## Build order & review

1. Branch `refresh-tailwind-worker`.
2. Change 1 (Tailwind build + page edits) → screenshot verification.
3. Change 2 (worker, TDD on validate.js; contact.html form).
4. **Codex (codex:rescue) review** in place of Claude review steps.
5. Address review, re-verify.
6. **Stop and confirm with Tag before any outward deploy** (Change 3).

## Testing & error handling

- Worker validation: `node --test worker/contact.test.mjs` (pure unit tests).
- Visual parity: headless-Chrome before/after screenshots per page.
- Form runtime errors surface inline (network failure, Turnstile fail, 502 from send_email) with a fallback
  to the directly-listed email/phone.
- Recipient is hard-coded in the worker → cannot be used as an open relay.

## Out of scope

- Copy/content rewrites, new pages, design changes beyond the contact form swap.
- tagbrown.com repo (no action needed there this session).
