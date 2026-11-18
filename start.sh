#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-3000}"
cd "$PROJECT_DIR"

run_timed() {
  local label="$1"
  shift
  /usr/bin/time -f "[timing] ${label}: %e s" "$@"
}

if [[ ! -x "$PROJECT_DIR/node_modules/.bin/vite" ]]; then
  if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then
    run_timed "npm ci" npm ci --no-audit --no-fund
  else
    run_timed "npm install" npm install --no-audit --no-fund
  fi
fi

run_timed "npm run build" npm run build

DEPLOYMENT_DIR="/home/runner/work/_temp/omgithub-web"
run_timed "prepare deployment metadata directory" mkdir -p "$DEPLOYMENT_DIR"
run_timed "write deployment metadata" env PROJECT_DIR="$PROJECT_DIR" node -e 'const fs=require("node:fs"); const path=require("node:path"); const project=process.env.PROJECT_DIR; fs.writeFileSync("/home/runner/work/_temp/omgithub-web/deployment-output.json", JSON.stringify({project,directory:path.resolve(project,"dist")}))'

run_timed "serve static build on port ${PORT}" node "$PROJECT_DIR/node_modules/vite/bin/vite.js" preview --host 0.0.0.0 --port "$PORT" --strictPort
