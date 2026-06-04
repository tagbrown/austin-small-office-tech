# ASOT Refresh & Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Precompile Tailwind (drop the CDN), replace the Tally contact form with a Cloudflare Worker email-relay form, and prepare a clean `dist/` for deploy to austinsmallofficetech.com.

**Architecture:** Static HTML site, now with a real Tailwind v3 build (config extracted from the inline CDN config, compiled to one minified static CSS). Contact form posts JSON to a separate Cloudflare Worker (`/api/*` route) that validates, checks Turnstile, and sends mail via the Email Routing `send_email` binding. Deploy is a direct `wrangler pages deploy dist/` (preview → production).

**Tech Stack:** Tailwind CSS v3 CLI, Cloudflare Pages, Cloudflare Workers (`cloudflare:email`), Cloudflare Turnstile, node:test for worker unit tests, headless Chrome for visual parity.

**Working dir:** `/Users/tag/Projects/austin-small-office-tech/` on branch `refresh-tailwind-worker`.

---

### Task 1: Capture "before" screenshots (visual baseline)

Capture the current CDN-rendered pages so we can prove pixel parity after the Tailwind swap.

**Files:** none modified (writes PNGs to `/tmp/asot-before/`).

- [ ] **Step 1: Capture every page with headless Chrome**

```bash
cd /Users/tag/Projects/austin-small-office-tech
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p /tmp/asot-before
for p in index about services contact faq testimonials 404; do
  "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1280,2400 \
    --screenshot="/tmp/asot-before/$p.png" "file://$PWD/$p.html" 2>/dev/null
done
ls -la /tmp/asot-before/
```

Expected: 7 PNGs, each non-trivial in size (the CDN compiles client-side, so allow it network access; if a page looks blank, re-run — the CDN JIT needs a moment).

- [ ] **Step 2: Sanity-check the baseline**

Open 2-3 of the PNGs (Read tool) and confirm they show the styled site (teal accents, warm background, laid-out nav). If blank, the CDN didn't finish — increase wait by using `--virtual-time-budget=4000`.

---

### Task 2: Tailwind v3 build scaffold

**Files:**
- Create: `package.json`
- Create: `tailwind.config.js`
- Create: `src/input.css`

- [ ] **Step 1: Create `tailwind.config.js`** (exact palette from the inline CDN config)

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html'],
  theme: {
    extend: {
      colors: {
        atx: {
          teal: '#2a9d8f',
          tealLight: '#e8f5f3',
          tealDark: '#1e7268',
          orange: '#e76f51',
          orangeLight: '#fdf0ed',
          cream: '#fefae0',
          sand: '#e9e5d6',
        },
        warm: {
          50: '#fdfcf9',
          100: '#f9f6f0',
          200: '#f0ebe0',
          300: '#d4cfc2',
          400: '#b8b0a0',
          500: '#9c937f',
          600: '#7a7265',
          700: '#5c5346',
          800: '#3d382f',
          900: '#2a2620',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Create `src/input.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "austin-small-office-tech",
  "version": "1.0.0",
  "private": true,
  "description": "Static marketing site for Austin Small Office Tech.",
  "scripts": {
    "build:css": "tailwindcss -i ./src/input.css -o ./css/tailwind.css --minify",
    "build": "npm run build:css && bash scripts/build-dist.sh",
    "test": "node --test worker/contact.test.mjs"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.17"
  }
}
```

- [ ] **Step 4: Install and compile**

```bash
cd /Users/tag/Projects/austin-small-office-tech
npm install
npm run build:css
```

Expected: `css/tailwind.css` created. Header line should read `tailwindcss v3.x` (NOT v4).

- [ ] **Step 5: Verify the compiled CSS contains the custom utilities actually used**

```bash
grep -c "atx-teal\|\.bg-atx-teal\|tealLight\|tealDark\|orangeLight" css/tailwind.css
head -c 120 css/tailwind.css
```

Expected: non-zero matches for the atx classes; first line confirms v3. The file should be roughly 10-30KB.

- [ ] **Step 6: Commit**

```bash
git add package.json tailwind.config.js src/input.css
git commit -m "build: add Tailwind v3 build (config extracted from CDN inline config)"
```

---

### Task 3: Swap CDN script → compiled CSS link across all 7 pages

The CDN `<script>` and the inline `tailwind.config` block are identical on the 6 content pages and slightly different on 404.html, but the swap is the same: remove both, add one `<link>`.

**Files:**
- Modify: `index.html`, `about.html`, `services.html`, `contact.html`, `faq.html`, `testimonials.html`, `404.html`

- [ ] **Step 1: Inspect the exact head block on one page to confirm the markers**

```bash
cd /Users/tag/Projects/austin-small-office-tech
sed -n '/cdn.tailwindcss.com/,/<\/script>/p' index.html | head -40
```

Expected: the `<script src="https://cdn.tailwindcss.com"></script>` line immediately followed by a `<script> tailwind.config = { ... } </script>` block ending in `</script>`.

- [ ] **Step 2: Replace, per page, using an exact-match edit**

For EACH of the 7 files, replace this exact two-script block:

```html
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
```
...through the closing...
```html
        }
    </script>
```

with a single line:

```html
    <link rel="stylesheet" href="/css/tailwind.css">
```

Use the Edit tool with the full literal block per file (the config body is identical on the 6 content pages; 404.html's config body may differ — read its block first and match it exactly). Leave the `<link ...Inter...>` Google Fonts line untouched.

- [ ] **Step 3: Verify no page still references the CDN or an inline config**

```bash
grep -l "cdn.tailwindcss.com" *.html || echo "CDN gone (good)"
grep -l "tailwind.config" *.html || echo "inline config gone (good)"
grep -c 'href="/css/tailwind.css"' *.html
```

Expected: both "gone" lines print; every page reports exactly `1` for the link.

- [ ] **Step 4: Confirm the inline mobile-menu script is still present**

```bash
grep -c "mobile-menu-btn" *.html
```

Expected: every page reports `>=1` (the functional JS was not removed).

- [ ] **Step 5: Commit**

```bash
git add *.html
git commit -m "refactor: replace CDN Tailwind + inline config with compiled stylesheet on all pages"
```

---

### Task 4: Visual parity verification (after vs before)

**Files:** none modified (writes PNGs to `/tmp/asot-after/`).

- [ ] **Step 1: Rebuild CSS (content globs may have pruned/added classes) and screenshot**

```bash
cd /Users/tag/Projects/austin-small-office-tech
npm run build:css
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p /tmp/asot-after
for p in index about services contact faq testimonials 404; do
  "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1280,2400 \
    --screenshot="/tmp/asot-after/$p.png" "file://$PWD/$p.html" 2>/dev/null
done
ls -la /tmp/asot-after/
```

Note: contact.html still has the Tally embed at this point (replaced in Task 7); expect that one section to differ. All OTHER pages must match.

- [ ] **Step 2: Compare before/after for each page**

Read the before and after PNGs for `index`, `about`, `services`, `faq`, `testimonials`, `404` and confirm identical layout, colors, spacing, fonts. Any difference (collapsed spacing, missing color, wrong font) means a class didn't compile — check `tailwind.config.js` key casing against the class in the HTML.

- [ ] **Step 3: Record the result**

If all non-contact pages match, note it. If anything differs, STOP and fix the config before continuing.

---

### Task 5: Worker validation module (TDD)

Pure, node-testable validation + raw-email builder. No `cloudflare:email` import here.

**Files:**
- Create: `worker/validate.js`
- Test: `worker/contact.test.mjs`

- [ ] **Step 1: Write the failing tests** (`worker/contact.test.mjs`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateContact, buildRawEmail } from './validate.js';

test('rejects when required fields missing', () => {
  const r = validateContact({ name: '', email: '', message: '' });
  assert.equal(r.ok, false);
  assert.match(r.error, /required/i);
});

test('rejects invalid email', () => {
  const r = validateContact({ name: 'A', email: 'not-an-email', message: 'hi there' });
  assert.equal(r.ok, false);
  assert.match(r.error, /email/i);
});

test('rejects header-injection email (CR/LF, angle brackets, commas)', () => {
  for (const bad of ['a@b.com\r\nBcc: x@evil.com', 'a@b.com,c@d.com', 'a<x>@b.com']) {
    const r = validateContact({ name: 'A', email: bad, message: 'hello there' });
    assert.equal(r.ok, false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('rejects when honeypot filled', () => {
  const r = validateContact({ name: 'A', email: 'a@b.com', message: 'hello there', nickname: 'bot' });
  assert.equal(r.ok, false);
  assert.match(r.error, /spam/i);
});

test('rejects too-short message', () => {
  const r = validateContact({ name: 'A', email: 'a@b.com', message: 'hi' });
  assert.equal(r.ok, false);
  assert.match(r.error, /short/i);
});

test('accepts valid input and returns trimmed fields', () => {
  const r = validateContact({ name: '  Jamie ', email: 'jamie@shop.com', business: "Jamie's Office", message: 'Our printers keep dropping off the network.' });
  assert.equal(r.ok, true);
  assert.equal(r.fields.name, 'Jamie');
  assert.equal(r.fields.email, 'jamie@shop.com');
});

test('buildRawEmail produces valid headers and strips injection from name', () => {
  const raw = buildRawEmail(
    { name: 'Jamie\r\nSubject: hijack', email: 'jamie@shop.com', business: "Jamie's Office", message: 'Hello.' },
    'noreply@austinsmallofficetech.com',
    'browntag@gmail.com'
  );
  assert.match(raw, /^From: ASOT Contact Form <noreply@austinsmallofficetech\.com>/m);
  assert.match(raw, /^To: <browntag@gmail\.com>/m);
  assert.match(raw, /^Reply-To: Jamie  Subject: hijack <jamie@shop\.com>/m);
  assert.match(raw, /^Subject: austinsmallofficetech\.com: Jamie/m);
  assert.match(raw, /Jamie's Office/);
  const headerLines = raw.split('\r\n\r\n')[0].split('\r\n');
  assert.equal(headerLines.filter((l) => l.startsWith('Subject:')).length, 1);
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd /Users/tag/Projects/austin-small-office-tech
node --test worker/contact.test.mjs
```

Expected: FAIL — `Cannot find module './validate.js'`.

- [ ] **Step 3: Write `worker/validate.js`**

```js
// Pure, runtime-agnostic helpers for the contact worker.
// No `cloudflare:email` import here, so this module is unit-testable under `node --test`.

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export function validateContact(payload) {
  const name = (payload.name || '').trim().slice(0, 200);
  const email = (payload.email || '').trim().slice(0, 200);
  const business = (payload.business || '').trim().slice(0, 200);
  const message = (payload.message || '').trim().slice(0, 5000);
  const honeypot = (payload.nickname || '').trim();

  if (honeypot) return { ok: false, error: 'Rejected as spam.' };
  if (!name || !email || !message) return { ok: false, error: 'Name, email, and message are required.' };
  // EMAIL_RE forbids whitespace and , ; < > , which also blocks header injection in Reply-To.
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Please enter a valid email.' };
  if (message.length < 5) return { ok: false, error: 'Message is too short.' };
  return { ok: true, fields: { name, email, business, message } };
}

function headerSafe(s) {
  return String(s).replace(/[\r\n<>,;]/g, ' ').trim();
}

export function buildRawEmail(fields, fromAddress, toAddress) {
  const name = headerSafe(fields.name);
  const email = headerSafe(fields.email);
  const business = String(fields.business || '').replace(/[\r\n]/g, ' ').trim();
  const subject = `austinsmallofficetech.com: ${name}`;

  const body = [
    'New message from austinsmallofficetech.com',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Business: ${business || '(not given)'}`,
    '',
    'Message:',
    fields.message,
  ].join('\r\n');

  return [
    `From: ASOT Contact Form <${fromAddress}>`,
    `To: <${toAddress}>`,
    `Reply-To: ${name} <${email}>`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n');
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
node --test worker/contact.test.mjs
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/validate.js worker/contact.test.mjs
git commit -m "feat(worker): add header-injection-safe contact validation with tests"
```

---

### Task 6: Worker fetch handler + wrangler config

**Files:**
- Create: `worker/index.js`
- Create: `worker/wrangler.toml`

- [ ] **Step 1: Create `worker/index.js`**

```js
// Cloudflare Worker: handles POST /api/contact for austinsmallofficetech.com.
// Sends mail via Cloudflare's email relay (Email Routing send_email binding) — no third-party API.
// Deployed separately from the Pages site; a Workers route on austinsmallofficetech.com/api/*
// intercepts the request ahead of Pages (Pages Functions cannot use send_email; a Worker route can).
import { EmailMessage } from "cloudflare:email";
import { validateContact, buildRawEmail } from "./validate.js";

const FROM_ADDRESS = "noreply@austinsmallofficetech.com";
// TO_ADDRESS must equal the verified Email Routing destination_address in wrangler.toml.
const TO_ADDRESS = "browntag@gmail.com";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/contact") return json({ ok: false, error: "Not found." }, 404);
    if (request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: "Could not read your submission." }, 400);
    }

    const v = validateContact(payload);
    if (!v.ok) return json(v, 400);

    const token = payload.turnstileToken || "";
    if (!token) return json({ ok: false, error: "Please complete the verification challenge." }, 400);
    let verified = false;
    try {
      const form = new FormData();
      form.append("secret", env.TURNSTILE_SECRET);
      form.append("response", token);
      form.append("remoteip", request.headers.get("CF-Connecting-IP") || "");
      const resp = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: form });
      const data = await resp.json();
      verified = !!data.success;
    } catch {
      verified = false;
    }
    if (!verified) return json({ ok: false, error: "Verification failed. Please try again." }, 403);

    const raw = buildRawEmail(v.fields, FROM_ADDRESS, TO_ADDRESS);
    try {
      await env.SEND_EMAIL.send(new EmailMessage(FROM_ADDRESS, TO_ADDRESS, raw));
      return json({ ok: true });
    } catch (err) {
      console.error("send_email failure:", err);
      return json({ ok: false, error: "Could not send right now. Please email us directly." }, 502);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 2: Create `worker/wrangler.toml`** (zone_id filled at deploy time)

```toml
name = "asot-contact"
main = "index.js"
compatibility_date = "2024-12-01"
# Tag's personal Cloudflare account (Browntag@gmail.com). The austinsmallofficetech.com zone lives here.
account_id = "51a8da47fd9cf86dece22773be076efb"
workers_dev = false

# Cloudflare email relay. destination_address MUST be verified in Email Routing first
# (Email Routing > Destination addresses). This is where contact-form mail is delivered.
[[send_email]]
name = "SEND_EMAIL"
destination_address = "browntag@gmail.com"

# Workers routes intercept /api/* on the domain ahead of Pages. Fill in the austinsmallofficetech.com
# zone id (Cloudflare dashboard > austinsmallofficetech.com > Overview > Zone ID) before deploying.
[[routes]]
pattern = "austinsmallofficetech.com/api/*"
zone_id = "REPLACE_WITH_ASOT_ZONE_ID"

[[routes]]
pattern = "www.austinsmallofficetech.com/api/*"
zone_id = "REPLACE_WITH_ASOT_ZONE_ID"
```

- [ ] **Step 3: Dry-run the worker bundle to catch syntax/import errors**

```bash
cd /Users/tag/Projects/austin-small-office-tech/worker
npx --yes wrangler@latest deploy --dry-run --outdir /tmp/asot-worker-dryrun 2>&1 | tail -20
```

Expected: bundles successfully (it will mention the `send_email` binding and routes). It does NOT publish. If it errors on zone_id, that's fine for a dry run; the import/syntax must be clean.

- [ ] **Step 4: Commit**

```bash
cd /Users/tag/Projects/austin-small-office-tech
git add worker/index.js worker/wrangler.toml
git commit -m "feat(worker): add send_email contact handler + wrangler config"
```

---

### Task 7: Replace the Tally embed in contact.html with a native form

**Files:**
- Modify: `contact.html`

- [ ] **Step 1: Add the Turnstile script to the `<head>`**

In `contact.html`, immediately after the `<link ...Inter...>` Google Fonts line, add:

```html
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

- [ ] **Step 2: Replace the Tally iframe block**

Replace this exact block (the form card body):

```html
                    <iframe data-tally-src="https://tally.so/embed/GxpB7O?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1&formEventsForwarding=1" loading="lazy" width="100%" height="643" frameborder="0" marginheight="0" marginwidth="0" title="Get in touch"></iframe>
```

with this native, Tailwind-styled form:

```html
                    <form id="contact-form" action="/api/contact" method="POST" novalidate class="space-y-5">
                        <div>
                            <label for="name" class="block text-sm font-medium text-warm-800 mb-1.5">Your name</label>
                            <input id="name" name="name" type="text" autocomplete="name" required
                                class="w-full rounded-lg border border-warm-300 px-4 py-3 text-warm-900 focus:border-atx-teal focus:ring-2 focus:ring-atx-teal/30 focus:outline-none">
                        </div>
                        <div>
                            <label for="business" class="block text-sm font-medium text-warm-800 mb-1.5">Business / office (optional)</label>
                            <input id="business" name="business" type="text" autocomplete="organization"
                                class="w-full rounded-lg border border-warm-300 px-4 py-3 text-warm-900 focus:border-atx-teal focus:ring-2 focus:ring-atx-teal/30 focus:outline-none">
                        </div>
                        <div>
                            <label for="email" class="block text-sm font-medium text-warm-800 mb-1.5">Email</label>
                            <input id="email" name="email" type="email" autocomplete="email" required
                                class="w-full rounded-lg border border-warm-300 px-4 py-3 text-warm-900 focus:border-atx-teal focus:ring-2 focus:ring-atx-teal/30 focus:outline-none">
                        </div>
                        <div>
                            <label for="message" class="block text-sm font-medium text-warm-800 mb-1.5">How can we help?</label>
                            <textarea id="message" name="message" rows="5" required
                                class="w-full rounded-lg border border-warm-300 px-4 py-3 text-warm-900 focus:border-atx-teal focus:ring-2 focus:ring-atx-teal/30 focus:outline-none"></textarea>
                        </div>
                        <div class="absolute left-[-9999px]" aria-hidden="true">
                            <label for="nickname">Leave this blank</label>
                            <input id="nickname" name="nickname" type="text" tabindex="-1" autocomplete="off">
                        </div>
                        <div class="cf-turnstile" data-sitekey="REPLACE_WITH_TURNSTILE_SITE_KEY" data-theme="light"></div>
                        <button type="submit"
                            class="w-full bg-atx-teal text-white px-6 py-3.5 rounded-lg hover:bg-atx-tealDark font-semibold disabled:opacity-60 disabled:cursor-not-allowed">
                            Send message
                        </button>
                        <div class="status text-sm" id="form-status" role="status" aria-live="polite"></div>
                    </form>
```

- [ ] **Step 3: Replace the Tally loader script** at the bottom of the body

Replace this exact line:

```html
    <script>var d=document,w="https://tally.so/widgets/embed.js",v=function(){"undefined"!=typeof Tally?Tally.loadEmbeds():d.querySelectorAll("iframe[data-tally-src]:not([src])").forEach((function(e){e.src=e.dataset.tallySrc}))};if("undefined"!=typeof Tally)v();else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w,s.onload=v,s.onerror=v,d.body.appendChild(s);}</script>
```

with the submit handler:

```html
    <script>
    (function () {
      var form = document.getElementById('contact-form');
      var status = document.getElementById('form-status');
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        status.className = 'status text-sm text-warm-600';
        status.textContent = 'Sending...';
        var btn = form.querySelector('button');
        btn.disabled = true;
        var data = Object.fromEntries(new FormData(form).entries());
        data.turnstileToken = data['cf-turnstile-response'] || '';
        fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
          .then(function (res) {
            if (res.ok && res.b.ok) {
              form.reset();
              status.className = 'status text-sm text-atx-teal font-medium';
              status.textContent = 'Thanks! We’ll get back to you shortly.';
            } else {
              status.className = 'status text-sm text-atx-orange font-medium';
              status.textContent = (res.b && res.b.error) || 'Something went wrong. Please email us directly.';
            }
          })
          .catch(function () {
            status.className = 'status text-sm text-atx-orange font-medium';
            status.textContent = 'Something went wrong. Please email us directly.';
          })
          .finally(function () {
            btn.disabled = false;
            if (window.turnstile) { window.turnstile.reset(); }
          });
      });
    })();
    </script>
```

- [ ] **Step 4: Verify Tally is fully gone and the form/handler are present**

```bash
cd /Users/tag/Projects/austin-small-office-tech
grep -c "tally" contact.html || echo "Tally gone (good)"
grep -c "contact-form\|cf-turnstile\|/api/contact" contact.html
```

Expected: "Tally gone"; non-zero count for the form markers.

- [ ] **Step 5: Rebuild CSS (new form classes) and screenshot contact.html**

```bash
npm run build:css
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1280,2400 \
  --screenshot="/tmp/asot-after/contact.png" "file://$PWD/contact.html" 2>/dev/null
```

Read `/tmp/asot-after/contact.png`. Expected: a styled form (labeled inputs, teal Send button) in the white card; Turnstile renders an empty box locally (needs the real key + domain — that is expected). Rest of page unchanged vs `/tmp/asot-before/contact.png`.

- [ ] **Step 6: Commit**

```bash
git add contact.html css/tailwind.css
git commit -m "feat: replace Tally embed with native Cloudflare-relay contact form"
```

Note: `css/tailwind.css` is committed here only if NOT yet gitignored. Task 8 adds `.gitignore`; after that, the file is build-time only. If you prefer the artifact out of git entirely, skip adding it and rely on `npm run build` before deploy.

---

### Task 8: Build/publish scripts, .gitignore, README

**Files:**
- Create: `scripts/build-dist.sh`
- Create: `scripts/check-ready.sh`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create `.gitignore`**

```
node_modules/
dist/
css/tailwind.css
.wrangler/
.DS_Store
```

- [ ] **Step 2: If `css/tailwind.css` was committed in Task 7, untrack it**

```bash
cd /Users/tag/Projects/austin-small-office-tech
git rm --cached css/tailwind.css 2>/dev/null || true
```

- [ ] **Step 3: Create `scripts/build-dist.sh`** (clean publish dir; excludes worker/, src/, scripts/, docs/, node_modules/)

```bash
#!/usr/bin/env bash
# Assemble the public site into dist/ for Cloudflare Pages deploy.
# Keeps internal files (worker/, src/, scripts/, docs/, node_modules/) OUT of the published site.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f css/tailwind.css ]; then
  echo "css/tailwind.css missing — run 'npm run build:css' first." >&2
  exit 1
fi

rm -rf dist && mkdir dist
cp -R css images dist/
cp ./*.html favicon.svg _headers _redirects robots.txt sitemap.xml dist/
echo "Built dist/ with $(find dist -type f | wc -l | tr -d ' ') files:"
find dist -type f | sort
```

- [ ] **Step 4: Create `scripts/check-ready.sh`** (launch-blocking placeholder gate)

```bash
#!/usr/bin/env bash
# Pre-production readiness gate. Fails (non-zero) if launch-blocking placeholders remain.
# Run before promoting to production:  bash scripts/check-ready.sh
set -u
cd "$(dirname "$0")/.." || exit 2
fail=0

if [ ! -f css/tailwind.css ]; then
  echo "MISSING: css/tailwind.css (run 'npm run build:css')."; fail=1
else
  echo "OK: css/tailwind.css present."
fi

if grep -q "cdn.tailwindcss.com" ./*.html; then
  echo "STILL PRESENT: CDN Tailwind in an HTML file. Should be the compiled stylesheet."; fail=1
else
  echo "OK: no CDN Tailwind references."
fi

if grep -q "REPLACE_WITH_TURNSTILE_SITE_KEY" contact.html; then
  echo "PLACEHOLDER: Turnstile site key in contact.html. Paste the real site key."; fail=1
else
  echo "OK: Turnstile site key is set."
fi

if grep -q "REPLACE_WITH_ASOT_ZONE_ID" worker/wrangler.toml; then
  echo "PLACEHOLDER: zone_id in worker/wrangler.toml. Fill the austinsmallofficetech.com Zone ID."; fail=1
else
  echo "OK: Worker zone_id is set."
fi

if grep -qi "tally" contact.html; then
  echo "STILL PRESENT: Tally reference in contact.html."; fail=1
else
  echo "OK: no Tally references."
fi

if [ "$fail" -eq 0 ]; then
  echo "READY: no launch-blocking placeholders found."
else
  echo "NOT READY: resolve the items above before production promote."
fi
exit "$fail"
```

- [ ] **Step 5: Make scripts executable and test the dist build**

```bash
cd /Users/tag/Projects/austin-small-office-tech
chmod +x scripts/build-dist.sh scripts/check-ready.sh
npm run build:css
bash scripts/build-dist.sh
echo "--- dist must NOT contain worker/src/scripts/docs ---"
ls dist/ | grep -E "worker|src|scripts|docs|node_modules" && echo "LEAK!" || echo "clean publish dir (good)"
```

Expected: dist contains the HTML, css/, images/, and the CF config files; the grep finds nothing (clean).

- [ ] **Step 6: Create `README.md`**

```markdown
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
```

- [ ] **Step 7: Commit**

```bash
git add .gitignore scripts/build-dist.sh scripts/check-ready.sh README.md
git commit -m "chore: add dist build, readiness gate, gitignore, and README"
```

---

### Task 9: Codex review (replaces Claude review)

- [ ] **Step 1: Run the readiness gate (expect 2 known placeholders pre-deploy)**

```bash
cd /Users/tag/Projects/austin-small-office-tech
bash scripts/check-ready.sh || true
```

Expected: NOT READY, flagging only the Turnstile site key and Worker zone_id (both filled at deploy). Everything else OK.

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all worker tests PASS.

- [ ] **Step 3: Dispatch Codex (codex:rescue) for review**

Ask Codex to review the diff on branch `refresh-tailwind-worker` vs `main`, focusing on: the Tailwind config↔class parity (no dropped/renamed colors), header-injection safety in `validate.js`, the worker fetch flow, the contact-form JS, and the dist build excluding internal dirs.

- [ ] **Step 4: Address findings**

Apply fixes per superpowers:receiving-code-review (verify before implementing). Re-run `npm test` and re-screenshot any changed page.

---

### Task 10: Deploy — GATED (do not run without Tag's go-ahead)

This task is outward-facing. STOP and confirm with Tag before executing. Steps are documented in `README.md`
and the design spec. Summary order:

1. Disconnect GitHub auto-build on the `austin-small-office-tech` Pages project.
2. Enable Email Routing + verify `browntag@gmail.com`.
3. Create Turnstile widget → site key into `contact.html`; `wrangler secret put TURNSTILE_SECRET`.
4. Fill `zone_id` in `worker/wrangler.toml`; `cd worker && wrangler deploy`.
5. `npm run build` → `wrangler pages deploy dist --branch=preview` → review → `--branch=production`.
6. Attach `austinsmallofficetech.com` + `www`; add 301 redirect from `atxtechservices.com`.
7. Smoke test every page + a real end-to-end form submission.

---

## Self-Review

- **Spec coverage:** Change 1 (Tailwind) → Tasks 2-4; Change 2 (worker + form) → Tasks 5-7; deploy scaffolding
  → Task 8; review → Task 9; deploy → Task 10. Visual parity, TDD worker, header-injection safety, clean
  publish dir, 301 redirect, domain attach all covered.
- **Placeholders:** the only intentional `REPLACE_WITH_*` tokens are the Turnstile site key and Worker zone_id,
  both filled at deploy and gated by `check-ready.sh`. No plan-step placeholders.
- **Type/name consistency:** `validateContact` / `buildRawEmail` signatures match between Task 5 (definition),
  Task 6 (worker import), and tests. Field names (`name`, `email`, `business`, `message`, `nickname`,
  `turnstileToken`) consistent across validate.js, index.js, contact.html form, and submit JS. Color keys
  (`atx-teal`, `atx-tealDark`, etc.) match the config in Task 2 and usage in Task 7.
