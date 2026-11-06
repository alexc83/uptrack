# Editorial review and provenance

## Recovery status

- 6/20: full approved writing-block text recovered from the current conversation, with CD-01's explicitly approved 5 MiB wording correction applied.
- 14/20: complete replacements reconstructed from the agreed article topics and repository audit facts. These are **not** the original approved wording. The owner explicitly accepted these reconstructions as replacements on November 5, 2026.

### Reconstructed articles accepted as replacements

GS-01, GS-02, GS-03, CR-01, CR-02, CR-03, CR-04, CE-01, CE-03, CE-04, DB-01, AS-01, AS-02, AS-03.

### Explicit approved changes incorporated

- CR-04: managed certificate assets are marked for deletion as part of credential deletion; deferred cleanup/retries, no immediate deletion promise.
- CE-03: CE-record deletion schedules managed certificate removal; save a backup before deletion.
- CR-03: avoid hard-coding the dynamic `See N more expirations` button text.
- DB-01: Recent Activity focuses on CE-related activity, not every profile/account event.
- GS-01 and CE-01: no outdated unverified-Cloudinary warning.
- CD-01: 5 MiB (not generic 5 MB) file size.

## Technical/source-level caveats for final QA

1. The React frontend supports authenticated `View certificate` delivery for managed assets with no public URL; older legacy/external links remain separate.
2. Managed deletion is durable and asynchronous; do not promise immediate provider-side erasure. Legacy non-managed/external records may differ.
3. The CE-hours total sums attached activities, not activities automatically restricted to a renewal period.
4. The dashboard's Upcoming Expirations window excludes already-expired credentials.
5. The report uses browser Print and lacks native CSV/PDF export.
6. No self-service forgot-password feature.
7. **Verify the exact login, upload and form error strings against current frontend behavior before publishing.** Some are reproduced from previously approved writing blocks and may differ from current runtime wording.
8. **Password-change session invalidation** is supported at code level but the user-visible redirect/sign-out needs final runtime verification.
9. Article descriptions of navigation and buttons in reconstructed files should be checked in the current production app before publishing.
10. The completed live issue #62 verification confirms `CERTIFICATE_DELIVERY_ENABLED=true` and private downloads working; stale legacy database metadata was not fully enumerable from that environment.

## Publication gate

All 20 articles are editorially approved. Runtime QA for exact UI/error strings and password-change sign-out remains recommended before public release. Publication and application implementation require separate owner approval.

## Additional UI-label QA completed (current `main`)

- AS-01: corrected profile action to **Save Changes** (`profile-card.tsx`).
- AS-02: removed internal editorial/runtime-verification commentary from public article body; the frontend mutation signs out on successful password change. Final browser smoke test remains recommended.
- CR-04: corrected action to **Delete Credential** (`credential-detail-drawer.tsx`).
- CR-01 and GS-03: corrected creation submit action to **Save Credential** (`credential-form.tsx`).
- TR-02: verified the exact 5 MiB exception wording in `UploadTooLargeException.java`.
- TR-03: verified **Profile updated** feedback in `profile-card.tsx`.

**Provenance remains transparent:** The 14 earlier articles are owner-approved reconstructions, not verbatim recovered historical drafts.
