# D01-D verification report — test quality and coverage reporting

Status: **COMPLETE — merged and verified.** [PR #37](https://github.com/alexc83/uptrack/pull/37) was merged into `main` as `db42d686e1a5a6a98a224690056e088bb9dcf3b2` (owner-accepted 2026-11-04); the post-merge CI run [41822488477](https://github.com/alexc83/uptrack/actions/runs/41822488477) passed all four jobs (§9). §1–§8 are the pre-merge evidence, preserved as written (they speak of the PR as pending).
Agent / session: Claude Code (cloud session).
Date / branch / base: 2026-11-04 / `chore/d01-d-test-quality` / `origin/main` = `f8ef6cdb9f983f40210a094835cb00b55687391a` (merge of D01-C closeout PR #36), ahead/behind 0/0 before changes.
Spec: [`specs/d01-ci-foundation.md`](../specs/d01-ci-foundation.md) §4 (G3–G6, G9), §6 (D01-D). Authorization: owner D01-D audit approval, implementation brief, commit/push/draft-PR authorization and final documentation brief (all 2026-11-04).

Notation: **[V]** verified from GitHub Actions logs or the GitHub API in this session; **[L]** local container evidence only (Maven 3.9.11 instead of the wrapper, whose distribution download is blocked; local PostgreSQL 16.15); **[U]** not verified / unknown.

## 1. Objectives and acceptance criteria

Spec §6 D01-D:

| # | Criterion | Result |
|---|---|---|
| 1 | Backend tests cover G3 (403/409/503 + `Retry-After`/500 without stack trace or class names), G4, G5 using existing MockMvc/Mockito patterns | **Met** — 26 new tests (§3). Cloudinary always mocked. |
| 2 | Frontend tests cover G6 and relevant error/edge states with existing Testing Library patterns | **Met** — 23 new tests (§3). |
| 3 | JaCoCo and `@vitest/coverage-v8` produce reports as CI artifacts/summaries; **no thresholds** | **Met** — see §4, §7. No `check` goal, no `coverage.thresholds`. |
| 4 | Coverage compared with the D01-A baseline | **Met** — §5 (backend directly comparable; frontend not strictly, see §5). |
| 5 | No test skipped, deleted or weakened; no assertion-free tests | **Met** — only 6 new test files and additive config; `git diff` shows no removed test lines; no `@Disabled`/`skip`. |

Owner decisions applied: Cloudinary cleanup behaviour is **characterized, not changed**; `@vitest/coverage-v8` is added at the exact version of the installed Vitest (4.1.12); no thresholds; the credential-delete orphan concern is recorded as [D01-W04](../follow-ups/d01-w04-cloudinary-certificate-lifecycle.md), outside D01-D.

## 2. Commits and exact files changed

Four implementation commits, all authored and committed as `alexc83 <alexc83@users.noreply.github.com>`, no AI trailers (11 files; +1184 / −5):

| SHA | Commit | Files |
|---|---|---|
| `acc8698` | test(backend): cover exception handling, upload, and account-change paths | `backend/src/test/java/com/ccruce/backend/exception/GlobalExceptionHandlerTest.java`, `service/UserServiceImplTest.java`, `service/CertificateUploadServiceImplTest.java`, `controller/CertificateCleanupFailureIntegrationTest.java` (all new) |
| `f88844c` | test(frontend): cover settings and certificate-upload hook edge cases | `frontend-react/src/features/settings/use-settings.test.tsx`, `frontend-react/src/features/ce-records/use-certificate-upload.test.tsx` (new) |
| `70c1323` | build: add JaCoCo and Vitest coverage reporting | `backend/pom.xml`, `frontend-react/vitest.config.ts`, `frontend-react/package.json`, `frontend-react/package-lock.json` |
| `d00eb39` | ci: publish coverage reports from backend and frontend jobs | `.github/workflows/ci.yml` |

A fifth, documentation-only commit `14f1824` (this report, D01-W04, tracker updates) completes the PR. **No production application code, deployment, Render/Vercel/Neon/Cloudinary configuration, branch protection or repository setting was changed.** `package-lock.json` changes are 148 pure insertions, limited to `@vitest/coverage-v8` and its 10 new transitive packages (`@bcoe/v8-coverage`, `ast-v8-to-istanbul` (+ nested `js-tokens`), `html-escaper`, `istanbul-lib-coverage`, `istanbul-lib-report`, `istanbul-reports`, `magicast`, `make-dir` (+ nested `semver`)); the `libc` fields that npm 10 would have stripped were deliberately preserved.

## 3. New tests (G3–G6) and findings

### Backend (+26: 167 → 193)

| Class | Tests | Covers |
|---|---|---|
| `GlobalExceptionHandlerTest` (standalone MockMvc + stub controller + the real `@ControllerAdvice`) | 8 | 403 `AccessDeniedException`; 409 for `DataIntegrityViolation` and `OptimisticLockingFailure`; 503 + `Retry-After: 5`; 413 (`RequestBodyTooLarge`, `UploadTooLarge`); 502 `UploadFailed`; **500 generic message with no stack trace, class names, SQL, JDBC URL or secret fragments** (a forbidden-substring guard is applied to the 403, 409, 409 and 500 bodies, including a nested cause). |
| `UserServiceImplTest` (Mockito) | 5 | "The account changed. Please sign in again." 409 when the guarded `updateProfile`/`changePassword` UPDATE affects 0 rows; password-change success path; unauthenticated and non-user-principal guards (no repository access). |
| `CertificateUploadServiceImplTest` (Mockito) | 8 | Upload `IOException` → generic 502 message; unauthenticated upload rejected before calling Cloudinary; missing/blank/non-string `resource_type`, `public_id`, `secure_url` rejected; raw-resource format-suffix logic; `deleteCertificate` call shape (`resource_type`, `invalidate`), blank/null arguments ignored, `IOException` and `RuntimeException` → generic "Certificate cleanup failed." |
| `CertificateCleanupFailureIntegrationTest` (`@SpringBootTest`, `CertificateUploadService` mocked) | 5 | 503 + `Retry-After: 5` over the full HTTP stack; **cleanup-failure characterization** (below); credential-delete cascade. |

**Distinction preserved (spec G3):** the 403 handler is `@ControllerAdvice` behaviour and fires only for an `AccessDeniedException` thrown inside MVC code. `SecurityConfig` has no `accessDeniedHandler` or method security, so filter-chain responses (401 via `restAuthenticationEntryPoint`) are a separate mechanism, already covered by 20 existing `isUnauthorized()` assertions. Production security configuration was not touched.

**Confirmed Cloudinary cleanup-failure behaviour (current, unchanged):**
- Deleting a CE record whose cleanup fails → **502 "Certificate cleanup failed."**, record and metadata intact (cleanup runs before the row delete).
- Replacing/removing a certificate whose previous-file cleanup fails → **502** and the whole `@Transactional` update **rolls back** (old title and certificate unchanged).
- A non-`UploadFailedException` from cleanup → generic 500 (`An unexpected error occurred.`), no provider detail in the body.
- Deleting a **credential** cascades to its CE records in the database but **never calls `deleteCertificate`** → certificate files are orphaned. Pinned by `deletingCredentialCascadesCeRecordsWithoutDeletingCloudinaryAssets` and recorded as [D01-W04](../follow-ups/d01-w04-cloudinary-certificate-lifecycle.md). No confirmed data-integrity defect (no database corruption); the exposure is orphaned external objects. Design note: cleanup failure blocks the user's action, so a Cloudinary outage blocks deleting/replacing certificates (probably intentional).

### Frontend (+23: 573 → 596)

| File | Tests | Covers |
|---|---|---|
| `use-settings.test.tsx` | 12 | `useUpdateProfile`: success writes cache and session user; aborts before the API call and discards the response (no cache/session write) when the session is replaced; API failure leaves cache and session untouched. `useChangePassword`: logout after success; abort before call; no logout of a replacement session when the session changed mid-request; no logout on rejection. `getSettingsErrorMessage`: ApiError/Error/empty/non-Error branches. |
| `use-certificate-upload.test.tsx` | 11 | Success, null original filename, client-side type rejection (API not called), ApiError message, non-`ApiError` generic fallback without leaking the original message, busy guard (second upload ignored while pending; retry afterwards), non-current session at start, session replaced mid-upload (success discarded; failure message suppressed), `removePending`, `reset`. |

The hooks tests mock `useSession` (`vi.mock`) to control `captureSession().isCurrent()`; no production component or hook was modified.

## 4. Coverage configuration

- **Backend (`backend/pom.xml`)**: `org.jacoco:jacoco-maven-plugin:0.8.13` (the version measured in D01-A); `prepare-agent` at the default phase, `report` bound to `verify` (XML, HTML, CSV in `backend/target/site/jacoco/`). No `check` goal → no thresholds. `-Djacoco.skip=true` disables it.
- **Frontend (`frontend-react/vitest.config.ts`, `package.json`)**: `@vitest/coverage-v8` **4.1.12** (exact; it peer-requires Vitest 4.1.12, so a future Vitest bump must move both), provider `v8`, reporters `text-summary`, `lcov`, `html`, `json-summary`, output `frontend-react/coverage/` (already git-ignored), script `npm run test:coverage` (`vitest run --coverage`). `npm test` is unchanged. No `coverage.thresholds`.
- **Frontend exclusions** (all documented in the config): `**/*.test.{ts,tsx}` (test files), `src/test/**` (test setup, helpers, fixtures), `**/*.d.ts` (type declarations), `src/main.tsx` (browser bootstrap, exercised by E2E not unit tests). Included: `src/**/*.{ts,tsx}`. **Backend exclusions: none.**

## 5. Coverage results (before → after)

Before = D01-A baseline at `7fabdbb`, re-measured at `f8ef6cd` (identical backend, frontend 96.92 % / 87.52 %). After = local measurement [L] of the PR head. **No coverage percentage was independently read from GitHub** (§6); the CI job summaries compute the same values from the same JaCoCo/Vitest outputs.

| | Before | After [L] |
|---|---|---|
| Backend line | 93.1 % (1066/1145) | **96.0 %** (1099/1145) |
| Backend branch | 77.0 % (399/518) | **80.5 %** (417/518) |
| `GlobalExceptionHandler` line | 24/34 (70.6 %) | **34/34** |
| `CertificateUploadServiceImpl` line / branch | 52/73 / 19/40 | **72/73 / 33/40** |
| `UserServiceImpl` line / branch | 37/40 / 9/14 | **40/40 / 13/14** |
| Frontend line / branch | 96.92 % / 87.52 % (`src/**`, before exclusions) | **98.06 % / 88.68 %** (with the §4 exclusions) |
| `use-settings.ts` line / branch | 76.9 % / 43.75 % | **100 % / 100 %** |
| `use-certificate-upload.ts` line / branch | 81.6 % / 57.1 % | **100 % / 100 %** |

Frontend totals are **not strictly comparable**: the exclusions shrink the denominator. The per-file figures are. Remaining backend misses (examples): `CERecordServiceImpl` branches 37/50, `RequestSizeLimitFilter` lines 81, 116, 122–124, 130, 135, one `CertificateUploadServiceImpl` line. Not chased; no threshold is proposed here.

## 6. GitHub Actions validation

CI run [#25 / 41818932511](https://github.com/alexc83/uptrack/actions/runs/41818932511), `pull_request`, head `d00eb39bce4ded448d491549b1ddb9dbd395c856`; **all four jobs passed**.

| Job | Result | Duration [V] | Evidence |
|---|---|---|---|
| `backend` (H2) | pass | 1 min 12 s | log: `Tests run: 193, Failures: 0, Errors: 0, Skipped: 0`; `jacoco:0.8.13:report` "Analyzed bundle 'backend' with 67 classes"; JAR built |
| `backend-postgres` | pass | 1 min 6 s | log: `Tests run: 193, Failures: 0, Errors: 0, Skipped: 0`; `Database version: 17.11`; service container `PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2)`; JDBC assertions passed; JaCoCo skipped |
| `frontend` | pass | 1 min 36 s | typecheck, lint, Vitest with coverage, coverage summary, coverage upload and build steps all `success` (Vitest step 48 s). The **596/596** figure was **not read from the CI log** (the log tail was inspected; the summary line lies earlier) — 596/596 is [L]; the CI step passed with 0 failures. |
| `e2e-chromium` | pass | 3 min 24 s | log: `146 passed (2.8m)` |

Whole run ≈ 3 min 26 s (jobs run in parallel; E2E is the critical path, so the added coverage steps — about 5 s backend, a few seconds frontend — did not change the wall time class). Failure-only artifact steps (`Upload Surefire reports`, `Upload Vitest report`, `Upload Playwright report and traces`) were `skipped` as designed; they were not exercised (no job failed) and are unchanged.

**Artifacts [V]** (workflow-run artifacts API): exactly two — `backend-coverage` (453,199 bytes, 175 files uploaded, digest `sha256:58638768…`) and `frontend-coverage` (688,124 bytes, 296 files, digest `sha256:6571bf7f…`). `expires_at` is exactly 14 days after `created_at` for both (created 2026-11-04 11:10, expires 2026-11-18). **The `backend-postgres` job produced no coverage artifact** (no duplicate reports). Total ≈ 1.1 MB per run.

**PR checks [V]:** `CodeQL`, `Analyze (java-kotlin)`, `Analyze (javascript-typescript)` and `Analyze (actions)` succeeded; the `Vercel` commit status was "Deployment has completed" and `Vercel Preview Comments` succeeded (the deployment itself was not opened).

## 7. Warnings and limitations

- **Not directly verified:** (a) the rendered `$GITHUB_STEP_SUMMARY` coverage tables — step summaries are not exposed by the API; the producing steps succeeded and read the same files used locally; (b) the **contents** of the artifacts (zip download needs the Azure blob host `productionresultssa7.blob.core.windows.net`, blocked in the sandbox; the file counts/sizes are consistent with the local HTML + XML/CSV and LCOV + HTML + JSON outputs); (c) the 596 count in the CI log (above). Open the run page to view the summaries.
- **Pre-existing warnings, unchanged:** Vite chunk-size warning (678.81 kB main chunk); Rollup "annotation" comments from `zod`; E2E `[vite] http proxy error ECONNREFUSED` lines (mocked `/api`, no backend by design); `HHH90000025` dialect warnings (6 per backend job); `Failed to save: Unable to reserve cache` when parallel jobs race for one cache key; Mockito self-attaching notice.
- **Local environment [L]:** Maven 3.9.11 instead of the wrapper; PostgreSQL **16.15** preliminary run (193/193) — not 17 parity; the authoritative PostgreSQL 17.11 result is the GitHub run above. actionlint v1.7.7 was clean on the workflow.
- `@vitest/coverage-v8` is pinned exactly to Vitest 4.1.12; Dependabot may open separate PRs for the two packages — merge them together.
- The first `git push` was rejected once with a transient remote error (`fatal error in commit_refs`); an immediate retry succeeded.
- Coverage is **reporting only**. No thresholds, gates or required checks were added; `backend-postgres` is still not a required check (D01-E).

## 8. Unchanged / open items

D01-W01 (production schema migrations; the real Neon schema is not validated), D01-W02 (live-stack CI), D01-W03 (logout query recreation race, **unresolved**) are unchanged. New: [D01-W04](../follow-ups/d01-w04-cloudinary-certificate-lifecycle.md). D01-E (Firefox/WebKit nightly and manual, CI documentation, branch-protection recommendations) is the next milestone and is **not authorized or started**.

## 9. Merge and post-merge verification (2026-11-04) [V]

- **Merge:** [PR #37](https://github.com/alexc83/uptrack/pull/37), merge-commit method, into `main` as **`db42d686e1a5a6a98a224690056e088bb9dcf3b2`** (parents `f8ef6cd` and `14f1824`; 5 commits, 19 files, +1377 / −15). All five D01-D commits (`acc8698`, `f88844c`, `70c1323`, `d00eb39`, `14f1824`) are ancestors of `main`. Branches were not deleted.
- **Post-merge CI:** run [#27 / 41822488477](https://github.com/alexc83/uptrack/actions/runs/41822488477), event `push` to `main`, head `db42d68`, **success**, about 3 min 40 s.

| Job | Result | Duration | Count source |
|---|---|---|---|
| `backend` (H2) | pass | 1 min 02 s | step green; 193/193 **confirmed on the PR head** (run 41818932511 log), not re-read post-merge |
| `backend-postgres` | pass | 1 min 20 s | **post-merge log:** `Tests run: 193, Failures: 0, Errors: 0, Skipped: 0`; service container `PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2)`; JDBC assertion lines not re-read post-merge |
| `frontend` | pass | 1 min 31 s | steps green; 596/596 in 43 files **confirmed on the PR head** (run 41819896582 log) on a tree identical to the merge commit; not re-read post-merge |
| `e2e-chromium` | pass | 3 min 37 s | **post-merge log:** `146 passed (2.9m)` |

- **Coverage artifacts:** the run produced exactly `backend-coverage` (453,195 bytes, 175 files) and `frontend-coverage` (688,239 bytes); `expires_at` = created + 14 days (2026-11-18); none from `backend-postgres`. Rendered summaries and artifact contents not inspectable from the sandbox (§7).
- **CodeQL:** the `Push on main` CodeQL run on the merge commit succeeded. **Vercel:** green on the PR head (§6); the post-merge Vercel commit status was **not checked**.
- **Unrelated:** a Dependabot run for Vite 8.3.5 (PR #9) started after the merge; not part of D01-D.
- **Still open (unchanged):** D01-W01, D01-W02, D01-W03 (unresolved) and [D01-W04](../follow-ups/d01-w04-cloudinary-certificate-lifecycle.md) (documented, not implemented). **D01-E is next; not authorized or started.**
