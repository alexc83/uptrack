# M04 visual evidence

Captured in local Microsoft Edge; runtime version in [browser.json](browser.json). No backend or real account data is used. Screenshots are synthetic shared-presentation previews, not completed business pages.

## Review findings

Compared directly with unchanged M01 references: [light desktop](../../baseline/screenshots/d1-dashboard-populated-1280.png), [dark desktop](../../baseline/screenshots/t1-dashboard-dark-1280.png), [768 px mobile boundary](../../baseline/screenshots/p-credentials-768.png), [right detail drawer](../../baseline/screenshots/c5-credential-drawer-1280.png).

- Same sidebar/main surface split, 272/88 px desktop widths, header brand/theme/collapse and footer account placement. Main scrolls independently; no added desktop content header.
- Mobile through 768 px inclusive, left navigation width min(300px, viewport−32px), 44 px control targets, no horizontal overflow. Border, active-link tint, primary and status palettes were checked visually and through computed-style assertions.
- Detail drawer widths asserted: 375 at 375 px; 544 at 768 px; 480 at 1280 px. At 375 it is full width, so the inaccessible background handler is exercised programmatically in addition to real backdrop clicks at larger widths. Mobile navigation and centered modal backdrops receive real pointer-click tests at every viewport.
- Auto-height centered modals leave a real clickable backdrop at mobile widths. Initial focused input/Cancel and nested overlay returns are verified separately from image appearance.
- Cards/forms/states remain generic; pixel identity of business screenshots is not claimed. Approved intentional differences include Lucide icons and larger accessible targets. No dashboard widgets or record data were migrated.

Eight stable golden images in [visual snapshots](../../../../frontend-react/e2e/visual.spec.ts-snapshots) cover light/dark desktop expanded/collapsed, mobile navigation and mobile modal. All eight were opened for visual inspection; subsequent normal E2E comparison passed without updates. Their names include msedge/darwin because browser fonts/rendering are platform-specific.

## Captures

Shell files show geometry/themes; forms and states show shared presentation while scrolling main; modal/drawer files show responsive overlays; nested-overlays shows layering. Images were captured at 375, 768 and 1280 px widths with 800 px height, except nested-overlays which uses the configured default browser viewport. Full viewport captures intentionally preserve the shell's independent scrolling behavior.

- [drawer-dark-1280.png](drawer-dark-1280.png)
- [drawer-dark-375.png](drawer-dark-375.png)
- [drawer-dark-768.png](drawer-dark-768.png)
- [drawer-light-1280.png](drawer-light-1280.png)
- [drawer-light-375.png](drawer-light-375.png)
- [drawer-light-768.png](drawer-light-768.png)
- [forms-dark-1280.png](forms-dark-1280.png)
- [forms-dark-375.png](forms-dark-375.png)
- [forms-dark-768.png](forms-dark-768.png)
- [forms-light-1280.png](forms-light-1280.png)
- [forms-light-375.png](forms-light-375.png)
- [forms-light-768.png](forms-light-768.png)
- [modal-dark-1280.png](modal-dark-1280.png)
- [modal-dark-375.png](modal-dark-375.png)
- [modal-dark-768.png](modal-dark-768.png)
- [modal-light-1280.png](modal-light-1280.png)
- [modal-light-375.png](modal-light-375.png)
- [modal-light-768.png](modal-light-768.png)
- [nested-overlays.png](nested-overlays.png)
- [shell-dark-1280-tokens.png](shell-dark-1280-tokens.png)
- [shell-dark-375-closed.png](shell-dark-375-closed.png)
- [shell-dark-375-open.png](shell-dark-375-open.png)
- [shell-dark-768-closed.png](shell-dark-768-closed.png)
- [shell-dark-768-open.png](shell-dark-768-open.png)
- [shell-light-1280-collapsed.png](shell-light-1280-collapsed.png)
- [shell-light-1280-expanded.png](shell-light-1280-expanded.png)
- [shell-light-1280-tokens.png](shell-light-1280-tokens.png)
- [shell-light-375-closed.png](shell-light-375-closed.png)
- [shell-light-375-open.png](shell-light-375-open.png)
- [shell-light-768-closed.png](shell-light-768-closed.png)
- [shell-light-768-open.png](shell-light-768-open.png)
- [states-dark-1280.png](states-dark-1280.png)
- [states-dark-375.png](states-dark-375.png)
- [states-dark-768.png](states-dark-768.png)
- [states-light-1280.png](states-light-1280.png)
- [states-light-375.png](states-light-375.png)
- [states-light-768.png](states-light-768.png)
