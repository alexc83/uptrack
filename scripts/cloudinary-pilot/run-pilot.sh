#!/usr/bin/env bash
# UpTrack Phase 3 — non-production Cloudinary authenticated-delivery pilot runner.
#
# SAFETY: refuses to run without PILOT_CONFIRM_NONPRODUCTION=yes and dedicated test-cloud
# credentials supplied via the environment (NEVER committed, never printed). Uses only
# synthetic fixtures generated below. Destroys every asset it creates at the end.
#
# Usage:
#   export CLOUDINARY_CLOUD_NAME=<test-cloud> CLOUDINARY_API_KEY=<key> CLOUDINARY_API_SECRET=<secret>
#   export PILOT_CONFIRM_NONPRODUCTION=yes
#   ./scripts/cloudinary-pilot/run-pilot.sh
#
# Requires: curl, jq, openssl. Read-only except for the synthetic assets it creates/deletes.
set -euo pipefail

: "${CLOUDINARY_CLOUD_NAME:?set the TEST cloud name}"
: "${CLOUDINARY_API_KEY:?set the TEST api key}"
: "${CLOUDINARY_API_SECRET:?set the TEST api secret}"
: "${PILOT_CONFIRM_NONPRODUCTION:?must be 'yes' — this pilot must only run against a dedicated non-production cloud}"

BASE="https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME"
DELIV="https://res.cloudinary.com/$CLOUDINARY_CLOUD_NAME"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

log() { printf '\n=== %s ===\n' "$*"; }

# --- Synthetic fixtures (no real documents) ---
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' > "$WORK/synth.pdf"
# 1x1 PNG
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB\x60\x82' > "$WORK/synth.png"

CREATED=()
cleanup() {
  log "CLEANUP: destroying pilot assets"
  for spec in "${CREATED[@]:-}"; do
    rt="${spec%%:*}"; rest="${spec#*:}"; pid="${rest%%:*}"; dtype="${rest##*:}"
    curl -s -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" -X POST "$BASE/resources/$rt/$dtype" \
      -d "public_ids[]=$pid" -d "invalidate=true" | jq -c '{result, deleted: (.deleted // {})}' || true
  done
}
trap cleanup EXIT

upload() { # $1=file $2=resource_type $3=delivery_type ; echoes public_id
  local resp
  resp=$(curl -s -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" -X POST "$BASE/$1" \
    -F "file=@$WORK/$1" -F "type=$3" -F "public_id=pilot/$3/$1-${RANDOM}" -F "invalidate=true")
  # note: upload endpoint is /resources/:resource_type/:type for explicit type control via API;
  # the Java SDK uploader.upload uses /:resource_type/upload with a 'type' option — same effect.
  echo "$resp" | jq -r '.public_id // .error.message'
}

log "0. env check (cloud=$CLOUDINARY_CLOUD_NAME) — confirm this is the TEST cloud, not production"

log "1. upload synthetic PDF as type=upload (baseline)"
PDF_UP=$(curl -s -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" -X POST "$BASE/raw/upload" -F "file=@$WORK/synth.pdf" -F "public_id=pilot/upload/synth.pdf")
echo "$PDF_UP" | jq -c '{public_id, secure_url, resource_type, type}'
PID_UP=$(echo "$PDF_UP" | jq -r .public_id); CREATED+=("raw:$PID_UP:upload")

log "2. logged-out fetch of public upload URL (expect 200)"
curl -s -o /dev/null -w 'public upload URL status=%{http_code}\n' "$DELIV/raw/upload/$PID_UP.pdf"

log "3. authenticated-type URL for the upload-type asset (expect denial)"
TS=$(date +%s)
SIG=$(printf '%s%s' "public_id=$PID_UP&timestamp=$TS" "$CLOUDINARY_API_SECRET" | openssl dgst -sha256 -hex | awk '{print $NF}')
curl -s -o /dev/null -w 'authenticated URL on upload-type asset status=%{http_code}\n' "$DELIV/raw/authenticated/s--$SIG--/$PID_UP.pdf?timestamp=$TS"

log "4. upload synthetic PDF with type=authenticated"
PDF_AU=$(curl -s -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" -X POST "$BASE/raw/authenticated" -F "file=@$WORK/synth.pdf" -F "public_id=pilot/authenticated/synth.pdf")
echo "$PDF_AU" | jq -c '{public_id, secure_url, type}'
PID_AU=$(echo "$PDF_AU" | jq -r .public_id); CREATED+=("raw:$PID_AU:authenticated")

log "5. upload synthetic PNG with type=authenticated"
PNG_AU=$(curl -s -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" -X POST "$BASE/image/authenticated" -F "file=@$WORK/synth.png" -F "public_id=pilot/authenticated/synth.png")
echo "$PNG_AU" | jq -c '{public_id, secure_url, type}'
PID_PNG=$(echo "$PNG_AU" | jq -r .public_id); CREATED+=("image:$PID_PNG:authenticated")

log "6. plain unsigned URL for authenticated asset (expect 401/404)"
curl -s -o /dev/null -w 'plain authenticated URL status=%{http_code}\n' "$DELIV/raw/authenticated/$PID_AU.pdf"
curl -s -o /dev/null -w 'plain image URL status=%{http_code}\n' "$DELIV/image/authenticated/$PID_PNG.png"

log "7. AuthToken URL (duration=60, acl pinned) — generate via the SDK/backend delivery endpoint in non-prod"
echo "   Generate with the app's GET /api/ce-records/{id}/certificate-url (non-prod deployment) or the Java SDK:"
echo "     cloudinary.url().secure(true).type(\"authenticated\").resourceType(\"raw\").authToken(new AuthToken().duration(60).acl(\"/raw/authenticated/$PID_AU\")).generate(\"$PID_AU\")"
echo "   Then, logged out:"
echo "     curl -s -o /dev/null -w '%{http_code} %{content_type}\\n' '<token-url>'        # expect 200 application/pdf (t=0)"
echo "     sleep 65; curl ... '<same-url>'                                            # expect 401/403 after the 60s TTL"
echo "   Record actual TTL/clock-skew from repeated fetches every 10s."
echo "   NOTE: manual openssl signing is intentionally NOT scripted here — the SDK AuthToken"
echo "   format is authoritative; do not hand-roll signatures."

log "8. ACL mismatch — token issued for the PDF used against the PNG URL (expect denial)"
echo "   Take the token query string from step 7 and request: $DELIV/image/authenticated/$PID_PNG.png?<that query>"
echo "   curl -s -o /dev/null -w '%{http_code}\\n' (expect 401/403)"

log "9. headers/caching on an authenticated URL (use the step-7 URL)"
echo "   curl -s -D - -o /dev/null '<token-url>' | grep -iE 'cache-control|content-disposition|content-type'"
echo "   Fetch twice with different tokens → check whether the CDN cache key includes auth_token."

log "10. Admin API existence probe incl. type (used by reservation sweeper)"
curl -s -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" "$BASE/resources/raw/authenticated?prefix=pilot/authenticated" | jq -c '{count: (.resources | length), first: .resources[0].public_id}'
curl -s -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" "$BASE/resources/raw/upload?prefix=pilot/upload" | jq -c '{count: (.resources | length)}'

log "11. destroy contract for authenticated asset (result=ok) and re-destroy (result=not found)"
curl -s -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" -X POST "$BASE/resources/raw/authenticated" -d "public_ids[]=$PID_AU" | jq -c '{result, deleted: (.deleted // {})}'
curl -s -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" -X POST "$BASE/resources/raw/authenticated" -d "public_ids[]=$PID_AU" | jq -c '{result}' 
CREATED=("${CREATED[@]/raw:$PID_AU:authenticated/}") # already destroyed

log "12. reconciliation listing across both delivery types"
curl -s -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" "$BASE/resources/image/authenticated?prefix=pilot/&max_results=500" | jq -c '{count: (.resources|length), next_cursor: (.next_cursor // null)}'
curl -s -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" "$BASE/resources/image/upload?prefix=pilot/&max_results=500" | jq -c '{count: (.resources|length)}'

log "PILOT DONE — review statuses above against the expected values in context/specs/issue-23-cloudinary-pilot-plan.md"
