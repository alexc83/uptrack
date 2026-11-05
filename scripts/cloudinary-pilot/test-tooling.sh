#!/usr/bin/env bash
# Local safety tests for the issue #23 pilot tooling. NEVER makes Cloudinary API calls:
# every case either aborts in preflight or runs with PILOT_PREFLIGHT_ONLY=yes.
# Usage: ./scripts/cloudinary-pilot/test-tooling.sh
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN="$HERE/run-pilot.sh"
PASS=0; FAILED=0
ok()   { PASS=$((PASS+1)); echo "ok   - $1"; }
bad()  { FAILED=$((FAILED+1)); echo "FAIL - $1"; }

run_case() { # name env... -- runs run-pilot.sh with a scrubbed environment
  local name="$1"; shift
  env -i PATH="$PATH" HOME="$HOME" "$@" bash "$RUN" > "/tmp/pilot-test-$name.out" 2> "/tmp/pilot-test-$name.err"
  echo $?
}

echo "== pilot tooling local tests (no network, no Cloudinary API calls) =="

# 1. nothing set -> abort on confirmation
rc=$(run_case noenv)
[ "$rc" -ne 0 ] && grep -q "PILOT_CONFIRM_NONPRODUCTION" "/tmp/pilot-test-noenv.err" \
  && ! grep -q "^=== [1-9]" "/tmp/pilot-test-noenv.out" && ok "missing confirmation aborts before any API step" || bad "missing confirmation aborts (rc=$rc)"

# 2. confirmation only -> abort on cloud name
rc=$(run_case noconf PILOT_CONFIRM_NONPRODUCTION=yes)
[ "$rc" -ne 0 ] && grep -q "CLOUDINARY_CLOUD_NAME" "/tmp/pilot-test-noconf.err" && ok "missing cloud name aborts" || bad "missing cloud name aborts (rc=$rc)"

# 3. cloud name but no expected name -> abort
rc=$(run_case noexp PILOT_CONFIRM_NONPRODUCTION=yes CLOUDINARY_CLOUD_NAME=test-cloud-xyz)
[ "$rc" -ne 0 ] && grep -q "PILOT_EXPECTED_CLOUD_NAME" "/tmp/pilot-test-noexp.err" && ok "missing expected cloud name aborts" || bad "missing expected cloud name aborts (rc=$rc)"

# 4. mismatch -> abort, and no pilot step markers (proves abort happened before API calls)
rc=$(run_case mismatch PILOT_CONFIRM_NONPRODUCTION=yes CLOUDINARY_CLOUD_NAME=test-cloud-xyz PILOT_EXPECTED_CLOUD_NAME=other-cloud CLOUDINARY_API_KEY=k CLOUDINARY_API_SECRET=s)
[ "$rc" -ne 0 ] && grep -q "mismatch" "/tmp/pilot-test-mismatch.err" && ! grep -q "^=== [1-9]" "/tmp/pilot-test-mismatch.out" \
  && ok "cloud-name mismatch aborts before any API call" || bad "cloud-name mismatch aborts (rc=$rc)"

# 5. names match but credentials missing -> abort
rc=$(run_case nocreds PILOT_CONFIRM_NONPRODUCTION=yes CLOUDINARY_CLOUD_NAME=test-cloud-xyz PILOT_EXPECTED_CLOUD_NAME=test-cloud-xyz)
[ "$rc" -ne 0 ] && grep -qE "CLOUDINARY_API_(KEY|SECRET)" "/tmp/pilot-test-nocreds.err" && ok "missing credentials abort" || bad "missing credentials abort (rc=$rc)"

# 6. full valid preflight, preflight-only: success, self-test passes, sentinel secret never logged
SENTINEL="SENTINEL_SECRET_do_not_leak_9f8e7d"
rc=$(run_case preflight PILOT_CONFIRM_NONPRODUCTION=yes CLOUDINARY_CLOUD_NAME=test-cloud-xyz PILOT_EXPECTED_CLOUD_NAME=test-cloud-xyz CLOUDINARY_API_KEY=SENTINEL_KEY_123 CLOUDINARY_API_SECRET="$SENTINEL" PILOT_PREFLIGHT_ONLY=yes)
if [ "$rc" -eq 0 ] && grep -q "PREFLIGHT OK" "/tmp/pilot-test-preflight.out" && grep -q "SELFTEST OK" "/tmp/pilot-test-preflight.out" \
   && ! grep -q "$SENTINEL" "/tmp/pilot-test-preflight.out" "/tmp/pilot-test-preflight.err" \
   && ! grep -q "SENTINEL_KEY_123" "/tmp/pilot-test-preflight.out" "/tmp/pilot-test-preflight.err" \
   && ! grep -qE "^=== [1-9]\." "/tmp/pilot-test-preflight.out"; then
  ok "valid preflight-only run passes self-test, makes no API calls, leaks no secrets"
else
  bad "valid preflight-only run (rc=$rc)"; echo "--- stdout tail:"; tail -5 "/tmp/pilot-test-preflight.out"; echo "--- stderr tail:"; tail -5 "/tmp/pilot-test-preflight.err"
fi

# 7. validate-state: good file
printf 'raw|pilot/authenticated/a|authenticated\nimage|pilot/upload/b|upload\n' > /tmp/pilot-state-good.txt
rc=$(env -i PATH="$PATH" HOME="$HOME" bash "$RUN" --validate-state /tmp/pilot-state-good.txt > /tmp/pilot-test-vs-good.out 2>&1; echo $?)
[ "$rc" -eq 0 ] && grep -q "VALIDATE-STATE OK" /tmp/pilot-test-vs-good.out && ok "validate-state accepts well-formed pilot/ state file" || bad "validate-state good file (rc=$rc)"

# 8. validate-state: asset outside prefix must be rejected
printf 'raw|production/important/doc|upload\n' > /tmp/pilot-state-bad.txt
rc=$(env -i PATH="$PATH" HOME="$HOME" bash "$RUN" --validate-state /tmp/pilot-state-bad.txt > /tmp/pilot-test-vs-bad.out 2>&1; echo $?)
[ "$rc" -ne 0 ] && grep -q "outside prefix" /tmp/pilot-test-vs-bad.out && ok "validate-state rejects assets outside pilot/ prefix" || bad "validate-state bad prefix (rc=$rc)"

# 9. validate-state: malformed line rejected
printf 'raw||upload\n' > /tmp/pilot-state-malformed.txt
rc=$(env -i PATH="$PATH" HOME="$HOME" bash "$RUN" --validate-state /tmp/pilot-state-malformed.txt > /tmp/pilot-test-vs-mal.out 2>&1; echo $?)
[ "$rc" -ne 0 ] && ok "validate-state rejects malformed entries" || bad "validate-state malformed (rc=$rc)"

echo
echo "RESULT: $PASS passed, $FAILED failed"
[ "$FAILED" -eq 0 ]
