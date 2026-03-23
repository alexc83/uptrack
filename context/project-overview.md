# 🏥 UpTrack — Project Overview

> **Track credentials. Stay compliant. Own your career.**
>
> A full-stack SaaS-style application for healthcare professionals to manage licenses, certifications, and continuing education — built as a portfolio project demonstrating production-grade system design.

---

## 📌 Problem Statement

Healthcare providers — nurses, physicians, respiratory therapists, and physician assistants — are required to maintain active licenses and certifications, often renewing every 1–3 years with continuing education (CE) requirements. Today, tracking this information is fragmented and painful:

- CE credits are scattered across multiple platforms (AACN, hospital systems, conferences)
- Certificates live in emails, random folders, or physical copies
- Renewal requirements must be manually checked through credentialing organizations
- Deadlines are frequently forgotten until the last minute

This results in missed deadlines, last-minute stress, and difficulty producing documentation during audits or credentialing reviews.

**UpTrack solves this** with a clean, centralized dashboard for managing credentials and CE progress — audit-ready and always up to date.

---

## 🎯 Project Goals

This is a **single-user personal portfolio project** — no monetization, multi-tenancy, or billing. The goal is to demonstrate real-world, production-style full-stack development skills:

1. **Clean full-stack architecture** — Angular 21 frontend communicating with a Spring Boot REST API
2. **Thoughtful domain modeling** — healthcare-focused data design for credentials, CE records, and audit-ready documentation
3. **Polished SaaS-style UX** — responsive layouts, strong visual hierarchy, and clear status communication inspired by Linear, Notion, and Stripe Dashboard

---

## 🧑‍⚕️ Target Users

| Persona | Examples |
|---|---|
| **Nurses** | RN, LPN |
| **Nurse Practitioners** | NP, APRN |
| **Physicians** | MD, DO |
| **Respiratory Therapists** | RRT, CRT |
| **Physician Assistants** | PA-C |

---

## ✨ Features

### A) Credential Management

Users create and manage credentials such as RN licenses, medical licenses, respiratory therapy licenses, and certifications (BLS, ACLS, PALS, CCRN, NRP, etc.).

Each credential record includes:

| Field | Description |
|---|---|
| Name | e.g. "RN License — Texas" |
| Type | `LICENSE` or `CERTIFICATION` |
| Issuing Organization | e.g. "Texas Board of Nursing" |
| Expiration Date | Used to derive status automatically |
| Renewal Cycle | Duration in months (e.g. 24) |
| Required CE Hours | Set to 0 if not applicable |

**Status** is derived at runtime (never stored) using configurable threshold logic:

```text
EXPIRATION_THRESHOLD_DAYS = 90

if expirationDate < today            → EXPIRED
if expirationDate < today + 90 days  → EXPIRING_SOON
else                                 → ACTIVE
```

### B) Continuing Education (CE) Tracking

Users log CE credits against any credential. The system automatically calculates hours earned and displays progress toward each credential's CE requirement.

Each CE record includes: title, provider, hours earned, date completed, and an optional certificate URL.

### C) Document Upload

Users upload PDF or image certificates and associate them with CE records. Files are stored externally (Cloudinary or S3) and only the returned URL is persisted in the database. This maintains audit-ready documentation in one place.

### D) Dashboard

A single at-a-glance view powered by one API call (`GET /api/dashboard`):

- Upcoming expirations bucketed at 30, 60, and 90 days
- CE progress bars per credential
- Status indicators across all credentials (Active, Expiring Soon, Expired)
- Quick stats: total credentials, expired count, credentials needing CE attention

### E) CE Summary & Export

Per credential, users can view all associated CE records, see total hours earned vs. required, and generate a printable/exportable list including credential name, CE record details, and total hours summary.

### F) Search & Filtering

- Search by credential name, CE title, or provider
- Filter credentials by status (`Active`, `Expiring Soon`, `Expired`)
- Filter by type (`License` vs. `Certification`)

### G) Authentication

Email and password login with JWT-based session persistence. All data is scoped to the authenticated user.

---

## 🧱 Tech Stack

### Frontend

| Category | Choice | Notes |
|---|---|---|
| **Framework** | [Angular 21](https://angular.dev/) | Standalone components, modern control flow (`@if`, `@for`, `@switch`) |
| **Language** | TypeScript | End-to-end type safety across models, DTOs, and services |
| **UI Library** | [PrimeNG](https://primeng.org/) | Accessible component library, customized beyond default admin aesthetic |
| **Styling** | PrimeNG theming + CSS variables | Design tokens for light/dark mode and status colors |
| **Forms** | Angular Reactive Forms | Typed form models, inline validation, predictable state |
| **State** | Angular Signals | Component and shared UI state without external state library |
| **HTTP** | Angular HttpClient | Typed service layer for backend integration |
| **Build** | Angular CLI | Standard frontend tooling |
| **Testing** | Vitest + Angular Testing Utilities | Component and unit testing

**Angular conventions:**

- Standalone components only (no NgModules)
- Signals for all component and UI state (no Signal Forms for MVP)
- Strongly typed models and DTOs throughout
- Responsive behavior built in from day one

### Backend

| Category | Choice | Notes |
|---|---|---|
| **Framework** | [Spring Boot 3.x](https://spring.io/projects/spring-boot) | REST API with layered architecture |
| **Language** | Java | |
| **ORM** | [Spring Data JPA](https://spring.io/projects/spring-data-jpa) + Hibernate | Repository-based data access |
| **Database** | [MySQL](https://www.mysql.com/) | Relational storage for users, credentials, and CE records |
| **Auth** | Spring Security + JWT | Stateless token-based authentication |
| **Validation** | Jakarta Bean Validation | Annotation-driven request validation |
| **Build** | Maven | Standard backend tooling |
| **Testing** | JUnit 5 + Spring Boot Test | Service and controller test coverage |

**Backend conventions:**

- DTOs for all API request/response shapes — JPA entities are never exposed directly
- `status`, `ceHoursEarned`, and `ceProgress` are computed in the service layer
- `DELETE /api/credentials/:id` cascades to all associated CE records
- Every query is scoped to the authenticated user via `userId`
- Global exception handler provides consistent error response shapes

### Infrastructure

| Category | Choice | Notes |
|---|---|---|
| **File Storage** | [Cloudinary](https://cloudinary.com/) or [AWS S3](https://aws.amazon.com/s3/) | CE certificates stored externally; only URLs persisted in DB |
| **Frontend Deploy** | [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/) | Static SPA hosting |
| **Backend Deploy** | [Render](https://render.com/), [Railway](https://railway.app/), or Azure App Service | Managed Java hosting |
| **Database** | Managed MySQL instance | Provisioned alongside backend |
| **Monitoring** | [Sentry](https://sentry.io/) | Runtime error tracking (post-MVP) |

---

## 🏗️ System Architecture

### High-Level Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│   Angular 21 SPA                                                │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│   │Dashboard │  │Credential│  │CE Record │  │  Auth        │   │
│   │Component │  │Components│  │Components│  │  Components  │   │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│        │              │              │               │           │
│        └──────────────┼──────────────┼───────────────┘           │
│                       │              │                           │
│              Angular HttpClient (typed services)                 │
└───────────────────────┼──────────────┼───────────────────────────┘
                        │   HTTPS/JSON │
                        ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SPRING BOOT REST API                          │
│                                                                 │
│   ┌────────────────────────────────────────────────────────┐    │
│   │  Security Filter Chain (JWT validation, user scoping)  │    │
│   └────────────────────────┬───────────────────────────────┘    │
│                            ▼                                    │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│   │ Controllers  │→│  Services   │→│   Repositories       │    │
│   │ (REST API)  │  │(business    │  │   (Spring Data JPA)  │    │
│   │             │  │ logic, DTO  │  │                      │    │
│   │             │  │ mapping,    │  │                      │    │
│   │             │  │ computed    │  │                      │    │
│   │             │  │ fields)     │  │                      │    │
│   └─────────────┘  └──────┬──────┘  └──────────┬──────────┘    │
│                           │                     │               │
│                    ┌──────┘                     │               │
│                    ▼                            ▼               │
│             ┌────────────┐              ┌────────────┐          │
│             │ Cloudinary │              │   MySQL    │          │
│             │ / AWS S3   │              │  Database  │          │
│             │ (files)    │              │            │          │
│             └────────────┘              └────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Layered Architecture

```text
Controller Layer         Service Layer              Repository Layer
─────────────────       ─────────────────          ─────────────────
Receives HTTP           Business logic,            Spring Data JPA
requests, delegates     DTO mapping,               interfaces,
to service layer,       computed fields            database queries
returns DTOs            (status, ceProgress),      scoped by userId
                        file upload orchestration
        │                       │                          │
        ▼                       ▼                          ▼
   @RestController          @Service                 JpaRepository
   @RequestMapping          @Transactional           Custom queries
   @Valid on DTOs           Cascade logic            Named methods
```

### Authentication Flow

```text
┌────────┐         ┌───────────────┐         ┌──────────────────┐
│ Client │──POST──▶│ /api/auth/    │──────▶  │ Spring Security  │
│        │ login   │ login         │         │ AuthManager      │
└────────┘         └───────┬───────┘         └────────┬─────────┘
                           │                          │
                           │    Validate credentials  │
                           │◀─────────────────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │ Generate JWT  │
                   │ (userId +     │
                   │  expiration)  │
                   └───────┬───────┘
                           │
                           ▼
┌────────┐         ┌───────────────┐
│ Client │◀────────│ { token, user}│
│ stores │  200 OK │               │
│ JWT    │         └───────────────┘
└───┬────┘
    │
    │  Subsequent requests:
    │  Authorization: Bearer <token>
    ▼
┌───────────────────────────────────────────┐
│ Security Filter Chain                     │
│ 1. Extract JWT from header                │
│ 2. Validate token signature + expiration  │
│ 3. Load user context                      │
│ 4. Scope all queries to userId            │
└───────────────────────────────────────────┘
```

### File Upload Flow

```text
┌────────┐  multipart   ┌──────────┐  upload    ┌────────────┐
│ Client │──upload────▶  │ CE Record│──file───▶  │ Cloudinary │
│        │  (PDF/image)  │ Service  │           │ / AWS S3   │
└────────┘               └────┬─────┘           └─────┬──────┘
                              │                       │
                              │   return file URL     │
                              │◀──────────────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │ Save CE     │
                       │ Record with │
                       │ certificate │
                       │ URL to MySQL│
                       └─────────────┘
```

---

## 🗄️ Data Model

> ⚠️ **Rough JPA/Hibernate draft** — this schema is a high-level starting point and will evolve during implementation. Field-level annotations, indexing strategy, and constraint details are intentionally abbreviated.

### Entity Relationship Diagram

```text
┌──────────────┐       ┌───────────────────┐       ┌──────────────────┐
│     USER     │       │    CREDENTIAL     │       │    CE_RECORD     │
├──────────────┤       ├───────────────────┤       ├──────────────────┤
│ id (PK)      │       │ id (PK)           │       │ id (PK)          │
│ name         │       │ name              │       │ title            │
│ email (UQ)   │──1:N─▶│ type (enum)       │──1:N─▶│ provider         │
│ password     │       │ issuingOrganization│      │ hours            │
│ createdAt    │       │ expirationDate    │       │ dateCompleted    │
└──────────────┘       │ renewalCycleMonths│       │ certificateUrl   │
                       │ requiredCEHours   │       │ credentialId (FK)│
                       │ userId (FK)       │       │ userId (FK)      │
                       └───────────────────┘       └──────────────────┘

Relationships:
  USER        1 ──── N  CREDENTIAL
  CREDENTIAL  1 ──── N  CE_RECORD
  USER        1 ──── N  CE_RECORD  (denormalized for query scoping)
```

### Entity Definitions (JPA / Hibernate)

#### User

```java
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;  // Bcrypt hashed

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Credential> credentials = new ArrayList<>();

    private LocalDateTime createdAt;
}
```

#### Credential

```java
@Entity
@Table(name = "credentials")
public class Credential {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CredentialType type;  // LICENSE, CERTIFICATION

    @Column(nullable = false)
    private String issuingOrganization;

    @Column(nullable = false)
    private LocalDate expirationDate;

    private Integer renewalCycleMonths;

    @Column(precision = 5, scale = 2)
    private BigDecimal requiredCEHours;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "credential", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CERecord> ceRecords = new ArrayList<>();
}
```

#### CERecord

```java
@Entity
@Table(name = "ce_records")
public class CERecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal hours;

    @Column(nullable = false)
    private LocalDate dateCompleted;

    private String certificateUrl;  // External storage URL (nullable)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credential_id", nullable = false)
    private Credential credential;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
```

### Derived Fields (Computed at Runtime)

These values are calculated in the service layer and injected into DTOs — they are never persisted:

| Field | Logic |
|---|---|
| `status` | `EXPIRED` if past expiration; `EXPIRING_SOON` if within 90 days; else `ACTIVE` |
| `ceHoursEarned` | `SUM(ce_records.hours)` for linked CE records |
| `ceProgress` | `ceHoursEarned / requiredCEHours` as a decimal (e.g. `0.70`) |

The 90-day expiration threshold is defined as a named constant (`EXPIRATION_THRESHOLD_DAYS`) so it can be adjusted without hunting through the codebase.

---

## 🔌 REST API

**Base path:** `/api`
**Auth:** All endpoints require `Authorization: Bearer <token>` except `/api/auth/**`
**Scoping:** Every query is automatically filtered to the authenticated user

### Auth Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new account |
| `POST` | `/api/auth/login` | Authenticate and return JWT |
| `GET` | `/api/auth/me` | Return current user profile |

### Credential Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/credentials` | List all credentials (supports `?status=`, `?type=`, `?search=`) |
| `GET` | `/api/credentials/:id` | Get credential detail with CE summary and records |
| `POST` | `/api/credentials` | Create a new credential |
| `PUT` | `/api/credentials/:id` | Update a credential |
| `DELETE` | `/api/credentials/:id` | Delete credential + cascade delete all CE records |

### CE Record Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/credentials/:id/ce-records` | List CE records for a credential (supports `?search=`) |
| `POST` | `/api/credentials/:id/ce-records` | Add a CE record to a credential |
| `PUT` | `/api/ce-records/:id` | Update a CE record |
| `DELETE` | `/api/ce-records/:id` | Delete a CE record |

### Dashboard Endpoint

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Single aggregated call for the entire dashboard view |

The dashboard response includes stats (total, active, expiring, expired counts), expiration buckets (30/60/90 days), and credentials needing CE attention. The Angular frontend renders the full dashboard from this single response without additional API calls.

### Error Response Shape

All errors follow a consistent structure:

```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Credential not found"
}
```

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `204` | No content (successful DELETE) |
| `400` | Bad request / validation failure |
| `401` | Unauthenticated |
| `403` | Forbidden |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate email) |

---

## 🎨 UI / UX

### Design Direction

Professional, modern, consumer-facing SaaS product — not a hospital intranet or enterprise admin dashboard. Clean, polished, and approachable.

**Design references:** Linear (card layouts, status indicators), Notion (calm whitespace, readability), Stripe Dashboard (professional data display, progress indicators)

### Color System

**Primary accent:** `#185FA5` (light) / `#378ADD` (dark) — a calm, trustworthy medium blue.

**Status tokens:**

| Status | Light BG | Light Text | Dark BG | Dark Text |
|---|---|---|---|---|
| 🟢 Active | `#EAF3DE` | `#27500A` | `#1e2d1a` | `#C0DD97` |
| 🟡 Expiring Soon | `#FAEEDA` | `#633806` | `#2d2010` | `#FAC775` |
| 🔴 Expired | `#FCEBEB` | `#791F1F` | `#2d1515` | `#F7C1C1` |

Both light and dark modes are fully specified. Dark mode is intentional and polished — backgrounds go dark and tinted, text lightens within the same color family, progress fills are brightened so they remain visible against dark surfaces.

### Icons

| Element | Icon |
|---|---|
| 🛡️ License | `Shield` or `IdCard` |
| 🏅 Certification | `Award` or `BadgeCheck` |
| 📖 CE Record | `BookOpen` |
| ❤️ BLS / ACLS / PALS | `Heart` |
| 📊 Dashboard nav | `LayoutDashboard` |
| 📂 Credentials nav | `FolderOpen` |
| 📋 CE Records nav | `ClipboardList` |

### Layout

**Desktop:** sidebar navigation (Dashboard, Credentials, CE Records) with main content area showing summary cards, data tables, and section headers. Primary actions (Add Credential, Add CE) are always visible.

**Mobile/Tablet:** sidebar collapses to a drawer/hamburger menu. Forms stack cleanly. No horizontal scrolling. Minimum 44px tap targets.

### Key Screens

1. **Dashboard** — stats cards, expiration alerts, CE progress bars
2. **Credential List** — filterable/searchable grid of credential cards
3. **Credential Detail** — full credential info with associated CE records listed
4. **Add/Edit Credential** — form with inline validation
5. **Add/Edit CE Record** — form with certificate upload

### Card Design

**Credential cards** include: type pill (License/Certification), credential name, issuing organization, status badge, quick facts row (expiration, renewal cycle, CE hours), and a CE progress bar. Expiring Soon cards receive an additional colored border as a passive visual alert.

**CE Record entries** include: course title, provider and date (muted secondary text), hours earned (right-aligned), certificate link if present, and a summary row at the bottom with total records and total hours.

---

## 📁 Project Structure

```text
uptrack/
├── frontend/                        # Angular 21 SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                # Auth guard, interceptors, JWT service
│   │   │   ├── shared/              # Shared components, pipes, directives
│   │   │   ├── features/
│   │   │   │   ├── auth/            # Login, Register components
│   │   │   │   ├── dashboard/       # Dashboard component
│   │   │   │   ├── credentials/     # List, Detail, Form components
│   │   │   │   └── ce-records/      # List, Form components
│   │   │   ├── models/              # TypeScript interfaces and DTOs
│   │   │   └── services/            # HTTP service layer
│   │   ├── assets/
│   │   └── styles/                  # Global styles, CSS variables, theme tokens
│   └── angular.json
│
├── backend/                         # Spring Boot 3.x REST API
│   ├── src/main/java/.../uptrack/
│   │   ├── config/                  # Security config, JWT config, CORS
│   │   ├── controller/              # REST controllers
│   │   ├── service/                 # Business logic, DTO mapping, computed fields
│   │   ├── repository/              # Spring Data JPA interfaces
│   │   ├── model/                   # JPA entities
│   │   ├── dto/                     # Request/response DTOs
│   │   ├── enums/                   # CredentialType, CredentialStatus
│   │   ├── exception/               # Global exception handler, custom exceptions
│   │   └── security/                # JWT filter, auth service, user details
│   ├── src/main/resources/
│   │   └── application.yml
│   └── pom.xml
│
└── README.md
```

---

## 🚫 Non-Goals (MVP)

These are explicitly out of scope for the initial build:

- No multi-user or team features
- No manager dashboard or role-based access
- No email notifications or reminders
- No third-party integrations (state boards, CE providers)
- No mobile app (responsive web only)
- No advanced analytics or reporting

---

## 🧭 Roadmap

### Phase 1 — Core MVP

- [ ] Project scaffolding (Angular CLI + Spring Boot + Maven)
- [ ] Auth flow (register, login, JWT, Spring Security filter chain)
- [ ] Credential CRUD with runtime status derivation
- [ ] CE Record CRUD with automatic hours calculation
- [ ] Dashboard (single API call, stats, progress bars, expiration alerts)
- [ ] Search and filtering (status, type, text search)
- [ ] Light/dark mode with full status color tokens
- [ ] Responsive layout (desktop, tablet, mobile)

### Phase 2 — Polish & Completeness

- [ ] CE certificate upload (Cloudinary or S3 integration)
- [ ] CE summary export (printable/downloadable per credential)
- [ ] Empty states with CTAs for new users
- [ ] Inline form validation with real-time feedback
- [ ] Sentry error monitoring integration
- [ ] Unit and integration tests (JUnit 5 + Angular testing tools)

### Phase 3 — Future Enhancements

- [ ] Email reminders for upcoming expirations
- [ ] Bulk CE record import (CSV upload)
- [ ] Credential templates (pre-filled common licenses and certifications)
- [ ] Multi-user support and team/organization features
- [ ] Manager dashboard with team credential overview
- [ ] Public API for third-party integrations
- [ ] Mobile app (native or PWA)

---

## 📌 Current Status

**In planning** — ready for project scaffolding and initial implementation.

---

🏥 *UpTrack — Track credentials. Stay compliant. Own your career.*
