# UpTrack — Specification: Issue #47 (Installable Progressive Web App — PWA01)

- **Issue:** [#47 — Explore installable PWA support](https://github.com/alexc83/uptrack/issues/47)
- **Status:** READY (Implemented on `feature/47-installable-pwa`)
- **Priority:** P2
- **Author:** alexc83
- **Date:** 2026-11-06

---

## 1. Outcome & Objective

Deliver an iOS-first, installable Progressive Web App (PWA01) for UpTrack using its React 19 and Vite 7 frontend. The goal is to provide a polished, app-like mobile experience without developing or maintaining a separate native mobile application.

The application remains **strictly online-first and secure**. No offline data mutation, offline credential creation, or background syncing is included in V1.

---

## 2. Technical Architecture

### 2.1 Tooling & Plugin Choice
- **`vite-plugin-pwa`** (v2.0.0, backed by Workbox 7.4.1): Native Vite plugin handling asset compilation, manifest generation, and service worker emission.
- **`generateSW` mode**: Declarative configuration with zero custom service worker code.
- **`registerType: 'prompt'`**: Controlled, user-facing update prompting via `virtual:pwa-register/react`.

### 2.2 Conservative Caching Policy
- **Precaching only:** Fingerprinted static assets emitted by Vite (`index.html`, `/assets/*.js`, `/assets/*.css`, static PNG/SVG icons).
- **Zero runtime API caching:** No `runtimeCaching` rule captures `/api/**` requests.
- **Navigation route denylist:** `{ denylist: [/^\/api/] }` prevents `/api/**` routes from being captured by the SPA fallback.
- **Private assets exclusion:** Cloudinary/S3 document URLs, signed download links, and `/uploads/certificates` are never cached in browser Cache Storage.
- **Logout isolation:** Because no user data enters Cache Storage, logging out or switching accounts leaves no residual sensitive records in the browser.

### 2.3 Web App Manifest Specification
- `name`: "UpTrack"
- `short_name`: "UpTrack"
- `description`: "UpTrack — Credential & CE Tracking"
- `start_url`: "/"
- `scope`: "/"
- `display`: "standalone"
- `background_color`: "#eef0f3" (matches `--ut-main-bg`)
- `theme_color`: "#185fa5" (matches `--ut-primary`)
- `orientation`: Unlocked (supports portrait and landscape across iPhone, iPad, and desktop)
- `icons`:
  - 192×192 PNG: `/pwa-192x192.png`
  - 512×512 PNG: `/pwa-512x512.png`
  - 512×512 Maskable PNG: `/pwa-512x512-maskable.png`

---

## 3. iOS-First Mobile Enhancements

1. **Apple Web App Tags in `index.html`:**
   - `<meta name="apple-mobile-web-app-capable" content="yes" />`
   - `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`
   - `<meta name="apple-mobile-web-app-title" content="UpTrack" />`
   - `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` (180×180 PNG, square, solid `#185fa5` background with centered shield).
2. **Safe-Area Inset Support:**
   - `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`
   - CSS tokens in `src/styles/globals.css`: `--ut-safe-top`, `--ut-safe-bottom`, `--ut-safe-left`, `--ut-safe-right`.
   - `MobileToolbar` top padding padded with `max(1rem, env(safe-area-inset-top, 1rem))` to clear notch and Dynamic Island.
   - Sticky headers (`LandingHeader`, `RoadmapHeader`, `HelpLayout`) padded with `env(safe-area-inset-top, 0px)`.
3. **Form Zoom Prevention:**
   - Mobile rule in `src/styles/globals.css` ensuring form inputs on narrow screens maintain 16px font-size to prevent iOS Safari auto-zooming and layout shifting.
4. **Certificate & Document Viewing:**
   - Standalone iOS mode delegates external document viewing (`window.open`) to the in-app Safari browser sheet, preserving internal navigation state upon return.

---

## 4. Controlled Updates & Unsaved Work Safeguards

1. **Global Work Guard (`src/core/work-guard/`):**
   - Central registry for dirty forms (`isDirty`) and active operations (`isBusy`).
   - Integrated into `CredentialForm`, `CERecordForm`, `useCertificateUpload`, and `ProfileCard`.
2. **Top-Level Update Prompt (`PwaUpdatePrompt`):**
   - Mounted at root router level in `RootLayout`, ensuring availability across both public routes (`/`, `/roadmap`, `/help`) and authenticated routes (`/dashboard`, `/credentials`, `/ce-records`, `/settings`).
   - Floating nonintrusive banner anchored to bottom-right, respecting `env(safe-area-inset-bottom)`.
3. **Safe Activation Workflow:**
   - If an operation is in progress (e.g. certificate upload): defers update and notifies user.
   - If unsaved form changes are present: prompts confirmation ("Keep editing" vs "Discard and update").
   - If clean: immediately activates waiting service worker (`SKIP_WAITING`) and reloads.

---

## 5. Deployment & Caching (Vercel)

Updated `frontend-react/vercel.json`:
- `/sw.js`: `Cache-Control: public, max-age=0, must-revalidate` (guarantees browser always checks for byte changes).
- `/manifest.webmanifest`: `Cache-Control: public, max-age=0, must-revalidate`.
- `/assets/(.*)`: `Cache-Control: public, max-age=31536000, immutable`.
- Existing `/api/:path*` proxy and SPA rewrites preserved intact.

---

## 6. Physical iPhone Acceptance Checklist (Owner Post-Deployment Verification)

- [ ] **Installation:** Navigate to UpTrack in Safari on iOS. Tap Share → "Add to Home Screen". Verify name displays as "UpTrack" with the crisp shield icon.
- [ ] **Standalone Launch:** Launch app from home screen. Confirm launch in standalone mode without Safari address bar or navigation buttons.
- [ ] **Safe-Area Spacing:** Verify top bar and mobile navigation button clear the notch and Dynamic Island; verify bottom navigation and drawer buttons clear the home indicator bar.
- [ ] **Theme Modes:** Verify light and dark mode appearance and status bar styling.
- [ ] **Authentication & Session:** Sign in with valid credentials. Lock phone or background the app for 5+ minutes. Reopen and verify user remains signed in seamlessly.
- [ ] **Form Interactions:** Open "Add Credential" or "Add CE Record". Tap inside inputs; confirm Safari does not zoom the viewport unexpectedly.
- [ ] **Certificate Viewing:** Open a CE record with an attached certificate. Tap "View Certificate". Confirm document opens in in-app Safari sheet and returning to UpTrack maintains navigation.
- [ ] **Update Detection:** Deploy a new frontend commit. Re-open app or return from background. Confirm the "A new version of UpTrack is available" prompt appears.
- [ ] **Dirty Form Update Guard:** With unsaved changes in a form, tap "Update now". Confirm prompt warns about unsaved changes and offers "Keep editing".
