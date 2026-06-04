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
