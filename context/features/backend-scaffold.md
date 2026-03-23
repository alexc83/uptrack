# UpTrack Backend Step 1 — Scaffold the Spring Boot API Foundation

## Goal

Build the initial Spring Boot backend foundation for UpTrack using a clean layered architecture.

This step is only about project setup, shared structure, configuration, and common backend plumbing. Do **not** build full business logic for credentials or CE records yet.

The result of this step should be a backend project that:

- runs successfully
- connects to MySQL
- has the correct package/folder structure
- includes shared exception handling
- includes the three JPA entities as the starting domain model
- is ready for feature-by-feature CRUD work in later steps

Use the project overview as the source of truth for the domain model, architecture, and REST direction. The project uses a layered Spring Boot architecture with controllers, services, repositories, DTOs, and MySQL persistence. fileciteturn1file0L88-L107 fileciteturn1file0L166-L214

Follow the coding standards closely. Keep controllers thin, use constructor injection, keep services focused on business logic, use DTOs instead of exposing entities, and use Spring Data JPA in a predictable way. fileciteturn1file2L96-L131

---

## Scope

Build only the shared backend foundation.

Include:

- Maven Spring Boot project setup
- package structure
- `application.yml`
- MySQL configuration placeholders
- base JPA entities for `User`, `Credential`, and `CERecord`
- enums needed by the data model
- repository interfaces for all three entities
- DTO package structure, even if only basic DTO placeholders are created in this step
- service and service implementation package structure
- controller package structure
- global exception handling
- a standard error response DTO

Do **not** add:

- Spring Security
- JWT
- authentication logic
- advanced validation rules beyond obvious field-level validation
- full CRUD endpoints for all features in this step
- Flyway/Liquibase yet
- file upload integration yet

For now, plain text username/password is acceptable because security will be added later.

---

## Required Maven Dependencies

Create a Maven Spring Boot project using:

- Spring Web
- Spring Data JPA
- MySQL Driver
- Validation
- Spring Boot DevTools (optional but fine)
- Spring Boot Test

Use Java 21.

Do not add Lombok unless explicitly requested.

---

## Required Package Structure

Use a package structure like this under the main application package:

```text
com.uptrack
├── UptrackApplication.java
├── controller
├── dto
│   ├── request
│   └── response
├── entity
├── enums
├── exception
├── repository
├── service
│   └── impl
└── config
```

You may add a `mapper` package later if needed, but do not introduce extra abstraction unless it clearly helps.

---

## Entity Requirements

Create the three JPA entities based on the project overview.

### 1. User

Fields:

- `id` as UUID
- `name`
- `email`
- `password`
- `createdAt`

Relationships:

- one user has many credentials
- one user has many CE records

### 2. Credential

Fields:

- `id` as UUID
- `name`
- `type`
- `issuingOrganization`
- `expirationDate`
- `renewalCycleMonths`
- `requiredCEHours`

Relationships:

- many credentials belong to one user
- one credential has many CE records

### 3. CERecord

Fields:

- `id` as UUID
- `title`
- `provider`
- `hours`
- `dateCompleted`
- `certificateUrl`

Relationships:

- many CE records belong to one credential
- many CE records belong to one user

Use the project overview as the reference for field names and relationships. fileciteturn1file0L216-L335

---

## Enum Requirements

Create at least:

- `CredentialType` with values `LICENSE` and `CERTIFICATION`

Do **not** persist `status` yet. The project overview says status is derived at runtime and should not be stored in the database. fileciteturn1file0L336-L347

---

## Repository Requirements

Create these repository interfaces using `JpaRepository`:

- `UserRepository`
- `CredentialRepository`
- `CERecordRepository`

At this stage, keep them simple. Add only a small number of obviously useful query methods if needed, such as:

- `Optional<User> findByEmail(String email)`
- user-scoped finders you know will be needed later

Do not overbuild custom queries yet.

---

## DTO and Error Handling Setup

Create the shared structure for DTOs.

At minimum, create:

- `ErrorResponse`
- a small set of request/response DTO placeholder classes so later steps have a clear home

Create global exception handling with:

- `ResourceNotFoundException`
- `BadRequestException` if useful
- `GlobalExceptionHandler`

The API should return a consistent error response shape similar to the project overview. fileciteturn1file0L379-L417

Use `@ControllerAdvice` and return JSON responses with fields such as:

- `status`
- `error`
- `message`
- `timestamp`

---

## Configuration Requirements

Create `application.yml` with:

- application name
- datasource URL placeholder for MySQL
- datasource username/password placeholder
- JPA/Hibernate config
- SQL logging only if helpful for local development

Use environment-variable-friendly placeholders where reasonable.

Example direction only:

- database name something like `uptrack`
- do not hardcode real secrets

---

## Quality Requirements

- Use constructor injection, not field injection. fileciteturn1file2L106-L114
- Keep code readable and production-minded. fileciteturn1file2L3-L8
- Do not expose entities directly in API responses later; set up the DTO structure now. fileciteturn1file2L116-L123
- Do not push business logic into controllers. fileciteturn1file2L106-L114
- Keep the implementation easy to understand and consistent with the rest of the project. fileciteturn1file1L32-L38

---

## Deliverables

At the end of this step, provide:

1. The full package structure
2. `pom.xml`
3. `application.yml`
4. The three entities
5. The enum(s)
6. The three repositories
7. Shared exception classes and global exception handler
8. Any minimal DTO scaffolding created
9. A short explanation of how the project is organized

Also explain any assumptions you made briefly.

Do not move on to user CRUD logic in this step.
