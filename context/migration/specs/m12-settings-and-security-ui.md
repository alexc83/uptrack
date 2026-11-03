# M12 — Settings and security UI

**Status:** READY (authorized for implementation per owner brief of 2026-11-03: "Begin M12 implementation now").  
**Branch:** `feature/react-settings`  
**Dependency:** M11 approved and merged (`35fd1dc`)

## Objective
Replace the dev-only React Settings placeholder with a fully functional Settings experience that achieves complete parity with the Angular application: profile viewing, profile editing with change detection and email duplicate conflict handling, and password change modal with security validations.

## Source references inspected
- `frontend/src/app/features/settings/settings-page.component.ts`
- `frontend/src/app/features/settings/settings-page.component.html`
- `frontend/src/app/features/settings/settings-page.component.scss`
- `frontend/src/app/features/settings/settings-page.component.spec.ts`
- `frontend/src/app/services/user-profile.service.ts`
- `frontend/src/app/services/user-profile.service.spec.ts`
- `frontend/src/app/models/user-profile.models.ts`
- `backend/src/main/java/com/ccruce/backend/controller/UserController.java`
- `backend/src/main/java/com/ccruce/backend/service/impl/UserServiceImpl.java`
- `backend/src/main/java/com/ccruce/backend/dto/request/UpdateProfileRequestDto.java`
- `backend/src/main/java/com/ccruce/backend/dto/request/ChangePasswordRequestDto.java`
- `backend/src/main/java/com/ccruce/backend/dto/response/UserResponseDto.java`
- `frontend-react/src/core/api/users-api.ts`
- `frontend-react/src/core/auth/session-store.ts` (`updateUser`)
- `frontend-react/src/core/auth/session-context.tsx` (`useSession`)

## In scope
1. **Authenticated Settings Page (`/settings`)** inside `AppShell`:
   - Page title `Settings — UpTrack`.
   - Back button navigates to previous route if present in history, else `history.back()`.
   - Header with kicker `Account`, `h1` `Settings`, subtitle `Manage your account information.`
   - Shell centered layout matching Angular (`max-w-[46rem] mx-auto`).
2. **Profile Section (`Profile`)**:
   - `h2` `Profile`, subtitle `Update the name and email tied to your UpTrack account.`
   - Form fields:
     - `Name`: required, max 120 chars, autocomplete `name`.
     - `Email`: required, valid email, max 180 chars, autocomplete `email`.
   - Change detection (`hasChanges`): "Save Changes" button is disabled unless form is valid, values differ from loaded profile (trimmed name differs or trimmed lowercase email differs), and save is not pending.
   - Successful save:
     - Dispatches `PUT /api/users/me` with trimmed values.
     - Updates query cache `['profile']` and session store (`updateUser(profile)`), immediately updating shell avatar and user identity.
     - Shows success banner: `role="status"`, "Profile updated".
     - Clears previous save errors and marks form pristine.
   - Error handling:
     - Backend 409 Conflict ("Email is already in use.") or other API errors display in `role="alert"` banner.
     - User input is preserved across errors.
3. **Security Section (`Security`)**:
   - `h2` `Security`, subtitle `Update your password.`
   - "Change Password" action button opening password modal dialog.
   - Success banner: `role="status"`, "Password updated" after modal password change succeeds.
4. **Change Password Modal Dialog**:
   - Modal dialog via `AppModal` with title `Change Password`, subtitle `Update your password with a secure confirmation step.`
   - Current Password: required.
   - New Password: required, min 8 chars, max 255 chars, must differ from Current Password (`samePassword` validation).
   - Confirm New Password: required, must match New Password (`passwordMismatch` validation).
   - Form actions: "Cancel" (resets form, closes modal) and "Update Password" (disabled if invalid or submitting).
   - Dynamic error clearing: typing in password fields clears active password error.
   - On submit: `PUT /api/users/me/password` with `{ currentPassword, newPassword }`.
   - On 204 No Content: closes modal, resets form, displays "Password updated" on settings page.
   - On 400 Bad Request (e.g. "Current password is incorrect."): keeps modal open, displays error banner in modal, preserves entered values.
5. **Loading, Error, and Session Isolation**:
   - Initial load skeleton matches Angular layout.
   - Load error displays `role="alert"` with "Settings unavailable", error message, and "Retry" button.
   - Session boundary (`SettingsSessionBoundary`) ensures component unmounts and state is discarded if user session replaces/logs out, preventing cross-account exposure.

## Out of scope
- Any backend controller, DTO, entity, or service changes.
- Adding unneeded third-party libraries.
- Features not present in Angular (theme settings inside page body, notification settings, delete account).

## API Contracts
| Endpoint | Method | Request DTO | Response | Errors |
|---|---|---|---|---|
| `/api/users/me` | GET | None | `UserResponseDto` `{ id, name, email, createdAt }` | 401 Unauthorized |
| `/api/users/me` | PUT | `UpdateProfileRequestDto` `{ name, email }` | `UserResponseDto` | 400 Validation, 401 Unauthorized, 409 Conflict ("Email is already in use.") |
| `/api/users/me/password` | PUT | `ChangePasswordRequestDto` `{ currentPassword, newPassword }` | 204 No Content | 400 Bad Request ("Current password is incorrect.", etc.), 401 Unauthorized |

## Component & State Ownership
- `SettingsPage`: container, orchestrates `useProfile` query and layout.
- `SettingsSessionBoundary`: key reset on session replacement.
- `ProfileCard`: manages profile form state, RHF + Zod schema, change detection, profile update mutation, and success/error banners.
- `SecurityCard`: displays security heading, password change button, and password success banner.
- `PasswordDialog`: modal dialog hosting password form, validation, submission, and modal error banner.
- `useProfile`: queries `/api/users/me` using TanStack Query key `queryKeys.profile()`.
- `useUpdateProfile`: mutation executing `usersApi.updateProfile`, guarded by `SessionGuard`, calling `session.updateUser()`.
- `useChangePassword`: mutation executing `usersApi.changePassword`, guarded by `SessionGuard`.

## Acceptance Criteria
1. **Given** an authenticated user on `/settings`, **When** the page loads, **Then** `GET /api/users/me` is invoked, initial name and email populate the form, and "Save Changes" is disabled.
2. **Given** loaded profile data, **When** user edits name or email to a valid distinct value, **Then** "Save Changes" becomes enabled.
3. **Given** modified profile values, **When** "Save Changes" is clicked, **Then** trimmed values are submitted via `PUT /api/users/me`, success banner "Profile updated" appears, session store updates (`updateUser`), and "Save Changes" becomes disabled.
4. **Given** modified email that is already taken by another account, **When** "Save Changes" is clicked and server responds with 409, **Then** "Email is already in use." is displayed in an alert banner and inputs are preserved.
5. **Given** the Security card, **When** "Change Password" is clicked, **Then** the Change Password modal opens with currentPassword, newPassword, and confirmPassword fields.
6. **Given** password inputs, **When** newPassword matches currentPassword or confirmPassword does not match newPassword, **Then** inline field errors display and submit is disabled.
7. **Given** valid password inputs, **When** current password is wrong and server returns 400, **Then** modal stays open with "Current password is incorrect." error banner.
8. **Given** valid password inputs, **When** update succeeds (204), **Then** modal closes, password form resets, and "Password updated" banner displays on Settings page.
9. **Given** account switch or logout, **When** session changes, **Then** all settings page and modal form state is destroyed and isolated to the authenticated user.

## Completion report
`context/migration/verification/m12-report.md`
