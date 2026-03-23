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

- Responsive Angular dashboard experience
- Dashboard summary cards and status panels
- Drawer-based detail exploration from the dashboard
- Base Spring Boot API foundation
- Starting persistence model for:
  `User`, `Credential`, and `CERecord`
- Shared backend error response and exception handling structure
- Backend repository and DTO scaffolding for future CRUD work

## Features Still To Be Implemented

### Backend API Features

- User CRUD
  `POST`, `GET`, `PUT`, and `DELETE` endpoints under `/api/users`
- Credential CRUD
  creation, listing, detail, update, delete, and derived status calculation
- CE Record CRUD
  creation, listing, detail, update, and delete for records tied to both credentials and users
- Relationship and query endpoints
  especially credential detail responses with CE aggregation and `GET /api/credentials/{id}/ce-records`
- User-scoped query behavior across the backend
- DTO mapping and service-layer business rules for full CRUD flows

### Frontend Features

- Add/Edit credential modal flows
- Add/Edit CE record modal flows
- Wiring drawer action buttons to those future modal flows
- Credentials management screens beyond the current dashboard shell
- CE record management screens beyond the current dashboard shell
- Dashboard integration with real backend data instead of mock data

### Planned Product Features

- CE summary/export
- search and filtering
- document upload integration
- authentication and JWT-based session handling
- user-scoped authorization
- deployment-ready production configuration

## Current Development Status

The project currently has a strong UI foundation on the frontend and a solid scaffolded API foundation on the backend, but the business CRUD flows and authenticated end-to-end integration are still in progress.

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

## Notes

- The backend uses `application.yml` for app configuration.
- Backend tests use an isolated H2 profile so they can run without depending on a live MySQL database.
- Some frontend views still use mock data while the real backend endpoints are being built.
