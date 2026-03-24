# Feature: CE Live Data Integration

## Goal

Connect CE record views and CE-related drawer content to the real backend so the frontend reflects actual database-backed CE data rather than mock objects.

This feature focuses on **reading and displaying live CE record data**.

---

## Context

UpTrack’s credential detail view is designed to show associated CE records. The app also includes a CE record detail drawer and may include a CE records collection page.

The backend already supports:
- credential-scoped CE record queries
- CE record CRUD
- aggregated CE progress values on credential detail

This feature should connect the existing UI to that real data.

---

## Scope

Implement:

1. credential-linked CE records inside the credential detail drawer
2. CE record detail drawer live data
3. CE record list/collection page live data if present
4. CE-related empty/loading/error states
5. real CE item selection from credential drawers

Do not implement:
- add CE record form submission
- edit CE record submission
- delete CE record submission
- certificate upload/replace
- export/download logic
- redesign of CE UI

---

## Relevant Backend Endpoints

Use the existing CE-related endpoints.

### Credential-linked CE list
`GET /api/credentials/{id}/ce-records`

### CE update/delete endpoints
These exist but are out of scope for this read-focused feature unless needed to satisfy interface wiring.

### CE detail source
If the backend exposes `GET /api/ce-records/{id}`, use it for the CE detail drawer.
If it does not, and the credential detail payload already includes enough data, reuse that data where practical.

Preferred approach:
- use a dedicated CE detail fetch if available
- otherwise use existing loaded CE data cleanly without redundant calls

---

## UI Areas Covered

### 1. CE Records Inside Credential Drawer
The credential detail drawer should display the real list of CE records tied to that credential.

Each entry should support:
- title
- provider
- date completed
- hours earned
- certificate presence if known

Requirements:
- clicking a CE record opens the CE record detail drawer
- total hours / count summary should reflect real data
- empty state should show when no CE records exist

If the credential detail endpoint already includes CE records, avoid making an unnecessary second fetch unless that clearly improves clarity or keeps the data fresher.

---

### 2. CE Record Detail Drawer
The CE record detail drawer should show real data for the selected CE record.

Display fields should include:
- title
- provider
- completion date
- hours
- linked credential
- certificate/file availability

Requirements:
- drawer opens from clicking a CE record row
- support loading state if data is fetched on open
- support error state if retrieval fails
- preserve the current drawer shell and visual style

---

### 3. CE Records Page
If a CE records collection page already exists in meaningful form, wire it to real backend data.

Support:
- listing CE records
- opening record details
- showing linked credential context where useful

If the page is still mostly placeholder-level, keep changes minimal and focus on the drawer workflows first.

---

## Data Mapping Requirements

Create or refine CE view models as needed.

Likely mapped fields:
- formatted completion date label
- hours label
- certificate display label
- linked credential display text

Rules:
- do not bury formatting logic across multiple templates
- keep CE-specific mapping close to the feature
- preserve strong typing throughout

---

## Loading / Empty / Error States

### Credential drawer CE section
- loading placeholder while CE items are being resolved
- empty state: “No CE records yet”
- error state only if the CE section truly fails independently

### CE detail drawer
- loading state inside drawer
- friendly error message if detail cannot be loaded

### CE list page
- empty state when no records exist
- clear zero-results state if filters/search are later added

---

## Mock Data Removal Rules

For CE-related read flows:
- stop using mock CE record arrays as the source of truth
- remove mock CE detail objects/helpers that are no longer needed
- keep unrelated mock usage only where another future feature still depends on it

---

## Acceptance Criteria

This feature is complete when:

1. CE records shown in the credential drawer come from the real backend
2. clicking a CE row opens a real-data CE detail drawer
3. any existing CE records page uses real backend data
4. CE totals/counts shown in the UI reflect actual linked records
5. empty/loading/error states are handled cleanly
6. mock CE read paths are removed

---

## Implementation Guidance for Claude Code / Codex

- Prioritize CE data inside the credential drawer first.
- Keep the current drawer interaction model intact.
- Reuse existing loaded data where it is clean and accurate to do so.
- Avoid mixing mutation logic into this feature.
- Keep the implementation small, typed, and easy to trace.
