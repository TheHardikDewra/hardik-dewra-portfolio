#!/usr/bin/env bash
# Copies everything both sites share into each site folder: fonts, animation
# libraries, the base CSS + motion layer, brand logos, the portrait and the
# work screenshots. Each Vercel project deploys only its own folder (Root
# Directory), so the files have to physically live inside v1/ and v2/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for site in v1 v2; do
  mkdir -p "$ROOT/$site/fonts" "$ROOT/$site/vendor" "$ROOT/$site/logos" "$ROOT/$site/img" "$ROOT/$site/work"
  cp "$ROOT"/shared/fonts/*.woff2 "$ROOT/$site/fonts/"
  cp "$ROOT"/shared/vendor/* "$ROOT/$site/vendor/"
  cp "$ROOT"/shared/tokens.css "$ROOT"/shared/base.css "$ROOT"/shared/motion.js "$ROOT/$site/vendor/"
  cp "$ROOT"/shared/logos/*.svg "$ROOT/$site/logos/"
  cp "$ROOT"/shared/img/* "$ROOT/$site/img/"
  rsync -a --delete "$ROOT/shared/work/" "$ROOT/$site/work/"
  cp "$ROOT"/shared/favicon.svg "$ROOT"/shared/favicon-32.png "$ROOT"/shared/apple-touch-icon.png "$ROOT/$site/"
  echo "synced shared -> $site"
done
