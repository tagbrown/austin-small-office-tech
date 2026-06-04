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
