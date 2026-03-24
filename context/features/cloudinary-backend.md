# UpTrack Feature Spec 01 — Cloudinary Backend Integration

## Overview

Implement the backend foundation for certificate file uploads using Cloudinary. This feature should only cover secure server-side upload support in the Spring Boot backend and should not yet change the Angular CE form UI.

The goal is to make the backend capable of receiving a certificate file, uploading it to Cloudinary, and returning the hosted file URL and useful metadata to the frontend.

---

## Goal

Create a secure, minimal backend upload flow for CE certificate files so the frontend can later call a dedicated upload endpoint before saving or updating a CE record.

---

## In Scope

- Add Cloudinary Java SDK dependency if needed.
- Add typed configuration for Cloudinary credentials.
- Read Cloudinary credentials from environment variables or application config placeholders.
- Create a backend upload service responsible for sending files to Cloudinary.
- Restrict uploads to certificate-friendly file types.
- Support PDF and common image formats at minimum.
- Create a dedicated authenticated upload endpoint.
- Return a small, clean response DTO with the uploaded asset URL and related metadata useful to the frontend.
- Add basic validation and error handling for invalid or failed uploads.
- Add or update backend tests where practical.
- Update relevant backend configuration or README notes if necessary.

---

## Out of Scope

- No Angular file picker UI yet.
- No CE form upload interaction yet.
- No deleting files from Cloudinary yet.
- No advanced file management features.
- No client-side unsigned uploads.
- No drag-and-drop upload widget.

---

## Requirements

### 1) Configuration

Add Cloudinary configuration in a backend-appropriate way that matches the existing layered Spring Boot style.

Use environment-backed config values for:
- cloud name
- API key
- API secret

Do not hardcode secrets.

Prefer a typed configuration pattern consistent with the rest of the backend.

### 2) Upload Service

Create a service dedicated to certificate upload behavior.

Responsibilities:
- accept a multipart file
- validate that it is present and non-empty
- validate allowed content types and/or filename extensions
- upload to Cloudinary
- keep the implementation straightforward and easy to understand
- return the hosted file URL plus useful metadata

Prefer storing files in a predictable folder structure, for example something like:
- `uptrack/certificates`
- or `uptrack/users/{userId}/certificates`

Do not over-engineer naming rules, but do aim for clean organization.

### 3) Upload Endpoint

Create a secure authenticated endpoint, for example under something like:
- `POST /api/uploads/certificates`

The endpoint should:
- require authentication
- accept multipart form data
- delegate upload logic to the service layer
- return a clean response DTO

A response shape like this is appropriate:

```json
{
  "url": "https://...",
  "publicId": "uptrack/certificates/...",
  "originalFilename": "acls-cert.pdf",
  "resourceType": "raw"
}
```

The exact response can vary, but it should stay small and useful.

### 4) Validation

Handle common invalid cases cleanly:
- missing file
- empty file
- unsupported type
- Cloudinary failure

Return consistent API errors aligned with the existing global exception handling approach.

### 5) Security

This must be a backend upload using server-side credentials.

Do not expose the Cloudinary API secret to the Angular frontend.

### 6) Testing

At minimum, verify:
- endpoint rejects unauthenticated access if that matches current security rules
- invalid files are rejected cleanly
- service/controller behavior is covered as reasonably as possible without overbuilding tests

Mock Cloudinary interactions in tests where appropriate.

---

## Suggested Implementation Notes

- Preserve the current layered architecture: controller → service → config/DTO.
- Keep the controller thin.
- Keep Cloudinary-specific logic out of unrelated credential or CE services.
- Prefer a dedicated upload response DTO rather than returning raw SDK maps.
- Keep code beginner-friendly and readable.

---

## Acceptance Criteria

- Backend has a working authenticated certificate upload endpoint.
- Backend uploads valid files to Cloudinary successfully.
- Backend returns the hosted URL and useful metadata.
- Invalid uploads fail with clear structured errors.
- Secrets are not committed or hardcoded.
- Backend build passes.
- Relevant backend tests pass.

---

## Verification

Backend:
- Run backend tests.
- Run backend build.
- Test the upload endpoint manually with an API client using a real PDF or image.
- Confirm the uploaded file appears in Cloudinary.
- Confirm the returned URL is valid.

---

## Completion Log Entry

When completed, add a history entry similar to:

- **2026-03-24** — Completed Cloudinary backend integration with secure server-side certificate upload configuration, authenticated upload endpoint, file validation, Cloudinary-hosted asset response DTOs, and backend verification for valid and invalid upload flows.
