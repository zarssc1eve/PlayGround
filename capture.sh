#!/usr/bin/env bash
set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR" || exit 1

RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"

run_timed() {
  local label="$1"
  shift
  /usr/bin/time -f "[timing] ${label}: %e s" "$@"
}

if [[ -z "${CAPTURE_URL:-}" ]]; then
  echo "CAPTURE_URL is required" >&2
  exit 1
fi
if [[ -z "${CAPTURE_DIR:-}" ]]; then
  echo "CAPTURE_DIR is required" >&2
  exit 1
fi

run_timed "prepare capture directory" mkdir -p "$CAPTURE_DIR" || exit 1

set +e
run_timed "capture desktop and mobile views" env \
  CAPTURE_STRICT=1 \
  CAPTURE_URL="$CAPTURE_URL" \
  CAPTURE_DIR="$CAPTURE_DIR" \
  node "$RUNTIME_DIR/scripts/default-capture.mjs"
status=$?
set -e

[[ $status -eq 75 ]] && exit 75
[[ $status -eq 0 ]] || exit 1

for image in final-desktop.png final-mobile.png; do
  if [[ ! -s "$CAPTURE_DIR/$image" ]]; then
    echo "Rendering defect: missing $image" >&2
    exit 1
  fi
done

exit 0
