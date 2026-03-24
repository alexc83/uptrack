# Feature Spec: CE Records Page UI Refactor

## Goal

Refactor the CE Records page so it scales well for large datasets and feels consistent with the rest of the app.

The current card-based layout is not a good long-term fit for CE records because users may have dozens or even hundreds of entries. This update should shift the CE Records page from a large-card layout to a more compact, structured, table-based layout that is easier to scan, filter, and manage.

The screenshots provided are **structural references only**. They should guide layout and information hierarchy, but the actual styling must match the existing app design system, especially the updated Credentials page, dashboard card surfaces, spacing, typography, rounded corners, and filter/search treatment.

### Screenshots for reference

- @context/screenshots/ce-reference-screenshot-1.png
- @context/screenshots/ce-reference-screenshot-2.png

---

## Context

The Credentials page works well with cards because the number of credentials is usually small. CE records are different:

- Users may have a high volume of CE entries
- Entries are repetitive and data-heavy
- The main user need is quick scanning, filtering, and opening details

Because of that, the CE Records page should behave more like a compact records management screen and less like a gallery of large cards.

This update should make the page feel like a real product workflow, not just a visual mockup.

---

## Primary Objectives

1. Replace the large CE cards with a structured table/list layout
2. Keep the page visually aligned with the rest of the app
3. Improve scalability for users with many CE records
4. Make it obvious that a CE record can be opened for more details
5. Add pagination so the page does not become too long or dense
6. Add credential-based filtering in addition to the existing filter/search concept

---

## Design Direction

Use the attached mockups as guidance for **content structure and layout only**.

Do **not** copy the mockup styling literally if it conflicts with the actual app. The final result should match the existing application UI, including:

- the app’s neutral page background
- the white or near-white card/table surfaces used on the dashboard and updated Credentials page
- the improved search/filter styling already used on Credentials
- the app’s typography scale and spacing rhythm
- the app’s button styling
- the app’s chip/badge styling
- the app’s corner radius and shadow language

This page should feel like it belongs to the same product as the dashboard and credentials pages.

---

## Required Changes

### 1) Replace Large Card Grid with Table-Based Records Layout

Remove the current large CE record cards from the main content area and replace them with a compact, structured table-style layout.

The page should support scanning many records without excessive vertical space.

#### Table structure should include these columns:
- Course Name
- Organization
- Date
- Hours
- Credential
- Certificate
- Actions

#### Expectations
- Rows should be compact but comfortable to read
- The table should feel modern and lightweight, not like a dense legacy enterprise grid
- Maintain generous alignment and readable spacing
- Avoid giant row height unless the content requires wrapping
- Use clear visual separation between rows
- Column headers should be easy to scan

#### Content expectations by column
- **Course Name**: primary text, most visually prominent cell in the row
- **Organization**: secondary supporting info
- **Date**: clearly formatted date
- **Hours**: easy to scan numerically
- **Credential**: linked credential name associated with the CE
- **Certificate**: status badge such as On file or Missing
- **Actions**: subtle visual affordance for opening the CE detail drawer

---

### 2) Keep and Refine the Top Summary Area

Retain the CE page header structure, but adjust it to support the new table layout.

#### Top section should include:
- small section label such as `CONTINUING EDUCATION`
- large page title such as `Live CE Records`
- short subtitle/description
- record count in the upper-right area
- primary button: `Add CE Record`

#### Summary cards
Add or retain a small summary row above the table using dashboard-style cards.

Recommended cards:
- Total CE Hours
- Records
- Certificates Missing

#### Important
These summary cards should be helpful but not visually dominant. They should support the page, not overpower it.

---

### 3) Reuse the Improved Search + Filter Pattern from Credentials Page

The search and filter area should visually match the updated Credentials page rather than the old CE page.

#### Search bar
Use a large rounded search input consistent with Credentials page styling.

Placeholder example:
- `Search by course name or organization...`

#### Filter row
Place the filter row beneath the search bar with consistent spacing and alignment.

Use chip-style or segmented filter controls consistent with the existing design language.

#### Required filters
Include at least the following:

##### Credential filter
Users must be able to filter CE records by credential.

Examples:
- All
- ACLS Certification
- CCRN Certification
- RN License

This is a required addition.

##### Certificate filter
Users must be able to filter by certificate status.

Examples:
- On file
- Missing

#### Optional future filters
Do not build these unless already easy to support, but keep the layout flexible enough for them later:
- Date range
- Hours range
- Organization

---

### 4) Make Opening CE Details Obvious

The updated layout must make it clear that each CE record can be opened to view more detail.

The current page should not require the user to guess whether a row is interactive.

#### Desired interaction model
- Each row should feel clickable
- Clicking a row should open the CE details drawer
- The Actions column should reinforce that behavior

#### Recommended implementation
Use a subtle icon button in the Actions column, such as:
- chevron
- arrow
- expand/open icon

That icon should open the same CE drawer as clicking the row.

#### Important UX guidance
- Do not use large heavy buttons like “View” unless needed
- Do not clutter the Actions column
- The Actions column is meant to signal interactivity, not dominate the row

#### Acceptance criteria
- Users can click the row to open details
- Users can also click the icon in the Actions column
- The UI makes the interaction obvious without being noisy

---

### 5) Add Pagination

The CE records page should support pagination to prevent the page from becoming too long.

#### Required behavior
- Default page size: **10 records per page**
- Pagination controls should appear below the table
- Keep the initial implementation simple and clean

#### Acceptable controls
- Previous / Next
- Page numbers if already easy to support with the chosen component

#### Also update records display text
Instead of only showing:
- `Showing 15 records`

Use something more informative, such as:
- `Showing 10 of 120 records`

If total count and current slice are available, display both.

---

### 6) Improve Certificate Status Presentation

Certificate status is important and should remain easy to scan.

#### Statuses
- On file
- Missing

#### Visual treatment
Use badge/chip styling that matches the app.

Suggested visual direction:
- **On file**: positive / green badge
- **Missing**: neutral warning or soft muted alert badge

Do not use overly aggressive styling unless it matches the design system.

The goal is clarity, not alarm.

---

### 7) Match Actual App Styling, Not Just Mockup Styling

This is critical.

The provided screenshots are intended to communicate:

- overall structure
- hierarchy
- layout
- information grouping

They are **not** the exact visual source of truth.

The actual source of truth for styling should be:
- the live app
- dashboard cards
- updated credentials page
- existing design tokens / theme variables / shared utility classes / shared component overrides

#### Reuse existing design patterns wherever possible
Prefer:
- shared card surface styles
- shared table surface styles
- shared search bar styling
- shared filter chip styles
- shared spacing tokens
- shared badge treatments

Avoid introducing a disconnected one-off design language just because the mockup looks slightly different.

---

## Suggested Final Page Structure

The page should roughly follow this content order:

1. Section label
2. Page title and subtitle
3. Top-right record count and Add CE Record button
4. Small summary cards
5. Search bar
6. Filter row
7. “Showing X of Y records” text
8. CE records table
9. Pagination controls

---

## Responsiveness Requirements

The page must remain usable on smaller screens.

### Expectations
- Search bar should remain full width
- Filters may wrap cleanly to multiple lines
- Table should remain readable
- If necessary, the table can become horizontally scrollable on smaller breakpoints, but do not allow the layout to break awkwardly
- Maintain clickable affordances for row opening on mobile/tablet as reasonably as possible

Do not sacrifice desktop usability just to avoid all horizontal scrolling. The priority is a clean, stable responsive implementation.

---

## Non-Goals

Do **not**:
- redesign the entire application
- change backend data behavior unless needed for pagination/filter wiring
- add advanced sorting if not already planned
- add bulk actions
- add complicated table editing behavior inline
- convert this into a separate CE detail page flow

This is a UI and interaction refactor focused on layout, scalability, and clarity.

---

## Implementation Guidance

### Recommended mindset
This should feel like:
- a real records management page
- a professional healthcare/admin SaaS screen
- a scalable table-driven workflow

Not like:
- a gallery of content cards
- a marketing layout
- a one-off visual experiment

### Reuse likely existing building blocks
Look for opportunities to reuse or align with:
- credentials page search/filter section
- existing app page header layout
- dashboard surface styles
- badge/chip patterns
- drawer interaction patterns already used elsewhere in the app

### Table behavior
- Keep row hover subtle but noticeable
- Make interactivity obvious without using heavy buttons everywhere
- Preserve readability even when course names or credentials wrap to multiple lines

---

## Acceptance Criteria

### Layout and structure
- [ ] Large CE record cards are replaced with a scalable table/list layout
- [ ] Page structure includes header, summary, search, filters, table, and pagination
- [ ] Styling matches the existing app rather than copying mockup styling literally

### Filters and search
- [ ] Search bar visually matches the updated Credentials page style
- [ ] Credential filter is present
- [ ] Certificate status filter is present

### Table and interaction
- [ ] Table includes Course Name, Organization, Date, Hours, Credential, Certificate, and Actions columns
- [ ] Rows are readable and compact
- [ ] The row is clickable and opens the CE detail drawer
- [ ] The Actions column includes a subtle icon/button reinforcing row interactivity

### Pagination
- [ ] Pagination exists
- [ ] Default page size is 10 records
- [ ] The page displays “Showing X of Y records” or equivalent informative text

### Visual consistency
- [ ] Surfaces, spacing, filters, badges, and buttons align with the app’s current design system
- [ ] Certificate status badges are easy to scan
- [ ] The page feels consistent with the Credentials page and dashboard

---

## Reference Notes for Implementation

Use the provided screenshots to guide:
- the move from cards to table layout
- the placement of summary cards
- the idea of search + filters above the table
- the presence of certificate status badges
- the concept of a visible action affordance for opening details

But final visual decisions should be grounded in the real app styling.

---

## Deliverable

Update the CE Records page so it becomes a scalable, table-based records management screen that:
- matches the app’s existing UI language
- supports filtering by credential and certificate status
- includes pagination with 10 records per page
- makes row-to-drawer interaction obvious
- works well for large CE datasets