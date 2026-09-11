#!/usr/bin/env bash
# Copies shared fonts + animation libraries into each site folder.
# Each Vercel project deploys only its own folder (Root Directory), so the
# files have to physically live inside v1/ and v2/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for site in v1 v2; do
  mkdir -p "$ROOT/$site/fonts" "$ROOT/$site/vendor"
  cp "$ROOT"/shared/fonts/*.woff2 "$ROOT/$site/fonts/"
  cp "$ROOT"/shared/vendor/* "$ROOT/$site/vendor/"
  echo "synced shared -> $site"
done
