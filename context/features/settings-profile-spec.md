# Settings / Profile Management Spec

## Feature Name
Settings Page + Account Profile Management

## Overview
Add a real account settings experience to UpTrack so the avatar area in the authenticated shell no longer acts only as a logout trigger. The user should be able to open a small profile menu from the avatar area, navigate to a dedicated Settings page, and update their account profile information.

This should feel like a normal SaaS application pattern and should match the current UpTrack interaction model:
- full pages for primary account management views
- modals for short focused tasks
- drawers for record detail views

This feature is focused on:
1. replacing the current avatar logout-only interaction with a small menu
2. adding a dedicated `/settings` page
3. allowing the authenticated user to update their name and email

Do not add unrelated profile features in this task.

---

## Why This Feature Exists
Right now the avatar/profile area does not behave like a real account entry point. Adding Settings makes the app feel more complete and gives the user a clear place to manage their own account.

This also creates a better long-term foundation for future account preferences such as avatar upload, theme preference persistence, timezone, notification settings, or account deletion.

---

## Scope

### In Scope
- Add a profile/avatar trigger in the authenticated shell header/footer area
- Open a small menu from the avatar area
- Menu options:
  - `Settings`
  - `Logout`
- Add a dedicated Settings page route
- Add a profile section on the Settings page
- Allow the current authenticated user to view and edit:
  - name
  - email
- Load current user data from the backend
- Persist profile updates through the API
- Show validation and success/error feedback

### Out of Scope
- password change UI and API for this spec
- avatar upload
- notification preferences
- account deletion
- multi-user admin settings
- theme persistence beyond existing app behavior

---

## UX Requirements

### 1. Avatar / Profile Menu
The current avatar area near the logout button should become an interactive account menu.

#### Behavior
- Clicking the avatar/profile area opens a small overlay menu
- The menu should be aligned to the avatar trigger
- The menu should close when:
  - the user clicks outside
  - the user selects an action
  - the user presses Escape if supported by the PrimeNG component

#### Menu Items
1. `Settings`
   - navigates to `/settings`
2. `Logout`
   - preserves the current logout behavior

#### UI Notes
- Use a PrimeNG overlay/menu component if it fits the current codebase cleanly
- Preserve the current visual styling of the shell
- The trigger should still visually show the user identity area
- The trigger should feel clearly clickable

---

### 2. Settings Page
Settings should be a full page, not a modal and not a drawer.

#### Route
- `/settings`

#### Navigation
- The page should be accessible from the avatar/profile menu
- It may also be added to the main sidebar navigation if that fits the current app layout cleanly, but this is optional
- The avatar menu entry is required

#### Page Layout
The page should feel like a lightweight SaaS settings screen.

Recommended structure:
- page title: `Settings`
- short subtitle/description such as: `Manage your account information`
- one primary card/section titled `Profile`

Inside the profile card:
- Name input
- Email input
- Save changes button
- Optional inline helper text

#### Design Expectations
- Match existing UpTrack visual language
- Use PrimeNG form components where appropriate
- Keep layout responsive and mobile-friendly
- Avoid a giant empty page; use a centered or constrained content width
- Avoid overdesign or extra sections not in scope

---

## Form Requirements

### Profile Form Fields
#### Name
- required
- trim leading/trailing whitespace before submission if current patterns support this cleanly
- show validation message when empty

#### Email
- required
- valid email format
- show validation message when invalid

### Form State
- Populate the form using the authenticated user’s current data
- Save button should be disabled when the form is invalid
- Prefer also disabling save when no changes have been made if easy to support cleanly
- While saving, show a loading state on the button or section

### Feedback
- On success, show a success toast/message such as `Profile updated`
- On backend error, show a clear user-friendly error message
- If email already exists, surface that clearly if the backend returns a conflict

---

## Frontend Implementation Notes

### Suggested Feature Area
Create or use a feature area such as:
- `features/settings/`

### Suggested Components
At minimum:
- `settings-page.component.*`
- reuse existing shell/profile trigger if possible

Possible supporting pieces if needed:
- `account-menu` component
- `settings-profile-form` child component

Do not over-componentize unless it clearly improves readability.

### Suggested Services / Models
- Reuse existing auth/user service if one already exposes the current authenticated user
- Add or update a service method for:
  - loading current user profile
  - updating current user profile

Suggested DTO-style frontend model example:
- `UpdateProfileRequest`
- `UserProfileResponse`

Use strict typing and preserve existing code patterns.

### Angular Expectations
- standalone components only
- reactive forms
- modern Angular patterns already used in the codebase
- avoid unnecessary subscriptions if async pipe or existing signal patterns fit cleanly

---

## Backend Requirements

### Goal
Support authenticated self-service profile updates without exposing a generic admin-style user editing flow.

### API
Add or update an authenticated endpoint for the current user.

Preferred approach:
- `GET /api/users/me`
- `PUT /api/users/me`

If `/api/auth/me` already exists and is the preferred source for current user info, it can continue to be used for reads. For updates, create a dedicated authenticated self-update endpoint.

### Update Behavior
The authenticated user should be able to update:
- name
- email

The backend must:
- identify the user from the authenticated security context / JWT
- never allow one user to update another user by passing an arbitrary user id
- validate required fields
- validate email format if current validation layer supports it
- enforce unique email constraints

### Suggested Request DTO
Example shape:
```json
{
  "name": "Alex Carter",
  "email": "alex@example.com"
}
```

### Suggested Response DTO
Return the updated user profile the frontend needs, such as:
```json
{
  "id": "...",
  "name": "Alex Carter",
  "email": "alex@example.com"
}
```

### Error Handling
Use the existing global exception handling pattern.

Expected cases:
- `400` invalid input
- `401` unauthenticated
- `409` email already in use
- `404` only if the authenticated user cannot be found

---

## Security Requirements
- Require authentication for all settings/profile endpoints
- Use the authenticated principal / JWT context to resolve the current user
- Do not accept user id from the client for self-update
- Do not expose password fields in this feature
- Do not log sensitive user update payloads unnecessarily

---

## Acceptance Criteria
- Clicking the avatar/profile area opens a menu
- The menu includes `Settings` and `Logout`
- Clicking `Settings` navigates to `/settings`
- The Settings page loads the current authenticated user’s name and email
- The user can edit and save name/email
- Validation errors appear for invalid inputs
- Successful save updates the backend and the UI reflects the new values
- Duplicate email conflicts are handled gracefully
- Logout still works from the avatar menu
- Frontend build passes
- Relevant frontend tests are added or updated where appropriate
- Backend build/tests pass for any backend changes made

---

## Manual Test Scenarios
1. Open the app while authenticated and click the avatar/profile area
2. Confirm the menu opens and closes properly
3. Click Settings and verify navigation to `/settings`
4. Verify the current name/email load correctly
5. Change the name only and save
6. Change the email to a valid new email and save
7. Attempt to save with blank name
8. Attempt to save with invalid email format
9. Attempt to save with an email already used by another account
10. Use Logout from the profile menu and confirm the session ends correctly

---

## Non-Goals / Keep It Simple
- Do not redesign the whole shell
- Do not create a massive account center
- Do not build preference tabs yet
- Do not add avatar uploads yet
- Do not add password change yet

This should be a clean, focused, minimal feature that makes the account area feel more complete.
