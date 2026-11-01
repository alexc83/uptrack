# Dependency security assessment (read-only) — 2026-10-31

Scope: backend (Spring Boot, `backend/pom.xml`) and Angular frontend (`frontend/package.json` and `package-lock.json`) at `main` = `6fd6f47`. **Nothing was upgraded, removed or installed; no dependency manifest or lockfile was modified; no application code changed.** Method and limits are in section 8. The decision on any manifest change is yours (section 7).

## 1. Headline
- **Nothing here needs to block M02.** M02 is architecture/documentation only; it installs and deploys nothing.
- **No advisory in either tree is in the CISA Known Exploited Vulnerabilities catalog** (1,766 entries, released 2026-10-30): none of the 66 backend CVEs and none of the 57 CVEs behind the npm critical/high advisories. Highest EPSS exploit-probability among the backend critical/high CVEs is 3.3% (CVE-2026-42198, a PostgreSQL JDBC SCRAM denial-of-service).
- **Backend: 66 advisories (8 critical, 24 high, 27 moderate, 7 low) across 19 of 72 packaged libraries.** Almost all come from the Spring Boot 3.5.12 BOM pins (Tomcat 10.1.52, Spring Framework 6.2.17, Jackson 2.19.4, PostgreSQL driver 42.7.10) and are patch-level fixable. A reachability review of the source and config found **no critical advisory that is reachable in UpTrack**, but several **Jackson JSON-parsing denial-of-service** advisories apply to the public login/register endpoints and one Spring MVC **multipart** advisory applies to the upload endpoint.
- **Two critical Spring MVC advisories have no fix on Spring Framework 6.2** (6.2.19 is the last affected version; fixed only in 7.0.9, i.e. Spring Boot 4). The features involved (XsltView, SSE view fragments) are not used.
- **Angular: 6 of the 20 production packages are flagged (4 high, 2 moderate, 0 critical)**; all are fixed by 21.2.25, inside the existing `^21.2.13` range, and none of the affected features (SSR, hydration, `HttpTransferCache`, i18n, date/number format strings, `innerHTML`) is used. The other 45 flagged packages (3 critical, 18 high) are in the 562-package development/build tree and never ship.
- GitHub reports 105 Dependabot alerts (2 critical, 36 high, 56 moderate, 11 low) on `main`. **I could not read them** (the API requires authentication; I did not extract stored credentials). Section 8 explains why the numbers differ and why the backend may be under-represented there.

## 2. Classification
| # | Class | What it is | Findings | Priority |
|---|---|---|---|---|
| 1 | Backend production dependencies that remain after the migration | 72 libraries packaged in the backend jar (Spring Boot 3.5.12 BOM, Cloudinary 2.3.0, jjwt 0.12.7, PostgreSQL driver) | 66 advisories: 8 C / 24 H / 27 M / 7 L | **Highest** (internet-facing once redeployed; the hosted backend is suspended and the S01 code fix is merged but not deployed) |
| 2 | Angular production dependencies that will be retired (M14) | 20 packages: `@angular/*`, PrimeNG, rxjs, tslib, PrimeIcons/PrimeFlex | 6 packages flagged: 4 H / 2 M, no critical; 15 unique advisories across the flagged packages (SSR, hydration, cache, XSS, DoS) | Low-medium (currently the deployed frontend, retired at cutover) |
| 3 | Development and build dependencies | 562 packages (Angular CLI/build, Vite, Vitest, jsdom, Prettier, TypeScript, their trees) plus 127 optional | 45 flagged packages: 3 C / 18 H / 22 M / 2 L | Low (not shipped; developer machine/CI exposure only); retired with `frontend/` |
| 4 | Transitive dependencies | Backend: 18 of the 19 flagged libraries are transitive (only the PostgreSQL driver is a declared dependency, and its version also comes from the BOM). Frontend: 41 of 51 flagged packages are transitive (10 direct: 7 `@angular/*` runtime/compiler packages, `@angular/build`, `@angular/cli`, `vitest`) | included above | Fixed by BOM/parent bump or property overrides (backend) and by a lockfile refresh (frontend) |
| 5 | Exploitability or remediation uncertain | see section 6 | | |

## 3. Backend (class 1): per-library view
Cell format is Critical/High/Moderate/Low advisories (0 = none). Scenarios are what-if lookups of the same libraries at hypothetical versions; **none was applied**.
- **A** = Spring Boot parent 3.5.12 → 3.5.16 (the newest 3.5.x on Maven Central; its BOM manages Tomcat 10.1.55, Spring Framework 6.2.19, Spring Security 6.5.11, Spring Data 2025.0.13, Jackson 2.21.4, PostgreSQL 42.7.11, Hibernate 6.6.53, Logback 1.5.34).
- **B** = A plus BOM-property overrides to the latest patch of each line: `tomcat.version` 10.1.61, `jackson-bom.version` 2.21.8, `postgresql.version` 42.7.14.
- **B+** = B plus `cloudinary-http5` 2.3.0 → 2.6.0 and overrides for `httpclient5` 5.6.4, `httpcore5` 5.4.3, `commons-lang3` 3.18.0 and `log4j2` 2.25.5 (Cloudinary 2.6.0 itself depends on those; the Boot BOM would otherwise pin older versions).

| Library (current version) | Direct or transitive | Advisories now C/H/M/L | After A: Boot 3.5.16 | After B: A + Tomcat/Jackson/PostgreSQL overrides | After B+: B + Cloudinary 2.6.0 and HTTP-client overrides |
|---|---|---|---|---|---|
| `tomcat-embed-core` 10.1.52 | transitive | 6/6/2/1 | 4/0/0/0 | 0 | 0 |
| `spring-webmvc` 6.2.17 | transitive | 2/2/6/1 | 2/0/0/0 | 2/0/0/0 | 2/0/0/0 |
| `jackson-databind` 2.19.4 | transitive | 0/5/7/0 | 0/3/6/0 | 0 | 0 |
| `jackson-core` 2.19.4 | transitive | 0/3/1/0 | 0/2/0/0 | 0 | 0 |
| `postgresql` 42.7.10 | direct (version from Boot BOM) | 0/2/0/0 | 0/1/0/0 | 0 | 0 |
| `spring-data-commons` 3.5.10 | transitive | 0/2/2/0 | 0 | 0 | 0 |
| `httpcore5` 5.3.6 | transitive | 0/1/0/0 | 0/1/0/0 | 0/1/0/0 | 0 |
| `httpcore5-h2` 5.3.6 | transitive | 0/1/0/0 | 0/1/0/0 | 0/1/0/0 | 0 |
| `spring-boot` 3.5.12 | transitive | 0/1/0/0 | 0 | 0 | 0 |
| `spring-expression` 6.2.17 | transitive | 0/1/1/1 | 0 | 0 | 0 |
| `logback-core` 1.5.32 | transitive | 0/0/0/2 | 0 | 0 | 0 |
| `commons-lang3` 3.17.0 | transitive | 0/0/1/0 | 0/0/1/0 | 0/0/1/0 | 0 |
| `httpclient5` 5.5.2 | transitive | 0/0/1/0 | 0/0/1/0 | 0/0/1/0 | 0 |
| `log4j-api` 2.24.3 | transitive | 0/0/1/0 | 0/0/1/0 | 0/0/1/0 | 0 |
| `spring-boot-autoconfigure` 3.5.12 | transitive | 0/0/1/0 | 0 | 0 | 0 |
| `spring-security-core` 6.5.9 | transitive | 0/0/1/1 | 0 | 0 | 0 |
| `spring-security-web` 6.5.9 | transitive | 0/0/2/0 | 0 | 0 | 0 |
| `spring-core` 6.2.17 | transitive | 0/0/0/1 | 0 | 0 | 0 |
| `spring-web` 6.2.17 | transitive | 0/0/1/0 | 0 | 0 | 0 |

Unique advisories: now 66 (8/24/27/7); A 23 (6/8/9/0); B 7 (2/2/3/0); B+ 2 (2/0/0/0). Note A still has **6** criticals because the Boot 3.5.16 BOM leaves Tomcat at 10.1.55 (three Tomcat criticals are fixed only in 10.1.58, a further one in 10.1.59).

### Critical and high advisories, with reachability in UpTrack
Reachability was checked in source and `application.yml` (greps for XsltView, SSE, default typing, Sort/Pageable, form/basic login, WebSocket, SpEL, `UriComponentsBuilder`, resource chains, redirects: no matches; no HTTP/2, SSL or Tomcat settings in `application.yml`). "Not reachable" means the required feature is absent from this code base, not that the library is safe.

| Library | Advisory (CVE) | Sev | Affected → fixed | In UpTrack |
|---|---|---|---|---|
| tomcat-embed-core 10.1.52 | 43515 security-constraint method handling; 65182 constraint ordering; 68525 FORM-auth constraint bypass; 43512 and 65905 DIGEST authenticator; 41293 HTTP/2 headers not validated; 65637 HTTP/2 SNI bypass (appears at 10.1.55) | Critical (6, +1 new at A) | ≤10.1.54 → 10.1.55; others → 10.1.58 / 10.1.59 | **Not reachable**: authentication is Spring Security JWT; no `web.xml` security constraints, Tomcat realms, DIGEST/FORM auth, HTTP/2 or TLS configured in the app (TLS termination by the host platform is an assumption) |
| tomcat-embed-core | 43513 LockOutRealm; 29129 cipher order; 42498 WebSocket header exposure; 41284 WebDAV; 34483 JsonAccessLog encoding; 34487 sensitive data in a log file | High (6) | → 10.1.53–10.1.55 | Not reachable except **34487** (conditions not established; **uncertain**) |
| spring-webmvc 6.2.17 | 47890 SSE stream corruption with view fragments; 47884 XsltView SSRF/RCE | Critical (2) | 6.2.0–6.2.19 affected; fixed only in 7.0.9 | **Not reachable** (no SSE, no XSLT/view rendering; REST controllers only). **No fix on the 6.2 line**; requires Spring Boot 4 |
| spring-webmvc | 41845 XSS via JavaScriptUtils; 41842 DoS via versioned resources | High (2) | → 6.2.19 | Not reachable (no JSP/templates, no resource versioning) |
| jackson-databind 2.19.4 | 91777, 91776, 68497 DoS (quadratic forward refs, unknown type-id retention, XMLGregorianCalendar parse); 54512, 54513 type-validator bypasses | High (5) | → 2.21.4–2.21.7 | **DoS ones: reachable** (public login/register and every JSON body); validator bypasses not reachable (no polymorphic typing) |
| jackson-core 2.19.4 | 89425, 89407 (ReDoS), 68494 async maxNumberLength bypass | High (3) | → 2.21.4–2.21.7 | **Reachable as JSON-parsing DoS**; async parser path likely unused (uncertain) |
| postgresql 42.7.10 | 42198 unbounded PBKDF2 in SCRAM; 54291 channel-binding downgrade | High (2) | → 42.7.11 / 42.7.12 | Low: needs a hostile/compromised DB server or MITM; highest EPSS in the set (3.3%) |
| spring-boot 3.5.12 | 40973 predictable temp directory | High (1) | → 3.5.14 | Local attacker on the same host only |
| spring-data-commons 3.5.10 | 41695, 41716 unbounded property-path caches | High (2) | → 3.5.12 | Not reachable (no client-supplied Sort/Pageable/projections) |
| spring-expression 6.2.17 | 41850 SpEL DoS | High (1) | → 6.2.19 | Not reachable (no user-controlled SpEL) |
| httpcore5 / httpcore5-h2 5.3.6 | 54399 HTTP/1 header memory exhaustion; 54428 HPACK header list | High (2) | → 5.4.3 | Low: client-side parsing of Cloudinary responses over TLS to a trusted endpoint |

Moderate/low items worth noting: **Spring MVC multipart request smuggling (applies to the upload endpoint; fixed 6.2.19)**, Spring Security X.509/OTT/open-redirect/user-enumeration (the app uses none of those mechanisms), Spring `UriComponentsBuilder` SSRF (not used), Spring Data Sort parsing (no Sort input), `log4j-api` (log4j-to-slf4j bridge only; logging is Logback), Logback deserialization modules (not used), Tomcat open redirect and AJP (AJP not enabled).

## 4. Angular production dependencies (class 2, retired at M14)
All flagged packages are direct dependencies. Fix: refresh the lockfile within the existing `^21.2.13` ranges to **21.2.25** (the latest 21.2.x; PrimeNG 21.1.3 peers `@angular/core ^21.0.7`, so no conflict). No major bump is needed.
| Package | Sev | Advisories | Fixed by | In UpTrack |
|---|---|---|---|---|
| `@angular/router` | High | 3 SSR denial-of-service issues (numeric matrix params, empty-path outlet, RouterLink query retention) | 21.2.25 | Not reachable: no SSR |
| `@angular/common` | High | 5 high (OOM in `formatDate`/number format, `HttpTransferCache` key/credential issues) + 1 moderate | 21.2.20 | Not reachable: no SSR/`HttpTransferCache`; no format-string pipes |
| `@angular/core` | High | hydration DOM clobbering, i18n event-handler XSS, namespace/host-binding sanitization bypass | 21.2.20 | Not reachable: no hydration, i18n, `innerHTML` or `bypassSecurityTrust*` |
| `@angular/compiler` | High | i18n XSS, two-way binding and namespace sanitization bypasses | 21.2.20 | Same as above |
| `@angular/forms`, `@angular/platform-browser` | Moderate | flagged via the above | 21.2.25 | n/a |
No `@angular/ssr` or `@angular/platform-server` exists in `package.json`, and `angular.json` has no SSR/prerender configuration. `frontend/` is declared read-only in `AGENTS.md`, so even this lockfile-only refresh needs explicit approval.

## 5. Development and build dependencies (class 3)
45 packages, none shipped: the Angular CLI/`@angular/build` toolchain, Vite 7.3.2, Vitest, and their trees. Critical: `piscina` 5.1.4 (prototype-pollution gadget), `proxy-addr` 2.0.7 (IP spoofing), `tar` 7.5.12 (PAX parsing). High examples: `vite`, `undici`, `postcss`, `immutable`, `body-parser`, `hono`, `zod`, `nanoid`, `pacote`, `sigstore`, `browserslist`. These matter only on developer machines/CI when processing untrusted input (for example an untrusted tarball or a hostile local dev-server request). All report a non-breaking fix available. Recommendation: do nothing to this tree; it disappears with `frontend/`. The React tree gets its own audit at M03.

## 6. Uncertain exploitability or remediation (class 5)
1. **Spring Framework 6.2 critical advisories (47890, 47884)**: unfixable on the 6.2 line; not reachable here; only a Spring Boot 4 / Spring Framework 7 migration removes them. Boot 4.x manages Spring Framework 7.0.10, Tomcat 11.0.27, Spring Security 7.0.8/7.1.2, Jackson 2.21.7 (2.x line) and Jackson 3.1.7. That is a major migration (Spring Security 7, Jackson 3 packages, Hibernate 7, Tomcat 11) and is **not** recommended inside this program.
2. **Tomcat 34487** (sensitive information written to a log file): conditions not established.
3. **jackson-core async parser** advisories: whether Spring MVC ever uses the async parser for these endpoints was not established.
4. **TLS/HTTP/2 termination** in the hosting platform: assumed outside the application; not verified.
5. **Spring Boot 3.5 line support status** (open-source patches may end at some point): not verified; 3.5.16 is on Maven Central today, so verify before relying on further 3.5 patches.
6. **Compatibility risk of the proposed upgrades** is an estimate, not a test: Boot 3.5.16 moves Jackson 2.19 → 2.21 (a minor bump, but the supported combination for that Boot version), Hibernate 6.6.44 → 6.6.53, Spring Framework/Security/Data patches; `httpcore5` 5.3 → 5.4 and `httpclient5` 5.5 → 5.6 are minor bumps that Cloudinary 2.6.0 itself depends on. The 90-test backend suite plus the M01/S01 runtime suites would be the safety net.
7. **Backend dependencies were queried by version from the built jar** (the S01 build). `spring-boot-jarmode-tools` and test-scope libraries (H2, test starters) are not part of the production classpath; the H2/test tree was not assessed.

## 7. Recommendation
| Item | Recommendation | When |
|---|---|---|
| Anything blocking M02 | **No.** Proceed with M02 (documentation/architecture) | now |
| Backend patch-level dependency update (scenario B+, 66 → 2 advisories, the two left being the unfixable-on-6.2, unreachable Spring MVC ones) | **Approved 2026-10-31 as milestone S02** (ID-preserving, between M02 and M03; spec `specs/s02-backend-dependency-remediation.md`, DRAFT): Boot parent 3.5.16, property overrides, Cloudinary 2.6.0, applied in incremental groups with verification after each group and a final dependency-tree/advisory assessment. The projected counts are not guaranteed. Implementation still needs a READY spec and approval | **After M02 and before M03 (gate)**, so React work and the M13 parity gate run against the patched backend; **hard gate: the hosted backend is not redeployed until S02 (or at least scenario A + Tomcat/Jackson overrides) is merged** |
| Minimum if you want less change | Scenario B only (7 advisories left) | same gate |
| Spring Boot 4 / Spring Framework 7 | Defer; out of scope for the migration; revisit after cutover | after M14 |
| Angular production lockfile refresh to 21.2.25 | Optional and low priority; the advisories are unreachable; needs approval because `frontend/` is read-only | only if the Angular frontend stays public for long; otherwise skip |
| Angular/dev-tree audit findings | Defer entirely; retire with `frontend/` | M14 |
| React toolchain | Run `npm audit` at M03 scaffold time and record results; add a gate to M13/M14: no high/critical advisories in `frontend-react/` production dependencies | M03, M13, M14 |
| Dependabot visibility | Provide an export of the alerts (or authenticate `gh`) so they can be reconciled; consider a Maven dependency-submission or OSV-Scanner step so transitive backend libraries are visible to GitHub | when convenient |

## 8. Method, sources and limits
- **Dependabot alerts: not accessible.** `api.github.com/.../dependabot/alerts` returns 401 without authentication, `gh` is not installed, and I did not use stored credentials. The only GitHub figure seen is the push notice: 105 vulnerabilities (2 critical, 36 high, 56 moderate, 11 low). By comparison, `npm audit` lists 146 unique advisories (3 critical, 56 high, 75 moderate, 12 low) in 51 packages; GitHub's lower figure may reflect how it counts alerts (per package, only advisories with patched versions), and its Maven view is normally built from `pom.xml`, which would omit transitive libraries such as Tomcat, Spring Framework and Jackson. Both explanations are inferences I could not verify.
- Backend: the 72 libraries packaged in `backend/target/backend-0.0.1-SNAPSHOT.jar` (S01 build), coordinates resolved from the local Maven repository, queried by exact version against OSV.dev (which carries GitHub Security Advisories); no Maven dependency plugin was run. Severity is the GitHub advisory rating. Fixed versions are the nearest published fix above the current version; BOM contents and latest versions come from Maven Central metadata and `spring-boot-dependencies` POMs.
- Frontend: `npm audit --json` and `npm audit --omit=dev --json` (read-only, `package-lock.json` unchanged), plus lockfile dev/prod flags and `npm view` for latest 21.2.x.
- Exploitation data: CISA KEV catalog (released 2026-10-30) and EPSS (api.first.org) for the 32 backend critical/high CVEs.
- Limits: reachability statements come from greps and configuration reads, not from exploit attempts; "not reachable" can become wrong if features are added later. Version data reflects 2026-10-31. Scripts and raw JSON are in the scratchpad (not committed).

---

## 9. S02 Remediation Results Addendum (2026-11-01)
Milestone **S02** successfully executed the Scenario B+ remediation plan on branch `fix/backend-dependency-remediation`:
- **Spring Boot Parent**: `3.5.12` → `3.5.16` (final OSS release on Maven Central).
- **Core Overrides**: `tomcat.version` `10.1.61`, `jackson-bom.version` `2.21.8`, `postgresql.version` `42.7.14`.
- **Cloudinary & HTTP**: `cloudinary-http5` `2.5.0` (corrected from invalid 2.6.0), `httpclient5.version` `5.6.4`, `httpcore5.version` `5.4.3`, `commons-lang3.version` `3.18.0`, `log4j2.version` `2.25.5`.
- **Advisories Before vs After**:
  - Baseline (Group 0): **66 advisories** (8 Critical, 24 High, 27 Moderate, 7 Low).
  - Post-S02 (Group 3): **2 advisories** (2 Critical, 0 High, 0 Moderate, 0 Low).
  - Both remaining criticals (`GHSA-j9f9-w8pj-32f8`, `GHSA-pc63-qcmh-9cmg`) reside in `spring-webmvc` 6.2.19, cannot be patched on Spring Boot 3.5 without migrating to Spring Boot 4, and are unreferenced in UpTrack's pure JSON REST architecture (see S02 verification report for detailed prerequisite, evidence, and uncertainty analysis).
- **Verification Evidence**:
  - Backend automated test suite: 90/90 pass (`./mvnw -B test` with JDK 21).
  - Runtime API regression suite on isolated PostgreSQL DB: 83 PASS / 6 FAIL (out-of-scope) / 3 INFO (0 regressions vs S01).
  - Runtime Playwright browser suite (10 stages) on isolated PostgreSQL DB: 131 PASS / 21 FAIL (frontend findings) / 1 NOT RUN / 4 INFO (0 regressions vs S01, identical to baseline).
  - Application source code modified: 0 files. Database schema changes: 0.
  - S02 verification report: `context/migration/verification/s02-report.md`.
