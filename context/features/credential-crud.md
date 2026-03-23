# Feature: Credential CRUD

## Goal
Implement CRUD functionality for Credential entity linked to User.

## Entity: Credential

Fields:
- id (UUID)
- name (String)
- type (Enum: LICENSE, CERTIFICATION)
- issuingOrganization (String)
- expirationDate (LocalDate)
- renewalCycleMonths (Integer)
- requiredCEHours (BigDecimal)
- user (ManyToOne)

## DTOs

CredentialRequestDto:
- name
- type
- issuingOrganization
- expirationDate
- renewalCycleMonths
- requiredCEHours
- userId

CredentialResponseDto:
- id
- name
- type
- issuingOrganization
- expirationDate
- renewalCycleMonths
- requiredCEHours
- status (derived)

## Business Logic

Status must be computed in service layer:

- EXPIRED → expirationDate < today
- EXPIRING_SOON → within 90 days
- ACTIVE → otherwise

## Repository

- extends JpaRepository<Credential, UUID>

## Service

- createCredential
- getAllCredentials
- getCredentialById
- updateCredential
- deleteCredential

## Controller

Base path: /api/credentials

Endpoints:
- POST /api/credentials
- GET /api/credentials
- GET /api/credentials/{id}
- PUT /api/credentials/{id}
- DELETE /api/credentials/{id}

## Notes

- Must validate user exists before creating credential
- Do NOT expose entity directly
- Status must NOT be stored in database