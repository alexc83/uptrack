# Settings / Security Spec

## Feature Name
Change Password from Settings

## Overview
Add a security section to the new Settings experience so the authenticated user can change their password in a secure, focused flow.

This should be treated as a separate feature from profile editing because it has different validation, different backend behavior, and stronger security considerations.

---

## Scope

### In Scope
- Add a `Security` section to the Settings page
- Add a `Change Password` action
- Open a focused modal for password change
- Allow the authenticated user to submit:
  - current password
  - new password
  - confirm new password
- Validate and persist the password change through the backend
- Show success/error feedback

### Out of Scope
- forgot password flow
- password reset email flow
- MFA / 2FA
- session management across devices
- account deletion

---

## UX Requirements

### Settings Page Security Section
Add a `Security` card/section below the Profile section on the Settings page.

Suggested content:
- section title: `Security`
- short helper text such as `Update your password`
- button: `Change Password`

### Change Password Modal
Clicking `Change Password` should open a centered modal.

Use a modal here rather than a separate page because this is a short, focused action.

#### Modal Fields
- Current password
- New password
- Confirm new password

#### Buttons
- Cancel
- Update Password

#### Behavior
- Close on cancel
- Close on successful update
- Reset form when modal closes

---

## Validation Requirements

### Current Password
- required

### New Password
- required
- minimum length should follow the project’s current auth/password rules
- if no current rule exists, use a reasonable minimum such as 8 characters

### Confirm New Password
- required
- must match new password

### Additional Rules
- new password should not equal current password if easy to validate cleanly
- show clear inline validation messages
- disable submit when form is invalid

---

## Frontend Implementation Notes
- Reuse the Settings page from the profile spec
- Implement the password flow as a focused modal dialog
- Use reactive forms and strong typing
- Show loading state while submitting
- Show success toast/message on completion
- Show clear error message if the current password is incorrect

Suggested frontend types:
- `ChangePasswordRequest`

Example request shape:
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

Do not send `confirmPassword` to the backend unless the backend contract explicitly expects it.

---

## Backend Requirements

### Endpoint
Create an authenticated endpoint such as:
- `PUT /api/users/me/password`

### Request DTO
Example:
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

### Backend Behavior
The backend must:
- identify the current user from the authenticated context
- verify the provided current password against the stored encoded password
- reject the request if current password is wrong
- encode the new password using the existing password encoder
- save the updated password securely

### Error Cases
Expected cases include:
- `400` invalid request / weak password / same password if enforced
- `401` unauthenticated
- `403` or `400` for incorrect current password depending on existing error patterns
- `404` only if authenticated user record cannot be found

Use the existing global exception handling style.

---

## Security Requirements
- Require authentication
- Never expose stored password data in responses
- Never log raw passwords
- Use the existing password encoder
- Keep password verification in the backend service layer
- Do not trust any user identifier passed from the client

---

## Acceptance Criteria
- Settings page contains a Security section
- Clicking `Change Password` opens a modal
- The modal validates all fields properly
- Incorrect current password is handled gracefully
- Successful submission updates the stored password
- The modal closes on success and shows feedback
- Existing login behavior continues to work with the new password
- Backend tests cover the password change behavior
- Frontend build/tests pass for the updated UI

---

## Manual Test Scenarios
1. Open Settings and click Change Password
2. Try to submit an empty form
3. Try mismatched confirm password
4. Try a too-short new password if minimum length is enforced
5. Try using the wrong current password
6. Successfully change the password
7. Log out
8. Confirm login works with the new password
9. Confirm login no longer works with the old password

---

## Keep It Focused
This feature should remain a clean password update flow only. Do not expand it into password reset, email verification, or broader account security management in the same task.
