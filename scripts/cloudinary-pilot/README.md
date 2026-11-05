# Issue #23 — non-production Cloudinary pilot tooling

Tooling for the authenticated-delivery pilot defined in
[`context/specs/issue-23-cloudinary-pilot-plan.md`](../../../context/specs/issue-23-cloudinary-pilot-plan.md).
**Execution requires separate owner authorization. Nothing here has been run against Cloudinary.**

## Files

- `run-pilot.sh` — env-driven pilot runner (preflight safety gate, synthetic fixtures, upload/access/
  token/expiry/ACL/probe/destroy checks, tracked cleanup, post-run inventory). Modes: default run,
  `--cleanup-only` (resume an interrupted run from `PILOT_STATE_FILE`), `--validate-state FILE`
  (offline state-file check), `PILOT_PREFLIGHT_ONLY=yes` (preflight + fixtures + SDK self-test, no API calls).
- `AuthTokenUrlTool.java` — local AuthToken URL generator compiled against the backend's Cloudinary SDK
  (cloudinary-core 2.5.0). Makes **no network calls**; prints only the signed URL on stdout.
  `--self-test` runs offline structural checks with a dummy key.
- `test-tooling.sh` — local safety test suite (9 cases). Never makes Cloudinary API calls.

## Required environment variables (test cloud only — never commit, never post to GitHub/chat)

| Variable | Purpose |
|---|---|
| `PILOT_CONFIRM_NONPRODUCTION` | must be exactly `yes` |
| `CLOUDINARY_CLOUD_NAME` | the **test** cloud name |
| `PILOT_EXPECTED_CLOUD_NAME` | retype the test cloud name; must match exactly, else abort before any API call |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | test-cloud API credentials (env only) |

Optional: `PILOT_PREFIX` (default `pilot`), `PILOT_TTL_SECONDS` (default 60),
`PILOT_EXPIRY_SKEW_SECONDS` (default 15), `PILOT_STATE_FILE`, `PILOT_PREFLIGHT_ONLY=yes`.

**Caveat:** cloud-name equality does not prove the cloud is non-production. Verify the cloud
identity in the Cloudinary console before running. The script contains no production cloud names
or secrets.

## Safety properties

- All preflight checks run before the first API call; any failure aborts with exit 2.
- Only synthetic, locally generated fixtures (1-page PDF, 1×1 PNG) are uploaded, under `pilot/`.
- Only assets created in the current run are destroyed (state file, `pilot/` prefix enforced);
  cleanup runs on normal exit, failure, and interruption (`--cleanup-only` resumes).
- Post-run inventory of the `pilot/` prefix must be empty; any leftover is reported as
  **UNRESOLVED** and fails the run — failed cleanup is never reported as success.
- Secrets and signed token URLs are never printed; evidence is HTTP status + safe headers only.

## Code-level SDK finding (cloudinary-core 2.5.0, verified against bytecode — [C])

`Url.generate()` only embeds an `AuthToken` when `Url.signed(true)` is set, and the token must be
constructed with the API secret as signing key (`new AuthToken(apiSecret)`); otherwise the token is
silently omitted (or empty). `AuthTokenUrlTool` implements the correct pattern. **The merged
`CertificateDeliveryServiceImpl` does not yet do this** — this is a blocking finding for Phase 3
acceptance and must be fixed (with tests) before/with the pilot; the pilot would otherwise fail
live. Mocked tests cannot catch this because `Cloudinary` is mocked in CI.

## Local verification (no Cloudinary access)

```bash
./scripts/cloudinary-pilot/test-tooling.sh          # 9 safety cases, no network
PILOT_CONFIRM_NONPRODUCTION=yes \
CLOUDINARY_CLOUD_NAME=<test> PILOT_EXPECTED_CLOUD_NAME=<test> \
CLOUDINARY_API_KEY=<k> CLOUDINARY_API_SECRET=<s> \
PILOT_PREFLIGHT_ONLY=yes ./scripts/cloudinary-pilot/run-pilot.sh   # preflight + self-test only
```

## Execution (owner-authorized only)

```bash
export PILOT_CONFIRM_NONPRODUCTION=yes
export CLOUDINARY_CLOUD_NAME=<test-cloud> PILOT_EXPECTED_CLOUD_NAME=<test-cloud>
export CLOUDINARY_API_KEY=<test-key> CLOUDINARY_API_SECRET=<test-secret>
./scripts/cloudinary-pilot/run-pilot.sh
# interrupted? resume cleanup: PILOT_STATE_FILE=<state> ./run-pilot.sh --cleanup-only
```

Requires `curl`, `jq`, `openssl`, `java`, `javac`; the Java helper is compiled against the backend
classpath (`backend/.m2` cached dependencies; offline `-o`).
