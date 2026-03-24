# UpTrack

UpTrack is a full-stack web application for healthcare professionals to manage licenses, certifications, and continuing education in one place.

The goal of the project is to deliver a polished SaaS-style experience with an Angular frontend and a Spring Boot backend, while demonstrating production-minded architecture, domain modeling, and implementation practices.

## What The Application Does

UpTrack is designed to help users:

- track professional credentials such as RN licenses, ACLS, BLS, PALS, CCRN, and similar certifications
- monitor expiration dates and derived status such as `ACTIVE`, `EXPIRING_SOON`, and `EXPIRED`
- log continuing education records tied to credentials
- keep certificate and renewal documentation organized
- review progress and upcoming risk areas from a dashboard instead of juggling spreadsheets, emails, and provider portals

## Tech Stack

### Frontend

- Angular 21 with standalone components
- TypeScript
- PrimeNG
- Angular Signals
- Vitest

### Backend

- Spring Boot 3.5
- Java 21
- Spring Data JPA
- MySQL
- JUnit 5 / Spring Boot Test

## Project Structure

```text
frontend/   Angular application
backend/    Spring Boot API
context/    project context, feature specs, screenshots, and working docs
```

## Progress So Far

### Completed Frontend Work

- Angular frontend bootstrapped with standalone components and PrimeNG
- Dashboard shell and navigation completed
- Dashboard UI Phase 1 completed:
  layout shell, sidebar, route structure, responsive navigation, and theme support
- Dashboard UI Phase 2 completed:
  summary stats, expiration panels, CE attention panels, recent activity, and polished responsive styling
- Drawer UI system completed:
  reusable right-side drawers for credential details, CE record details, and overflow lists from the dashboard

### Completed Backend Work

- Spring Boot backend bootstrapped with Maven and Java 21
- MySQL datasource configuration added for local development
- Backend scaffold foundation completed:
  layered package structure, JPA entities, repositories, DTO scaffolding, global exception handling, YAML configuration, and H2-backed test profile for backend tests

## Features Implemented Right Now

- Public landing page with login and sign-up modals
- JWT-based authentication with session restore and protected app routes
- Responsive Angular dashboard, credentials page, and CE records page
- Live dashboard stats, expirations, CE attention, recent activity, and drawer flows
- Live credential detail and CE record detail drawers
- Spring Boot REST API for users, credentials, CE records, dashboard aggregation, and auth
- MySQL-backed persistence for:
  `User`, `Credential`, and `CERecord`
- Shared backend exception handling and typed frontend API/service layers

## Features Still To Be Implemented

- Add/Edit credential modal flows
- Add/Edit CE record modal flows
- Wiring drawer action buttons to those future modal flows
- CE summary/export
- document upload integration
- user-scoped authorization
- deployment-ready production configuration

## Current Development Status

The project is now running as a real authenticated app against the backend instead of a frontend-only prototype. The remaining work is mostly around mutation workflows, document handling, export, and production hardening rather than replacing mock reads.

## Local Development

### Frontend

```bash
cd frontend
npm start
```

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

### Tests

Frontend:

```bash
cd frontend
npm test
```

Backend:

```bash
cd backend
./mvnw test
```

## Seed Data

The app is expected to run locally against MySQL with realistic seed data already loaded or imported manually.

Reference seed files in the repo:

- `test_data_v2.sql`
- `test_data.sql`

The main app no longer depends on frontend mock data for dashboard, credentials, or CE record reads.

### Seeded Login Expectations

The current local seed set is intended to support users such as:

- `alex@example.com`
- `jordan@example.com`

with the password:

- `password123`

Important:

- Spring Security login expects BCrypt-hashed passwords in the database.
- If you import the SQL reference files manually, do not leave the `users.password` column as raw plaintext; convert those values to BCrypt hashes for `password123` or recreate the users through the real sign-up flow.

### Helpful Verification

After seeding, verify that these render from the live backend:

- login with a seeded user
- dashboard stats and previews
- credential detail drawer
- CE record detail drawer
- `/credentials`
- `/ce-records`

Useful SQL checks:

```sql
SELECT BIN_TO_UUID(id) AS id, name, email FROM users;
SELECT BIN_TO_UUID(id) AS id, name, BIN_TO_UUID(user_id) AS user_id FROM credentials;
SELECT BIN_TO_UUID(id) AS id, title, BIN_TO_UUID(credential_id) AS credential_id FROM ce_records;
```

## Notes

- The backend uses `application.yml` for app configuration.
- Backend tests use an isolated H2 profile so they can run without depending on a live MySQL database.
- Main app runtime views no longer depend on `mock-data.ts`.
