# Dashboard UI Phase 2 Spec

## Goal

Build the **main dashboard content area** for UpTrack using Angular standalone components and PrimeNG. This is a **UI implementation task**, not a design task. The visual design has already been decided based on the reference screenshots.

The objective is to match the screenshots as closely as practical while keeping the code clean, modular, and professional for a real Angular application.

This phase only covers the **main dashboard area to the right of the sidebar**. The sidebar already exists and should not be rebuilt in this task.

Use mock data directly for now. Do not add backend calls, services, or state management beyond what is needed to render the UI.

---

## Context Files

Read these before making changes:

- context/project-overview.md
- context/features/dashboard-ui-1-spec.md
- context/features/dashboard-ui-2-spec.md
- src/lib/mock-data.js

Reference screenshots:

- context/screenshots/dark-mode-dashboard-1.png
- context/screenshots/dark-mode-dashboard-2.png
- context/screenshots/light-mode-dashboard-1.png
- context/screenshots/light-mode-dashboard-2.png

---

## Implementation Constraints

- Use **Angular standalone components**
- Use **PrimeNG components where appropriate**, but do not force PrimeNG if plain semantic HTML is cleaner
- Use **TypeScript with strong typing**
- Use **Angular signals or simple readonly computed values** if needed, but do not over-engineer state
- Keep this phase **purely presentational**
- Import mock data directly from `src/lib/mock-data.js`
- Do **not** add API calls
- Do **not** add fake routing changes
- Do **not** redesign the layout
- Do **not** invent extra dashboard sections not shown in the screenshots
- Focus on **matching the screenshots** and creating **clean Angular structure**

---

## Main Layout Requirements

Build the main dashboard content area with this vertical structure:

1. Header row
2. Stats cards row
3. Two-column dashboard content row
4. Recent activity section

The content should sit inside the main page area to the right of the existing sidebar.

Use a centered content container with consistent horizontal padding and vertical spacing between sections.

---

## 1. Header Row

At the top of the dashboard content area, create a header section with two sides:

### Left side

Show a greeting and date:

- Greeting format:
  - Good morning, Sarah 👋
  - Good afternoon, Sarah 👋
  - Good evening, Sarah 👋

Rules:

- Before 12:00 local time → Good morning  
- 12:00 to 17:59 local time → Good afternoon  
- 18:00 to 23:59 local time → Good evening  

Use the logged in user’s **first name only**.

Below the greeting, show the full formatted date similar to the screenshots, for example:

- Monday, March 23, 2026

### Right side

Show two action buttons aligned horizontally:

- Add CE Record
- Add Credential

Styling rules:

- Match screenshot styling closely
- First button is secondary / neutral
- Second button is primary / blue
- Buttons should have icon + label
- Buttons should remain on the same row on desktop
- On smaller screens they may stack or wrap cleanly

---

## 2. Stats Cards Row

Below the header, render a row of **4 summary cards**:

1. Total Credentials  
2. Active  
3. Expiring Soon  
4. Expired  

Each card must contain:

- Label at top  
- Large numeric value  
- Icon shown on the right inside a subtle tinted square or rounded background  
- Card styling that matches the screenshots  
- Equal height across all four cards  

Visual rules:

- Total Credentials uses neutral/blue styling  
- Active uses green-tinted icon background  
- Expiring Soon uses yellow/orange-tinted icon background  
- Expired uses red-tinted icon background  

Desktop behavior:

- Four cards in one row  

Tablet/mobile behavior:

- Cards wrap into 2 columns or 1 column depending on available width  

Do not make these cards clickable in this phase.

---

## 3. Two-Column Dashboard Content Row

Below the stats cards, render a two-column layout:

### Left column

Upcoming Expirations

### Right column

CE Progress

Desktop:

- 2 columns  
- roughly equal width  
- aligned top  

Tablet/mobile:

- stack vertically  
- Upcoming Expirations first  
- CE Progress second  

Both panels should be card-like containers with:

- section header row  
- bordered or elevated surface  
- internal spacing  
- rounded corners  

---

## 3A. Upcoming Expirations Panel

This panel displays credentials that are expiring within the next 90 days, including expired items if present in the mock data.

### Panel header

Left side:

- warning/alert icon  
- title: Upcoming Expirations  

Right side:

- label: Next 90 days  

### Panel body

Render a vertical list of expiration rows.

Each row should contain:

- Credential name  
- Issuing organization below the name in muted text  
- Small type pill beside or near the credential name:
  - License  
  - Certification  
- Status badge or countdown badge on the right:
  - 23d left  
  - 40d left  
  - 79d left  
  - Expired  
- Expiration date below/right as shown in the screenshots  

Visual rules:

- Expiring items use yellow/orange badge treatment  
- Expired items use red badge treatment  
- First row may include a subtle colored left border like in the screenshots  
- Rows should have separators between them  
- Keep the panel height visually similar to the screenshots  

---

## 3B. CE Progress Panel

This panel displays CE progress for all credentials.

### Panel header

Left side:

- book/progress-related icon  
- title: CE Progress  

Right side:

- text showing number of credentials, for example: 6 credentials  

### Panel body

Render a vertical list of progress rows.

Each row should contain:

- Credential name  
- Percentage value aligned to the right  
- Progress bar below the name  
- Hours summary aligned to the right:
  - 16.5/20 hrs  
  - 4/8 hrs  
  - 80/100 hrs  

Visual rules:

- Neutral/blue progress bars for standard in-progress items  
- Green progress bar for 100% complete item  
- Amber/yellow treatment for very low progress if shown in screenshots  
- Consistent spacing between rows  
- Row separators between items  

---

## 4. Recent Activity Section

Below the two-column row, render a **Recent Activity** panel spanning the full content width.

### Panel header

Left side:

- activity/document icon  
- title: Recent Activity  

### Panel body

Render the most recent 5 activity items from the mock data.

Each activity row should contain:

- Small icon in a rounded square or circle on the left  
- Activity title  
- Secondary description text below it  
- Timestamp aligned to the far right:
  - 2 hours ago  
  - Yesterday  
  - 3 days ago  
  - 1 week ago  

Example activity types:

- Added CE record  
- Uploaded certificate  
- Renewed credential  

Visual rules:

- Compact row layout  
- Divider lines between rows  
- Full-width panel like the screenshots  
- Muted secondary text  
- Timestamp lighter and right-aligned  

---

## Data Mapping Requirements

Use the mock data file directly.

From the mock data, derive:

### Greeting

- Use logged-in user first name  

### Stats cards

Compute:

- Total credentials  
- Active credentials  
- Expiring soon credentials  
- Expired credentials  

### Upcoming expirations

Show credentials with expiration dates within the next 90 days and expired credentials if present  

### CE progress

Show all credentials with:

- credential name  
- percent complete  
- earned hours  
- required hours  

### Recent activity

Show latest 5 items sorted by most recent first  

---

## Responsive Requirements

### Desktop

- Header in one row  
- Stats in four columns  
- Two-column content row  
- Full-width recent activity section  

### Tablet

- Header may wrap  
- Stats may become two columns  
- Two-column content may stack  

### Mobile

- Header stacks vertically  
- Action buttons wrap cleanly  
- Stats become one or two columns  
- Panels stack vertically  
- No horizontal scrolling  

---

## Angular Code Organization Requirements

```text
src/app/features/dashboard/
  dashboard-page/
    dashboard-page.component.ts
    dashboard-page.component.html
    dashboard-page.component.scss

  components/
    dashboard-header/
    stats-cards/
    expirations-panel/
    ce-progress-panel/
    recent-activity-panel/

  models/
    dashboard.models.ts

  utils/
    dashboard.mappers.ts
    dashboard.helpers.ts