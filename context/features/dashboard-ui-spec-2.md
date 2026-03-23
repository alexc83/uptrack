# Dashboard UI Phase 2 Spec

## Overview

This is phase 2 of 2 for the dashboard UI layout. Use the screenshots referenced below for how it should look. Use the data from the mock data file referenced below. Just import it directly for now until we implement a database.

## Requirements for phase 3

- The main area to the right
- A welcome message that says Good morning (before noon local time), good afternoon (noon to 6 pm local time), or good evening (6 pm to midnight local time). Use the logged in user's first name as a personal greeting.
- Date under. See screenshots below
- Buttons to the right, one for adding a CE record and one for adding a credential. Match styling of the screenshots.
- 4 cards as specified in the screenshots, Total Credentials, Active, Expiring Soon, and Expired with numbers and icons as seen in the screenshots
- Under these cards have two blocks, to the right shows any upcoming expirations over the next 90 days, and the next shows the CE progress of all credentials for the user. See screenshots.
- Under these show a list of the previous 5 items added or updated with a timestamp as seen in the screenshots
- Make this layout response on mobile

## References

- @context/screenshots/dark-mode-dashboard-1,png
- @context/screenshots/dark-mode-dashboard-2,png
- @context/screenshots/light-mode-dashboard-1,png
- @context/screenshots/light-mode-dashboard-2,png
- @context/project-overview.md
- @src/lib/mock-data.js
- @context/features/dashboard-ui-1-spec.md
- @context/features/dashboard-ui-2-spec.md