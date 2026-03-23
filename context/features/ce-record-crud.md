# Feature: CE Record CRUD

## Goal
Implement CRUD for CE records linked to Credential and User.

## Entity: CERecord

Fields:
- id (UUID)
- title (String)
- provider (String)
- hours (BigDecimal)
- dateCompleted (LocalDate)
- certificateUrl (String, nullable)
- credential (ManyToOne)
- user (ManyToOne)

## DTOs

CERecordRequestDto:
- title
- provider
- hours
- dateCompleted
- certificateUrl
- credentialId
- userId

CERecordResponseDto:
- id
- title
- provider
- hours
- dateCompleted
- certificateUrl

## Repository

- extends JpaRepository<CERecord, UUID>

## Service

- createCERecord
- getAllCERecords
- getCERecordById
- updateCERecord
- deleteCERecord

## Controller

Base path: /api/ce-records

Endpoints:
- POST /api/ce-records
- GET /api/ce-records
- GET /api/ce-records/{id}
- PUT /api/ce-records/{id}
- DELETE /api/ce-records/{id}

## Notes

- Must validate credential exists
- Must validate user exists
- CE records belong to both user and credential