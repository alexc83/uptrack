#!/usr/bin/env bash
# UpTrack Phase 3 — non-production Cloudinary authenticated-delivery pilot runner (issue #23).
#
# SAFETY MODEL
#   - Aborts BEFORE any API call unless ALL of:
#       PILOT_CONFIRM_NONPRODUCTION=yes
#       CLOUDINARY_CLOUD_NAME=<test cloud>          (present)
#       PILOT_EXPECTED_CLOUD_NAME=<test cloud>      (present, must equal CLOUDINARY_CLOUD_NAME exactly)
#       CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET  (test-cloud credentials, env only, never printed)
#   - Equality checking alone does NOT prove the cloud is non-production: the owner must verify
#     the cloud identity in the Cloudinary console before running. This script contains no
#     production cloud names, credentials, or hardcoded secrets.
#   - Creates only synthetic fixtures (generated PDF/PNG) under the "pilot/" prefix and destroys
#     only assets it created in THIS run (tracked in a state file; --cleanup-only resumes an
#     interrupted run from an existing state file).
#   - Never prints secrets or signed token URLs; evidence is HTTP status + safe headers only.
#
# Modes:
#   ./run-pilot.sh                      full pilot (requires all env above)
#   ./run-pilot.sh --cleanup-only       destroy only assets listed in PILOT_STATE_FILE, then verify
#   ./run-pilot.sh --validate-state F   check a state file (format + pilot/ prefix), no API calls
#   PILOT_PREFLIGHT_ONLY=yes ./run-pilot.sh   preflight + fixture + SDK self-test only, no API calls
#
# Extra env: PILOT_PREFIX (default "pilot"), PILOT_TTL_SECONDS (default 60),
#            PILOT_EXPIRY_SKEW_SECONDS (default 15), PILOT_STATE_FILE (default <tmpdir>/created-assets.txt)
#
# Requires: curl, jq, openssl, java, javac. The Java AuthToken helper is compiled against the
# backend's Cloudinary SDK (cloudinary-core 2.5.0) via `./mvnw -o dependency:build-classpath`.
set -euo pipefail

MODE="run"
case "${1:-}" in
  "") ;;
  --cleanup-only) MODE="cleanup-only" ;;
  --validate-state) MODE="validate-state"; STATE_ARG="${2:?usage: run-pilot.sh --validate-state FILE}" ;;
  *) echo "unknown argument: $1" >&2; exit 2 ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PREFIX="${PILOT_PREFIX:-pilot}"
TTL="${PILOT_TTL_SECONDS:-60}"
SKEW="${PILOT_EXPIRY_SKEW_SECONDS:-15}"
WORK="$(mktemp -d)"
STATE_FILE="${PILOT_STATE_FILE:-$WORK/created-assets.txt}"
: > "$STATE_FILE"

log()  { printf '\n=== %s ===\n' "$*"; }
fail() { printf 'ABORT: %s\n' "$*" >&2; exit 2; }
note() { printf '    %s\n' "$*"; }

# ---------------------------------------------------------------- preflight (NO API calls)
preflight() {
  log "0. preflight (no API calls yet)"
  [ "${PILOT_CONFIRM_NONPRODUCTION:-}" = "yes" ] \
    || fail "PILOT_CONFIRM_NONPRODUCTION must be exactly 'yes' — this pilot must only run against a dedicated non-production cloud"
  [ -n "${CLOUDINARY_CLOUD_NAME:-}" ]     || fail "CLOUDINARY_CLOUD_NAME (test cloud) is required"
  [ -n "${PILOT_EXPECTED_CLOUD_NAME:-}" ] || fail "PILOT_EXPECTED_CLOUD_NAME is required (type the test cloud name again; must match exactly)"
  [ "$CLOUDINARY_CLOUD_NAME" = "$PILOT_EXPECTED_CLOUD_NAME" ] \
    || fail "cloud-name mismatch: CLOUDINARY_CLOUD_NAME != PILOT_EXPECTED_CLOUD_NAME — refusing before any API call"
  [ -n "${CLOUDINARY_API_KEY:-}" ]   || fail "CLOUDINARY_API_KEY (test cloud) is required"
  [ -n "${CLOUDINARY_API_SECRET:-}" ] || fail "CLOUDINARY_API_SECRET (test cloud) is required"
  for tool in curl jq openssl java javac; do command -v "$tool" >/dev/null || fail "missing required tool: $tool"; done
  note "cloud under test: $CLOUDINARY_CLOUD_NAME"
  note "REMINDER: name equality does not prove non-production — verify the cloud in the Cloudinary console."
  note "no credentials are printed or logged by this script."
}

# ---------------------------------------------------------------- helpers
BASE=""; DELIV=""
init_urls() {
  BASE="https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME"
  DELIV="https://res.cloudinary.com/$CLOUDINARY_CLOUD_NAME"
}

api() { curl -sS -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" "$@"; } # response may contain metadata; caller decides what to print (never secrets)

# status of a (possibly token-signed) URL — the URL is never printed
fetch_status() { curl -sS -o /dev/null -w '%{http_code}' "$1"; }
# safe evidence headers only (no query strings, no tokens)
fetch_headers() { curl -sS -D - -o /dev/null "$1" | grep -iE '^(HTTP/|content-type:|content-disposition:|cache-control:|etag:)' | tr -d '\r' || true; }

track() { # resource_type public_id delivery_type
  case "$2" in "$PREFIX"/*) ;; *) fail "refusing to track asset outside prefix '$PREFIX/': $2" ;; esac
  printf '%s|%s|%s\n' "$1" "$2" "$3" >> "$STATE_FILE"
}

validate_state_file() { # FILE — no API calls
  local file="$1" line rt pid dt
  [ -f "$file" ] || fail "state file not found: $file"
  while IFS='|' read -r rt pid dt; do
    [ -n "$rt" ] || fail "malformed state line (empty resource_type) in $file"
    case "$pid" in "$PREFIX"/*) ;; *) fail "state entry outside prefix '$PREFIX/': $pid" ;; esac
    case "$rt/$dt" in raw/upload|raw/authenticated|image/upload|image/authenticated) ;; *) fail "unknown resource/delivery type combo: $rt/$dt" ;; esac
  done < "$file"
  note "state file OK: $(wc -l < "$file") tracked asset(s), all under '$PREFIX/'"
}

SDK_CP=""
sdk_classpath() {
  [ -n "$SDK_CP" ] && return
  (cd "$REPO_ROOT/backend" && ./mvnw -o -q dependency:build-classpath -Dmdep.outputFile="$WORK/cp.txt")
  SDK_CP="$(cat "$WORK/cp.txt")"
}

compile_helper() {
  sdk_classpath
  mkdir -p "$WORK/classes"
  javac -cp "$SDK_CP" -d "$WORK/classes" "$REPO_ROOT/scripts/cloudinary-pilot/AuthTokenUrlTool.java"
}

# generate a signed authenticated-delivery URL into file $5 (never printed)
gen_token_url() { # resource_type public_id format duration outfile
  java -cp "$WORK/classes:$SDK_CP" AuthTokenUrlTool \
    --resource-type "$1" --public-id "$2" ${3:+--format "$3"} --duration "$4" > "$5"
}

# ---------------------------------------------------------------- fixtures
make_fixtures() {
  log "fixtures (synthetic only)"
  printf '%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' > "$WORK/synth.pdf"
  printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB\x60\x82' > "$WORK/synth.png"
  head -c 4 "$WORK/synth.pdf" | grep -q '%PDF' || fail "synthetic PDF fixture invalid"
  [ "$(head -c 4 "$WORK/synth.png" | od -An -tx1 | tr -d ' \n')" = "89504e47" ] || fail "synthetic PNG fixture invalid"
  note "synthetic fixtures OK (PDF + PNG, generated locally, no real documents)"
}

# ---------------------------------------------------------------- cleanup
destroy_asset() { # resource_type public_id delivery_type -> prints result
  api -X POST "$BASE/resources/$1/$3" -d "public_ids[]=$2" -d "invalidate=true" \
    | jq -r '.result // .error.message // "no-result"'
}

CLEANUP_FAILURES=0
cleanup() {
  [ "$MODE" = "run" ] || return 0
  [ -s "$STATE_FILE" ] || { note "cleanup: nothing tracked"; return 0; }
  log "CLEANUP: destroying only assets created by this pilot run"
  local rt pid dt result
  while IFS='|' read -r rt pid dt; do
    [ -n "$rt" ] || continue
    result="$(destroy_asset "$rt" "$pid" "$dt" || echo "request-failed")"
    case "$result" in
      ok|"not found") note "destroyed (or already gone): $rt/$dt $pid -> $result" ;;
      *) note "CLEANUP FAILED: $rt/$dt $pid -> $result"; CLEANUP_FAILURES=$((CLEANUP_FAILURES+1)) ;;
    esac
  done < "$STATE_FILE"
  inventory_check
}

inventory_check() {
  log "post-run inventory of prefix '$PREFIX/' (must be empty)"
  local combo count total=0
  for combo in raw/upload raw/authenticated image/upload image/authenticated; do
    count="$(api "$BASE/resources/$combo?prefix=$PREFIX/&max_results=500" | jq -r '.resources | length')"
    note "$combo: $count remaining"
    total=$((total + count))
  done
  if [ "$total" -ne 0 ]; then
    note "UNRESOLVED: $total pilot asset(s) remain in the test cloud — manual cleanup required."
    CLEANUP_FAILURES=$((CLEANUP_FAILURES+1))
  else
    note "inventory clean: no pilot assets remain"
  fi
}

on_exit() {
  local rc=$?
  if [ "$MODE" = "run" ]; then
    cleanup || true
    if [ "$CLEANUP_FAILURES" -gt 0 ]; then
      echo "PILOT INCOMPLETE: $CLEANUP_FAILURES cleanup/inventory failure(s) — see above; unresolved assets must be removed manually from the TEST cloud." >&2
      exit 1
    fi
  fi
  rm -rf "$WORK"
  exit $rc
}
trap on_exit EXIT
trap 'exit 130' INT TERM

# ================================================================ modes
if [ "$MODE" = "validate-state" ]; then
  validate_state_file "$STATE_ARG"
  echo "VALIDATE-STATE OK"
  exit 0
fi

preflight
init_urls

if [ "$MODE" = "cleanup-only" ]; then
  [ -n "${PILOT_STATE_FILE:-}" ] || fail "--cleanup-only requires PILOT_STATE_FILE pointing at the interrupted run's state file"
  validate_state_file "$STATE_FILE"
  log "cleanup-only mode"
  cleanup
  [ "$CLEANUP_FAILURES" -eq 0 ] || exit 1
  echo "CLEANUP-ONLY OK"
  exit 0
fi

# ---------------------------------------------------------------- run mode
compile_helper
log "SDK helper self-test (local signing only, no network)"
java -cp "$WORK/classes:$SDK_CP" AuthTokenUrlTool --self-test
make_fixtures

if [ "${PILOT_PREFLIGHT_ONLY:-}" = "yes" ]; then
  echo "PREFLIGHT OK — no Cloudinary API calls were made (PILOT_PREFLIGHT_ONLY=yes)"
  exit 0
fi

RUN_ID="$(date +%s)-$RANDOM"

log "1. upload synthetic PDF as type=upload (public baseline)"
R="$(api -X POST "$BASE/raw/upload" -F "file=@$WORK/synth.pdf" -F "type=upload" -F "public_id=$PREFIX/upload/synth-$RUN_ID")"
PID_UP="$(echo "$R" | jq -r '.public_id // empty')"; [ -n "$PID_UP" ] || fail "upload failed: $R"
track raw "$PID_UP" upload
note "uploaded: $PID_UP"

log "2. logged-out fetch of the public upload URL (expect 200)"
S="$(fetch_status "$DELIV/raw/upload/$PID_UP.pdf")"; note "public upload URL status=$S (expect 200)"

log "3. signed authenticated URL against the upload-type asset (expect 4xx — delivery-type mismatch)"
gen_token_url raw "$PID_UP" pdf "$TTL" "$WORK/url-up.txt"
S="$(fetch_status "$(cat "$WORK/url-up.txt")")"; note "authenticated URL on upload-type asset status=$S (expect 401/403/404)"

log "4. upload synthetic PDF with type=authenticated"
R="$(api -X POST "$BASE/raw/upload" -F "file=@$WORK/synth.pdf" -F "type=authenticated" -F "public_id=$PREFIX/authenticated/synth-$RUN_ID")"
PID_AU="$(echo "$R" | jq -r '.public_id // empty')"; [ -n "$PID_AU" ] || fail "authenticated upload failed: $R"
track raw "$PID_AU" authenticated
note "uploaded: $PID_AU"

log "5. upload synthetic PNG with type=authenticated (image)"
R="$(api -X POST "$BASE/image/upload" -F "file=@$WORK/synth.png" -F "type=authenticated" -F "public_id=$PREFIX/authenticated/synth-$RUN_ID-img")"
PID_IMG="$(echo "$R" | jq -r '.public_id // empty')"; [ -n "$PID_IMG" ] || fail "authenticated image upload failed: $R"
track image "$PID_IMG" authenticated
note "uploaded: $PID_IMG"

log "6. plain unsigned URLs for authenticated assets (expect 401/403/404)"
S="$(fetch_status "$DELIV/raw/authenticated/$PID_AU.pdf")"; note "plain raw authenticated URL status=$S (expect 4xx)"
S="$(fetch_status "$DELIV/image/authenticated/$PID_IMG.png")"; note "plain image authenticated URL status=$S (expect 4xx)"

log "7. signed AuthToken URL for the authenticated PDF, before expiry (expect 200)"
gen_token_url raw "$PID_AU" pdf "$TTL" "$WORK/url-pdf.txt"
S="$(fetch_status "$(cat "$WORK/url-pdf.txt")")"; note "token URL (t=0) status=$S (expect 200)"
note "response headers:"; fetch_headers "$(cat "$WORK/url-pdf.txt")" | sed 's/^/      /'

log "8. cross-asset ACL negative: PDF token applied to the image URL (expect 4xx)"
PDF_QUERY="$(sed 's/^[^?]*//' "$WORK/url-pdf.txt")"
S="$(fetch_status "$DELIV/image/authenticated/$PID_IMG.png$PDF_QUERY")"; note "cross-asset status=$S (expect 401/403/404)"

log "9. expiry: waiting $((TTL + SKEW))s (TTL=$TTL + skew=$SKEW), then refetch (expect 4xx)"
sleep $((TTL + SKEW))
S="$(fetch_status "$(cat "$WORK/url-pdf.txt")")"; note "token URL after TTL status=$S (expect 401/403/404); record actual denial time for clock-skew analysis"

log "10. Admin API existence probes (used by reservation sweeper / reconciliation)"
api "$BASE/resources/raw/authenticated?prefix=$PREFIX/authenticated" | jq -c '{count: (.resources|length)}' | sed 's/^/    raw\/authenticated: /'
api "$BASE/resource/raw/authenticated/$PID_AU" | jq -c '{public_id, type, resource_type}' | sed 's/^/    single probe: /'
api "$BASE/resources/raw/upload?prefix=$PREFIX/upload" | jq -c '{count: (.resources|length)}' | sed 's/^/    raw\/upload: /'

log "11. destroy contract for authenticated asset (expect ok, then 'not found')"
R1="$(destroy_asset raw "$PID_AU" authenticated)"; note "first destroy result=$R1 (expect ok)"
R2="$(destroy_asset raw "$PID_AU" authenticated)"; note "re-destroy result=$R2 (expect 'not found')"
# remove from tracking so cleanup does not retry it; record explicit results above
grep -v "raw|$PID_AU|authenticated" "$STATE_FILE" > "$STATE_FILE.tmp" || true
mv "$STATE_FILE.tmp" "$STATE_FILE"

log "12. reconciliation-style listing across both delivery types (prefix=$PREFIX/)"
for combo in raw/upload raw/authenticated image/upload image/authenticated; do
  api "$BASE/resources/$combo?prefix=$PREFIX/&max_results=500" | jq -c '{count: (.resources|length), next_cursor: (.next_cursor // null)}' | sed "s/^/    $combo: /"
done

log "PILOT DONE — compare every recorded status with the expected values in context/specs/issue-23-cloudinary-pilot-plan.md §3."
note "Remaining MANUAL steps (browser/CDN): PDF preview vs download and Content-Disposition in Chromium;"
note "image transformations on authenticated assets; CDN cache keying of the token param; old public URL"
note "behavior after in-place type change; SDK 2.5.0 vs 2.6.0 (PR #30) parity."
note "Token URLs were used but never printed; state file: $STATE_FILE"
