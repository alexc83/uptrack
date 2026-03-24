# UpTrack Feature Spec 03 — CE Report Backend Endpoint

## Overview

Implement the backend endpoint and supporting service logic for generating a per-credential CE report.

This feature should provide the data needed for a printable CE summary/export flow in the frontend. It should aggregate credential details, associated CE records, and earned-hours totals into a clean response shape.

---

## Goal

Create a backend endpoint that returns all report-ready CE data for a single credential owned by the authenticated user.

---

## In Scope

- Add a report-focused endpoint for one credential.
- Return credential summary information.
- Return associated CE records in a print-friendly order.
- Return earned-hours totals and requirement/progress summary values.
- Reuse existing user-scoped authorization and validation rules.
- Add backend tests where practical.

---

## Out of Scope

- No frontend report UI yet.
- No actual PDF generation on the backend.
- No multi-credential export.
- No CSV export unless already trivial and explicitly requested later.

---

## Requirements

### 1) Endpoint

Create a backend endpoint for report data, for example:
- `GET /api/credentials/{id}/ce-report`

The endpoint should:
- require authentication
- ensure the credential belongs to the authenticated user
- return a dedicated response DTO for report rendering

### 2) Response Content

The report response should include at minimum:

#### Credential summary
- credential id
- credential name
- credential type
- issuing organization
- expiration date
- required CE hours
- derived status

#### CE summary
- total CE hours earned
- remaining hours if applicable
- progress percentage or ratio if helpful
- total CE record count

#### CE records list
Each record should include:
- title
- provider
- hours
- date completed
- certificate URL if present

### 3) Ordering

Return CE records in a sensible print-friendly order.

A good default is:
- newest completed date first

If the app already has a stronger convention, follow the existing pattern.

### 4) DTO Design

Use a report-specific DTO or nested DTOs.

Do not expose entities directly.

Keep the response shape easy for the Angular frontend to render in a printable layout.

### 5) Business Logic

Re-use existing CE aggregation logic where it makes sense.

Avoid duplicating logic if the same calculations already exist elsewhere.

### 6) Authorization and Validation

If the credential does not belong to the authenticated user, do not return report data.

Missing credential requests should return the same style of not-found response already used elsewhere.

### 7) Testing

Add tests that reasonably verify:
- happy path report response
- missing credential handling
- authenticated user scoping
- total hours / summary correctness

---

## Suggested Response Shape

A structure similar to this is appropriate:

```json
{
  "credential": {
    "id": "...",
    "name": "ACLS",
    "type": "CERTIFICATION",
    "issuingOrganization": "AHA",
    "expirationDate": "2027-05-15",
    "requiredCeHours": 8,
    "status": "ACTIVE"
  },
  "summary": {
    "totalHoursEarned": 6.5,
    "remainingHours": 1.5,
    "recordCount": 3,
    "progress": 0.8125
  },
  "records": [
    {
      "title": "ACLS Renewal",
      "provider": "AHA",
      "hours": 4,
      "dateCompleted": "2026-01-10",
      "certificateUrl": "https://..."
    }
  ]
}
```

The exact shape can vary, but it should be explicit and frontend-friendly.

---

## Acceptance Criteria

- Backend exposes a working authenticated CE report endpoint for one credential.
- Response includes credential summary, CE summary, and CE record details.
- Totals and progress values are correct.
- User scoping is enforced.
- Backend build passes.
- Relevant backend tests pass.

---

## Verification

Backend:
- Call the new endpoint for a credential with CE records.
- Confirm totals match the underlying data.
- Confirm missing credential behavior is correct.
- Confirm another user’s credential cannot be accessed.
- Run backend tests and build.

---

## Completion Log Entry

When completed, add a history entry similar to:

- **2026-03-24** — Completed CE report backend support with an authenticated per-credential report endpoint, report-specific DTOs for credential and CE summary data, ordered CE record output, user-scoped validation, and backend verification for totals and access control.
