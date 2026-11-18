#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the evidence output directory}"
: "${RUNTIME_DIR:?RUNTIME_DIR must point to the worker runtime}"
cd "$PROJECT_DIR"

run_timed() {
  local label="$1"
  shift
  /usr/bin/time -f "[timing] ${label}: %e s" "$@"
}

run_timed "prepare capture directory" mkdir -p "$CAPTURE_DIR"
# The runtime capture helper opens the exact CAPTURE_URL, waits for the page,
# captures desktop and mobile PNGs, and closes the browser it launched.
run_timed "capture desktop and mobile views" env CAPTURE_STRICT=1 node "$RUNTIME_DIR/scripts/default-capture.mjs"
