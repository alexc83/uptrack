# Current Feature

None

## Status

Idle

## Purpose

No active feature. Refer to the history below for completed work and use the next feature spec to populate this file when work begins.

## Scope

- None.

## Out of Scope

- N/A.

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
