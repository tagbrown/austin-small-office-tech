# Austin Small Office Tech

Static marketing site for Austin Small Office Tech. Tailwind CSS is **precompiled** (no CDN). The contact
form posts to a separate **Cloudflare Worker** (`worker/`) that sends mail via Cloudflare's Email Routing
`send_email` binding, gated by Cloudflare Turnstile + a honeypot. Mirrors the tagbrown.com / fadyatherapy.com setup.

## Architecture
- **Static site** → Cloudflare Pages (publish the built `dist/`, not the repo root).
- **Contact API** → a Worker bound to `austinsmallofficetech.com/api/*`. A POST to `/api/contact` hits the
  Worker, not Pages (Pages Functions cannot use `send_email`; a Worker route can).

## Build
    npm install
    npm run build        # compiles Tailwind → css/tailwind.css, then assembles dist/

## Local preview
    npm run build:css && npx --yes serve .
The contact form needs the deployed Worker + Turnstile to actually send; locally it returns an error (expected).

## Tests
    npm test             # node --test worker/contact.test.mjs

## Deploy

### Static site → Cloudflare Pages (direct upload; project already exists)
This project deploys by **direct upload of `dist/`** — the GitHub auto-build is disconnected so a push can
never publish the repo root (which would expose `worker/` and ship without compiled CSS).

    npm run build
    npx --yes wrangler@latest pages deploy dist --project-name=austin-small-office-tech --branch=preview
    # review the preview URL, then:
    npx --yes wrangler@latest pages deploy dist --project-name=austin-small-office-tech --branch=production

Then attach `austinsmallofficetech.com` + `www` as custom domains, and add a 301 redirect rule
`atxtechservices.com` (+ www) → `austinsmallofficetech.com`.

### Contact Worker → Cloudflare email relay
One-time Cloudflare setup:
- **Email Routing** (austinsmallofficetech.com > Email): enable; add + verify `browntag@gmail.com`.
- **Turnstile** (dashboard > Turnstile): create a widget; site key → `contact.html`
  (replace `REPLACE_WITH_TURNSTILE_SITE_KEY`); keep the secret key for the Worker.
- In `worker/wrangler.toml`, fill `zone_id` (austinsmallofficetech.com > Overview > Zone ID).

Deploy:

    cd worker
    npx --yes wrangler@latest secret put TURNSTILE_SECRET
    npx --yes wrangler@latest deploy

### Before production promote (run `bash scripts/check-ready.sh`)
Fails if the Turnstile site key, Worker zone_id, or compiled CSS is missing, or if CDN/Tally references remain.

## Account
Cloudflare account: Browntag (`51a8da47fd9cf86dece22773be076efb`). Recipient is hard-coded in the Worker, so
it cannot be used as an open relay.
