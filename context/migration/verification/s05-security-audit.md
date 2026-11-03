# S05 — Comprehensive application security audit

Status: **COMPLETE (audit-only; no application source, dependency, configuration or GitHub-setting change)**
Auditor: Claude Code (Sonnet 5.5) · Date: 2026-11-03
Baseline audited: **`main` = `origin/main` = `cd763aa918614718d4474854c3a33a165c971013`** (merge of S04.1 PR #14, merged 2026-11-03T16:43Z; verified with `gh pr view 14`). Audit branch: `audit/s05-comprehensive-security` (created from `origin/main`).
Repository visibility: **PUBLIC** — this report therefore deliberately omits exploit-ready payloads, real hostnames beyond what is already committed, and any secret values. Full reproduction detail is limited to what a maintainer needs to write a regression test.

---

## 1. Executive summary

UpTrack's security posture is **good for a single-tenant-per-row CRUD application**. Authentication, JWT handling and per-user data isolation — the areas that carried the P0/P1 risk in earlier milestones — are correctly implemented and well tested. **No P0 or P1 vulnerability was found.**

| Severity | Count | IDs |
|---|---|---|
| P0 Critical | **0** | — |
| P1 High | **0** | — |
| P2 Medium | **4** | S05-001 … S05-004 |
| P3 Low | **9** | S05-005 … S05-013 |

Top five risks (all P2/P3; none gives cross-user data access):

1. **S05-001 (P2, confirmed)** — no rate limiting or lockout on login/registration; open registration plus unmetered certificate upload (S05-002) lets any anonymous visitor consume Cloudinary storage and attempt online password guessing without throttling.
2. **S05-002 (P2, confirmed in code + local HTTP)** — upload validation accepts a file if *either* client-declared content type *or* extension looks allowed, there is no content sniffing, no quota, and the 1 MB default multipart limit is unhandled (returns 500). The backend can be used as an arbitrary-file host on the owner's Cloudinary account.
3. **S05-003 (P2, needs live verification)** — certificate documents (health-professional records) are served as public, unauthenticated CDN URLs whose path contains the original filename; possession of the URL is the only access control.
4. **S05-004 (P2, confirmed)** — stateless JWT with no revocation: a token keeps working after password change; lifetime is whatever `AUTH_JWT_EXPIRATION_SECONDS` is set to (no upper bound enforced); the token sits in `localStorage` (accepted, documented tradeoff).
5. **S05-007 (P3, confirmed)** — many client-caused errors (malformed JSON, bad UUID, wrong content type, over-length fields, passwords > 72 bytes, uploads > 1 MB) return HTTP 500 and log full stack traces. Not an information leak, but it is a reliability and log-noise defect and breaks a legitimate user flow (long passwords, larger certificates).

**Spring MVC criticals (GHSA-j9f9-w8pj-32f8 / CVE-2026-47890 and GHSA-pc63-qcmh-9cmg / CVE-2026-47884): both independently classified _not currently reachable_** (verified by code search, controller inventory, and a runtime inspection of the Spring context). Residual risk is *latent*: reachable only if future code introduces SSE-with-fragments or `XsltView`. No Spring Boot 4 migration is required to address them; a guardrail test is recommended instead (§8).

**Cloudinary document security:** server-side authorization of the upload/delete paths is sound (per-user folder derived from the JWT, ownership-prefix check on attach/delete, no SSRF surface). The weaknesses are content validation (S05-002), public delivery (S05-003) and orphan cleanup (S05-009). A live Cloudinary integration has **not** been verified and was not attempted (§6.3 checklist).

**Go / no-go: GO for continued product-feature work**, with the remediation sequence in §11 scheduled before any new *public* deployment of the backend (the hosted instance is currently suspended by the owner).

---

## 2. Audit scope and methodology

**In scope:** `backend/` (Spring Boot 3.5.16, Java 21 target), `frontend-react/` (active SPA), committed config/deployment files, `.github/`, prior S01–S04.1, M13 and M14 documentation. Legacy `frontend/` inspected only for residual deployment/config exposure.

**Evidence categories** (every finding is labelled with one):

| Tag | Meaning |
|---|---|
| **CI** | Code-inspection finding |
| **ET** | Existing-test evidence |
| **NR** | Newly reproduced locally during S05 |
| **LV** | Requires live verification (not reproducible without real infrastructure) |

**What was executed:**

| Check | Result |
|---|---|
| `./mvnw -o test` (full backend suite, H2) | **90 run, 0 failures, 0 errors, 0 skipped** (reproduces the S02/S04.1 baseline) |
| Temporary probe test A (`@SpringBootTest` RANDOM_PORT, real Tomcat + Spring Security stack, H2, **mocked** Cloudinary, disposable users) — ~45 HTTP requests covering error handling, headers, CORS, operational endpoints, token-after-password-change, login timing/lockout, upload validation, certificate-metadata validation | Results quoted in findings. **File deleted after the run; working tree clean (only the pre-existing untracked `conversation-*.txt`).** |
| Temporary probe test B (Spring context introspection: view resolvers, handler mappings, XSLT beans) | Quoted in §8. Deleted after the run. |
| `frontend-react`: `vitest` on `safe-url` + `core/auth` | **144/144 passed** (5 files) |
| `npm audit --omit=dev` (frontend-react) | **0 vulnerabilities** |
| `npm audit` (full, frontend-react) | 13 moderate, all dev-only (eslint/minimatch chain) — unchanged from S04 |
| `gh api …/dependabot/alerts?state=open` | **2 open**, both `minimatch` medium, development scope (frontend-react #185, retired frontend #179) |
| Repository secret scan (tracked files + `git log --diff-filter=A` for `.env`/key files) | **No secrets, tokens, private keys or credential URLs found**; only `frontend-react/.env.example` (placeholders) is tracked among env files |
| Advisory lookup (`gh api advisories/<GHSA>`, Maven Central metadata) | §8 |

**Not run (by design / unavailable):** live PostgreSQL stack (disposable H2 only; PostgreSQL 18 client tools exist locally but M13 already covered the live PostgreSQL path), any real Cloudinary call, any hosted-service contact, browser suites (frontend findings are from code inspection and existing unit tests), load/DoS tests, invasive scanners.

---

## 3. Application threat model

**Assets:** account credentials (bcrypt hashes), JWTs, credential/licence records and CE records (professional PII), uploaded certificate documents (Cloudinary), JWT signing secret, Cloudinary API secret, database.
**Trust boundaries:** Browser ⇄ API (JSON/Bearer), API ⇄ PostgreSQL, API ⇄ Cloudinary (server-side SDK), Browser ⇄ Cloudinary CDN (document download via plain link), CI/dev machines ⇄ npm/Maven registries.
**External services:** Cloudinary (storage), PostgreSQL host, npm/Maven registries, GitHub (Dependabot, secret scanning).
**Sensitive user-controlled inputs:** auth JSON, credential/CE JSON (incl. `certificateUrl`, `certificatePublicId`), multipart file + its declared filename/content-type, path UUIDs, list filters (`status`, `type`, `search`), `returnTo` query parameter (frontend only).

| Threat actor | Target asset / boundary | Existing mitigations | Residual risk |
|---|---|---|---|
| **Anonymous attacker** | Login/registration endpoints; public `/api/health`; guessing endpoints | BCrypt; generic login error; uniform 401 for any bad token; unknown routes → generic 404; actuator/swagger/h2-console absent (401); only `/api/auth/**`, `/api/health/**` public | No throttling (S05-001); user enumeration by registration message and login timing (S05-006); open registration abuse (S05-001/002) |
| **Authenticated malicious user** | Other users' credentials/CE records/files; privilege escalation | Every service call scopes by JWT `uid`; foreign IDs → 404 indistinguishable from nonexistent; owner fields ignored (no mass assignment); ownership prefix on `certificatePublicId`; removed all `/users/{id}` endpoints (S01); 47 cross-user ET cases | Storage/cost abuse via uploads (S05-002); self-targeted bad data (S05-008); content hosting on owner's CDN (S05-002) |
| **Compromised user token** | That user's data only | HS256/HS384/HS512 only via `verifyWith(SecretKey)` (no `alg:none`, no RS/HS confusion); signature+`exp` enforced; ET matrix of 12 token kinds | No revocation / no logout invalidation / token survives password change (S05-004); `localStorage` exposure to XSS (accepted) |
| **Malicious / malformed certificate upload** | Cloudinary account, downstream viewers of the URL | Auth required; per-user folder; allow-list of extensions/MIME; Cloudinary also validates `image` resource type; provider errors replaced by generic 502 | OR-logic validation, no sniffing/quota/size handling (S05-002) |
| **Exposed Cloudinary document URL** | Certificate confidentiality | URL not guessable in practice (random suffix) and only returned to owner | Public bearer URL; filename in URL; no expiry/revocation (S05-003) |
| **Compromised dependency / build environment** | Backend jar, frontend bundle, dev machines | Prod `npm audit` 0; backend 2 unreachable advisories; Dependabot + secret scanning + push protection enabled; lockfiles committed | No CI at all, no required checks, no branch protection, no Maven vulnerability scanning in Dependabot alerts view (S05-012) |

---

## 4. Authentication and authorization assessment

### 4.1 Authentication (CI + ET + NR)

| Area | Assessment |
|---|---|
| Password hashing | `BCryptPasswordEncoder` default strength (10). Good. Register/change allow up to 255 chars, but a 75- and a 100-character password both returned **HTTP 500** (NR, S05-007) — consistent with BCrypt's 72-byte input limit (exact exception not isolated). It is not a silent-truncation weakness; it is a robustness defect. |
| Password policy | Min 8 / max 255 only; no complexity or breached-password check. Reasonable (NIST-aligned) but see S05-001 for the missing throttling that makes weak passwords riskier. |
| JWT generation | HS256-class via `Jwts.builder().signWith(SecretKey)` (algorithm chosen from key length by JJWT). Claims: `sub`=email, `uid`, `name`, `iat`, `exp`. |
| JWT verification | `Jwts.parser().verifyWith(key).parseSignedClaims()` — rejects unsigned, wrong-algorithm and tampered tokens; `exp`/`nbf` enforced; missing/non-UUID `uid` rejected. Weak-key/config exceptions are deliberately **not** swallowed (surface as 500, not as "invalid token"). **No algorithm-confusion risk** (symmetric key only, asymmetric algs impossible with a `SecretKey` verifier). |
| JJWT 0.13.0 | Same API surface as 0.12.x; full test matrix passes on 0.13.0 (ET). |
| Invalid tokens | Filter clears context and continues; entry point returns one generic 401 body; public endpoints keep working with a stale token (ET). |
| Secret strength | Only JJWT's ≥ 256-bit minimum is enforced at first use (application starts, then fails on first token if too short). See S05-004/S05-005. |
| Logout | Client-side only (token removed from `localStorage`, caches cleared). Server cannot revoke (S05-004). |
| Enumeration | Login returns identical message for unknown email vs wrong password, **but** unknown email skips BCrypt: measured **~1 ms vs ~55 ms** average (NR). Registration returns a distinct 400 "Email is already in use." (S05-006). |
| Brute force | 25 consecutive failed logins against one account; the 26th (correct) login still succeeded immediately — no lockout/throttle (NR, S05-001). |
| CSRF | Disabled; acceptable because auth is a Bearer header and sessions are `STATELESS`; the SPA uses `credentials: 'same-origin'` and no cookies are issued. |

### 4.2 Authorization (CI + ET)

All data access goes through services that resolve the caller from the validated JWT `uid` (never from request input) and filter by owner:

* List endpoints call `findAllByUserId[...]`.
* By-ID endpoints load the entity then compare `entity.user.id` to the caller; mismatch → `ResourceNotFoundException` (404), identical to "not found".
* Create/update of a CE record verifies **both** the CE record and the target credential belong to the caller (prevents moving a record onto, or onto from, another user's credential).
* DTOs carry no owner/ID fields → no mass assignment (ET proves client-supplied `userId`/`user` fields are ignored).
* Self-service profile/password endpoints act only on `/users/me`; password change requires the current password.
* Method-override/alternate routes: `PATCH`/unknown methods → 405 generic; `TRACE` → 400 (NR); unknown paths → 404 generic; no Spring Data REST / actuator.
* M13 live acceptance and S01 repairs are intact on current `main` (the `CrossUserAuthorizationIntegrationTest` 47-case suite passes).

**No BOLA/IDOR, cross-account read/write/delete, privilege escalation, or auth-bypass was found.**

---

## 5. Endpoint authorization matrix

Global rule (`SecurityConfig`): `/api/auth/**`, `/api/health/**` and `OPTIONS` are public; **everything else `authenticated()`**. There are no roles (single-role app), so authorization = ownership.

| Method & path | Auth | Ownership enforcement | Validation | Notes |
|---|---|---|---|---|
| `POST /api/auth/register` | none | n/a | `@Valid` name≤120, email≤180, pw 8–255 | enumeration message (S05-006); no throttle |
| `POST /api/auth/login` | none | n/a | `@Valid` | timing oracle (S05-006); no throttle |
| `GET /api/auth/me` | JWT | self | – | 401 if user row gone |
| `GET /api/health` | none | – | – | `{"status":"ok"}` only |
| `GET /api/users/me`, `PUT /api/users/me` | JWT | self (uid) | `@Valid`; email uniqueness → 409 | email change doesn't affect token (`uid`-based) |
| `PUT /api/users/me/password` | JWT | self + current password | new pw 8–255 | no token revocation; >72 bytes → 500 |
| `GET /api/credentials` (`status,type,search`) | JWT | `findAllByUserId` | enum binding; `search` in-memory filter | no SQL concatenation; filters applied in Java |
| `POST /api/credentials` | JWT | owner = caller | `@NotBlank/@NotNull/@Min/@DecimalMin`; **no `@Size`, no upper bounds** | oversize → 500 (S05-007) |
| `GET/PUT/DELETE /api/credentials/{id}` | JWT | owner check → 404 | as above | delete cascades CE rows, **not** Cloudinary assets (S05-009) |
| `GET /api/credentials/{id}/ce-records`, `/ce-report` | JWT | owner check → 404 | – | |
| `GET/POST /api/ce-records` | JWT | list scoped; create verifies credential ownership | `@Valid`; certificate fields `@Size` only | `certificateUrl` unvalidated (S05-008) |
| `GET/PUT/DELETE /api/ce-records/{id}` | JWT | record + target credential ownership | as above | delete/replace calls Cloudinary first (M13 F-03) |
| `GET /api/dashboard` | JWT | scoped to caller | – | |
| `POST /api/uploads/certificates` | JWT | folder from JWT `uid` | extension **OR** MIME (S05-002); no size/quota | provider errors → generic 502 |
| any other path | JWT required | – | – | unauthenticated → 401; authenticated unknown → generic 404 |

Operational endpoints probed unauthenticated (NR): `/actuator*`, `/h2-console`, `/v3/api-docs`, `/swagger-ui.html`, `/error` → all **401**; none exist.

---

## 6. Cloudinary and certificate-upload assessment

### 6.1 What is sound (CI/ET)
* Upload requires a valid JWT; the destination folder `uptrack/users/<uid>/certificates` is built from the *token's* `uid`, never from request data.
* Attaching or deleting an asset requires `certificatePublicId` to start with the caller's own folder prefix, and the credential/record ownership check precedes it; a foreign publicId is rejected (ET + CI). Because the prefix embeds an unguessable UUID, cross-user attach/delete is not feasible.
* Cloudinary credentials are read from environment (`CLOUDINARY_*`), never committed; `secure=true` forces HTTPS delivery URLs.
* Provider exceptions are logged server-side and returned as a generic message (`Certificate upload failed.`/502) — no provider detail leaks. (Note: the logs record the user id and the exception; no secrets.)
* There is **no SSRF surface**: the server never fetches a user-supplied URL; it uploads bytes it received. `certificateUrl` is stored and returned, never dereferenced server-side.
* Filename is passed as Cloudinary `filename_override`, not used for any local filesystem path → no local path traversal.

### 6.2 Weaknesses
* **S05-002** — validation uses `!allowedContentType && !allowedExtension` (i.e. accepts if *either* is allowed). NR (mocked Cloudinary, real HTTP): `.html` declared `image/png`, `.svg` declared `application/pdf`, `.exe` declared `image/jpeg`, and `real.pdf` declared `text/html` were all **accepted (201)**; only files where *both* fail (`noext`/octet-stream, `.txt`/text-plain) were rejected. No magic-byte check. Anything not PDF-labelled is sent as Cloudinary `image` (Cloudinary will itself reject non-images, which limits this path in practice — LV), but PDF-labelled content is sent as `raw` and stored as-is. A 2 MB upload returns 500 (Spring's 1 MB default multipart limit, exception unhandled). No per-user count/size quota.
* **S05-003** — assets are `upload`-type (public) resources; the URL contains the original filename (`use_filename=true`) plus a random suffix. Anyone with the link can fetch the document; there is no expiry or revocation, and links appear in reports/print views. LV: real delivery mode depends on the Cloudinary account's settings.
* **S05-008** — `certificateUrl` is not validated (any scheme/host accepted) and is not bound to `certificatePublicId`; publicId prefix check does not canonicalise (a `..` segment passes the prefix test). Self-only impact; frontend neutralises non-http(s) links (§7).
* **S05-009** — orphaned assets: deleting a *credential* cascades to its CE rows but never calls Cloudinary; assets uploaded but never attached are never cleaned; there is no account-deletion flow.

### 6.3 Separate integration-verification checklist (future controlled live test — requires owner authorization and a non-production Cloudinary account)

1. Use a dedicated test cloud/sub-account with its own API key; confirm no real certificates are used (synthetic PDF/PNG only).
2. Upload a small PDF and a PNG as user A → expect 201 with `url`, `publicId` under `uptrack/users/<A>/certificates/`, correct `resource_type` (`raw`/`image`).
3. Open the returned URL in a logged-out browser: record whether it is publicly readable (S05-003), and what `Content-Type`/`Content-Disposition` Cloudinary serves for the `raw` PDF.
4. Attempt an `.html` file labelled `image/png` and a `.svg` labelled `application/pdf`: record Cloudinary's actual accept/reject behaviour and delivery content type (S05-002).
5. Upload > 1 MB and ≈ 9–10 MB (the Cloudinary plan limit): record application result (currently 500) and provider limits.
6. Attach asset to a CE record; replace it; delete the record → confirm the asset is gone from Cloudinary (`destroy` with `invalidate`), including for `raw` assets.
7. As user B, attempt to attach/delete user A's `publicId` → expect 400/404 (ownership prefix).
8. Delete a credential that has attached certificates → confirm whether assets remain (S05-009).
9. Simulate provider failure (bad key in the test env): confirm 502 generic message, no key/provider text in response or logs, and that record deletion is blocked/unblocked as intended (M13 F-03).
10. Confirm Cloudinary account settings: restricted allowed formats, upload presets/size limits, "strict transformations", and that the API secret never appears in app logs.

---

## 7. Frontend security assessment (`frontend-react/`)

| Topic | Finding |
|---|---|
| JWT storage | `localStorage['uptrack_token']` — readable by any XSS. Documented, accepted tradeoff (M02 D7); no XSS sink was found (below). Token shape-validated on read and malformed values purged. |
| Auth state / logout | Single synchronous `#commit` clears token, cancels/removes queries and mutation cache; cross-tab `storage` events logout; a protected-request 401 under the current token ends the session with an "expired" notice. |
| Route guards | Client-side only (as expected); server independently enforces auth/ownership (§4). |
| XSS | No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `document.write`, or `window.open`/`location` assignments in `src/`. All user text rendered through React escaping. |
| Certificate URLs | Rendered only through `safeHttpUrl()` (absolute `http:`/`https:` only) with `target="_blank" rel="noreferrer"`; non-matching values render "link unavailable". Unit tests (`safe-url.test.ts`) pass. Backend stores arbitrary strings (S05-008) but the SPA neutralises them. |
| Open redirects | `returnTo` is parsed by `parseReturnTo` — must be an internal, known protected route; rejects absolute, protocol-relative, backslash, control characters and unknown routes (unit-tested). |
| Browser storage | Only token, theme and sidebar-collapsed flag. No PII persisted. |
| Env exposure | Only `VITE_API_BASE_URL` (default `/api`) and dev-server `VITE_PROXY_TARGET` (not bundled). No secrets in the bundle. |
| API transport | `fetch(..., { redirect: 'error', credentials: 'same-origin' })`; Authorization header stripped for public requests. |
| Console logging | No `console.*` calls outside tests. |
| Caching | Backend sends `Cache-Control: no-cache, no-store, max-age=0, must-revalidate`, `Pragma`, `Expires` on API responses (NR) — authenticated data is not browser-cacheable. |
| Third-party/external resources | No CDN scripts or fonts in `index.html`. Dependency risk: prod `npm audit` = 0. |
| CSP compatibility | No CSP is set anywhere. `index.html` contains one small inline theme-bootstrap script, so a strict `script-src` would need a hash/nonce. Vite production output otherwise uses same-origin module scripts (S05-010). |
| Print/PDF report | Print view reuses the report data already shown; certificate "label" derived from URL, not rendered as HTML; no extra data source. |
| Dev-only code | `/preview` shared-UI route is gated by `import.meta.env.DEV`. |

No actual frontend vulnerability was found.

---

## 8. Dependency and Spring MVC advisory analysis

**Baseline (verified, not copied):** Spring Boot 3.5.16 → `spring-webmvc`/Spring Framework **6.2.19** (confirmed in the built jar and in `spring-boot-dependencies-3.5.16`); Tomcat 10.1.61; Jackson 2.21.8; PostgreSQL JDBC 42.7.14; JJWT 0.13.0; Cloudinary-http5 2.5.0; Spring Security 6.5.11. Frontend production audit: 0. Open Dependabot alerts: 2 (minimatch, dev-only). Per Maven Central metadata, **6.2.19 is the last published 6.2.x release**; fixes exist only in 7.0.9+ (7.0.10 current).

### 8.1 GHSA-j9f9-w8pj-32f8 / CVE-2026-47890 — SSE stream corruption with view fragments

| Item | Detail |
|---|---|
| Published | 2026-08-27, CVSS 9.8 (`AV:N/AC:L/PR:N/UI:N`) |
| Affected | `spring-webmvc` / `spring-webflux` 6.2.0–6.2.19 (and 7.0.0–7.0.8); fixed 7.0.9 only |
| Documented prerequisite | Application streams **Server-Sent Events that render view fragments** |
| UpTrack trace | `grep` for `SseEmitter`, `text/event-stream`, `ServerSentEvent`, `ModelAndView`, `FragmentsRendering`, template engines (Thymeleaf/FreeMarker/Mustache/JSP): **zero matches** in `backend/src`; no template starter in `pom.xml`; all 7 controllers are `@RestController` returning DTOs; no `WebMvcConfigurer`/view controllers/`@EnableWebMvc` |
| Reachability | **Not currently reachable.** No request path can reach SSE-fragment rendering. |
| Classification | **Not currently reachable** (latent: only if SSE + fragments are added) |

### 8.2 GHSA-pc63-qcmh-9cmg / CVE-2026-47884 — `XsltView` SSRF/RCE

| Item | Detail |
|---|---|
| Published | 2026-08-27, CVSS 9.8 |
| Affected | `spring-webmvc` ≤ 5.2.25, 5.3.0–5.3.49, 6.0.0–6.0.30, 6.1.0–6.1.28, 6.2.0–6.2.19, 7.0.0–7.0.8; fixed 7.0.9 only |
| Documented prerequisites | `XsltView` in use **and** an `/**` mapping that results in view rendering **and** the view name not explicitly specified |
| Runtime evidence (NR, context introspection) | View resolvers present are only Boot defaults: `BeanNameViewResolver`, `InternalResourceViewResolver`, `ContentNegotiatingViewResolver`, `ViewResolverComposite`. **0 `XsltView` beans, 0 `XsltViewResolver` beans.** The only `/**` mapping is `SimpleUrlHandlerMapping → ResourceHttpRequestHandler` (static resources; this is the source of the generic 404 for unknown paths) — it does not render views. `ViewController`s: none. |
| Reachability | **Not currently reachable.** The class ships inside `spring-webmvc.jar` (so SCA scanners flag it), but nothing instantiates it and no controller returns a view name. |
| Classification | **Not currently reachable** (latent: only if someone registers an `XsltViewResolver`/`XsltView`) |

### 8.3 Assessment and recommendation
* The prior claim of non-reachability is **independently confirmed**; severity is *not* inflated by the 9.8 CVSS.
* **Do not** perform an emergency Spring Boot 4 migration. Recommended proportionate actions:
  1. Add a lightweight guardrail test (e.g. ArchUnit or a source-grep test) failing the build if `SseEmitter`, `XsltView*`, `ModelAndView`, `@Controller` (non-REST), or a template starter appears — so the "not reachable" status cannot silently regress.
  2. Track Spring Boot 3.5.x / Framework 6.2.x for a patch release; the owner should verify the current OSS support window of Boot 3.5 (not verifiable from the repository) because the absence of a 6.2.20 may signal end-of-OSS-support.
  3. Schedule a Spring Boot 4 evaluation as normal lifecycle work after cutover, not as a security emergency.
* Dev-tool vs production: both Spring advisories are **production-classpath** but unreachable. The remaining npm findings (minimatch/eslint chain, 13 moderate) are **development-only** and not shipped.

---

## 9. Secrets and deployment configuration review

| Item | Result |
|---|---|
| Hardcoded secrets | **None found** in tracked files or in `git log` additions (patterns for cloud keys, private keys, `cloudinary://`, JWTs, DB URLs with credentials, GitHub tokens). `application.yml` reads everything from env vars; tests use H2 + dummy values. |
| `.env` files | None tracked; `backend/.env.local`-style files are git-ignored; `scripts/dev-demo/env.example` and `frontend-react/.env.example` hold placeholders only. |
| JWT secret | From `AUTH_JWT_SECRET`; no startup validation (S05-005). |
| Cloudinary creds | From env (`CLOUDINARY_*`); not logged. |
| DB creds | From env. |
| Debug/dev settings | `spring-boot-devtools` is `runtime`+`optional` and **absent from the packaged jar** (verified). `org.hibernate.SQL: info` only. |
| `spring.jpa.hibernate.ddl-auto: update` in the **only** `application.yml` (no prod profile) | Production schema is auto-mutated on every start (S05-011). |
| CORS | Default allowed origins are localhost only; `ALLOWED_ORIGIN_PATTERNS` env widens it. Evil origin → 403, allowed origin → echoed, `allowCredentials=true`, `allowedHeaders=*` (NR). Credentials flag is unnecessary for a Bearer-token API (S05-011). |
| TLS / HSTS | App is HTTP-only behind whatever terminates TLS; no HSTS header emitted (expected at the app tier; must be set by the proxy/host) (S05-010). |
| Security headers (NR) | Present: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cache-Control: no-store…`. Absent: `Strict-Transport-Security`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy` (S05-010). |
| Operational endpoints | None exposed (see §5). |
| Docker | `backend/Dockerfile` multi-stage; runs as **root**, tags not pinned by digest, builds with `-DskipTests` (S05-011). |
| GitHub | Secret scanning + push protection + Dependabot security updates **enabled** (read-only check). **`main` is not branch-protected** (404) and there are **no GitHub Actions workflows** (so no workflow-permission risk, but also no CI gate) (S05-012). Dependabot version updates cover `/frontend-react` and `/backend`. |
| Hosted deployment | Retired Angular `frontend/src/environments/environment.production.ts` commits a public hostname of the (currently suspended) hosted backend. Not a vulnerability; informational (S05-013). **No hosted service was contacted.** |
| Logging | No passwords/tokens/secrets logged by application code. Client-triggered errors log full stack traces at ERROR (S05-007). Upload failure logs the user UUID. |
| Backups / DB access | Not defined in the repository; outside the audit's evidence (LV, §13). |

---

## 10. Prioritized findings

Standards mapping uses OWASP ASVS 4.0 and OWASP Top 10 2021.

### P2 — Medium

#### S05-001 — No rate limiting / brute-force protection on authentication and registration
* **Severity:** P2 · **Confidence:** High · **Evidence:** NR (+CI) · **ASVS** 2.2.1, 11.1.4 · **OWASP** A07
* **Files:** `backend/.../config/SecurityConfig.java:38-42` (no throttling filter), `service/impl/AuthServiceImpl.java:30-55` (register/login).
* **Description:** No per-IP or per-account throttling, lockout, delay or CAPTCHA exists on `/api/auth/login` or `/register`.
* **Prerequisites:** Network access to a deployed backend; none otherwise.
* **Evidence:** 25 consecutive failed logins for a single account were all processed; the following correct login succeeded immediately (local probe).
* **Impact:** Online password guessing is limited only by BCrypt cost (~55 ms/attempt/thread); unlimited account creation feeds S05-002 abuse.
* **Remediation:** Add a servlet-filter or gateway rate limit (e.g. Bucket4j) keyed by IP+email for login (e.g. 5/min, exponential backoff) and by IP for registration; consider proxy/CDN rate limiting if the host provides it.
* **Regression test:** MockMvc test performing N+1 failed logins and asserting HTTP 429 (with `Retry-After`) on the limit, plus a test that a different IP/account is unaffected.

#### S05-002 — Certificate upload content validation is weak and unmetered
* **Severity:** P2 · **Confidence:** High (behaviour) / Medium (Cloudinary-side impact, LV) · **Evidence:** CI + NR (mocked Cloudinary), M13 F-02 · **ASVS** 12.1.1, 12.2.1, 12.3.x · **OWASP** A04
* **Files:** `service/impl/CertificateUploadServiceImpl.java:81-96` (OR logic), `:110-117` (resource type from client MIME/extension), `:71-80` (no limits), `exception/GlobalExceptionHandler.java` (no multipart-size handler), `controller/UploadController.java`.
* **Description:** A file is accepted when *either* its client-declared content type *or* its extension is on the allow-list; there is no content (magic-byte) verification, no explicit size limit, and no per-user quota or request rate limit. Files labelled PDF are stored as Cloudinary `raw`.
* **Prerequisites:** Any registered account (registration is open and unthrottled — S05-001).
* **Evidence:** Probe: mismatched `.html`/`.svg`/`.exe` files with allowed MIME labels returned 201; `real.pdf` declared `text/html` returned 201; 2 MB PDF returned 500.
* **Impact:** The owner's Cloudinary account/brand domain can be used to host arbitrary content and storage can be consumed without limit (cost / abuse reporting). Delivery occurs from Cloudinary's origin, **not** the app origin, so no direct XSS against UpTrack users.
* **Remediation:** Require content type **and** extension to be allowed and consistent; verify magic bytes (`%PDF-`, PNG/JPEG/WEBP/GIF signatures); set `spring.servlet.multipart.max-file-size`/`max-request-size` deliberately (e.g. 5–10 MB) and map `MaxUploadSizeExceededException` to 413; add per-user upload quota/rate limit; sanitise `filename_override`; configure Cloudinary allowed formats and size caps on the account/preset.
* **Regression test:** Upload tests asserting 400 for (html + image/png), (pdf name + html body), and 413 for oversize; quota test for N+1 uploads.

#### S05-003 — Certificate documents are publicly retrievable by URL (no access control, filename in URL)
* **Severity:** P2 · **Confidence:** Medium (design is certain; real Cloudinary delivery mode needs LV) · **Evidence:** CI + LV · **ASVS** 4.2.1, 8.3.4 · **OWASP** A01/A04
* **Files:** `CertificateUploadServiceImpl.java:71-80` (no `type`/`access_mode` option; `use_filename=true`), `:118-128` (returns `secure_url`); `frontend-react/src/features/ce-report/*` and drawer link rendering.
* **Description:** The backend returns the permanent CDN URL; anyone holding it can download the document without authentication, expiry or revocation (other than deleting the asset). The URL embeds the uploader's original filename (often a person's name/course).
* **Prerequisites:** Possession of a URL (shared by the user, leaked via browser history, referrer logs of third-party link targets, screenshots, printed reports).
* **Impact:** Disclosure of professional certificate content if a URL leaks; no cross-user enumeration vector was found (random suffix, folder keyed by UUID).
* **Remediation (proportionate):** Accept as a documented tradeoff for now, or move to Cloudinary `type: authenticated` + short-lived signed URLs issued by an owner-checked endpoint; at minimum set `use_filename=false` so URLs contain no personal text, and keep `rel="noreferrer"` (already done).
* **Regression test:** Live-integration checklist step 3 (§6.3); unit test that upload options contain no `use_filename` and (if adopted) that downloads go through an authorised endpoint returning 404 for non-owners.

#### S05-004 — Stateless JWT cannot be revoked; sessions survive password change; lifetime unbounded by code
* **Severity:** P2 · **Confidence:** High · **Evidence:** NR + CI · **ASVS** 3.3.1, 3.3.2, 3.5.x · **OWASP** A07
* **Files:** `security/JwtService.java:25-37` (expiry from config only), `security/JwtAuthenticationFilter.java` (no user/credential-version lookup), `service/impl/UserServiceImpl.java:36-48` (password change), `config/AuthProperties.java`.
* **Description:** Tokens are valid until `exp`; logout is client-side; changing the password does not invalidate earlier tokens; there is no maximum on `AUTH_JWT_EXPIRATION_SECONDS`. Token also lives in `localStorage` (accepted tradeoff).
* **Prerequisites:** Attacker already possesses a token (XSS, device theft, leaked log).
* **Evidence:** After `PUT /api/users/me/password`, the previous token still returned 200 on `/api/auth/me` (local probe).
* **Impact:** A stolen token remains usable until expiry even after the victim resets their password.
* **Remediation:** Enforce a short access-token lifetime (e.g. ≤ 1 h; validate at startup); add a `tokenVersion`/`passwordChangedAt` claim checked against the user row (one cheap lookup you already do in services), bumped on password change; optionally add refresh-token rotation if longer sessions are needed.
* **Regression test:** Change password, then assert old token → 401 and the new token → 200; startup test rejecting an expiration above the maximum.

### P3 — Low

#### S05-005 — JWT secret strength is not validated at startup
* **Confidence:** High · **Evidence:** CI · **Files:** `JwtService.java:62-64`, `AuthProperties.java`
* Only JJWT's 256-bit minimum applies, and only when the first token is created/parsed (the app starts normally with a weak/blank secret, then returns 500s). **Remediation:** `@Validated` `AuthProperties` (`@Size(min=32)` bytes, non-blank; fail fast at boot). **Test:** context-load test with a short secret expecting startup failure.

#### S05-006 — Account enumeration (registration message and login timing)
* **Confidence:** High · **Evidence:** NR · **ASVS** 2.2.x, 3.2.x · **OWASP** A07 · **Files:** `AuthServiceImpl.java:34-37, 50-54`
* Duplicate registration returns a distinct `400 Email is already in use.`; login for an unknown email skips BCrypt (~1 ms vs ~55 ms measured). **Impact:** email-existence oracle (combined with S05-001 it is scalable). **Remediation:** always run a dummy `passwordEncoder.matches` for unknown users; accept the registration oracle as a UX tradeoff or move to email-verified registration. **Test:** timing-ratio assertion with a tolerance, plus a rate-limit test.

#### S05-007 — Client-caused errors return HTTP 500 and log stack traces; limits missing on several inputs
* **Confidence:** High · **Evidence:** NR (+M13 F-01) · **ASVS** 7.4.x, 5.1.x · **OWASP** A05
* **Files:** `exception/GlobalExceptionHandler.java` (catch-all `Exception` handler pre-empts Spring's default 4xx mapping), `dto/request/CredentialRequestDto.java` (no `@Size`/upper bounds), `dto/request/*Password*` (255 allowed vs. BCrypt's 72-byte limit; root cause inferred).
* **Observed 500s (local HTTP):** malformed JSON body; non-UUID path variable; wrong `Content-Type` (should be 415); unparseable enum/date (M13 F-01); credential `name` of 300 chars (column length 180); `requiredCEHours` of 99999 (column `precision 5,scale 2`); registration or password change with a password > 72 bytes; multipart upload > 1 MB. (`renewalCycleMonths` of 2147483647 is accepted.)
* **Impact:** Not an information leak (body is generic). Impacts: correct client mistakes appear as server faults, log flooding by any authenticated/anonymous caller (ERROR + stack trace per request), and legitimate users with long passphrases cannot register or change passwords.
* **Remediation:** Add handlers for `HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException`, `HttpMediaTypeNotSupportedException`, `MaxUploadSizeExceededException`, `DataIntegrityViolationException` → 400/415/413/409; add `@Size`/`@Max` to credential DTOs to match columns; cap password at 72 bytes (or pre-hash) and say so in the validation message; log client errors at WARN/DEBUG without stack trace.
* **Regression test:** One parameterised MockMvc test per case above asserting the expected 4xx and a generic body.

#### S05-008 — Server does not validate `certificateUrl` or canonicalise `certificatePublicId`
* **Confidence:** High · **Evidence:** NR · **ASVS** 5.1.x, 12.x · **OWASP** A03/A04 (low) · **Files:** `CERecordServiceImpl.java:126-142`, `dto/request/CERecordRequestDto.java`
* A record with `certificateUrl` of any scheme and no publicId is accepted; a publicId containing `..` segments after the caller's prefix is accepted; URL and publicId are never cross-checked. Impact is limited to the caller's own data and the frontend neutralises non-http(s) links; defense-in-depth gap (e.g. future sharing/export features). **Remediation:** require `https` + Cloudinary host for `certificateUrl`, strict regex for `publicId` (`^uptrack/users/<uid>/certificates/[A-Za-z0-9._-]+$`, no `..`), and consistency between them. **Test:** table-driven 400 cases.

#### S05-009 — Orphaned Cloudinary assets and cleanup coupling
* **Confidence:** High · **Evidence:** CI + M13 F-03 · **Files:** `CredentialServiceImpl.java:~deleteCredential`, `Credential.java` (cascade ALL), `CERecordServiceImpl.java:65-70, 143-164`
* Deleting a credential removes its CE rows (JPA cascade) without deleting their Cloudinary assets; uploads that are never attached are never cleaned; a Cloudinary outage blocks record deletion (502). **Impact:** storage growth and retention of documents the user believes deleted (privacy). **Remediation:** delete assets for all cascaded records (best-effort after commit), add a periodic orphan sweep keyed by folder vs referenced publicIds, and make the DB delete not depend on the provider call. **Test:** unit test verifying `destroy` is invoked per cascaded record; failure-injection test.

#### S05-010 — Missing browser hardening headers (CSP, HSTS, Referrer-Policy, Permissions-Policy)
* **Confidence:** High · **Evidence:** NR · **ASVS** 14.4.x, 14.5.x · **OWASP** A05 · **Files:** `SecurityConfig.java`; frontend host unknown.
* Backend already emits `nosniff`, `X-Frame-Options: DENY`, no-store caching. The SPA host's headers are not defined in the repo. **Remediation:** at the SPA host/CDN set a CSP (`default-src 'self'; script-src 'self' 'sha256-…' (theme bootstrap); img-src 'self' data: https://res.cloudinary.com; connect-src 'self' <api>; frame-ancestors 'none'`), `Referrer-Policy: no-referrer`, HSTS (TLS terminator). Optionally move the theme bootstrap to an external file so `script-src 'self'` suffices. **Test:** header assertions in a smoke test against the production build host.

#### S05-011 — Insecure production defaults in configuration and container
* **Confidence:** High · **Evidence:** CI · **ASVS** 14.1.x · **OWASP** A05
* **Files:** `application.yml` (`ddl-auto: update`, `CorsConfiguration.allowCredentials(true)`/`allowedHeaders("*")` in `SecurityConfig.java:53-64`), `backend/Dockerfile`.
* Schema auto-mutates on startup in any environment (risk of unreviewed schema drift/data-loss on entity change); credentials-bearing CORS is unnecessary for Bearer auth; container runs as root with floating image tags and tests skipped during the build. **Remediation:** `ddl-auto: validate` (or `none`) in a `prod` profile with migrations (Flyway/Liquibase) when schema changes are approved; `allowCredentials(false)`; add `USER` non-root, pin base-image digests, run tests in CI. **Test:** profile-load test asserting `validate` under `prod`; CORS test asserting no `Access-Control-Allow-Credentials`.

#### S05-012 — No CI gate, no branch protection, limited supply-chain visibility
* **Confidence:** High · **Evidence:** CI + read-only `gh api` · **OWASP** A06/A08 · **Files:** `.github/` (only `dependabot.yml`)
* No GitHub Actions workflows; `main` unprotected (no required PR review or status checks); Dependabot's alert view does not surface Maven transitive libraries (noted in S04). **Remediation (owner decision; no setting was changed by S05):** add a workflow with explicit least-privilege `permissions: contents: read` running `./mvnw verify`, `npm run typecheck/lint/test/build`, `npm audit --omit=dev`, and an OSV/Maven dependency check; enable branch protection requiring those checks; pin actions by SHA. **Test:** the workflow itself; a PR deliberately failing a check.

#### S05-013 — Informational: legacy hosted-backend hostname committed; public-repo hygiene
* **Confidence:** High · **Evidence:** CI · **Files:** `frontend/src/environments/environment.production.ts:3`
* The retired Angular app records the hosted backend's hostname in a public repository. Not a vulnerability, but it identifies the deployment target. **Remediation:** when the hosted instance is retired/replaced, remove or neutralise the file; keep the retired frontend undeployed.

### Non-security technical debt (kept separate)
* M13 F-04 (duplicate registration returns 400 instead of 409), F-05 (permanent-404 deep link shows "Retry"), F-06 (leftover "Loading migration preview"/preview copy).
* In-memory `search` filtering and per-credential CE-record queries (N+1) in `CredentialServiceImpl.toResponse` — performance, not security.
* `renewalCycleMonths` has no upper bound (cosmetic/data-quality).
* 13 moderate dev-only npm findings (eslint/minimatch chain), deferred vite 8 / lucide 1.x upgrades (S04.1).

---

## 11. Recommended remediation sequence

1. **Before any new public backend deployment:** S05-001 (rate limiting), S05-002 (upload validation + limits), S05-007 (4xx mapping + input bounds), S05-005 (secret validation), S05-004 (token lifetime cap + password-change invalidation).
2. **With the first deployment:** S05-010 (headers/CSP at host), S05-011 (`ddl-auto`, CORS credentials, container user), S05-012 (CI + branch protection).
3. **Privacy hardening:** S05-003 (decide public-vs-signed delivery; drop `use_filename`), S05-009 (asset cleanup), S05-008 (strict URL/publicId validation), S05-006 (timing equalisation).
4. **Guardrails:** Spring-feature guard test (§8.3); controlled live Cloudinary verification (§6.3).
5. **Lifecycle:** Spring Boot 4 evaluation, eslint 10/typescript-eslint 9 (clears dev-only minimatch), informational S05-013.

### Remediation checklist (grouped by priority)

**P2**
- [ ] S05-001 Login/registration rate limiting + regression test (429)
- [ ] S05-002 Require MIME **and** extension, magic-byte check, size limits (413), per-user quota, Cloudinary format/size caps
- [ ] S05-003 Decide delivery model (public vs signed); stop embedding original filenames in URLs
- [ ] S05-004 Max token lifetime; invalidate sessions on password change (`tokenVersion`/`passwordChangedAt`)

**P3**
- [ ] S05-005 Fail-fast JWT secret validation
- [ ] S05-006 Constant-time login path; decide on registration oracle
- [ ] S05-007 Map client errors to 4xx; DTO `@Size/@Max`; 72-byte password cap; stop stack-trace logging for client errors
- [ ] S05-008 Strict `certificateUrl`/`certificatePublicId` validation
- [ ] S05-009 Delete Cloudinary assets on credential cascade; orphan sweep; decouple DB delete from provider
- [ ] S05-010 CSP/HSTS/Referrer-Policy/Permissions-Policy at the host
- [ ] S05-011 `ddl-auto` per profile, `allowCredentials(false)`, non-root pinned container
- [ ] S05-012 CI workflow (least-privilege), branch protection, Maven vulnerability scanning
- [ ] S05-013 Remove/neutralise legacy hosted hostname when retiring the host

**Guardrails / verification**
- [ ] Spring MVC SSE/XSLT/view guard test
- [ ] Controlled live Cloudinary test (§6.3)
- [ ] Owner decision on Spring Boot 3.5/Framework 6.2 support window

---

## 12. Existing security strengths

* Consistent owner-scoped data access with 404-equivalent responses; 47-case cross-user authorization suite and token-abuse matrix (expired, tampered, wrong key, `alg:none`, garbage).
* Correct JJWT usage: key-typed verification (no algorithm confusion), strict claim handling, configuration errors not masked as "invalid token".
* No mass assignment (request DTOs carry no owner fields); owner always from the token.
* Removal of the general user CRUD endpoints (S01) and generic 404/405 handling that avoids framework detail leakage.
* Generic error bodies; no stack traces or SQL in responses; no sensitive values logged.
* Sensible default response headers (`nosniff`, `X-Frame-Options: DENY`, no-store).
* Frontend: no HTML injection sinks, `safeHttpUrl`, `returnTo` allow-listing, `redirect: 'error'`, token shape-validation, race-safe session store, no console logging, no secrets in bundle.
* Production dependency tree clean (npm prod 0); critical dependency work (S02–S04.1) well documented; secret scanning + push protection enabled; no committed secrets.
* Parameterised JPA queries only (derived finders, no concatenated SQL/JPQL).

---

## 13. Verification gaps and limitations

* No live PostgreSQL run in S05 (M13 covered it earlier); S05 dynamic probes used H2 and the real Tomcat/Spring Security stack on a random local port.
* **No real Cloudinary interaction** (mocked only): S05-002/003/009 delivery behaviours, Cloudinary-side rejection, `raw` content type served, and traversal handling of `..` public IDs are unverified (§6.3).
* Hosted deployment, TLS terminator/proxy headers, SPA host headers, production env values (JWT lifetime, secret length, CORS origins, multipart limits), database backups/access controls and log retention were **not available** and are unassessed.
* Frontend assessed by code inspection + existing unit tests; no browser or CSP enforcement test was run.
* Timing figures (≈1 ms vs ≈55 ms) are from 6 samples on a developer laptop — sufficient to show the oracle exists, not to quantify it.
* Spring Boot 3.5 OSS support window and potential commercial patches for 6.2.x could not be verified from the repository.
* No load/DoS testing was performed (by instruction).

---

## 14. Go / no-go recommendation

**GO — continue product-feature work.** There is no critical or high-severity vulnerability, no cross-user data exposure, and no reachable critical dependency issue. The four P2 findings are abuse-resistance and session-lifecycle gaps that matter for an **internet-facing** deployment, not for local development. Condition: complete the "before any new public backend deployment" group in §11 (S05-001, -002, -004, -005, -007) before re-enabling a hosted backend or announcing M14 production traffic.

---

## Appendix A — Handoff summary

| Item | Value |
|---|---|
| Baseline commit | `cd763aa918614718d4474854c3a33a165c971013` (`main` after PR #14) |
| Findings | P0: 0 · P1: 0 · P2: 4 · P3: 9 (S05-005…S05-013) |
| Spring advisories | GHSA-j9f9-w8pj-32f8 and GHSA-pc63-qcmh-9cmg — both **not currently reachable** (latent) |
| Tests executed | Backend `./mvnw -o test` 90/90; temporary local probes (deleted); frontend vitest `safe-url` + `core/auth` 144/144; `npm audit --omit=dev` 0; `npm audit` 13 moderate dev-only |
| Not run | Live PostgreSQL, real Cloudinary, hosted services, browser suites, load tests |
| Git | Docs-only commit on `audit/s05-comprehensive-security`; commit identity `alexc83`; no AI trailers |
