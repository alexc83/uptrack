# M01 runtime results — browser (Playwright + Microsoft Edge 156, headless) (RAN 2026-10-31)

Tooling: `playwright-core` installed in a scratchpad directory **outside the repo** (no change to `frontend/package.json` or any repo manifest); browser = installed Microsoft Edge via `channel: msedge`, headless. Application: Angular dev server `http://localhost:4200` against backend `:8080` and isolated PostgreSQL DB `uptrack_migration_test` (role `uptrack_m01`). Placeholder Cloudinary values. Two synthetic accounts only (A, B); before the UI run the three tables of that isolated DB were emptied so both accounts could be created with known throwaway passwords (earlier API-run data discarded; its results are recorded in `runtime-results-api.md`).

Screenshot policy: a curated set of 25 images is committed; the full local capture set is not (see the last section).

Verdict key: PASS = the stated check held. FAIL = the stated check did not hold (the row note says whether this is an app behavior difference or a security finding). INFO = observation. NOT RUN = not executed. **A PASS only means what the scenario text says**; screenshots were captured for review but visual fidelity was not judged and no visual comparison to a design was made.

Effective results: 125 PASS, 10 FAIL, 1 NOT RUN, 4 INFO. Superseded script attempts (listed at the end) are excluded from these totals.

| ID | Verdict | Scenario | Observed / evidence |
|---|---|---|---|
| U1.1 | PASS | landing page renders at 1280px with hero and nav | title=Frontend |
| U1.2 | PASS | landing theme toggle adds html.dark and persists key uptrack-landing-theme | {"l":"dark","s":null} |
| U1.4 | PASS | backdrop click closes the modal; X button closes the modal |  |
| U1.5 | PASS | Tab order inside login modal: email -> password -> submit (focus stays in modal) | email: > password: > submit:Log In > button:Sign up > button:Close authentication modal > email: |
| U2.1 | PASS | signup validation: empty submit shows field errors and sends no request | ["This field is required.","This field is required.","This field is required."] |
| U2.2 | PASS | signup validation: 7-char password rejected client-side | ["Password must be at least 8 characters."] |
| U2.3 | PASS | signup success (user A) -> POST /auth/register, lands on /dashboard, token stored |  |
| U2.4 | PASS | second synthetic account B created via API (registration UI for B not repeated: third-account rule) |  |
| U4.1 | PASS | session restoration: reload on /dashboard keeps session |  |
| U4.2 | PASS | session restoration: new tab in same context lands in app via guard bootstrap |  |
| U4.3 | PASS | authenticated visit to / redirects to /dashboard |  |
| U4.4 | PASS | logout: account menu -> Log out opens confirm; Cancel keeps session |  |
| U4.5 | PASS | logout: Log Out clears token and navigates to / |  |
| U4.6 | PASS | back button after logout does not expose protected content | http://localhost:4200/ |
| U5.1 | PASS | login wrong password shows error alert and stays on / | Invalid email or password. |
| U5.2 | PASS | login success (A) -> /dashboard |  |
| U6.1 | PASS | invalid token in localStorage + protected route -> redirected to /, token cleared |  |
| U6.2 | PASS | invalid token at / then login works (S4 UI impact) |  |
| U7./app | PASS | logged in: /app -> /dashboard | landed /dashboard |
| U7./app/dashboard | PASS | logged in: /app/dashboard -> /dashboard | landed /dashboard |
| U7./app/credentials | PASS | logged in: /app/credentials -> /credentials | landed /credentials |
| U7./app/ce-records | PASS | logged in: /app/ce-records -> /ce-records | landed /ce-records |
| U7./app/settings | PASS | logged in: /app/settings -> /dashboard | landed /dashboard |
| U7./does-not-exist | PASS | logged in: /does-not-exist -> /dashboard | landed /dashboard |
| U7.settings | PASS | logged in: /settings renders Settings page |  |
| U8./dashboard | PASS | logged out: /dashboard -> / | landed / |
| U8./credentials | PASS | logged out: /credentials -> / | landed / |
| U8./ce-records | PASS | logged out: /ce-records -> / | landed / |
| U8./settings | PASS | logged out: /settings -> / | landed / |
| U8./credentials/00000000-0000-0000-0000-000000000000/ce-report | PASS | logged out: /credentials/00000000-0000-0000-0000-000000000000/ce-report -> / | landed / |
| U8./app/dashboard | PASS | logged out: /app/dashboard -> / | landed / |
| U8./unknown | PASS | logged out: /unknown -> / | landed / |
| U1.3b | FAIL | login modal: after Esc focus returns to the Log In trigger button (strict) | expectation failed: activeElement={"tag":"BODY","cls":"","text":"UpTrackLog InSign UpTrack cred"} |
| U1.3c | FAIL | login modal: after X-button close focus returns to trigger (strict) | expectation failed: activeElement={"tag":"BODY","text":"UpTrackLog InSign UpTrack cred"} |
| U1.6b | PASS | modal switch Log In -> Sign Up -> Log In via in-modal links |  |
| C1.1 | PASS | credentials page empty state for new user | CREDENTIALS Live credential tracking Review real licenses and certifications from the API, filter the list, and open full credential details |
| C1.2 | PASS | CE records page empty state; Add CE Record disabled with no credentials | addDisabled=true |
| C2.3 | PASS | Add Credential success via UI -> card appears |  |
| C4.1 | PASS | list sorted by expiration ascending (expired, soon, b90, ui(200), far(400)) | ["ACLS Seed","BLS Seed","Boundary 90","UI Credential","Far Future License"] |
| C4.Active | PASS | status chip "Active" filters server-side | ["Far Future License","UI Credential"] |
| C4.Expiring Soon | PASS | status chip "Expiring Soon" filters server-side | ["BLS Seed","Boundary 90"] |
| C4.Expired | PASS | status chip "Expired" filters server-side | ["ACLS Seed"] |
| C4.type | PASS | type chip Certification filters | ["ACLS Seed","BLS Seed"] |
| C4.search | PASS | search "bls" (debounced) returns BLS only; no-match shows empty state; Clear restores | searchRequestsForTyping"bls"=1; empty msg="CREDENTIALS Live credential tracking Review real licenses and certifications fro" |
| C5.1 | PASS | open credential card -> detail drawer shows metadata, CE progress and actions | Far Future License Seed Org License Active EXPIRES Dec 5, 2027 RENEWAL CYCLE 12 months REQUIRED CE HOURS 30 hours CURRENT STATUS Active CE Progress 18 / 30 hours 60% complete CE Records (12) Recent continuing education a |
| C5.2 | PASS | Escape closes drawer; overlay click closes drawer |  |
| C6.1 | PASS | edit credential in drawer: rename UI Credential -> UI Credential Edited | list refreshed after edit |
| C6.2 | PASS | delete credential with confirmation: Cancel keeps it, Delete removes it (cascade to CE records verified in E1.1) | ["ACLS Seed","BLS Seed","UI Credential Edited","Far Future License"] |
| C2.1b | PASS | Add Credential dialog: submit button state when form empty (disabled?) and touched-field errors | submitDisabled=true; blurErrors=["This field is required.","This field is required."]; <button _ngcontent-ng-c1156324954="" pbutton="" type="submit" class="credential-primary-button p-button p-component" disabled="" pc13="" data-pc-name="bu |
| C2.2b | PASS | renewal=0: error message appears and submit remains disabled | ["Renewal cycle must be at least 1 month."] |
| C2.4b | FAIL | Escape on Add Credential dialog: does it close? (observed) | dialog still open after Escape; activeElement=INPUT |
| C2.5 | PASS | Cancel button closes dialog; backdrop click behaviour | backdropClickClosesDialog=false |
| D1.1 | PASS | dashboard renders stats matching /api/dashboard and panels | api stats={"totalCredentials":4,"activeCount":2,"expiringSoonCount":1,"expiredCount":1,"needsCEAttentionCount":3}; panels: Upcoming=true,CEs Still Needed=true,Recent=true |
| D1.2 | PASS | dashboard recent activity shows at most 4 items | items=4 (API returned 12) |
| D1.4 | PASS | dashboard Add Credential / Add CE Record buttons present and enabled |  |
| D1.5 | PASS | dashboard: sidebar nav links navigate between Dashboard / Credentials / CE Records (row-click drawer tested in D1.5b) |  |
| E1.1 | PASS | CE records page: 12 records (cascade removed Zeta Course), 10 rows on page 1, pagination 2 pages | rows=10; Showing 1–10 of 12 records |
| E1.2 | PASS | pagination: Next shows remaining 2 rows, Prev returns; numbered page buttons present | page2 rows=2 |
| E1.3 | PASS | search "Seed CE 03" filters to 1 row and resets to page 1; debounce |  |
| E1.4 | PASS | credential select filter and certificate chips (On file / Missing) | far=10 onfile=0(emptyState=true) missing(page1)=10 |
| E1.5 | PASS | row click opens CE record drawer; Esc closes; row not keyboard-focusable (F7) | row tabindex=null; open-details button present=true (keyboard path exists via button) |
| E1.6 | PASS | keyboard: Tab reaches the row "Open details" button and Enter opens the drawer |  |
| E3.3 | NOT RUN | successful certificate upload, replace, remove-after-upload | no safe Cloudinary credentials (placeholders only) |
| E2.2b | PASS | CE hours validation: 0 and -3 keep Save disabled | 0:disabled=true -3:disabled=true 0.05:disabled=true |
| E3.1b | PASS | unsupported file (.txt): an explicit error (beyond the static hint) is shown and no upload request is sent | new text: ["Unsupported file type. Please choose a PDF or common image file."] |
| E3.2b | PASS | valid PDF with placeholder Cloudinary: visible failure message "Certificate upload failed." | message shown |
| E2.1b | PASS | Add CE Record: fill and save -> record appears in list |  |
| E4.1b | PASS | edit CE record via drawer: rename, save, list reflects change |  |
| E4.2b | PASS | delete CE record: Cancel keeps it, Delete removes it | dialog buttons: ["Cancel","Delete CE Record"] |
| D1.3c | PASS | dashboard: >3 upcoming expirations -> preview shows 3 + "See more" opens list drawer; Esc closes | button="See 2 more expirations"; drawer: All Upcoming Expirations 5 credentials · sorted by urgency Soon 1 Org 11d left License Expires Nov 10, 2026 5 hrs remaining Soon 2 Org 21d left License Expires  |
| D1.5b | PASS | dashboard: clicking a preview row opens the credential detail drawer |  |
| D1.6 | PASS | keyboard: focus after closing a drawer with Escape returns to the opener (observed) | {"tag":"BUTTON","t":"Soon 1 License Org 5 CE h"} |
| R1.1 | PASS | credential card "Open CE Report" navigates to report with returnTo=/credentials; content renders | url=/credentials/0a62e44d-af4c-4df0-9cc2-aad3f548933b/ce-report?returnTo=%2Fcredentials |
| R1.2 | PASS | report Back returns to returnTo (/credentials) |  |
| R1.3 | PASS | report direct deep link when logged in renders; shell/sidebar absent |  |
| R1.4 | PASS | report Back without returnTo falls back to /credentials |  |
| R1.6 | PASS | report for unknown id shows error state with Retry/Back (no crash) | CE report unavailable Credential not found for id: 00000000-0000-0000-0000-000000000000 |
| R1.7 | PASS | report empty-records state (credential with no CE records) | empty-state text present |
| S1.1 | PASS | settings page loads with current profile values; Save disabled until changed |  |
| S1.2 | PASS | profile: duplicate email (B) shows error banner and keeps form | Email is already in use. |
| S1.3 | PASS | profile: invalid email blocks save (Save disabled) |  |
| S1.4 | PASS | profile: rename saves, success status banner shown, sidebar name updates after navigation | status="Profile updated" sidebar="M01 User A Renamed" |
| S2.1 | PASS | password dialog opens; Esc closes; mask click closes |  |
| S2.2 | PASS | password validation: mismatch confirm, same-as-current and <8 chars disable Update Password with messages | short:true mismatch:true same:true msgs=["This field is invalid.","New password must be different from your current password.","This field is invalid."] |
| S2.3 | PASS | password: wrong current password -> error banner in dialog, dialog stays open | Current password is incorrect. |
| S2.4 | PASS | password: success -> dialog closes, success banner; old password rejected, new accepted at login | banner=["Profile updated","Password updated"] |
| R1.5a | PASS | Print Report click: window.print called once and html.dark removed at that moment | {"p":1,"dark":false,"darkNow":false} (afterprint event not fired because print() was stubbed) |
| R1.5b | PASS | print media: controls marked .screen-only compute display:none | 1 .screen-only elements display=none in print media; PDF generated |
| T1.1 | PASS | shell theme toggle flips html.dark, stores uptrack-theme, persists across reload | before=false after=true key=dark persisted=true |
| T1.shot-credentials | PASS | dark mode renders credentials (screenshot captured; visual quality not judged) |  |
| T1.shot-ce-records | PASS | dark mode renders ce-records (screenshot captured; visual quality not judged) |  |
| T1.shot-settings | PASS | dark mode renders settings (screenshot captured; visual quality not judged) |  |
| T1.report | FAIL | report page in dark mode (stored dark): html.dark applied on direct load? | F1 confirmed: with uptrack-theme=dark stored, direct load of report renders LIGHT (no theme init outside shell) |
| T2.1 | PASS | no stored theme + OS prefers dark: shell follows prefers-color-scheme |  |
| T3.1 | FAIL | F1: landing dark toggle then login -> theme inside app (observed, two storage keys) | theme NOT carried into app: landing=dark but app html.dark=false; keys={"l":"dark","s":"light"} |
| P375.landing | PASS | landing at 375px: no horizontal overflow | {"sw":375,"cw":375} |
| P375.modal | PASS | login modal at 375px fits viewport | box x=16 w=343 |
| P375.dashboard | PASS | dashboard at 375px: renders, no horizontal overflow | {"sw":375,"cw":375} |
| P375.credentials | PASS | credentials at 375px: renders, no horizontal overflow | {"sw":375,"cw":375} |
| P375.ce-records | PASS | ce-records at 375px: renders, no horizontal overflow | {"sw":375,"cw":375} |
| P375.settings | PASS | settings at 375px: renders, no horizontal overflow | {"sw":375,"cw":375} |
| P375.report | PASS | report at 375px: renders, no horizontal overflow | {"sw":375,"cw":375} |
| P375.sidebar | PASS | sidebar is off-canvas at 375px and opens with the menu button | initial visible=true x=-316; open visible=true x=0 |
| P375.ce-layout | PASS | CE records layout at 375px (table vs stacked cards) | row display=grid, thead=none |
| P768.landing | PASS | landing at 768px: no horizontal overflow | {"sw":768,"cw":768} |
| P768.modal | PASS | login modal at 768px fits viewport | box x=129 w=510 |
| P768.dashboard | PASS | dashboard at 768px: renders, no horizontal overflow | {"sw":768,"cw":768} |
| P768.credentials | PASS | credentials at 768px: renders, no horizontal overflow | {"sw":768,"cw":768} |
| P768.ce-records | PASS | ce-records at 768px: renders, no horizontal overflow | {"sw":768,"cw":768} |
| P768.settings | PASS | settings at 768px: renders, no horizontal overflow | {"sw":768,"cw":768} |
| P768.report | PASS | report at 768px: renders, no horizontal overflow | {"sw":768,"cw":768} |
| P768.sidebar | PASS | sidebar is off-canvas at 768px and opens with the menu button | initial visible=true x=-316; open visible=true x=0 |
| P768.ce-layout | PASS | CE records layout at 768px (table vs stacked cards) | row display=grid, thead=none |
| P1280.landing | PASS | landing at 1280px: no horizontal overflow | {"sw":1280,"cw":1280} |
| P1280.modal | PASS | login modal at 1280px fits viewport | box x=385 w=510 |
| P1280.dashboard | PASS | dashboard at 1280px: renders, no horizontal overflow | {"sw":1280,"cw":1280} |
| P1280.credentials | PASS | credentials at 1280px: renders, no horizontal overflow | {"sw":1280,"cw":1280} |
| P1280.ce-records | PASS | ce-records at 1280px: renders, no horizontal overflow | {"sw":1280,"cw":1280} |
| P1280.settings | PASS | settings at 1280px: renders, no horizontal overflow | {"sw":1280,"cw":1280} |
| P1280.report | PASS | report at 1280px: renders, no horizontal overflow | {"sw":1280,"cw":1280} |
| P1280.ce-layout | PASS | CE records layout at 1280px (table vs stacked cards) | row display=table-row, thead=table-header-group |
| P375.dark | PASS | dark mode dashboard + ce-records at 375px, no overflow |  |
| K1.1 | PASS | Tab order from page start reaches sidebar controls, nav links, then main (first 12 stops) | Toggle theme > Collapse sidebar > Dashboard > Credentials > CE Records > Open account menu > Add CE Record > Add Credential > Soon 1 License Org 5 C > Soon 2 License Org 5 C > Soon 3 License Org 5 C > See more upcoming expirations |
| K1.2 | PASS | visible focus indicator on keyboard-focused nav link/button (outline or box-shadow present) | {"tag":"BUTTON","outline":"solid 2px","shadow":"none"} |
| K2.dashboard.data | INFO | a11y counts | {"h1":1,"imgNoAlt":0,"btnNoName":0,"inputNoLabel":0,"ariaLive":0,"lang":"en","title":"Frontend"} |
| K2.dashboard | PASS | a11y DOM spot-check dashboard (counts only; not a full audit) | {"h1":1,"imgNoAlt":0,"btnNoName":0,"inputNoLabel":0,"ariaLive":0,"lang":"en","title":"Frontend"} |
| K2.credentials.data | INFO | a11y counts | {"h1":1,"imgNoAlt":0,"btnNoName":0,"inputNoLabel":1,"ariaLive":0,"lang":"en","title":"Frontend"} |
| K2.credentials | FAIL | a11y DOM spot-check credentials (counts only; not a full audit) | expectation failed: {"h1":1,"imgNoAlt":0,"btnNoName":0,"inputNoLabel":1,"ariaLive":0,"lang":"en","title":"Frontend"} |
| K2.ce-records.data | INFO | a11y counts | {"h1":1,"imgNoAlt":0,"btnNoName":0,"inputNoLabel":2,"ariaLive":0,"lang":"en","title":"Frontend"} |
| K2.ce-records | FAIL | a11y DOM spot-check ce-records (counts only; not a full audit) | expectation failed: {"h1":1,"imgNoAlt":0,"btnNoName":0,"inputNoLabel":2,"ariaLive":0,"lang":"en","title":"Frontend"} |
| K2.settings.data | INFO | a11y counts | {"h1":1,"imgNoAlt":0,"btnNoName":0,"inputNoLabel":0,"ariaLive":0,"lang":"en","title":"Frontend"} |
| K2.settings | PASS | a11y DOM spot-check settings (counts only; not a full audit) | {"h1":1,"imgNoAlt":0,"btnNoName":0,"inputNoLabel":0,"ariaLive":0,"lang":"en","title":"Frontend"} |
| K2.title | FAIL | document title is a meaningful app name (F8: index.html title "Frontend") | expectation failed: title="Frontend" |
| X1.1 | PASS | user B logs in through the UI |  |
| X1.2 | PASS | B sees none of A's credentials / CE records in the UI lists |  |
| X1.3 | PASS | B opens A's report URL -> error state, no A data | Back Print Report CE report unavailable Credential not found for id: 0a62e44d-af4c-4df0-9cc2-aad3f54 |
| X1.4 | FAIL | B deep-links /credentials?credentialId=<A id>: drawer must not reveal A's credential (S2 via UI) | SECURITY (S2) via UI: B sees A's credential "Far Future License" in the drawer. Excerpt: Far Future License Seed Org License Active EXPIRES Dec 5, 2027 RENEWAL CYCLE 12 months REQUIRED CE HOURS 30 hours CURREN |
| K1.3b | FAIL | logout confirm dialog: Esc dismisses it (focus inside dialog) | confirm dialog still open after Escape; activeElement before Esc=BODY:UpTrackDashboardCred |
| K1.3c | PASS | logout confirm dialog: Cancel closes it (cleanup) |  |
| K1.4b | PASS | account menu keyboard: Enter opens menu, Settings item activates with Enter | focus in menu=menu:SettingsLogout; url=/settings |

## Superseded script attempts (kept for transparency; not counted)
| ID | Why superseded |
|---|---|
| U1.3 | false PASS: assertion matched whole-body text; replaced by U1.3b/U1.3c (strict) |
| U1.6 | script selector ambiguous; replaced by U1.6b |
| C2.1 | script waited on a disabled submit button; replaced by C2.1b |
| C2.2 | same cause; replaced by C2.2b |
| C2.4 | replaced by C2.4b (observed behavior) |
| D1.3 | did not exercise overflow (1 upcoming item); replaced by D1.3c |
| D1.3b | declared NOT EXERCISED; replaced by D1.3c |
| E2.1 | wrong select label in script; replaced by E2.1b |
| E2.2 | same; replaced by E2.2b |
| E3.1 | matched static hint text; replaced by E3.1b |
| E3.2 | replaced by E3.2b (stricter message check) |
| E4.1 | script cascade from E2 failure; replaced by E4.1b |
| E4.2 | same; replaced by E4.2b |
| K1.3 | cascade/ordering; replaced by K1.3b |
| K1.4 | cascade from K1.3 leaving dialog open; replaced by K1.4b |
| R1.5 | script locator timed out under print media; replaced by R1.5a/R1.5b |
| C3.0 | setup step (data seeding), not a test |

## Browser console errors / page errors captured

| Kind | Message | Steps |
|---|---|---|
| console.error | Failed to load resource: the server responded with a status of 401 () | U5.1,U6.1,U6.2 (x3) |
| console.error | Failed to load resource: the server responded with a status of 502 () | E3.2,E3.2b (x2) |
| console.error | Failed to load resource: the server responded with a status of 404 () | R1.6,X1.3 (x2) |
| console.error | Failed to load resource: the server responded with a status of 409 () | S1.2 (x1) |
| console.error | Failed to load resource: the server responded with a status of 400 () | S2.3 (x1) |

Captured via `page.on("console")` (type error) and `page.on("pageerror")`. The browser logs "Failed to load resource" for HTTP 4xx/5xx; those correspond to the deliberate negative tests (wrong password, 409, 502 upload, 404 report). Network failures were not otherwise recorded.

## Screenshots — curated evidence set (25 images committed in `baseline/screenshots/`)
Every one of the 25 images was individually reviewed before commit. All images use synthetic data only (`m01-user-a@example.test`, `m01-user-b@example.test`, seed names such as "Seed CE 01"); no tokens, real passwords (password fields are masked) or real people appear. The two landing images were cropped because the full-page capture includes the project's own static marketing preview (a demo first name and a March 2026 date from `frontend/public/landing/`); the uncropped originals are local-only. Screenshots are evidence that a state rendered; they were **not compared against any design or the legacy `context/screenshots/`**, so they do not establish visual fidelity. The complete capture set (77 files in total, including the print PDF) was kept locally in `baseline/screenshots-local/` (git-excluded through `.git/info/exclude`, not committed); result rows above that cite scenarios without an image below were captured in that local set.

| File | Scenario IDs | What it shows | Result / finding it supports |
|---|---|---|---|
| `u1-landing-light-1280.png` | U1.1 | Landing hero and nav, light, 1280 px (cropped to the top 470 px: the page's embedded marketing preview image is the project's own asset, not M01 data, so it was cut out) | PASS |
| `u1-landing-dark-1280.png` | U1.2 | Landing hero and nav, dark (`uptrack-landing-theme`), cropped as above | PASS; part of F1 (two theme keys) |
| `u1-login-modal-dark.png` | U1.3b | Login modal open (dark); empty fields; page behind is blurred | modal renders; **FAIL F11** (focus not restored on close; focus state not visible in image) |
| `u3-dashboard-empty-light-1280.png` | U2.3, U4 | Dashboard empty state right after registration | PASS |
| `d1-dashboard-populated-1280.png` | D1.1, D1.2 | Dashboard with stats, panels, 4-item activity | PASS |
| `d1-dashboard-list-drawer.png` | D1.3c | "All Upcoming Expirations" list drawer | PASS |
| `c4-credentials-list-1280.png` | C4.1 | Credentials grid sorted by expiry ascending | PASS |
| `c5-credential-drawer-1280.png` | C5.1 | Credential detail drawer (metadata, progress, CE list) | PASS |
| `c2-credential-form-empty.png` | C2.1b | Add Credential dialog, empty, Save disabled, field errors on blur | PASS (submit disabled until valid); related FAIL C2.4b (Esc/backdrop do not close it, F12) |
| `c6-credential-delete-confirm.png` | C6.2 | Delete credential confirmation | PASS |
| `e1-ce-records-1280.png` | E1.1 | CE records table, 10 of 12, pagination | PASS |
| `e1-ce-drawer-1280.png` | E1.5 | CE record detail drawer | PASS |
| `e3-upload-failure.png` | E3.2b, E2.2b | Certificate upload failure message with placeholder Cloudinary; also shows hours 0.05 flagged "Hours must be greater than 0." | PASS (failure path only; success path NOT RUN, E3.3); the 0.05 message is misleading (F6) |
| `r1-report-1280.png` | R1.1 | CE report page (full page) | PASS |
| `r1-report-print-media.png` | R1.5b | Report rendered with print media emulation | PASS (screen-only controls hidden); real print dialog NOT automatable |
| `s1-settings-1280.png` | S1.1 | Settings page | PASS |
| `s2-password-validation.png` | S2.2 | Change Password dialog with validation messages | PASS |
| `t1-dashboard-dark-1280.png` | T1.1 | Dashboard, dark theme | PASS |
| `t1-report-stored-dark-direct-load.png` | T1.report | Report direct load with dark theme stored renders light | **FAIL (F1)** |
| `p-dashboard-375.png` | P375.dashboard | Dashboard at 375 px | PASS (no horizontal overflow) |
| `p-ce-records-375.png` | P375.ce-records, P375.ce-layout | CE records as stacked cards at 375 px | PASS |
| `p-credentials-768.png` | P768.credentials | Credentials at 768 px | PASS |
| `p-dashboard-dark-375.png` | P375.dark | Dashboard dark at 375 px | PASS |
| `k1-logout-confirm-after-esc.png` | K1.3b | "Log out?" dialog still open after Escape | **FAIL (F12)** |
| `x1-b-deeplink-a-credential.png` | X1.4 | User B session showing user A's credential in the drawer | **FAIL — security finding F13/S2** |
