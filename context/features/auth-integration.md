# Feature: Auth Integration

## Goal

Wire the existing landing page, login modal, and sign up modal to the real Spring Boot authentication API so UpTrack supports a complete end-to-end auth flow.

This feature is about **real authentication integration**, not just modal UI. The landing page and auth modals already exist. This work connects them to the backend, stores auth state, protects app routes, and makes authenticated API requests possible.

---

## Context

UpTrack’s project overview defines these auth endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

All non-auth API calls should require a bearer token. The Angular frontend is expected to store the JWT and send it automatically on protected requests.

This feature should be implemented in a way that fits the existing Angular 21 standalone app structure and the current frontend visual flow.

---

## Scope

Implement:

1. frontend auth API integration
2. auth request/response models
3. login form submission
4. sign up form submission
5. JWT persistence strategy
6. current-user bootstrapping
7. auth guard for protected routes
8. HTTP interceptor to attach bearer token
9. logout behavior
10. basic auth error handling in the modals

Do not implement:

- forgot password
- social login
- email verification
- refresh token flow unless already present in backend
- role-based authorization
- redesign of landing page/auth modal visuals

---

## Backend Assumptions

Assume the backend already exposes:

### Register
`POST /api/auth/register`

Expected request body:
```json
{
  "name": "Alex Carter",
  "email": "alex@example.com",
  "password": "Password123!"
}
```

### Login
`POST /api/auth/login`

Expected request body:
```json
{
  "email": "alex@example.com",
  "password": "Password123!"
}
```

### Current user
`GET /api/auth/me`

Expected response should include at least:
- user id
- name
- email

### Login/Register response
Assume login and register return enough information for the frontend to establish auth state. Prefer this shape or adapt cleanly if the backend uses a slightly different one:

```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "name": "Alex Carter",
    "email": "alex@example.com"
  }
}
```

If the backend response differs slightly, align the frontend models accordingly instead of forcing a backend change unless necessary.

---

## Frontend Architecture Requirements

Use Angular standalone conventions and strong typing.

Suggested structure:

```text
src/app/core/auth/
  auth.service.ts
  auth.store.ts
  auth.guard.ts
  auth.interceptor.ts
  auth.models.ts

src/app/features/auth/
  login-form/
  signup-form/
```

You may adjust the exact folder names to match the codebase, but keep auth concerns centralized and easy to understand.

---

## Routing Rules

Public:
- `/`

Protected:
- `/dashboard`
- `/credentials`
- `/ce-records`

Rules:
- unauthenticated users can access the landing page
- unauthenticated users attempting to access protected routes should be redirected to `/`
- authenticated users should be able to access protected routes normally
- optionally, authenticated users visiting `/` can either remain there or be redirected to `/dashboard`; pick one behavior and keep it consistent

Recommended MVP behavior:
- after login/register success, navigate to `/dashboard`
- protected routes use an auth guard
- logout returns user to `/`

---

## Token Storage Strategy

For MVP, store the JWT in `localStorage` under a clear key such as:

- `uptrack_token`

Store minimal current user info separately only if it meaningfully helps bootstrapping. Do not duplicate unnecessary data.

On app startup:
- read token from storage
- if token exists, attempt `GET /api/auth/me`
- if that succeeds, restore authenticated state
- if it fails, clear token and treat user as logged out

---

## State Requirements

Keep auth state simple and explicit.

Suggested state shape:
- `token`
- `currentUser`
- `isAuthenticated`
- `isLoading`
- `authError`

Use Angular signals or a simple service-backed state model. Do not introduce NgRx or other heavyweight state tools.

---

## HTTP Interceptor Requirements

Create an HTTP interceptor that:

- reads the stored JWT
- adds `Authorization: Bearer <token>` to outgoing API requests
- skips auth header for public auth endpoints if desired
- handles `401` responses by clearing stale auth state and redirecting to `/`

Avoid overcomplicated retry logic for MVP.

---

## Login Modal Integration

The existing login modal UI already exists. Update it to submit real credentials.

### Required behavior

- field validation before submit
- submit button shows loading state during request
- on success:
  - token is stored
  - current user state is updated
  - modal closes
  - user is navigated to `/dashboard`
- on failure:
  - show friendly inline error message
  - keep entered email if practical
  - do not close the modal

### Validation

Use reactive forms.

Fields:
- email
- password

Validation:
- email required
- email format valid
- password required

---

## Sign Up Modal Integration

The existing sign up modal UI already exists. Update it to submit real registration requests.

### Required behavior

- field validation before submit
- submit button shows loading state during request
- on success:
  - if register returns token, establish session immediately and navigate to `/dashboard`
  - if register does not return token, fall back to a clean follow-up flow only if required by backend
- on failure:
  - show friendly inline error message
  - keep form values where reasonable
  - do not close the modal

### Validation

Fields:
- name
- email
- password

Validation:
- name required
- email required
- email format valid
- password required
- optional minimum password length if already enforced by backend

Do not invent overly strict password UX unless the backend requires it.

---

## Current User Bootstrap

When the app initializes:

1. check for stored token
2. if token exists, call `GET /api/auth/me`
3. if the call succeeds, populate current user state
4. if the call fails, clear token and log the user out locally

This is important so the dashboard shell can know whether the user is authenticated after refresh.

---

## Sidebar / Header Integration

Once authenticated:
- show the authenticated app shell as normal
- use the real current user’s name where user identity is displayed

If the existing sidebar currently uses placeholder identity data, replace that with the authenticated user once available.

---

## Logout Behavior

Implement logout from the existing app shell.

Logout should:
- clear token
- clear current user state
- clear any auth-related cached state
- navigate to `/`

If the backend eventually adds logout/token revocation, that can be layered on later. For MVP, frontend logout is sufficient.

---

## Error Handling

Support clean user-facing messaging.

Examples:
- invalid email or password
- email already in use
- session expired
- network error / server unavailable

Requirements:
- do not expose raw Java exception text directly
- provide one visible error region per modal
- clear prior error when the user retries submission
- do not swallow errors silently

---

## Acceptance Criteria

This feature is complete when:

1. login modal submits to the real backend
2. sign up modal submits to the real backend
3. successful auth stores the JWT
4. app startup restores auth state from stored token when valid
5. protected routes are guarded
6. bearer token is attached automatically to protected API requests
7. logout clears auth state and returns the user to `/`
8. auth errors display cleanly in the existing modal UI
9. no mock auth flow remains in use

---

## Implementation Guidance for Claude Code / Codex

- Modify the existing frontend project; do not rebuild auth UI from scratch.
- Reuse the landing page and auth modal components already created.
- Keep the auth state model simple.
- Use strict typing for all auth DTOs and responses.
- Make the smallest reasonable set of changes needed to establish real auth.
- Favor readability over clever abstractions.
