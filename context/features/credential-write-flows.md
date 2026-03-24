# Feature: Credential Write Flows

## Goal

Implement the real create, edit, and delete flows for credentials from the Angular frontend using the existing backend API, while preserving UpTrack’s interaction philosophy:

- pages for browsing
- drawers for detail and editing context
- modals for short focused actions
- lightweight confirmation for destructive actions

This feature turns credential management into a working end-to-end user workflow.

---

## Context

The backend already supports credential CRUD. The frontend already has dashboard, drawer, and modal patterns in place. The project overview also defines add/edit credential as a core MVP workflow with inline validation and quick contextual actions.

This feature should wire the existing UI patterns to real credential mutations.

---

## Scope

Implement:

1. Add Credential flow
2. Edit Credential flow
3. Delete Credential flow
4. reactive form validation
5. success/error handling
6. UI refresh after mutation
7. integration with dashboard and drawer refresh behavior

Do not implement:
- CE record mutation
- certificate upload
- bulk actions
- advanced autosave/draft behavior
- major redesign of existing UI

---

## Relevant Backend Endpoints

Use the real credential endpoints:

- `POST /api/credentials`
- `PUT /api/credentials/{id}`
- `DELETE /api/credentials/{id}`

Payloads should align with the real credential request DTO used by the backend.

Expected fields:
- name
- type
- issuingOrganization
- expirationDate
- renewalCycleMonths
- requiredCEHours

The authenticated user context should come from the backend auth layer rather than asking the frontend to send arbitrary `userId`, if that auth scoping has already been implemented.

---

## Interaction Pattern Requirements

### Add Credential
Use a **modal** for the add flow if the current UI already follows that pattern.

Why:
- it is a focused, bounded input task
- it matches the app’s quick-action interaction model
- it keeps the user in context from dashboard or credentials page

If the current codebase already has a credential form area inside a page or drawer shell, reuse what exists rather than creating a conflicting second experience.

---

### Edit Credential
Preferred UX:
- open from the credential detail drawer
- editing can happen either:
  1. in the same drawer with editable form mode, or
  2. in a tightly related modal if that better fits the current codebase

Recommended MVP choice:
- keep editing closely tied to the selected credential context
- do not navigate away to a totally different page unless the current UI structure strongly pushes that direction

---

### Delete Credential
Delete should require confirmation.

Use:
- a small confirm modal/dialog, or
- an existing PrimeNG confirm dialog if it fits the design

Rules:
- make clear that deleting a credential also removes linked CE records if that is true in the backend
- prevent accidental single-click destructive deletion
- after delete, close any stale drawer state and refresh relevant lists/panels

---

## Credential Form Requirements

Use Angular reactive forms with strict typing where practical.

Fields:
- credential name
- type (`LICENSE` or `CERTIFICATION`)
- issuing organization
- expiration date
- renewal cycle months
- required CE hours

Validation:
- name required
- type required
- issuing organization required
- expiration date required
- renewal cycle months non-negative if provided
- required CE hours non-negative if provided

If the backend enforces additional validation, mirror the most important rules in the form where it improves UX.

---

## UX Requirements

### Add flow
- user opens “Add Credential”
- form is blank
- submit button disabled or protected while invalid/submitting
- success closes modal and refreshes the UI
- dashboard stats / previews update after creation
- if the user is currently in a list page, the new record should appear after refresh or optimistic insertion

### Edit flow
- drawer shows current credential values
- user clicks edit
- form loads with existing values
- success updates the visible drawer data and any impacted dashboard/list data

### Delete flow
- user confirms deletion
- backend delete succeeds
- drawer closes if that credential was open
- dashboard/list/overflow content refreshes
- any stale references to the deleted credential are cleared

---

## Refresh Strategy

After a successful create/update/delete:

Refresh the minimum necessary live data cleanly.

Likely areas impacted:
- dashboard stats
- upcoming expirations preview
- CE attention/progress preview
- credential list page
- currently open drawer content

Acceptable MVP strategies:
- refetch impacted data after mutation
- avoid premature complex cache invalidation systems

Do not leave the UI stale after mutations.

---

## Error Handling

Support visible, user-friendly errors.

Examples:
- validation failure from backend
- duplicate/conflicting data if backend rejects it
- network failure
- delete blocked or failed unexpectedly

Requirements:
- show inline form errors where practical
- show top-level submit error if needed
- keep the modal/drawer open on failure
- do not silently fail

---

## Empty State Impact

Credential creation may be the user’s first real record.

If the app currently shows empty states in dashboard or credential pages, a successful create should transition the user cleanly from empty to populated UI without requiring a full manual refresh.

---

## Acceptance Criteria

This feature is complete when:

1. users can create credentials from the frontend
2. users can edit credentials from the frontend
3. users can delete credentials with confirmation
4. form validation works cleanly
5. success and error states are shown appropriately
6. dashboard/list/drawer data refreshes correctly after mutation
7. no credential mutation path relies on mock data

---

## Implementation Guidance for Claude Code / Codex

- Reuse existing modal/drawer patterns instead of inventing new ones.
- Keep forms strongly typed and readable.
- Prefer simple refetch-after-success over complex client caching.
- Preserve the current visual design.
- Make the workflow feel solid and complete before adding extra polish.
