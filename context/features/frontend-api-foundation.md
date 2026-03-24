# Feature: Frontend API Foundation

## Goal

Create the shared frontend API foundation for UpTrack so the Angular app can stop depending on local mock-only structures and begin consuming real Spring Boot REST data in a clean, typed, reusable way.

This feature is the plumbing layer for all later live-data work.

---

## Why This Feature Exists

The dashboard, drawers, landing page, and auth modals now exist on the frontend. The backend REST API also exists. Before wiring individual screens one by one, the frontend needs a stable API foundation:

- environment-aware base URL
- shared HTTP services
- strongly typed request/response models
- consistent query parameter handling
- predictable error handling
- reusable mapping between backend DTOs and UI view models where needed

This should be a real foundation, not a quick patch inside each component.

---

## Scope

Implement:

1. frontend API base configuration
2. shared request/response models
3. HTTP services for dashboard, credentials, and CE records
4. shared query param builders where helpful
5. shared API error handling helpers
6. minimal mapper/util structure if needed
7. replacement strategy for importing data from `mock-data.ts`

Do not implement:
- full page-by-page live data wiring in this feature
- create/edit/delete UI flows
- certificate upload
- export/download logic
- new visual UI redesigns

This feature should prepare the app for those later steps.

---

## Project Areas to Create or Refine

Suggested structure:

```text
src/app/core/api/
  api.config.ts
  api.helpers.ts
  api-error.model.ts

src/app/models/
  auth.models.ts
  dashboard.models.ts
  credential.models.ts
  ce-record.models.ts
  common.models.ts

src/app/services/
  dashboard.service.ts
  credential.service.ts
  ce-record.service.ts
```

If the current codebase already has some of these folders, extend the existing structure instead of duplicating it.

---

## Environment Requirements

Set up frontend environment-based API configuration.

Expected environment values:
- production-safe API base URL token
- development API base URL

Example direction:
- `http://localhost:8080/api` for local development
- environment-specific override later for deployed backend

Requirements:
- do not hardcode the backend URL in every service
- use a single source of truth for the API base path
- keep the setup beginner-friendly and easy to trace

---

## Model Requirements

Create strict TypeScript interfaces/types for the real backend DTOs.

At minimum include:

### Common
- UUID/string id type conventions
- pageless list response assumptions if used
- API error response shape

### Dashboard
Models for the aggregated dashboard response, including:
- stat counts
- expiring credentials items
- CE attention/progress items
- recent activity if included by backend

### Credentials
Models for:
- credential summary/list item
- credential detail
- credential request payload
- credential filters/query params
- derived status enum/string union

### CE Records
Models for:
- CE record summary
- CE record detail
- CE record request payload
- search/filter params if needed

Keep the frontend models aligned with the backend DTOs described in the project overview.

---

## Service Requirements

Build typed Angular services using `HttpClient`.

### DashboardService
Should support:
- `getDashboard()`

Endpoint:
- `GET /dashboard`

### CredentialService
Should support:
- `getCredentials(filters?)`
- `getCredentialById(id)`
- `createCredential(payload)`
- `updateCredential(id, payload)`
- `deleteCredential(id)`
- `getCredentialCeRecords(credentialId, params?)`

Endpoints:
- `GET /credentials`
- `GET /credentials/{id}`
- `POST /credentials`
- `PUT /credentials/{id}`
- `DELETE /credentials/{id}`
- `GET /credentials/{id}/ce-records`

### CERecordService
Should support:
- `createCeRecord(credentialId, payload)` if backend is nested
- `updateCeRecord(id, payload)`
- `deleteCeRecord(id)`

If the backend still exposes older non-nested CE creation endpoints, align the service with the actual backend implementation but prefer the nested workflow from the project overview for ongoing direction.

---

## Query / Filter Handling

Support clean query parameter construction for credential list requests.

Likely filters:
- `status`
- `type`
- `search`

Requirements:
- omit empty params cleanly
- keep query param logic out of components where practical
- use a small helper if it improves readability

---

## Error Handling Requirements

Create a shared API error shape and helper utilities.

Requirements:
- parse backend error responses predictably
- give components a clean way to show user-friendly messages
- do not couple every component to raw `HttpErrorResponse` parsing
- preserve enough detail for debugging in dev mode

A tiny helper like `getApiErrorMessage(error)` is fine if that keeps things simple.

---

## Mock Data Transition Rules

This feature should begin the transition away from `mock-data.ts`, but not fully remove it yet unless that is necessary for clean compilation.

Rules:
- do not break existing UI while building the service layer
- it is acceptable for components to still use mock data temporarily until the next integration features are completed
- however, all new data access logic should flow through the real services, not through new mock helpers

---

## Testing / Verification Expectations

At minimum verify:
- services compile cleanly with strict typing
- API calls hit the correct endpoint paths
- query params are built correctly
- auth interceptor compatibility is preserved
- no duplicate base URL strings are scattered throughout the app

Unit tests are nice if the project already has a pattern for them, but not required for this feature unless easy to add.

---

## Acceptance Criteria

This feature is complete when:

1. the frontend has a single API base configuration
2. dashboard, credential, and CE services exist with typed methods
3. request/response DTOs are modeled in TypeScript
4. credential query/filter support exists cleanly
5. shared API error parsing/helper support exists
6. future live-data features can consume these services without redoing plumbing
7. the codebase is clearly moving away from `mock-data.ts`

---

## Implementation Guidance for Claude Code / Codex

- Focus on infrastructure, not UI behavior.
- Reuse existing Angular patterns where possible.
- Avoid overengineering generic API abstractions.
- Prefer explicit typed services over a magic catch-all data service.
- Keep model names and service names obvious and consistent.
