# UpTrack

Track credentials. Stay compliant. Own your career.

UpTrack is a healthcare-focused web application for keeping licenses, certifications, and continuing education in one organized place. It is designed for local use right now and works well as a realistic demo of a credential-tracking product: you can sign in, manage credentials, log CE records, and monitor compliance status from a live dashboard.

It is also a portfolio project, but the goal is for someone opening the app locally to immediately understand how to use it like a real product.

## Why UpTrack

Healthcare professionals often have to keep track of:

- licenses that expire on different schedules
- certifications with separate renewal rules
- CE hours that belong to specific credentials
- certificate links or documentation needed during audits or renewals

UpTrack brings those pieces together into one dashboard so you can quickly see what is active, what is expiring, and what still needs CE attention.

## What You Can Do Today

- Create an account or sign in through the landing page
- Switch between light and dark mode
- Use a live dashboard with credential status, CE attention, and recent activity
- Add, edit, and delete credentials
- Add, edit, and delete CE records
- Open credential and CE details in contextual drawers
- Search and filter credentials
- Review CE history from the dedicated CE Records page
- Use the app on desktop or mobile layouts

## Try It Locally

### 1. Start the backend

```bash
cd backend
./mvnw spring-boot:run
```

### 2. Start the frontend

```bash
cd frontend
npm start
```

### 3. Open the app

Visit:

```text
http://localhost:4200
```

### 4. Sign up or use seed data

The easiest way to try the app is to create a new account through the real sign-up flow on the landing page.

If you already loaded local seed SQL into MySQL, you can also use those users. Optional seed files currently in the repo root:

- `test_data.sql`
- `test_data_v2.sql`

Seeded example users may include:

- `alex@example.com`
- `jordan@example.com`

with password:

- `password123`

Important:

- seeded passwords must be stored as BCrypt hashes in the database
- raw plaintext passwords will not work with Spring Security login
- if seed login is not working, using the real sign-up flow is the recommended path

## How To Use UpTrack

### Start with the dashboard

After logging in, go to [`/dashboard`](/Users/alexc/Documents/UpTrack/frontend/src/app/features/dashboard/dashboard-page/dashboard-page.component.ts). This is the main at-a-glance view for:

- credential counts
- upcoming expirations
- CE progress that still needs attention
- recent activity

### Add your first credential

Use the `Add Credential` action from the dashboard or go to [`/credentials`](/Users/alexc/Documents/UpTrack/frontend/src/app/features/credentials/credentials.component.ts).

Each credential includes:

- name
- type
- issuing organization
- expiration date
- renewal cycle
- required CE hours

UpTrack automatically derives whether a credential is active, expiring soon, or expired.

### Add CE records tied to a credential

Once a credential exists, add CE records either:

- from the credential drawer
- from the CE Records page at [`/ce-records`](/Users/alexc/Documents/UpTrack/frontend/src/app/features/ce-records/ce-records.component.ts)

Each CE record tracks:

- title
- provider
- hours earned
- completion date
- optional certificate URL
- linked credential

### Use drawers to review and update details

Credential cards, dashboard lists, and CE items open drawers so you can:

- review full credential details
- review CE records linked to a credential
- edit or delete credentials
- edit or delete CE records

### Search and filter credentials

The credentials page supports:

- text search
- filtering by status
- filtering by type

That makes it easier to find expiring items or narrow the list to licenses versus certifications.

### Review CE history

The CE Records page gives you a dedicated view of your CE activity across credentials. From there you can:

- browse all CE completions
- see which credential each CE record counts toward
- open record details
- add a new CE record with credential selection

## Current Status

UpTrack is already a working authenticated local app with live frontend/backend integration.

### Implemented now

- public landing page with light/dark mode toggle
- login and sign-up modals
- JWT authentication with session restore
- live dashboard data
- live credentials page with add/edit/delete
- live CE records page with add/edit/delete
- live credential and CE detail drawers
- responsive shell, navigation, and theme support

### Still not implemented

- real certificate file upload to Cloudinary or S3
- CE summary export or printable download flow
- Sentry monitoring integration
- explicit dashboard 30/60/90 expiration bucket views

## Technical Details

UpTrack is a full-stack Angular + Spring Boot application with a typed frontend service layer and a JWT-secured REST API. The current architecture keeps business logic in the backend while the frontend focuses on presentation, typed forms, and live data interactions.

### Frontend

- Angular 21
- TypeScript
- PrimeNG
- Angular Signals
- Angular Reactive Forms
- Vitest

### Backend

- Spring Boot 3.5
- Java 21
- Spring Security with JWT
- Spring Data JPA
- MySQL
- JUnit 5 and Spring Boot Test

## Project Structure

```text
frontend/   Angular application
backend/    Spring Boot REST API
context/    feature specs, screenshots, and working docs
```

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

## Testing

### Frontend tests

```bash
cd frontend
npm test -- --watch=false
```

### Backend tests

```bash
cd backend
./mvnw test
```

## Build Notes

### Frontend production build

```bash
cd frontend
npm run build
```

### Backend package build

```bash
cd backend
./mvnw package
```

Current note:

- frontend tests pass
- backend tests pass
- the frontend production build is still sensitive to Angular bundle/style budget thresholds, especially around the landing page stylesheet

## Live Data and Seed Notes

- the app no longer depends on frontend mock data for dashboard, credentials, or CE reads
- backend tests run against an isolated H2 profile and do not require your local MySQL database
- local app usage expects MySQL data if you want persistent users and records between runs
- backend configuration now uses `application.yml`

Helpful SQL checks:

```sql
SELECT BIN_TO_UUID(id) AS id, name, email FROM users;
SELECT BIN_TO_UUID(id) AS id, name, BIN_TO_UUID(user_id) AS user_id FROM credentials;
SELECT BIN_TO_UUID(id) AS id, title, BIN_TO_UUID(credential_id) AS credential_id FROM ce_records;
```

## Engineering Notes

- credential and CE write operations are scoped to the authenticated JWT user
- credential status, CE hours earned, and CE progress are derived rather than stored
- `DELETE /api/credentials/{id}` cascades to linked CE records
- certificate handling is currently URL-based only; there is no real upload pipeline yet
