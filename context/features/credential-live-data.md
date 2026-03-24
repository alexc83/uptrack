# Feature: Credential Live Data Integration

## Goal

Connect the credential-related frontend experiences to real backend data so credential details, credential drawers, and credential collection views stop depending on mock data and begin reflecting the actual MySQL-backed API.

This feature is primarily about **reading live credential data**, not full mutation flows yet.

---

## Context

UpTrack’s backend already includes credential CRUD plus relationship/query endpoints. The frontend already has a reusable drawer system and dashboard-triggered credential interactions.

This feature should connect those existing UI pieces to the real API:

- credential detail drawer
- credential list / collection rendering if present
- dashboard-to-drawer credential interactions
- credential search and filtering where already supported

---

## Scope

Implement:

1. live credential detail fetch
2. live credential list fetch for any existing credential collection page
3. live data wiring for the credential detail drawer
4. dashboard item click → real credential lookup
5. overflow drawer item click → real credential lookup
6. credential list filters/search integration if the UI already exists
7. empty/error/loading states for credential data

Do not implement:
- add credential modal/form submission
- edit credential submission
- delete credential submission
- CE record mutation
- certificate upload
- redesign of drawer visuals

---

## Relevant Backend Endpoints

Use the existing backend credential endpoints.

### List
`GET /api/credentials`

Supports optional:
- `?status=`
- `?type=`
- `?search=`

### Detail
`GET /api/credentials/{id}`

This endpoint should return:
- core credential fields
- computed status
- CE summary values
- associated CE records

If the backend currently returns slightly different field names, align through the service/model layer rather than changing every component.

---

## UI Areas Covered

### 1. Credential Detail Drawer
This is the highest-priority integration target.

The drawer should stop relying on mock detail objects and instead fetch or consume real credential detail DTOs.

Required content to support:
- credential name
- issuing organization
- type
- derived status
- expiration date
- renewal cycle
- required CE hours
- CE progress
- CE record list summary
- footer actions (still UI-only if mutations are not wired yet)

Rules:
- opening the drawer from dashboard or list views should show real data
- support loading state inside the drawer body
- support error state inside the drawer body
- support empty CE record section cleanly if no linked CE records exist

---

### 2. Credential Collection Page
If a credentials page already exists beyond placeholder level, wire it to real list data.

Support:
- fetching credential summaries from backend
- rendering real cards/rows
- status pills and quick facts
- opening the detail drawer from a selected credential

If the credentials page is still mostly placeholder UI, only do the minimal integration needed to avoid fake content and keep scope controlled.

---

### 3. Dashboard / Overflow Drawer Selection
When a user clicks:
- an upcoming expiration item
- a CE attention item that maps to a credential
- a credential in the overflow list drawer

the resulting credential drawer should open using the real credential id and display real backend detail.

Requirements:
- preserve the existing interaction pattern
- avoid duplicating credential data fetch logic in multiple components
- centralize the detail fetch in a credential-focused service or drawer container where practical

---

## Search and Filtering

If the credentials page UI already exposes filter/search controls, wire them to the backend query params.

Supported params:
- `status`
- `type`
- `search`

Requirements:
- debounce search only if simple to add and already fits the codebase
- reset list results correctly when filters change
- handle zero-result states cleanly
- do not perform frontend-only filtering once backend filtering is live, unless clearly intentional

---

## Data Mapping Requirements

Backend DTOs may not match the exact view shape the drawer/card components want. Create a clear mapping layer if needed.

Examples of useful mapped values:
- formatted expiration date label
- days remaining text
- CE percent complete
- hours summary text
- status badge presentation fields

Rules:
- do not push formatting logic deep into multiple templates
- do not store computed presentation fields in backend DTO models
- keep mapping readable and local to the feature

---

## Loading / Empty / Error States

### Drawer loading
Show a compact skeleton or placeholder inside the drawer.

### Drawer error
Show a clean error message with optional retry action.

### Empty CE section
If a credential has no CE records:
- show “No CE records yet”
- keep the existing Add CE action visible if already part of the drawer UI

### Empty credential list
If no credentials match filters:
- show a calm empty state
- optionally prompt the user to add a credential later, but do not implement that flow in this feature

---

## Mock Data Removal Rules

For credential-related reads:
- stop using `mock-data.ts` as the data source
- remove mock credential detail objects/helpers that are no longer needed
- preserve only temporary mock usage in features not yet integrated

---

## Acceptance Criteria

This feature is complete when:

1. credential detail drawer is backed by real API data
2. credential selection from dashboard/overflow views opens real detail
3. any existing credential collection page reads from `GET /api/credentials`
4. filters/search use backend query params if the UI already exposes them
5. credential CE summary values shown in the drawer come from real backend responses
6. loading, empty, and error states are handled cleanly
7. credential-related mock reads are removed

---

## Implementation Guidance for Claude Code / Codex

- Prioritize the credential detail drawer first.
- Preserve the current drawer design and interaction model.
- Keep live-data fetch logic centralized and readable.
- Do not mix create/edit/delete work into this feature unless required for compilation.
- Make the drawer feel real without expanding scope into full mutation flows.
