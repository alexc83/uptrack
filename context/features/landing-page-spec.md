# UpTrack Landing Page + Auth Modal Spec

## Purpose

Build a public landing page for UpTrack along with sign in and sign up modals that match the provided mockups and the existing UpTrack visual language.

This spec is intended for Claude Code / Codex to implement the UI in the existing frontend project.

---

## Screenshot References

Use these screenshots as the visual source of truth. They will exist in the repository under:

`content/screenshots/`

Reference all of the following PNG files during implementation:

- `content/screenshots/landing-page-1.png`
- `content/screenshots/landing-page-2.png`
- `content/screenshots/landing-page-3.png`
- `content/screenshots/landing-page-4.png`
- `content/screenshots/landing-page-5.png`
- `content/screenshots/login-modal.png`
- `content/screenshots/sign-up-modal.png`

Do not reproduce them pixel-for-pixel, but match their layout, spacing, visual tone, and hierarchy closely.

---

## High-Level Goal

Create a polished public entry experience for UpTrack that:

- introduces the product clearly
- visually matches the existing dashboard and drawer UI
- provides entry points for `Log In` and `Sign Up`
- uses modals for authentication
- feels like a real SaaS landing page, not a generic marketing template

This landing page should work as the app's unauthenticated homepage.

---

## Product Context

UpTrack is a healthcare-focused application that helps professionals manage:

- licenses
- certifications
- CE records
- expiration tracking
- CE progress
- certificate storage

The page should communicate:

**Track credentials. Stay compliant. Own your career.**

---

## Scope

Implement:

1. landing page route / page
2. navbar / header
3. hero section
4. product screenshot / preview section
5. feature cards section
6. compliance detail section with supporting mock credential drawer preview
7. bottom CTA banner
8. footer
9. sign in modal
10. sign up modal

Do not implement the actual authentication backend flow in this task unless explicitly asked. Focus on the UI structure, behavior, and frontend state for opening/closing modals.

---

## Routing / Entry

Create a public route for the landing page.

Suggested route:
- `/`

Authenticated app routes can remain separate.

When the user is not logged in, this page should feel like the natural first screen of the product.

---

## Visual Style

Match the existing UpTrack UI language shown in the screenshots:

- clean SaaS aesthetic
- light mode only for this screen
- soft rounded corners
- generous white space
- subtle borders
- very light shadows where helpful
- modern, calm healthcare-adjacent visual tone
- primary blue CTA color
- muted grays for supporting text
- dark navy/charcoal for headings

The page should visually feel consistent with the existing dashboard and drawer work already completed.

---

## Layout Overview

The landing page should have the following vertical structure:

1. Header / navbar
2. Hero section
3. Large product preview section
4. Feature cards section
5. Compliance detail section
6. Bottom CTA banner
7. Footer

---

## Header / Navbar

### Behavior
A simple top navigation bar across the full width.

### Content
Left side:
- UpTrack logo mark
- UpTrack wordmark

Right side:
- `Log In` text button
- `Sign Up` primary button

### Visual Notes
- horizontal layout
- modest vertical padding
- subtle bottom border
- minimal and clean
- logo styling should feel consistent with the app sidebar logo

### Interaction
- clicking `Log In` opens the login modal
- clicking `Sign Up` opens the sign up modal

---

## Hero Section

### Content
Main headline:
- `Track credentials. Stay compliant. Own your career.`

Supporting text:
- A centralized dashboard for healthcare professionals to manage licenses, certifications, and continuing education requirements — audit-ready and always up to date.

Primary CTA:
- `Get Started`

Optional secondary behavior:
- the navbar already contains `Log In` and `Sign Up`, so hero can remain focused on one primary CTA

### Layout
- centered text
- large bold heading
- supporting paragraph beneath
- CTA button beneath the paragraph
- strong vertical spacing
- wide container

### Screenshot Reference
This section should visually follow:
- `content/screenshots/landing-page-1.png`

---

## Product Preview Section

### Content
A large framed preview of the UpTrack dashboard.

This can be:
- a real image screenshot rendered in a styled frame, or
- a recreated mock component if that is easier in the project

### Requirements
- rounded outer frame
- subtle shadow
- large enough to feel like the product centerpiece
- should show the dashboard UI already designed in the app
- should feel connected to the hero and reinforce that the product is real

### Screenshot Reference
Use:
- `content/screenshots/landing-page-1.png`
- `content/screenshots/landing-page-2.png`

---

## Feature Cards Section

### Section Heading
- `Everything you need to stay compliant`

### Supporting Text
- Built specifically for healthcare professionals who need to track multiple licenses, certifications, and CE requirements.

### Cards
Create 4 feature cards in a responsive grid.

#### Card 1
Title:
- `Credential Tracking`

Description:
- Track all your licenses and certifications in one place. Monitor expiration dates and renewal cycles for RN, NP, MD, DO, RT, and PA credentials.

Suggested icon:
- shield

#### Card 2
Title:
- `CE Progress Monitoring`

Description:
- Automatically calculate CE hours earned toward each credential's renewal requirements. See your progress at a glance with visual progress bars.

Suggested icon:
- book / open book

#### Card 3
Title:
- `Certificate Storage`

Description:
- Upload and store CE certificates, course documentation, and completion records. Keep everything organized and accessible for audits or credentialing.

Suggested icon:
- file / document

#### Card 4
Title:
- `Expiration Alerts`

Description:
- Get clear visibility into upcoming expirations. Credentials expiring within 90 days are automatically flagged so you can renew before deadlines.

Suggested icon:
- bell

### Visual Notes
- cards should be fairly large
- subtle border
- soft background
- consistent padding
- icon in a tinted rounded square at top
- title and description below
- consistent heights across the row on desktop

### Screenshot Reference
Use:
- `content/screenshots/landing-page-3.png`
- `content/screenshots/landing-page-4.png`

---

## Compliance Detail Section

### Purpose
This is a more informative section that explains how the dashboard helps users stay on top of compliance.

### Left Side Content
Heading:
- `Your compliance status, at a glance`

Body copy:
- The UpTrack dashboard gives you instant visibility into your credential status. See what's active, what's expiring soon, and what needs attention — all in one clean interface.

Bullet list / benefit list:
- Smart status tracking  
  Credentials are automatically categorized as Active, Expiring Soon, or Expired based on expiration dates.

- CE progress visualization  
  See exactly how many hours you've earned toward each credential's CE requirements.

- Upcoming expirations  
  View all credentials expiring in the next 90 days with days-remaining indicators.

- Audit-ready records  
  All your credentials and CE documentation in one organized, exportable location.

### Right Side Content
A visual preview of a credential detail drawer/card, styled like the screenshot.

This should resemble the real credential drawer UI in the app:
- credential name
- organization
- status pills
- expires
- renewal cycle
- required CE hours
- current status
- CE progress
- CE records summary
- Add CE Record button
- Edit Credential button
- Export CE Summary link/button

### Layout
- two-column layout on desktop
- stacked layout on smaller screens
- image / visual should align to the right
- text block should align to the left with clear spacing

### Screenshot Reference
Use:
- `content/screenshots/landing-page-4.png`
- `content/screenshots/landing-page-5.png`

---

## Bottom CTA Banner

### Content
Heading:
- `Start tracking your credentials today`

Supporting text:
- Join healthcare professionals who have simplified their credential management with UpTrack.

CTA Button:
- `Get Started for Free`

### Visual Notes
- large full-width container inside page content width
- strong blue background
- white text
- white/light button with blue text
- large rounded corners
- centered content
- visually prominent

### Interaction
- CTA should open the sign up modal

### Screenshot Reference
Use:
- `content/screenshots/landing-page-5.png`

---

## Footer

### Content
Center-aligned footer with:
- UpTrack logo + wordmark
- short product phrase:
  - `Built for healthcare professionals`
- technology line:
  - `Built with Angular 21 and Spring Boot`
- copyright line:
  - `© 2026 UpTrack`

### Visual Notes
- light divider line above footer
- centered, minimal, calm
- use muted text
- preserve brand consistency

### Screenshot Reference
Use:
- `content/screenshots/landing-page-5.png`

---

## Login Modal

### Trigger Points
Open login modal from:
- navbar `Log In`
- sign up modal secondary text link

### Modal Content
Title:
- `Log In`

Fields:
- email
- password

Primary action button:
- `Log In`

Secondary text:
- `Don't have an account? Sign up`

### Behavior
- centered modal overlay
- blurred or dimmed background
- close icon in top-right
- clicking backdrop closes modal
- pressing escape closes modal
- clicking `Sign up` from inside this modal closes login modal and opens sign up modal

### Visual Notes
- rounded modal corners
- comfortable padding
- inputs with soft borders and large height
- button full width
- maintain visual consistency with landing page

### Screenshot Reference
Use:
- `content/screenshots/login-modal.png`

---

## Sign Up Modal

### Trigger Points
Open sign up modal from:
- navbar `Sign Up`
- hero CTA if desired
- bottom CTA button
- login modal secondary text link

### Modal Content
Title:
- `Sign Up`

Fields:
- name
- email
- password

Primary action button:
- `Create Account`

Secondary text:
- `Already have an account? Log in`

### Behavior
- centered modal overlay
- same modal shell and styling as login modal
- close icon in top-right
- clicking backdrop closes modal
- pressing escape closes modal
- clicking `Log in` from inside this modal closes sign up modal and opens login modal

### Screenshot Reference
Use:
- `content/screenshots/sign-up-modal.png`

---

## Modal State Rules

Use simple frontend state management.

### Requirements
- only one auth modal may be open at a time
- login and sign up modals should share a consistent shell and spacing system
- avoid duplicated layout code where practical
- modal state should be straightforward and easy to maintain

Suggested implementation idea:
- one auth modal state signal / variable with values like:
  - `'login'`
  - `'signup'`
  - `null`

---

## Responsiveness

The landing page must be responsive from day one.

### Desktop
- multi-column layout
- large hero
- four-up feature cards
- two-column compliance section

### Tablet
- product preview remains large
- feature cards may collapse to two columns
- compliance section may still be two columns or stacked depending on breakpoint

### Mobile
- stacked layout throughout
- hero text scales down appropriately
- navbar remains usable
- buttons remain large tap targets
- feature cards become one-per-row
- compliance section stacks text above visual
- modals fit smaller viewports with proper margins and no overflow

Do not allow horizontal scrolling.

---

## Accessibility

Implement with good baseline accessibility.

### Requirements
- semantic headings
- buttons use actual button elements
- modals have appropriate dialog semantics
- inputs have visible labels
- keyboard navigation works
- focus should move into modal when opened
- focus should return appropriately when modal closes if practical
- adequate contrast for text and buttons

---

## Technical Implementation Notes

Follow the existing project conventions.

### Frontend Expectations
- Angular standalone components
- TypeScript strict typing
- SCSS styling
- PrimeNG and PrimeFlex can be used where appropriate, but do not force a generic PrimeNG admin look
- match existing project spacing, typography, and design tokens where available
- keep components reasonably modular

### Suggested Component Breakdown
This is a suggested structure, not a hard requirement:

- `landing-page.component`
- `landing-header.component`
- `landing-hero.component`
- `landing-product-preview.component`
- `landing-feature-cards.component`
- `landing-compliance-section.component`
- `landing-cta-banner.component`
- `landing-footer.component`
- `auth-modal.component`
- `login-form.component`
- `signup-form.component`

If a simpler structure fits the current codebase better, keep it simple.

---

## Out of Scope

Do not implement the following unless explicitly requested:

- real JWT authentication
- token storage
- route guards
- forgot password
- email verification
- social auth
- backend validation integration beyond placeholder form handling
- full marketing site extras like testimonials, pricing, FAQ, or blog

---

## Acceptance Criteria

Implementation is complete when:

1. a public landing page exists and matches the provided screenshots closely
2. navbar includes `Log In` and `Sign Up`
3. hero section, feature cards, preview section, compliance section, CTA banner, and footer are all present
4. login modal opens and closes correctly
5. sign up modal opens and closes correctly
6. login ↔ sign up modal switching works
7. page is responsive and visually polished
8. the page feels consistent with the existing UpTrack dashboard and drawer UI
9. screenshot references from `content/screenshots/*.png` are clearly used as the visual basis for implementation

---

## Implementation Guidance for Claude Code / Codex

- Modify the existing frontend project; do not regenerate the app from scratch.
- Preserve the current UpTrack visual direction.
- Make the smallest reasonable set of changes needed to add this landing page and auth modal experience.
- Reuse existing tokens, spacing, and visual patterns where possible.
- Keep the code readable and beginner-to-intermediate friendly.
