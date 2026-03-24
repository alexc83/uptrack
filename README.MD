# UpTrack

UpTrack is a full-stack web application for healthcare professionals to manage licenses, certifications, and continuing education in one place.

The project is built as a portfolio-style SaaS app with an Angular frontend and a Spring Boot backend, focused on clean architecture, realistic healthcare domain modeling, and a polished dashboard-style user experience.

## What The App Does

UpTrack helps users:

- track professional credentials such as RN licenses, ACLS, BLS, PALS, CCRN, and similar certifications
- monitor credential status using derived `ACTIVE`, `EXPIRING_SOON`, and `EXPIRED` states
- log and review continuing education records tied to specific credentials
- view credential details and CE details through contextual drawers
- stay on top of renewal risk through a live dashboard with expirations, CE attention, and recent activity
- sign up, log in, restore sessions, and keep all data scoped to the authenticated user

## Current Product Status

The application is now running as a real authenticated app against the backend rather than a frontend-only prototype.

Implemented right now:

- public landing page with light/dark mode and auth modals
- JWT-based authentication with session restore and route protection
- live dashboard backed by `GET /api/dashboard`
- live credentials page with search and filters
- live CE records page
- live credential and CE record detail drawers
- real credential create, edit, and delete flows from the frontend
- Spring Boot REST API for auth, users, credentials, CE records, and dashboard aggregation

Still planned or incomplete:

- CE record create/edit/delete flows from the frontend
- certificate upload flow
- CE summary/export flow
- production deployment/config hardening

## Tech Stack

### Frontend

- Angular 21 with standalone components
- TypeScript
- PrimeNG
- Angular Signals
- Angular Reactive Forms
- Vitest

### Backend

- Spring Boot 3.5
- Java 21
- Spring Security + JWT
- Spring Data JPA
- MySQL
- JUnit 5 / Spring Boot Test

## Project Structure

```text
frontend/   Angular application
backend/    Spring Boot REST API
context/    feature specs, screenshots, and project working docs
```

## Core Features Implemented

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- JWT-based session persistence in the Angular app
- protected dashboard, credentials, and CE routes

### Dashboard

- aggregated live stats
- upcoming expirations preview
- CE attention preview
- recent activity
- overflow drawers and detail-drawer integration

### Credentials

- `GET /api/credentials`
- `GET /api/credentials/{id}`
- `GET /api/credentials/{id}/ce-records`
- `POST /api/credentials`
- `PUT /api/credentials/{id}`
- `DELETE /api/credentials/{id}`
- frontend search/filter UI
- frontend add/edit/delete flows with validation and confirmation

### Continuing Education

- `GET /api/ce-records`
- `GET /api/ce-records/{id}`
- `POST /api/ce-records`
- `PUT /api/ce-records/{id}`
- `DELETE /api/ce-records/{id}`
- live CE list page and live CE detail drawer

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
npm test -- --watch=false
```

Backend:

```bash
cd backend
./mvnw test
```

## Build Notes

Frontend production build:

```bash
cd frontend
npm run build
```

Backend package build:

```bash
cd backend
./mvnw package
```

Current note:

- frontend tests pass
- backend tests pass
- the frontend production build is still sensitive to existing Angular style/bundle budget thresholds, especially around the landing page stylesheet

## Seed Data

The app is expected to run locally against MySQL with realistic seed data already loaded or imported manually.

Reference SQL files currently in the repo root:

- `test_data.sql`
- `test_data_v2.sql`

The runtime app no longer depends on frontend mock data for dashboard, credentials, or CE reads.

### Seeded Login Expectations

The local seed set is intended to support users such as:

- `alex@example.com`
- `jordan@example.com`

with password:

- `password123`

Important:

- Spring Security login expects BCrypt-hashed passwords in the database.
- If you import SQL manually, do not leave `users.password` as raw plaintext.
- If needed, either store BCrypt hashes or recreate users through the real sign-up flow.

### Helpful Verification

After seeding, useful manual checks include:

- log in with a seeded user
- verify dashboard stats and previews
- verify `/credentials`
- verify `/ce-records`
- verify credential add/edit/delete flows
- verify credential and CE drawers load live data

Useful SQL checks:

```sql
SELECT BIN_TO_UUID(id) AS id, name, email FROM users;
SELECT BIN_TO_UUID(id) AS id, name, BIN_TO_UUID(user_id) AS user_id FROM credentials;
SELECT BIN_TO_UUID(id) AS id, title, BIN_TO_UUID(credential_id) AS credential_id FROM ce_records;
```

## Notes

- Backend configuration uses `application.yml`.
- Backend tests use an isolated H2 profile and do not require a live MySQL instance.
- Credential writes are now JWT-scoped on the backend rather than relying on a frontend-supplied `userId`.
