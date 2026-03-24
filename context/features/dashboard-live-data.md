# Feature: Dashboard Live Data Integration

## Goal

Replace the dashboard’s mock-data-driven rendering with real data from the Spring Boot backend using the aggregated dashboard API.

The dashboard UI already exists. This feature makes it real.

---

## Context

The project overview defines a single dashboard endpoint:

- `GET /api/dashboard`

The backend is intended to return the entire dashboard payload in one aggregated response so the Angular frontend can render the full dashboard without making multiple additional API calls.

The dashboard UI has already been implemented with summary cards, upcoming expirations, CE progress/attention sections, recent activity, and drawer triggers. This feature should keep the current visual design intact while replacing mock inputs with real backend data.

---

## Scope

Implement:

1. connect dashboard page to `DashboardService`
2. remove direct dependency on `mock-data.ts` for dashboard rendering
3. map backend dashboard DTOs into the existing UI needs
4. support loading state
5. support empty state
6. support error state
7. preserve existing light/dark mode styling
8. preserve existing drawer trigger behavior

Do not implement:
- create/edit/delete mutations
- credential list page live integration
- CE page live integration
- auth flow
- redesign of dashboard layout

---

## Expected Backend Endpoint

### Endpoint
`GET /api/dashboard`

### Expected response content
Include enough data to drive:
- total credentials count
- active credentials count
- expiring soon count
- expired count
- upcoming expirations preview
- CE attention/progress preview
- recent activity

If the current backend response differs slightly from this ideal shape, adapt the frontend mapping layer cleanly rather than hacking each component individually.

---

## Dashboard Data Areas to Integrate

### 1. Header Greeting
Continue to show:
- contextual greeting based on local time
- authenticated user first name if available

Preferred source of user name:
- current auth user state

If the dashboard response also includes user-facing summary data, do not duplicate unnecessary user identity logic.

---

### 2. Stats Cards
Replace mock-derived counts with backend values:

- Total Credentials
- Active
- Expiring Soon
- Expired

These values should come directly from the dashboard API response if available.

Do not recalculate them on the frontend if the backend already provides them.

---

### 3. Upcoming Expirations Panel
Use real backend expiration items.

Each item should continue to support the existing UI fields:
- credential name
- issuing organization
- type
- status / days remaining
- expiration date label

Rules:
- show up to 3 items in the preview card
- if more than 3 exist, show the existing “view all” action
- preserve the current interaction that opens the overflow drawer

If the backend returns more than needed, the preview truncation should happen in the frontend view layer.

---

### 4. CE Progress / CE Attention Panel
Use real backend CE summary data.

Each item should support:
- credential name
- progress percent
- hours earned vs required
- optional remaining hours helper
- any urgency metadata the current UI expects

Rules:
- show up to 3 items in the preview card
- if more than 3 exist, preserve the current “view all” drawer flow

If the panel is currently named slightly differently in the UI, keep the existing visible label unless product direction requires a rename.

---

### 5. Recent Activity
Replace mock recent activity with real backend activity items if the backend already exposes them.

If the backend does **not** yet expose recent activity:
- support one of these approaches cleanly:
  1. temporary empty state with a note in the code that recent activity awaits backend support, or
  2. derive a simplified activity feed from existing response data only if that derivation is straightforward and not misleading

Do not invent fake activity once the rest of the dashboard is live.

Preferred approach:
- use backend activity if available
- otherwise render an honest empty state

---

## Component Integration Rules

Keep the existing component structure where practical.

Likely areas to update:
- dashboard page container
- dashboard mappers/helpers
- stats card component inputs
- upcoming expirations component inputs
- CE progress/attention component inputs
- recent activity component inputs

Requirements:
- components receive already-shaped data where practical
- avoid scattering raw API shape assumptions across many child components
- keep mapping logic close to the dashboard feature, not inside generic shared components

---

## Loading / Empty / Error States

Support polished states without redesigning the layout.

### Loading
- skeleton rows or lightweight placeholders are fine
- maintain panel/card shape while loading if practical

### Empty
Examples:
- no credentials yet
- no upcoming expirations
- no credentials currently need CE attention
- no recent activity

Use calm, product-appropriate empty states.

### Error
If the dashboard API fails:
- show a visible but non-disruptive error block in the main dashboard area
- optionally include a retry button
- do not crash the shell or sidebar layout

---

## Mock Data Removal Rules

For the dashboard feature specifically:
- stop importing dashboard content from `mock-data.ts`
- remove unused dashboard-only mock mappers/helpers
- leave unrelated mock usage alone if later features still need it

The goal is dashboard live data, not a whole-app cleanup in one step.

---

## Acceptance Criteria

This feature is complete when:

1. dashboard data comes from `GET /api/dashboard`
2. mock dashboard content is no longer the source of truth
3. stats cards show real values from the backend
4. upcoming expirations preview shows real backend data
5. CE progress/attention preview shows real backend data
6. recent activity is either real or honestly empty if not yet supported
7. existing drawer trigger behavior still works
8. loading, empty, and error states are handled cleanly
9. the current dashboard design remains intact

---

## Implementation Guidance for Claude Code / Codex

- Do not redesign the dashboard.
- Reuse the current dashboard components.
- Keep API-to-view-model shaping near the dashboard feature.
- Preserve the current “show 3 then view all” behavior.
- Make the smallest reasonable changes needed to swap the data source from mock to real.
