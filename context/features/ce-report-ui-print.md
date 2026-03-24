# UpTrack Feature Spec 04 — CE Report UI and Print Flow

## Overview

Implement the frontend UI for viewing and printing a CE report for a single credential.

This feature should consume the backend report endpoint from Feature 03 and provide a polished, printable report experience for the user.

---

## Goal

Allow the user to open a credential-specific CE report, review all associated CE records and totals, and print or save the report as PDF using the browser’s print flow.

---

## In Scope

- Add a frontend flow to request a credential-specific CE report.
- Render report data in a clean print-friendly layout.
- Provide a print action.
- Support the browser print dialog for PDF saving/printing.
- Show loading, empty, and error states.
- Connect report access from the most sensible credential-related UI entry points.
- Add frontend tests where practical.

---

## Out of Scope

- No backend PDF generation.
- No multi-credential reporting.
- No email/export delivery.
- No advanced reporting filters beyond the selected credential.

---

## Requirements

### 1) Entry Points

Add a clear way to open the CE report for a credential.

Good options include:
- credential detail drawer action
- credentials page action
- dashboard credential detail action if appropriate

The entry point should be obvious but not visually noisy.

### 2) Report Rendering

Render a credential-specific report that includes:
- credential name and core details
- status and expiration info
- required CE hours
- earned CE hours
- remaining hours if applicable
- CE record count
- table or structured list of all CE records

Each record should show:
- title
- provider
- date completed
- hours
- certificate indicator or link if present

### 3) Layout Choice

Use the simplest layout that supports printing well.

A dedicated print-friendly page or dedicated full-screen report view is likely the best choice.

Avoid trying to print directly from a cramped modal or drawer.

A practical pattern is:
- open report in its own route or focused full-page view
- provide a print button
- use print CSS to simplify the layout for paper/PDF output

### 4) Print Behavior

Support a browser-native print flow using `window.print()` or an equivalent lightweight approach.

The goal is that users can:
- print the report on paper
- or save it as PDF from the browser print dialog

### 5) Print Styling

Add print-specific styles so the report prints cleanly.

Print output should:
- hide unnecessary navigation/chrome
- preserve readable spacing and hierarchy
- keep text dark on light background for printing
- avoid clipping or awkward overflow
- keep tables readable

### 6) Empty and Error States

Handle:
- no CE records for the credential
- failed report load
- loading state while fetching report data

### 7) Frontend Service/Model Support

Add typed frontend models for the report response.

Use a dedicated service method to fetch report data from the backend.

### 8) UX Guidance

This should feel like a professional export preview, not a rough debug page.

Keep it clean, simple, and highly readable.

---

## Suggested UI Structure

A good report layout might include:

1. Header area
- report title
- credential name
- generated date
- print button
- optional back button

2. Credential summary card
- type
- issuing organization
- expiration date
- status
- required hours
- earned hours
- remaining hours

3. CE records section
- compact table or structured list
- total row at the bottom if useful

4. Optional footer note
- “Generated from UpTrack”
- generation timestamp

---

## Acceptance Criteria

- User can open a CE report for a specific credential.
- Frontend loads report data from the backend endpoint.
- Report renders credential details and all associated CE records clearly.
- Print action opens the browser print dialog.
- Printed output is clean and readable.
- Loading, empty, and error states are handled.
- Frontend build passes.
- Relevant frontend tests pass.

---

## Verification

Frontend:
- Open the report from a credential-related entry point.
- Confirm report data matches the backend response.
- Confirm print opens correctly.
- Test browser save-as-PDF behavior.
- Confirm print styles remove unnecessary app chrome.
- Run frontend build and relevant tests.

---

## Completion Log Entry

When completed, add a history entry similar to:

- **2026-03-24** — Completed CE report UI and print flow with a credential-specific report view, typed frontend report models and service wiring, clean loading/empty/error states, browser print support with print-specific styling, and verified printable CE summary output.
