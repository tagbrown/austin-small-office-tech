# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static marketing website for Austin Small Office Tech, an IT support company serving small Austin offices.
Target production domain: https://austinsmallofficetech.com/ (the old domain `atxtechservices.com` 301-redirects to it).

## Tech Stack

- Static HTML (one Tailwind build step; no framework)
- **Tailwind CSS v3, precompiled** (NOT the CDN). Config in `tailwind.config.js`; source `src/input.css`;
  output `css/tailwind.css` (generated, gitignored). Custom theme: `atx-*` and `warm-*` colors, Inter sans.
- Contact form → a separate **Cloudflare Worker** (`worker/`) using the Email Routing `send_email` binding
  + Turnstile, routed at `austinsmallofficetech.com/api/*`.
- Hosted on Cloudflare Pages (account: Browntag `51a8da47fd9cf86dece22773be076efb`).

## Development

    npm install
    npm run build:css        # recompile Tailwind after editing any HTML class or the config
    npx --yes serve .        # local preview (use a server, not file://, so /css/tailwind.css resolves)

`npm run build` compiles CSS and assembles the deployable `dist/`. Run `npm test` for the worker unit tests.

## Deploy

**Direct upload of `dist/` (not git auto-build).** The GitHub auto-build is disconnected so a push can't
publish the repo root (which would expose `worker/` and ship without compiled CSS).

    npm run build
    npx --yes wrangler@latest pages deploy dist --project-name=austin-small-office-tech --branch=preview
    npx --yes wrangler@latest pages deploy dist --project-name=austin-small-office-tech --branch=production

Worker deploys separately: `cd worker && wrangler deploy`. Full runbook + one-time CF setup (Email Routing,
Turnstile, zone_id) is in `README.md`. Run `bash scripts/check-ready.sh` before promoting to production.

## Site Structure

- `index.html`, `about.html`, `services.html`, `contact.html`, `faq.html`, `testimonials.html` - pages
- `404.html` - error page
- `tailwind.config.js`, `src/input.css` - Tailwind build inputs; `css/tailwind.css` - generated output
- `worker/` - Cloudflare Worker contact API (`index.js`, `validate.js`, `contact.test.mjs`, `wrangler.toml`)
- `scripts/` - `build-dist.sh` (assemble publish dir), `check-ready.sh` (launch gate)
- `_headers` / `_redirects` - Cloudflare Pages config; `images/` - static assets
- `docs/superpowers/` - design spec + implementation plan for the refresh/launch

## Style Notes

- Brand colors live in `tailwind.config.js` (single source of truth — no per-page inline config).
- Navigation and footer are duplicated across pages (no templating).
- Inter font family from Google Fonts.
- After editing classes in any HTML file, re-run `npm run build:css` so utilities recompile.
