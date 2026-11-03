# Prepared draft PR

Title: **fix(security): remediate S05 authentication uploads and JWT lifecycle**

Base: `main`; head: `fix/s05r-security-remediation`. Create as **draft**; do not merge.

S05 confirmed unrestricted authentication attempts, weak certificate validation, non-revocable JWTs and client errors returning 500. This change adds bounded request limits, parsed PDF/raster validation and size caps, startup JWT checks, credential-bound token revocation, safe validation/error handling and compatible React behavior. Public Cloudinary delivery is retained; new asset names omit original filenames.

Validation: full Maven verify **132/132** including **47** cross-user cases and packaging; frontend typecheck/lint/build and full **556/556**, then expanded affected tests **63/63**; **4/4** focused system Chromium/Linux browser cases; actual HTTP 400/413/429 tests; isolated PostgreSQL token-revocation smoke. External services are mocked. Full browser/visual suites and real Cloudinary are not run.

Rollout: **no schema migration**. All pre-S05R tokens require one re-login. Password changes sign out every device. Require a generated signing secret of at least 32 UTF-8 bytes, JWT lifetime 1–3600 seconds and coordinated backend rollout without old replicas.

Remaining owner decisions: public vs authenticated document delivery and historical migration; durable orphan cleanup/storage quotas; trusted edge limits/proxy/body caps; production schema/headers/CI/rulesets. In-memory limits are per instance. No deployment, real asset work, ruleset change or retired Angular change is included.

See [the finding matrix and verification report](s05r-security-remediation.md) for implementation choices, compatibility impact, test evidence, initial failures, deferred findings and independent follow-up.
