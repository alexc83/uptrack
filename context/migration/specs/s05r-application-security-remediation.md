# S05R — Application security remediation

Status: task-authorized implementation, 2026-11-03. The owner's S05R brief explicitly authorizes analysis, backend/frontend security fixes, focused dependency additions, full verification, commits, normal push and a draft PR without routine approval pauses. No deployment, main merge, ruleset change or Cloudinary account interaction is authorized.

Baseline: `75d6eecf035920b89b2f57a7a89ca34c580d0b42`, latest `origin/main` at branch creation; merge commit for S05 audit PR #15. Branch: `fix/s05r-security-remediation`.

Scope: fix S05-001/002/004/005/007; apply low-risk portions of S05-003/006/008/011; preserve retired Angular, public Cloudinary delivery and existing API response shapes. Treat the S05 audit as immutable evidence, not acceptance criteria to rewrite.

Acceptance:

1. Public login/registration are bounded before BCrypt; 429 has a safe message and Retry-After; windows recover, forwarded-header spoofing does not change identity, state is bounded.
2. Uploads enforce 5 MiB per file at both multipart and application boundaries; MIME, extension and parsed content agree. Simple PDF, JPEG, PNG, WebP and GIF work with mocked Cloudinary. Reject active PDFs, unsupported/malformed content and excess sizes; bound image/PDF traversal work.
3. Startup rejects weak/blank secrets and JWT lifetime outside 1–3600 seconds. Signature, expiry, issuance and maximum claimed lifetime are verified; password changes invalidate old sessions, new sessions work, and cross-user authorization stays enforced.
4. Return safe 400/413/415/409 for the documented client errors and generic 500 for unexpected failures. Respect storage precision and BCrypt's 72 UTF-8 byte limit.
5. React handles 429 and password-change sign-out; uploads retain server-error display. No UI redesign or retired Angular changes.
6. Run full Maven verification, new security tests, frontend typecheck/lint/unit/build and focused supported browser tests. External services remain mocked; isolated PostgreSQL is allowed.
7. Record every S05 finding, deferred decisions, token rollout compatibility, residual risks and verification evidence in `verification/s05r-security-remediation.md`.

Design choice: a signed HMAC credential marker checked against the current stored BCrypt hash replaces a database token-version column. It requires no schema change, blacklist or new service. All old-format sessions require re-login at rollout. Do not enable old backend replicas concurrently, because they cannot enforce this revocation rule.
