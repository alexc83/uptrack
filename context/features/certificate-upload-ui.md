# UpTrack Feature Spec 02 — Certificate Upload UI Integration

## Overview

Implement the Angular frontend flow for uploading certificate files as part of the CE record create/edit experience.

This feature should connect the CE form UI to the new backend upload endpoint from Feature 01. The user should be able to choose a certificate file, upload it, and have the returned hosted URL saved into the CE record flow.

---

## Goal

Allow users to upload a certificate file during CE record creation or editing in a way that feels clean, understandable, and consistent with the existing modal and drawer UX.

---

## In Scope

- Add certificate file selection to the CE create/edit form.
- Upload the selected file through the backend upload endpoint.
- Reflect upload progress/state in the UI.
- Save the returned certificate URL into the CE record request payload.
- Show the current uploaded file state clearly in the form.
- Support both add and edit CE flows where appropriate.
- Handle upload errors cleanly.
- Update frontend tests where practical.

---

## Out of Scope

- No direct-to-Cloudinary client upload.
- No drag-and-drop area unless it is extremely lightweight and already fits the design.
- No file delete-from-Cloudinary behavior yet.
- No full file manager.
- No large redesign of the CE form beyond what is needed for upload support.

---

## Requirements

### 1) Form UI

Add a certificate upload section to the CE add/edit form.

This should feel consistent with the current app styling and modal patterns.

Include:
- a file picker control
- a short helper text about accepted file types
- visible upload status
- clear feedback when upload succeeds or fails

Accepted file examples:
- PDF
- JPG
- JPEG
- PNG

### 2) Upload Interaction

Recommended behavior:
- user selects a file
- frontend uploads it immediately or via a clear “Upload” action
- backend returns URL + metadata
- form stores the returned URL for later CE record submission

Either immediate upload or explicit upload button is acceptable, but keep the UX simple and obvious.

### 3) Form State

The form should clearly represent these states:
- no file selected
- file selected but not yet uploaded, if applicable
- upload in progress
- upload success
- upload failed

Disable repeated/conflicting actions while upload is in progress.

### 4) Edit Flow

If a CE record already has a certificate URL:
- show that a certificate is already attached
- allow replacing it with a new uploaded file
- preserve the existing URL unless the user uploads a replacement

### 5) Save Behavior

When the CE record is finally submitted:
- include the certificate URL returned from the upload endpoint
- do not send raw file data to the CE record create/update endpoint

### 6) Service Layer

Add or extend a frontend service for upload behavior.

Keep upload logic out of the component as much as practical.

The UI component should coordinate state, not own low-level HTTP details.

### 7) Error Handling

Provide clean frontend feedback for:
- unsupported file type
- upload failure
- network failure
- backend validation errors

Use the project’s existing notification or error-display patterns where possible.

---

## UX Guidance

Keep this polished but not overbuilt.

A good lightweight flow would be:
- file input row
- helper text under it
- upload status row or inline message
- after success, show file name and a small success indicator
- if a certificate URL exists, allow opening it in a new tab

If a link preview is shown, keep it simple.

---

## Suggested Technical Notes

- Reuse current CE modal patterns.
- Preserve typed models.
- Keep upload response mapping explicit.
- Avoid mixing upload state with unrelated CE form logic if it starts getting messy.
- If needed, use a small dedicated child section/component only if it improves clarity.

---

## Acceptance Criteria

- User can select a supported certificate file from the CE form.
- Frontend uploads the file through the backend upload endpoint.
- Frontend stores the returned certificate URL.
- Add CE and edit CE flows both handle certificate upload cleanly.
- Upload success and failure are visible to the user.
- Existing certificate URLs are shown appropriately in edit mode.
- Frontend build passes.
- Relevant frontend tests pass.

---

## Verification

Frontend:
- Open CE add modal and upload a valid file.
- Confirm the upload succeeds and the CE record saves with the returned certificate URL.
- Open CE edit modal for a record with an existing certificate.
- Confirm replacement behavior works.
- Confirm invalid or failed uploads show useful feedback.
- Run frontend build and relevant tests.

---

## Completion Log Entry

When completed, add a history entry similar to:

- **2026-03-24** — Completed certificate upload UI integration with CE form file selection, authenticated backend upload wiring, inline upload status and error handling, persisted certificate URL support for CE create/edit flows, and frontend verification across success and failure states.
