#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

PORT="${PORT:-3000}"
DIST_DIR="$PROJECT_DIR/dist"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"

# Static projects need no framework build: stage the deployable files into dist.
/usr/bin/time -p mkdir -p "$DIST_DIR"
/usr/bin/time -p rm -rf "$DIST_DIR"/*
/usr/bin/time -p cp -a index.html "$DIST_DIR/index.html"
if [[ -f README.md ]]; then /usr/bin/time -p cp -a README.md "$DIST_DIR/README.md"; fi

if [[ -f package.json ]]; then
  /usr/bin/time -p npm install --no-audit --no-fund
fi

/usr/bin/time -p mkdir -p "$WEB_DIR"
/usr/bin/time -p node -e 'const fs=require("fs"); fs.writeFileSync(process.argv[1], JSON.stringify({project:process.argv[2],directory:process.argv[3]}))' \
  "$WEB_DIR/deployment-output.json" "$PROJECT_DIR" "$DIST_DIR"

# Serve only the built static directory and stay foregrounded for tmux/process supervision.
exec python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$DIST_DIR"
