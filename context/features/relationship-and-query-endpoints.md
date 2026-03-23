# Feature: Relationship & Query Endpoints

## Goal
Implement endpoints that reflect real UpTrack workflows.

## Credential-based CE queries

### Endpoint:
GET /api/credentials/{id}/ce-records

Returns all CE records tied to a credential.

## Credential Detail View

### Endpoint:
GET /api/credentials/{id}

Must include:
- credential fields
- computed status
- total CE hours earned
- CE progress (earned / required)
- list of CE records

## CE Aggregation Logic

In service layer:

- ceHoursEarned = SUM(hours)
- ceProgress = ceHoursEarned / requiredCEHours

## Optional Filters (if time allows)

GET /api/credentials?status=ACTIVE
GET /api/credentials?type=LICENSE
GET /api/credentials?search=RN

## Notes

- All calculations must happen in service layer
- Do NOT store computed fields in database
- Keep controller thin
- Keep queries scoped to userId