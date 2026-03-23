# UpTrack Drawer UI Spec

## Goal

Create a reusable drawer system for UpTrack using **Angular standalone components** and **PrimeNG**, primarily for:

1. **Individual item detail drawers**

   * Credential / certification / license detail
   * CE record detail
2. **Dashboard overflow list drawers**

   * View all expiring credentials
   * View all credentials needing CE attention

The drawer system should feel like a modern SaaS right-side panel, similar to Linear, Notion, or Stripe detail panels. It should preserve dashboard context while allowing users to inspect details and take action.

---

## Primary UX Rule

Use a **right-side drawer** for detail exploration.

Do **not** use a modal for these views.

Why:

* The content is too rich for a modal
* Users may want to scan lists, click between items, and take actions
* A drawer keeps the dashboard or list page visible in the background
* This pattern matches the interaction model already defined for UpTrack:

  * **Pages** = browsing and management
  * **Drawers** = detail viewing and expanded context
  * **Modals** = quick actions only

---

## PrimeNG Recommendation

Use **PrimeNG `p-drawer`** as the base component if available in the project version.

Recommended behavior:

* Position: `right`
* Overlay mode
* Dismissible by clicking the overlay
* Closable with an `X` button in the drawer header
* Responsive width rules
* Internal sections composed with semantic HTML and PrimeNG components where helpful

If PrimeNG drawer behavior is too restrictive for styling, keep `p-drawer` for the shell and build the inside content with custom layout markup.

---

## Drawer Types

### 1. Credential Detail Drawer

This opens when a user clicks:

* a credential row/card from the dashboard
* an expiring item from the overflow list drawer
* a credential from the Credentials page
* a CE progress item when that interaction maps to its parent credential

This drawer is for an **individual credential** such as:

* RN License — Texas
* BLS Certification
* ACLS Certification
* CCRN Certification

### 2. CE Record Detail Drawer

This opens when a user clicks an individual CE record.

This drawer focuses on a single CE entry and supporting details.

### 3. Overflow List Drawer

This opens from dashboard cards when the preview is truncated.

Examples:

* `View all expirations`
* `View all CE attention items`

This drawer shows a vertical list of items. Clicking one item should update the UI to show the corresponding **credential detail drawer**.

---

## Dashboard Overflow Rule

On the dashboard:

* Upcoming Expirations card should show **up to 3 items** by default
* CE Attention / CE Progress preview should show **up to 3 items** by default
* If there are more than 3 relevant items, show a footer or header link/button:

  * `View all expirations`
  * `View all CE items`

Clicking these should open a **list drawer**, not a new page and not a modal.

Inside the list drawer:

* show all relevant items
* allow scrolling
* keep items compact and clickable
* clicking any item should open the **credential detail drawer**

Implementation may use:

* one drawer shell whose content switches
* or a list drawer that closes and immediately opens a detail drawer

Preferred UX:

* keep it feeling seamless
* avoid sending the user to a new route just to inspect one item

---

## Recommended Component Structure

```text
src/app/features/drawers/
  drawer-shell/
    drawer-shell.component.ts
    drawer-shell.component.html
    drawer-shell.component.scss

  credential-detail-drawer/
    credential-detail-drawer.component.ts
    credential-detail-drawer.component.html
    credential-detail-drawer.component.scss

  ce-record-detail-drawer/
    ce-record-detail-drawer.component.ts
    ce-record-detail-drawer.component.html
    ce-record-detail-drawer.component.scss

  credential-list-drawer/
    credential-list-drawer.component.ts
    credential-list-drawer.component.html
    credential-list-drawer.component.scss

  models/
    drawer.models.ts

  utils/
    drawer.mappers.ts
```

---

## Recommended State Model

Keep drawer state simple and explicit.

Example concept:

* `isOpen`
* `drawerType`

  * `credential-detail`
  * `ce-record-detail`
  * `credential-list`
* `selectedCredentialId`
* `selectedCeRecordId`
* `credentialListMode`

  * `expiring`
  * `needs-ce`

The parent page should own which drawer is open and what data is passed into it.

Avoid a complex global drawer store for MVP unless the drawer is used across many unrelated pages immediately.

---

## 1. Credential Detail Drawer Spec

## Purpose

Show a rich, compact summary of a credential without leaving the current screen.

## Layout

The drawer should be a **right-side panel** with these sections in order:

1. Header / identity
2. Metadata summary row
3. CE progress section
4. CE records list section
5. Footer actions

---

### 1A. Header / Identity

At the top of the drawer show:

* Credential icon tile (shield, award, or relevant credential icon)
* Credential name
* Issuing organization
* Close button in the top-right corner

Below that, show status pills such as:

* `License` or `Certification`
* `23d left`, `Expired`, or `Active`

This area should visually match the reference screenshots.

---

### 1B. Metadata Summary Row

Show key facts in a compact two-column layout.

Recommended fields:

* Expiration date
* Renewal cycle

Optional future fields:

* Required CE hours
* Last renewed date

Use small muted labels above stronger values.

Example:

* `EXPIRES` → `Apr 15, 2026`
* `RENEWAL CYCLE` → `24 months`

---

### 1C. CE Progress Section

Show a section titled:

* `CE Progress`

Display:

* earned hours / required hours
* percent complete
* horizontal progress bar

Examples:

* `16.5 / 20 hours`
* `83%`

Visual rules:

* blue bar for standard in-progress
* green for fully complete
* amber/red only if intentionally used for low-progress emphasis

Keep this section compact.

---

### 1D. CE Records Section

Show a section titled:

* `CE Records (4)`

Below it, render a vertical list of linked CE record summaries.

Each item should show:

* CE title
* provider and completion date in muted text
* hours on the right

Example:

* Infection Control Update 2025
* NursingCE.com · Jan 10, 2025
* `4 hrs`

Style these as compact stacked rows or soft cards inside the drawer.

At the bottom of this section show a summary row:

* total record count
* total CE hours

Example:

* `4 records`
* `16.5 total hours`

---

### 1E. Footer Actions

At the bottom of the drawer show actions in this order:

1. Primary button: `Add CE Record`
2. Secondary outlined button: `Edit Credential`
3. Tertiary text button/link: `Export CE Summary`

These actions should stay visually grouped and easy to scan.

If the drawer height becomes long, the footer may remain in normal flow for MVP. Sticky footer behavior can be a later enhancement.

---

## 2. CE Record Detail Drawer Spec

## Purpose

Show the details for one CE record when a user clicks a CE entry.

## Layout

Recommended sections:

1. Header / identity
2. Core details
3. Associated credential
4. Certificate/file section
5. Footer actions

---

### 2A. Header

Show:

* CE title
* provider
* completion date
* close button

Optional supporting chip:

* number of hours

---

### 2B. Core Details

Display:

* Hours earned
* Date completed
* Provider
* Optional description if present

---

### 2C. Associated Credential

Show the credential this CE record applies to.

Example:

* RN License — Texas
* Texas Board of Nursing

This may be a compact linked card/row that allows opening the credential detail drawer.

---

### 2D. Certificate Section

If certificate exists, show:

* file name or document label
* view/download link

If no certificate exists, show a muted empty state:

* `No certificate uploaded`

---

### 2E. Footer Actions

Suggested actions:

* `Edit CE Record`
* `Upload / Replace Certificate`
* `Delete CE Record` (destructive, secondary placement)

---

## 3. Overflow List Drawer Spec

## Purpose

Show all items when a dashboard preview card is truncated to 3 items.

There will be two main variants:

1. **Expiring credentials list drawer**
2. **Needs CE attention list drawer**

---

### 3A. Shared Layout

The list drawer should contain:

1. Header
2. Count / context line
3. Scrollable list of compact items
4. Optional footer action

Header examples:

* `All Upcoming Expirations`
* `Credentials Needing CE Attention`

Optional subtitle:

* `7 credentials`
* `Sorted by urgency`

---

### 3B. Expiring Credentials List

Each list item should show:

* Credential name
* Issuing organization
* Type pill (`License` / `Certification`)
* Countdown/status badge on the right (`23d left`, `Expired`)
* Expiration date

Sort order:

1. Expired first or last depending on product choice, but be consistent
2. Then soonest expiration first

Recommended default:

* soonest upcoming first
* expired grouped at top or clearly labeled

Each row should be clickable.

Click behavior:

* open the **Credential Detail Drawer** for that item

---

### 3C. Needs CE Attention List

Each list item should show:

* Credential name
* Issuing organization
* Progress percentage
* Hours earned vs required
* Progress bar
* Optional helper text such as `6 hrs remaining`

Sort order:

* lowest completion or highest urgency first

Each row should be clickable.

Click behavior:

* open the **Credential Detail Drawer** for that credential

---

## Responsive Rules

### Desktop

* drawer opens from the right
* width around 420px to 520px depending on content density

### Tablet

* slightly wider percentage-based width is acceptable

### Mobile

* drawer may become nearly full width
* internal spacing should tighten slightly
* footer actions should remain easily tappable
* maintain 44px minimum tap targets

---

## Visual Rules

The drawer should match the UpTrack UI system.

### Light mode

* soft white / near-white surface
* subtle borders
* muted gray secondary text
* blue primary actions
* light tinted pills for status

### Dark mode

* dark tinted surface, not pure black if avoidable
* soft border separation
* brighter progress bars for visibility
* muted text still readable
* overlay should dim but not fully obscure the page

### General

* rounded corners
* clean section dividers
* strong spacing rhythm
* no cluttered admin-panel feel

---

## Interaction Flow

### Flow A: Dashboard preview item → detail drawer

1. User clicks one credential in Upcoming Expirations preview
2. Credential Detail Drawer opens

### Flow B: Dashboard `View all expirations` → list drawer → detail drawer

1. User clicks `View all expirations`
2. Expiring Credentials List Drawer opens
3. User clicks one item
4. Credential Detail Drawer opens for that item

### Flow C: Dashboard `View all CE items` → list drawer → detail drawer

1. User clicks `View all CE items`
2. Needs CE Attention List Drawer opens
3. User clicks one item
4. Credential Detail Drawer opens for that credential

### Flow D: Credential detail → CE record detail

1. User clicks one CE record row inside the credential drawer
2. CE Record Detail Drawer opens

For MVP, it is acceptable to close one drawer and open the next immediately. Later, this can be enhanced into smoother nested transitions if desired.

---

## Recommended View Models

Create specific view models for drawer content instead of passing raw entities everywhere.

Examples:

### CredentialDrawerViewModel

* id
* name
* organization
* type
* status
* daysRemaining
* expirationDateLabel
* renewalCycleLabel
* ceHoursEarned
* ceHoursRequired
* ceProgressPercent
* ceRecords
* ceRecordCount
* ceTotalHours

### CERecordDrawerViewModel

* id
* title
* provider
* dateCompletedLabel
* hoursLabel
* certificateUrl
* certificateName
* linkedCredentialName
* linkedCredentialOrganization

### CredentialListDrawerItem

* id
* name
* organization
* type
* status
* expirationDateLabel
* daysRemainingLabel
* ceProgressPercent
* ceHoursSummary

---

## Suggested Angular Components

### `drawer-shell`

Responsibilities:

* wraps `p-drawer`
* handles open/close shell behavior
* receives drawer title/size/mode inputs
* projects child content

### `credential-detail-drawer`

Responsibilities:

* renders one credential detail view
* uses mapped credential drawer view model

### `ce-record-detail-drawer`

Responsibilities:

* renders one CE record detail view

### `credential-list-drawer`

Responsibilities:

* renders either expiring list or needs-CE list
* emits selected credential id when user clicks an item

---

## Suggested PrimeNG Usage

Use PrimeNG selectively.

Recommended candidates:

* `p-drawer` for shell
* `p-button` for footer actions
* `p-tag` or styled pills for status badges if the styling can be controlled
* `p-progressBar` only if it visually fits the design; otherwise use custom progress markup
* `p-divider` only if it does not create bulky spacing

If PrimeNG components fight the design too much, prefer custom semantic HTML inside the drawer body.

---

## Empty States

Support clean empty states.

### Credential drawer with no CE records

Show:

* `No CE records yet`
* helper text prompting the user to add one
* primary button: `Add CE Record`

### Empty overflow list drawer

Show:

* `No expiring credentials`
  or
* `No credentials currently need CE attention`

Keep empty states calm and compact.

---

## Accessibility Notes

* Focus should move into the drawer when it opens
* Escape key should close the drawer
* Close button should have accessible label
* List rows that are clickable should be keyboard reachable
* Buttons and rows should meet minimum tap target sizes

---

## Final Build Priority

Implement in this order:

1. Drawer shell using PrimeNG `p-drawer`
2. Credential detail drawer
3. Overflow list drawer for expiring items
4. Overflow list drawer for CE attention items
5. CE record detail drawer

This order supports the dashboard UX first and keeps the MVP focused.

---

## Final Instruction

Do not treat these as full pages. These are right-side drawers meant to preserve dashboard context.

The dashboard should preview a limited number of items. If there are more than 3 relevant entries, show a link/button that opens a list drawer. Clicking a list item should open the corresponding credential detail drawer.

Use PrimeNG where it helps, but prioritize matching the desired SaaS UI and keeping the Angular structure modular and clean.
