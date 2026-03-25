# Current Feature

## Status

Complete

## Feature: Performance Polish

### Goal

Improve the perceived performance of the deployed UpTrack app so that page loads and interactions feel more immediate and polished.

The app is functional, but the current deployed experience feels slightly delayed in a way that makes it seem less responsive than it should. The biggest issue is not necessarily raw speed alone — it is that the user often sees blank or partially rendered UI before content appears.

This spec focuses on improving:
- first-load experience
- dashboard loading experience
- drawer/modal responsiveness
- loading feedback
- transition smoothness
- frontend data fetching patterns where appropriate

Do **not** redesign the app visually. Keep the current structure and styling language intact. This is a performance and UX polish pass.

---

### Primary Objectives

1. **Eliminate "blank waiting" states** — show skeleton loaders, placeholder rows/cards, and preserve layout stability while data is loading
2. **Make interactions feel immediate** — UI should acknowledge clicks instantly even if data is still loading
3. **Improve dashboard perceived performance** — render shell immediately, use skeletons, avoid flashing between empty and loaded state
4. **Keep UI transitions subtle and fast** — animations should support responsiveness, not slow the app down

---

### Scope

- App startup / initial page load
- Login/signup flow if applicable
- Dashboard page
- Credential list/detail flow
- CE list/detail flow
- Drawers and modals
- Route transitions where relevant
- Loading indicators for API-backed content

Do not change backend business logic unless needed to support lightweight performance improvements.

---

### Requirements

#### A. Add loading states everywhere data is fetched

For any page, section, drawer, table, or card that depends on async API data:

- Show a loading state immediately when the request begins
- Avoid showing blank white space or empty containers while waiting
- Keep the final loaded layout roughly the same size as the loading layout to reduce layout shift

**Preferred UI patterns:**
- Skeleton cards for summary/stat cards
- Skeleton rows for tables/lists
- Spinner only for small inline actions, not for full-page blank states
- "Loading drawer content" placeholders inside drawers before data resolves

**Specific areas to apply:**
- Dashboard summary/stat cards
- Expiring credentials section
- CE progress / CE summary sections
- Credential detail drawer
- CE detail drawer
- Any table/list view backed by API data

#### B. Dashboard loading UX improvement

- Render the dashboard shell immediately
- Use skeleton placeholders for dashboard cards and dashboard lists while data is loading
- Replace skeletons with live data once the request resolves
- Avoid flashing between empty state and loaded state

#### C. Drawer and modal responsiveness

- Open the drawer immediately on click
- Show loading placeholder content inside the drawer if the detail request is still in progress
- Do not wait for the full API response before showing the drawer container

Especially important for:
- Credential detail drawer
- CE detail drawer
- Any list-of-items drawer launched from dashboard "see all" interactions

#### D. Route-level loading polish

- Render page shell/title/header immediately
- Show skeleton or placeholder content in main body
- Avoid full blank pause before the page appears
- Avoid delayed rendering where the user clicks and sees almost no visible reaction

#### E. Loading state architecture cleanup

- Each async data source should have explicit loading state
- Loading state should be local and predictable
- Avoid ad hoc or duplicated patterns if there is a cleaner shared approach
- Prefer clear Angular patterns using current project conventions (standalone components, signals, modern Angular syntax)
- No unnecessary new libraries unless clearly justified

#### F. Prevent jarring layout shifts

- Cards should not suddenly jump in size
- Drawers should not snap from empty to full in an awkward way
- Tables should maintain predictable spacing while loading
- Loading placeholders should resemble final content dimensions
- Use subtle fade/opacity transition only if it helps and remains fast

#### G. Transition tuning

- Keep animations subtle and quick
- Do not add heavy or slow transitions
- Transitions should help mask loading, not create extra waiting

**Good examples:**
- Fast fade-in for loaded content
- Subtle opacity transition when skeletons are replaced
- Immediate drawer open, then content fade-in

**Avoid:**
- Long easing animations
- Delayed entrance animations
- Anything that makes the app feel more sluggish

#### H. Review redundant or blocking frontend requests

Inspect the frontend data-fetching flow and identify simple improvements such as:
- Duplicate requests on init
- Unnecessarily sequential requests that could be parallelized
- Requests triggered before they are actually needed
- Unnecessary refetching when data is already available
- Route-level fetches that could be deferred until after shell render

#### I. Improve first meaningful paint where feasible

- Render page shell immediately
- Defer non-critical content if needed
- Avoid blocking visible UI on nonessential calls
- Ensure core dashboard content gets priority

#### J. Keep implementation lightweight and maintainable

**Do not do:**
- Premature micro-optimizations with no visible UX impact
- Unnecessary abstraction layers
- Overengineered state management changes
- Massive refactors unless truly needed

**Do:**
- Focus on visible user experience improvements
- Keep changes readable and practical
- Improve maintainability where possible

---

### Success Criteria

- The app no longer shows obvious blank waiting areas during common flows
- Dashboard loading feels intentional and polished
- Drawers open immediately on click, even if content loads after
- Navigation feels more responsive
- Content loading feels smoother and less jarring
- The deployed app feels noticeably more professional to a user, even if backend response times are unchanged

---

### Important Constraints

- Preserve the existing app design direction
- Do not introduce a major redesign
- Do not break current working functionality
- Do not add unnecessary dependencies unless clearly justified
- Prioritize perceived performance and responsiveness over theoretical optimization

---

## History

<!-- Keep this updated, earliest to latest -->

- **2026-03-23** — Bootstrapped Angular 21 frontend with standalone components and PrimeNG UI library.
- **2026-03-23** — Bootstrapped Spring Boot 3.5 backend with Java 21, Spring Data JPA, and Spring Security.
- **2026-03-23** — Completed Dashboard UI Phase 1 with a persistent shell layout, themed sidebar, dashboard/credentials/CE routes, profile footer, desktop collapse behavior, and responsive mobile navigation.
- **2026-03-23** — Completed Dashboard UI Phase 2 with the main dashboard content area, modular dashboard components, summary stats, upcoming expirations, CE-focused attention panel, recent activity, responsive layout, and polished light/dark theme styling.
- **2026-03-23** — Completed Drawer UI System with reusable right-side drawers for credential details, CE record details, and dashboard overflow lists, including dashboard-triggered interactions and polished responsive styling.
- **2026-03-23** — Completed Backend Step 1 - Spring Boot API Foundation with layered package scaffolding, JPA entities, repositories, DTO scaffolding, global exception handling, YAML configuration, and an isolated H2-backed test profile.
- **2026-03-23** — Completed User CRUD with backend DTOs, service-layer mapping and validation, repository-backed email uniqueness checks, REST controller endpoints under `/api/users`, and missing-user handling aligned with global exceptions.
- **2026-03-23** — Completed Credential CRUD with credential request/response DTOs, derived status calculation in the service layer, `/api/credentials` REST endpoints, required user validation, and integration coverage for CRUD and status behavior.
- **2026-03-23** — Completed CE Record CRUD with dedicated request/response DTOs, `/api/ce-records` REST endpoints, credential and user ownership validation, and integration coverage for CRUD plus missing-resource edge cases.
- **2026-03-23** — Completed Relationship & Query Endpoints with aggregated credential detail responses, `/api/credentials/{id}/ce-records`, service-layer CE hour/progress calculations, and optional credential filters for user, status, type, and search.
- **2026-03-23** — Completed the public landing page with screenshot-backed product previews, healthcare-focused marketing sections, responsive login and sign-up modals, public `/` routing, and frontend verification through build and tests.
- **2026-03-23** — Completed auth integration with Spring Security + JWT backend endpoints, Angular auth state/bootstrap/guards/interceptor, reactive login and sign-up modal submission, real shell identity/logout behavior, and live dashboard data loading for authenticated users.
- **2026-03-23** — Completed the frontend API foundation with environment-based API configuration, shared API helpers and error parsing, typed auth/credential/CE/dashboard models, reusable dashboard/credential/CE services, auth compatibility updates, and focused frontend verification for endpoint paths, query params, and interceptor behavior.
- **2026-03-23** — Completed dashboard live data integration with a real aggregated `/api/dashboard` backend endpoint, dashboard stats/expirations/CE attention/recent activity wiring, preserved drawer interactions, and explicit dashboard loading, empty, and error states verified through backend and frontend tests/builds.
- **2026-03-23** — Completed landing page dark mode with a subtle header toggle, persistent landing-only theme state, dark-mode auth modal styling, and matched light/dark landing screenshots without layout shifts.
- **2026-03-23** — Completed credential live data integration with a real credentials page, live credential detail drawer fetching from dashboard and list interactions, backend-driven search and filtering, credential loading/error/empty states, and removal of credential-related mock reads.
- **2026-03-23** — Completed CE live data integration with real CE rows inside credential drawers, a dedicated live CE detail drawer fetch flow, a real CE records page with linked credential context, CE loading/error/empty states, and removal of mock CE read paths.
- **2026-03-23** — Completed seed data integration and mock removal stabilization by verifying the app no longer depends on frontend runtime mocks, documenting local seed-data expectations and seeded login details, and aligning the project README with the current live-data application state.
- **2026-03-24** — Completed credential write flows with JWT-scoped credential mutations, add/edit/delete UX across dashboard and credentials page, typed reactive form validation, live post-mutation refresh behavior, and dashboard/landing page UI polish for button consistency and header hierarchy.
- **2026-03-24** — Completed CE write flows with JWT-scoped CE mutations, shared add/edit modal styling, dashboard and CE page entry points, delete confirmation handling, centered modal presentation from drawers, and live refresh of credential, dashboard, and CE record views after mutation.
- **2026-03-24** — Completed Credentials Page UI Refresh with dashboard-matching card backgrounds, a redesigned full-width rounded search bar with visible fill and border, and chip-style filters grouped by Status and Type labels replacing the previous select dropdowns.
- **2026-03-24** — Completed CE Records Page UI Refactor by replacing large card layouts with a scalable table view, adding structured columns for CE data, introducing credential and certificate chip-based filters, enabling row-click and action icon drawer interactions for CE details, and adding summary cards with paginated results while aligning styling with the dashboard and credentials pages
- **2026-03-24** — Completed CE Records mobile responsiveness with stacked mobile card layouts, improved spacing for the mobile title/content sections, dark-mode card cleanup to remove table-like separators, and preserved desktop table behavior.
- **2026-03-24** — Completed Cloudinary backend integration with secure server-side certificate upload configuration, authenticated upload endpoint, file validation, Cloudinary-hosted asset response DTOs, and backend verification for valid and invalid upload flows.
- **2026-03-24** — Completed certificate upload UI integration with CE form file selection, authenticated backend upload wiring, Cloudinary-backed certificate metadata persistence, inline upload status and error handling, reliable PDF/image certificate viewing, direct remove actions in form and drawer flows, and cleanup of replaced or deleted certificate assets.
- **2026-03-24** — Completed CE report backend support with an authenticated per-credential report endpoint, report-specific DTOs for credential and CE summary data, newest-first CE record ordering, reused aggregation logic, user-scoped validation, and backend verification for totals and access control.
- **2026-03-24** — Completed CE report UI and print flow with a credential-specific report view, typed frontend report models and service wiring, clean loading/empty/error states, browser print support with print-specific styling, credentials-page and drawer entry points, and verified printable CE summary output.
- **2026-03-24** — Completed CE report UI refinement with a stronger audit-ready header, authenticated user display, clearer CE progress emphasis, grouped summary sections, improved CE record table readability, styled certificate indicators, and stronger print or PDF page handling.
- **2026-03-24** — Completed CE report layout cleanup by removing duplicated header and summary content, restoring a single clean report header, simplifying the credential summary into a compact grid, keeping the CE records table print-friendly, and reducing the PDF output to one disciplined bottom summary section.
- **2026-03-24** — Completed CE report and credentials polish with clearer credentials-page CE report actions, cleaned card affordances, dark-mode-safe printable report output, stabilized CE summary and table layout, proper print header repetition through native table headers, multi-page CE records support, and final print overflow cleanup for certificate text.
- **2026-03-24** — Completed Settings Page + Account Profile Management with an authenticated avatar menu, dedicated `/settings` route, JWT-scoped self-service profile read/update endpoints, name/email validation and conflict handling, reactive settings form feedback, and frontend/backend verification for profile management flows.
- **2026-03-24** — Completed Settings Security - Change Password with a dedicated Security section on `/settings`, a focused password-change modal, JWT-scoped self-service password update endpoint, current-password verification, client and server validation, success and error feedback, and frontend/backend verification for password-change behavior.
- **2026-03-25** — Completed Performance Polish with a global `ut-fade-in` transition applied to all loaded content (dashboard, credentials, CE records, settings, drawers), CE records summary card skeletons during load to prevent layout shift, and theme-aware skeleton gradients across all loading states replacing light-mode-only `color-mix(…, white)` values.
