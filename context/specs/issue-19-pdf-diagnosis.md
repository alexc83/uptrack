> **Canonical tracker:** [GitHub issue #19](https://github.com/alexc83/uptrack/issues/19) — do not create duplicates.
> **Related:** #24 (registry, Phase 1, [spec](issue-24-certificate-asset-registry.md)), #20 (lifecycle, [spec](issue-20-certificate-lifecycle.md)), #23 (delivery, [spec](issue-23-authenticated-delivery.md)).

# READY Specification — Issue #19: Certificate PDF rejection diagnosis (Phase 0, independent)

**Status: READY.** Owner approved the v3 architecture as the basis of this READY specification on 2026-11-05. **READY is not implementation authorization; implementation remains unauthorized.**

Evidence tags: **[C]** confirmed in current `main` code/tests · **[H]** hypothesis.

## 1. Current-code findings

- **[C]** On 2026-11-03 the owner reported two different one-page test PDFs rejected locally with "Certificate content is invalid or does not match its file type." Files and exact build SHA were not supplied; **not reproduced**. Do not conclude the files are malformed, that all PDFs fail, or that Cloudinary caused it.
- **[C]** `CertificateFileValidator.validate` gates, in order: file present/non-empty; ≤5 MiB (bounded read of 5 MiB+1 regardless of declared size); exact extension↔declared-MIME match (`pdf/jpg/jpeg/png/webp/gif`); PDF: `%PDF-` prefix, `%%EOF` within final 4 KiB (S05H tolerance), PDFBox parse, reject encrypted or 0 pages, recursive COS scan rejecting active content (`JS`, `JavaScript`, `OpenAction`, `AA`, `Launch`, `EmbeddedFiles`, `EF`, `RichMedia*`, `3DD`, `Movie`, `Sound`, `XFA`, **`AcroForm`**, `GoToR`, `GoToE`, `SubmitForm`, `ImportData`, plus active `/S` actions), depth ≤100 / ≤100 000 objects; images: ImageIO format match, 1–100 frames, ≤40 Mpx checked from headers before decode.
- **[H]** Leading hypotheses for the two rejections: browser-declared MIME/extension mismatch; PDFBox rejecting an unusual-but-valid structure; **false positive on the active-content gate — `AcroForm` is present in many digitally signed certificate PDFs**; `%%EOF` beyond the 4 KiB tail window (partially mitigated in S05H).

## 2. Approved direction

**Preserve the strict security validation policy; diagnose before any change.** Identify which gate rejects each reported file. Do not relax validation without demonstrated compatibility evidence and explicit approval.

## 3. Investigation plan (mocked Cloudinary; synthetic/sanitized fixtures only)

1. Owner supplies sanitized, non-sensitive reproducer PDFs plus exact frontend/backend SHA and HTTP status (never real credentials or personal content in the issue).
2. Build a fixture matrix: plain one-page PDF; digitally signed PDF (AcroForm); unusual xref/cross-reference-stream variants; linearized PDF; trailing data beyond 4 KiB; generator quirks. Record filename extension, browser-declared MIME and byte size only.
3. For each fixture, identify the exact rejecting gate (envelope check, PDFBox parse, active-content scan, MIME handling, multipart processing).
4. Add a minimal regression fixture **only** for a proven false rejection of a supported plain certificate PDF. Genuine PDFs must still pass; malicious/encrypted/active/oversized files must still fail.
5. Propose safe, user-facing error messages per failure class (without provider or internal detail).

## 4. Acceptance criteria

- Per-file root cause identified, or a documented not-reproduced evidence record.
- All existing `CertificateFileValidatorTest` cases pass unchanged on H2 and PostgreSQL 17 CI; any new fixture proves a false rejection before any rule change.
- No validation rule weakened without demonstrated evidence + explicit owner approval.
- Cloudinary mocked in all CI.

## 5. Verification matrix

Unit/integration: fixture matrix under mocked provider; error-message mapping. Required CI: `backend`, `backend-postgres` (frontend/e2e unaffected unless messages change — then `frontend`, `e2e-chromium` too).

## 6. Remaining owner decisions

Provide sanitized reproducer files + SHAs; approve any future validation change; explicit Phase 0 authorization (currently **not granted**).
