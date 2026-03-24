# Feature: Seed Data Integration and Mock Removal

## Goal

Move UpTrack from frontend prototype mode to real app mode by loading database seed data into MySQL, verifying live API-backed rendering, and removing remaining `mock-data.ts` dependencies that are no longer needed.

This feature is about **stabilizing the live-data transition** after auth, dashboard, credential, and CE integrations are in place.

---

## Why This Feature Exists

Once the frontend is talking to the real backend, the app still needs realistic data to prove the full experience works. Right now the project has relied heavily on mock data for UI development.

This feature formalizes the switch:
- import realistic dummy SQL data into MySQL
- validate that the backend returns the expected records
- confirm the frontend renders real values correctly
- retire the old mock-data file and related helpers where safe

This is the moment the app stops behaving like a mock prototype.

---

## Scope

Implement:

1. load or document loading of a seed SQL file into MySQL
2. verify relational data integrity between users, credentials, and CE records
3. confirm the frontend works against real seeded data
4. remove remaining runtime dependencies on `mock-data.ts`
5. clean up no-longer-needed mock mappers/helpers/constants
6. document any small backend/frontend shape mismatches discovered and resolve them

Do not implement:
- brand new product features
- major UI redesign
- certificate upload
- export/download
- full automated end-to-end testing suite unless small smoke tests are easy to add

---

## Seed Data Requirements

Use the existing SQL seed file the user already has, or create a clean seed script if minor changes are needed to match the current schema.

The seed data should include at minimum:

### Users
At least one realistic user account that can log in.

### Credentials
A variety of records such as:
- active license
- expiring-soon license
- expired certification
- credential with no CE requirement if that case exists
- credential with CE requirement and progress in multiple ranges

### CE Records
A realistic spread of CE records linked to those credentials:
- some credentials with multiple CE records
- some with none
- some complete
- some incomplete
- certificate URLs populated for some but not all records if supported

The seed set should help exercise:
- stats cards
- expiration previews
- CE progress previews
- drawer detail views
- empty states where appropriate

---

## Database Loading Requirements

Ensure the seed-loading approach is clear and repeatable.

Acceptable approaches:
- a documented `.sql` import step
- a backend resource SQL initializer if already appropriate
- a dev-only seed process

Requirements:
- do not hardcode production credentials
- do not make seeding destructive without clearly documenting it
- make the process understandable for future local setup

If the user already has a SQL seed file, prefer using it rather than inventing a second competing seed source.

---

## Frontend Verification Areas

After seeding, verify all of the following render correctly from the database-backed API:

1. dashboard stats
2. upcoming expirations preview
3. CE attention/progress preview
4. recent activity if supported
5. credential detail drawer
6. CE record detail drawer
7. any credential list page
8. any CE records page
9. login flow using seeded user credentials

Fix any DTO/UI mismatches discovered during this work.

---

## Mock Removal Requirements

Once live data is working, remove or retire `mock-data.ts` and related mock-only plumbing.

Rules:
- do not remove mock code that is still required for unfinished isolated experiments
- do remove any runtime dependency that affects the main app experience
- if useful, keep archived mock examples in a non-runtime dev location, but they should no longer drive the app

Likely cleanup areas:
- mock dashboard calculators
- placeholder user identity data
- mock credential arrays
- mock CE arrays
- mock activity feeds if the real app now provides them

---

## Shape Alignment Work

This feature is allowed to fix small mismatches between frontend expectations and backend DTOs.

Examples:
- field name mismatch
- status formatting mismatch
- missing hours summary field
- inconsistent date shape
- null handling problems

Rules:
- prefer small targeted fixes
- do not rewrite whole layers unless truly necessary
- keep the contract between backend and frontend clearer after this feature than before

---

## Documentation Expectations

Provide a short developer-facing note or README update covering:
- how to load the SQL seed data
- any credentials for local seeded login
- what mock dependencies were removed
- any known remaining gaps

This can be a markdown file or a short README section.

---

## Acceptance Criteria

This feature is complete when:

1. realistic seed data is loaded into MySQL
2. login works against a seeded user
3. dashboard and drawer data render from the real database
4. remaining main-app runtime dependence on `mock-data.ts` is removed
5. small data-contract mismatches discovered during seeding are resolved
6. the local setup process for seeding is documented

---

## Implementation Guidance for Claude Code / Codex

- Treat this as a stabilization feature, not a flashy feature.
- Be methodical.
- Prefer removing mocks only after confirming the live path works.
- Do not invent extra fake data in the frontend.
- Leave the app in a state where a developer can run it, seed it, log in, and see realistic content end to end.
