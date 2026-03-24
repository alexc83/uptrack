# Feature: CE Write Flows

## Goal

Implement the real create, edit, and delete flows for CE records from the Angular frontend using the existing backend API, while fitting naturally into the credential-detail-centered workflow already established in UpTrack.

This feature completes the core CE management loop for the MVP.

---

## Context

UpTrack is designed so a user can inspect a credential, see its current CE progress, and add or manage CE records without losing context. The drawer spec and project overview both point toward a workflow where CE actions are launched from within or near credential detail.

The backend already supports CE CRUD. This feature wires those capabilities into the current frontend.

---

## Scope

Implement:

1. Add CE Record flow
2. Edit CE Record flow
3. Delete CE Record flow
4. reactive CE form validation
5. UI refresh of credential CE totals after mutation
6. drawer-to-modal and drawer-to-drawer workflow continuity

Do not implement:
- real certificate file upload
- certificate storage provider integration
- export/print flow
- bulk CE import
- full page redesign

You may include a placeholder certificate URL/text field only if that already exists in the backend contract.

---

## Relevant Backend Endpoints

Use the real CE endpoints exposed by the backend.

Preferred API direction from the project overview:
- `POST /api/credentials/{id}/ce-records`
- `PUT /api/ce-records/{id}`
- `DELETE /api/ce-records/{id}`

If the existing backend still uses a slightly different create route, align cleanly through the frontend service layer.

Expected request payload fields:
- title
- provider
- hours
- dateCompleted
- certificateUrl (nullable or optional)
- credential linkage as required by the actual backend contract

---

## Interaction Pattern Requirements

### Add CE Record
Preferred UX:
- launch from within the credential detail drawer using the existing `Add CE Record` action
- open a focused modal for data entry

Why:
- adding one CE record is a bounded task
- the credential drawer remains the user’s context anchor
- this matches the page → drawer → modal interaction philosophy already defined for UpTrack

---

### Edit CE Record
Preferred UX:
- open from the CE record detail drawer
- either:
  1. switch that drawer into edit mode, or
  2. open a modal prefilled with the CE record data

Recommended MVP choice:
- use the approach that fits the existing codebase with the least friction
- keep the user close to the parent credential context

---

### Delete CE Record
Deleting a CE record should require confirmation.

Requirements:
- user must confirm before deletion
- after success, the CE record disappears from the credential drawer list
- linked credential CE totals/progress refresh immediately
- if the CE record detail drawer is open, it should close or transition safely after deletion

---

## CE Form Requirements

Use Angular reactive forms.

Fields:
- title
- provider
- hours
- date completed
- optional certificate URL or reference field if already supported

Validation:
- title required
- provider required
- hours required and greater than 0
- date completed required
- optional certificate URL field can remain lightly validated unless stricter backend rules already exist

Do not add file upload behavior in this feature.

---

## Parent Credential Refresh Requirements

This is the most important part of the CE workflow.

After CE create/update/delete, refresh the affected credential detail so the user immediately sees updated:

- CE hours earned
- CE progress percent
- CE record count
- CE record list
- any related dashboard CE attention/progress summaries

Acceptable MVP strategy:
- refetch the parent credential detail after each successful CE mutation
- also refetch dashboard data if the dashboard is visible or cached in memory

Do not leave the parent credential drawer showing stale CE progress.

---

## UI Flow Examples

### Add flow
1. user opens a credential detail drawer
2. clicks `Add CE Record`
3. CE modal opens
4. user submits valid form
5. modal closes on success
6. credential drawer refreshes with new CE record and updated totals
7. dashboard summaries refresh if needed

### Edit flow
1. user clicks a CE record from the credential drawer
2. CE detail drawer opens
3. user chooses edit
4. form opens with current values
5. submit success updates both CE detail and parent credential totals

### Delete flow
1. user opens CE detail
2. user chooses delete
3. confirmation appears
4. delete succeeds
5. CE detail closes
6. parent credential drawer refreshes
7. dashboard summaries refresh if needed

---

## Error Handling

Support visible, user-friendly errors.

Examples:
- invalid form input
- network failure
- backend validation failure
- CE record no longer exists
- stale credential linkage

Requirements:
- keep the modal/drawer open on failure
- show inline and/or top-level form errors
- do not silently fail
- clear prior submit errors when the user retries

---

## Empty State Impact

Adding a first CE record should transition a credential from:
- “No CE records yet”
to
- a populated CE list with updated totals

Deleting the last CE record should transition back to the proper empty state cleanly.

---

## Acceptance Criteria

This feature is complete when:

1. users can add CE records from the frontend
2. users can edit CE records from the frontend
3. users can delete CE records with confirmation
4. CE form validation works cleanly
5. parent credential totals/progress refresh after every successful mutation
6. dashboard summaries update as needed after CE mutations
7. no CE mutation path depends on mock data

---

## Implementation Guidance for Claude Code / Codex

- Keep the parent credential context central to the CE workflow.
- Reuse existing modal and drawer components wherever possible.
- Prefer straightforward refetch-after-success logic.
- Do not expand scope into file upload in this feature.
- Make sure CE mutations visibly change the credential progress UI right away.
