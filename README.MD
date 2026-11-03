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
- Use a live dashboard with credential status, CE attention, summary stats, and recent activity
- Add, edit, and delete credentials from the dashboard and credentials page
- Add, edit, and delete CE records from the dashboard, credential details, and CE Records page
- Upload certificate PDFs or images while creating or editing CE records
- Replace or remove a certificate and have the old Cloudinary asset cleaned up automatically
- Open credential and CE details in contextual drawers
- Search and filter credentials by text, status, and type
- Review CE history from the dedicated CE Records page with summary cards, chip filters, pagination, and a scalable table layout
- Use the CE Records page on mobile with stacked card layouts instead of a wide scrolling table
- Use the app on desktop or mobile layouts

## If You're Trying The App As A User

You do not need to understand React, Spring Boot, JWT, or databases to try UpTrack. If you are opening this locally just to see what the product does, the simplest way to think about it is:

- the dashboard tells you what needs attention
- credentials are the licenses/certifications you need to keep active
- CE records are the classes or learning activities that count toward renewal
- certificates are optional proof files you can attach to a CE record

If you want a quick walkthrough, try this order:

1. Create an account from the landing page.
2. Add one credential, like `RN License - Texas` or `BLS Certification`.
3. Add a CE record tied to that credential.
4. Upload a PDF certificate for that CE record.
5. Go to the CE Records page and confirm the certificate shows as `On file`.
6. Open the CE drawer and use the certificate link or remove action to see how the record is managed.

If all you want is a product feel test, that flow will show you the main value of the app in just a couple minutes.

## Try It Locally

### 1. Start the backend

The backend needs local environment variables (database, JWT secret, Cloudinary placeholders). Copy the template and fill in local-only values:

```bash
cp scripts/dev-demo/env.example backend/.env.local   # then edit backend/.env.local
cd backend
set -a; . ./.env.local; set +a
./mvnw spring-boot:run
```

The backend listens on `http://localhost:8080` by default (`SERVER_PORT` can override it).

### 2. Start the frontend

The active frontend is the React application in `frontend-react/`:

```bash
cd frontend-react
npm ci
npm run dev
```

### 3. Open the app

Visit:

```text
http://localhost:5173
```

The Vite dev server proxies `/api` requests to the backend (`http://localhost:8080` by default; override with `VITE_PROXY_TARGET`), so no CORS configuration is needed for local development. See `frontend-react/.env.example`.

### 4. Sign up or use seed data

The easiest way to try the app is to create a new account through the real sign-up flow on the landing page.

If you already loaded local seed SQL into PostgreSQL, you can also use those users. Optional seed files currently in the repo root:

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

After logging in, go to [`/dashboard`](frontend-react/src/features/dashboard/dashboard-page.tsx). This is the main at-a-glance view for:

- credential counts
- upcoming expirations
- CE progress that still needs attention
- recent activity

### Add your first credential

Use the `Add Credential` action from the dashboard or go to [`/credentials`](frontend-react/src/features/credentials/credentials-page.tsx).

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
- from the CE Records page at [`/ce-records`](frontend-react/src/features/ce-records/ce-records-page.tsx)

Each CE record tracks:

- title
- provider
- hours earned
- completion date
- optional uploaded certificate file
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

- browse all CE completions in a table view
- see the linked credential, completion date, hours, and certificate status at a glance
- filter by credential and certificate presence
- open record details from the row or action icon
- add a new CE record with credential selection
- use the mobile card layout on smaller screens

### Attach proof documents when needed

When adding or editing a CE record, you can upload a certificate file through the app.

Supported file types include:

- PDF
- JPG / JPEG
- PNG
- WEBP
- GIF

You can also:

- open the uploaded file from the form or drawer
- replace it with a new file
- remove it from the record

UpTrack stores the hosted file information with the CE record and cleans up replaced or removed files through the backend integration.

## Current Status

UpTrack is already a working authenticated local app with live frontend/backend integration.

### Implemented now

- public landing page with light/dark mode toggle
- login and sign-up modals
- JWT authentication with session restore
- live dashboard data from the backend `/api/dashboard` endpoint
- live credentials page with backend search/filtering plus add/edit/delete flows
- live CE records page with add/edit/delete flows, filters, summary cards, pagination, responsive mobile cards, and a table-based desktop layout
- live credential and CE detail drawers
- CE certificate upload, replace, remove, and view flows backed by Cloudinary-hosted files
- credential detail responses with linked CE records and computed CE progress
- responsive shell, navigation, and theme support

### Still not implemented

- CE summary export or printable download flow
- Sentry monitoring integration
- explicit dashboard 30/60/90 expiration bucket views

## Technical Details

UpTrack is a full-stack React + Spring Boot application with a typed frontend API layer and a JWT-secured REST API. The current architecture keeps business logic in the backend while the frontend focuses on presentation, typed forms, and live data interactions.

### Frontend (canonical since M14)

The active frontend is `frontend-react/`:

- React 19 with TypeScript (strict mode)
- Vite 7 (dev server on port 5173 with an `/api` proxy to the backend)
- Tailwind CSS 4 + Flowbite React
- React Router v7, TanStack Query, React Hook Form + Zod
- Vitest + React Testing Library (unit), Playwright (e2e)

The legacy Angular 21 + PrimeNG application remains in `frontend/` as a historical reference only. It is no longer part of the development, build, test, or CI workflow and is not built by any supported command.

### Backend

- Spring Boot 3.5
- Java 21
- Spring Security with JWT
- Spring Data JPA
- PostgreSQL
- JUnit 5 and Spring Boot Test

### Current backend capabilities

- User CRUD endpoints
- Credential CRUD endpoints with derived status calculation
- CE record CRUD endpoints with credential ownership validation
- Aggregated credential detail responses with CE hour and CE progress calculations
- Credential filtering by search, status, and type
- Authenticated dashboard aggregation endpoint
- Authenticated certificate upload endpoint backed by Cloudinary
- CE record certificate metadata persistence for hosted file management
- Cleanup of replaced, removed, or deleted CE certificate assets from Cloudinary

## Project Structure

```text
frontend-react/   active React application (canonical frontend)
frontend/         legacy Angular application (historical reference only; not built)
backend/          Spring Boot REST API
context/          feature specs, screenshots, and working docs
```

## Local Development

### Frontend (React)

```bash
cd frontend-react
npm ci
npm run dev        # http://localhost:5173, proxies /api to the backend
```

Other useful commands (run from `frontend-react/`): `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run e2e`. See `frontend-react/README.md` and `context/testing-workflow.md`.

### Backend

```bash
cd backend
set -a; . ./.env.local; set +a   # local env vars; see scripts/dev-demo/env.example
./mvnw spring-boot:run
```

## Testing

### Frontend tests (React)

```bash
cd frontend-react
npm run test                 # Vitest unit/component tests
npx playwright test          # Playwright e2e (see context/testing-workflow.md for browser projects)
```

### Backend tests

```bash
cd backend
./mvnw test
```

## Build Notes

### Frontend production build (React)

```bash
cd frontend-react
npm run build    # outputs frontend-react/dist/
```

Hosting notes for the production build:

- any static host must serve `index.html` as the fallback for all client-side routes (React Router deep links such as `/dashboard` or `/credentials/:id/ce-report`)
- the development-only `/preview` route is gated behind `import.meta.env.DEV` and is excluded from the production build
- configure the API origin at build time with `VITE_API_BASE_URL` (default `/api`, same-origin); for local cross-origin setups set `VITE_PROXY_TARGET` (dev proxy) or the backend's `ALLOWED_ORIGIN_PATTERNS`

### Backend package build

```bash
cd backend
./mvnw package
```

Current note:

- frontend tests pass
- backend tests pass
- the frontend production build has been verified during recent feature work

## Live Data and Seed Notes

- the app no longer depends on frontend mock data for dashboard, credentials, or CE reads
- credential and CE write flows are live and JWT-scoped
- backend tests run against an isolated H2 profile and do not require your local PostgreSQL database
- local app usage expects PostgreSQL data if you want persistent users and records between runs
- backend configuration uses `application.yml`, with environment variables for all secrets (copy `scripts/dev-demo/env.example` to the git-ignored `backend/.env.local`)
- local development serves the React app on `http://localhost:5173` and proxies `/api` to the backend on `http://localhost:8080`, so the backend CORS defaults do not apply in the standard dev flow; if you call the API cross-origin, set `ALLOWED_ORIGIN_PATTERNS` to include the frontend origin
- Cloudinary PDF delivery must be enabled in your Cloudinary environment security settings if you want uploaded PDFs to open directly in the browser

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
- certificate uploads are handled through the backend and stored in Cloudinary
- CE records now persist certificate URL plus asset metadata so replace/remove/delete flows can clean up old hosted files

## S05R security limits and rollout

JWT configuration now fails at startup unless the signing secret is nonblank and at least 32 UTF-8 bytes and `AUTH_JWT_EXPIRATION_SECONDS` is between 1 and 3600. Use a generated secret. All sessions from before S05R must sign in once after a coordinated backend rollout; password changes sign out every device. No database schema change is required.

Passwords are limited to 72 UTF-8 bytes (multibyte characters count by their encoded size). Certificates are limited to 5 MiB per file: plain PDF or supported JPEG/PNG/GIF/WebP images. Active/encrypted/forms PDFs must be exported to a simple PDF. The API limits login, registration and per-user uploads and returns 429 with Retry-After when exhausted. Uploads remain publicly delivered Cloudinary URLs; private delivery and durable orphan cleanup are separate owner decisions.

See the [S05R finding matrix, verification and deployment requirements](context/migration/verification/s05r-security-remediation.md), especially the trusted-proxy, multi-instance, storage-quota and historical document considerations.
