import { defineConfig, devices } from '@playwright/test';

/**
 * Browser projects (see context/testing-workflow.md for the policy and commands).
 *
 *  Functional projects (every e2e spec EXCEPT visual.spec.ts):
 *    msedge   installed Microsoft Edge   (channel 'msedge')
 *    chrome   installed Google Chrome    (channel 'chrome')
 *    firefox  Playwright-managed Firefox
 *    webkit   Playwright-managed WebKit  (Safari engine; not Safari itself)
 *
 *  Visual project (visual.spec.ts only, Edge on macOS only):
 *    visual-edge
 *    Its snapshot template pins the historical suffix "-msedge-<platform>", so the 8 existing
 *    goldens (visual.spec.ts-snapshots/*-msedge-darwin.png) are reused untouched. No other
 *    browser or OS gets goldens. The project is not registered on non-macOS hosts.
 *
 *  Linux/cloud fallback: installed Chrome/Edge are usually absent. Set E2E_CHROMIUM_FALLBACK=1
 *  to replace msedge+chrome with Playwright's bundled Chromium (project 'chromium'). This is
 *  functional coverage of the Chromium engine only; it is NOT Edge or Chrome branded-build
 *  coverage and must never be reported as such. Visual tests are never run in this mode.
 */
const chromiumFallback = process.env.E2E_CHROMIUM_FALLBACK === '1';
const isMac = process.platform === 'darwin';

const visualSpec = /visual\.spec\.ts$/;

const chromiumFamily = chromiumFallback
  ? [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
  : [
      { name: 'msedge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
      { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    ];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    ...[
      ...chromiumFamily,
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ].map(project => ({ ...project, testIgnore: visualSpec })),
    ...(isMac && !chromiumFallback
      ? [
          {
            name: 'visual-edge',
            testMatch: visualSpec,
            snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}-msedge{-snapshotSuffix}{ext}',
            use: { ...devices['Desktop Edge'], channel: 'msedge' },
          },
        ]
      : []),
  ],
});
