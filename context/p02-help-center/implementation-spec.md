# P02 — Public Help Center implementation specification (planning draft)

## Mission

Deliver a public-facing, user-friendly UpTrack Help Center containing the 20 articles in `article-manifest.json`. **This spec is for future implementation planning; it is not current authorization to edit the app.**

## Source of truth

1. Read root `AGENTS.md`, `CLAUDE.md`, and relevant repo context before planning.
2. Treat the article manifest as the source for category order, article order, URL slugs and related links.
3. Treat the Markdown files as owner-approved editorial content, including 14 explicitly accepted reconstructions. Do not replace them with model-generated copy.
4. Do not paraphrase articles, invent features, change approved user-facing wording or render the provenance fields to end users.

## Visual and navigation design

- Public-accessible, search-friendly documentation site (no login for reading articles).
- Inspired by the conventional Claude documentation information architecture: left-side category/article navigation and search, focused central article column, right-side sticky "On this page" heading navigation on wide screens.
- **Not** a copy of Claude's branding. Use UpTrack's current dark navy/blue identity, spacing, typography, and components, consistent with the already approved P01 public roadmap visual direction.
- Responsive: desktop three-column layout where space permits; tablet compact navigation; mobile drawer/navigation and single readable content column.
- Accessible: keyboard-operable navigation/search, focus states, semantic headings, descriptive links, skip-to-content, visible active article and active TOC item, adequate contrast.
- Friendly reading experience: breadcrumbs, article title, readable long-form prose, numbered task steps, related articles, and nonintrusive code-free content.

## Architecture constraints

- Inspect React/Vite routing, deployment configuration, navigation and public website structure before deciding whether Help Center is integrated into React, a static microsite, or another lightweight approach.
- Avoid unnecessary dependencies and duplication; favor static Markdown-based content and build-time manifest validation.
- Do not change backend/API, auth, certificate upload behavior, or database schema merely to implement documentation.
- Keep the content source cleanly separate from presentation components.
- Do not add features absent from UpTrack: password reset, automatic license verification, reminders, exports/downloads not currently supported.
- Resolve final public path/domain only after repository inspection and explicit owner approval.

## Acceptance criteria proposal

- All 20 manifest entries have matching Markdown files and valid internal related links.
- All seven category groups appear in correct order; article URLs/slug links work on reload/deep link.
- Search finds relevant articles by title and content without sending private user data.
- Desktop/tablet/mobile navigation verified; accessible keyboard focus and heading hierarchy.
- No hardcoded secrets, no unintended API requests, no authorization bypass.
- Cross-browser smoke tests and existing CI gates pass; deployment remains separate owner decision.
- Final content QA includes an authenticated UI run verifying password-change session behavior and exact error strings.

## Implementation process

1. Read-only code/UI audit and architecture recommendation.
2. Owner approves detailed plan and scope.
3. Implement on a dedicated P02 branch with tests and screenshots.
4. Submit PR; verify CI, article integrity, navigation, accessibility and public performance.
5. Separate explicit authorization before merge/deploy.
