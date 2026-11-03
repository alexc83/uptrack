import { defineConfig, devices } from '@playwright/test';

/**
 * M13 live-backend acceptance (React -> Spring Boot -> PostgreSQL). NOT part of the default `npm run e2e`.
 * Targets a DISPOSABLE backend (LIVE_BACKEND, default http://localhost:18081) via a dedicated Vite dev server on
 * port 5180 whose /api proxy is pinned to that backend. Never point this at 8080 or any hosted backend.
 *   npx playwright test -c playwright.live.config.ts
 */
const backend = process.env.LIVE_BACKEND ?? 'http://localhost:18081';
const { hostname, port } = new URL(backend);
if (!['localhost', '127.0.0.1'].includes(hostname) || port === '8080') {
  throw new Error(`Refusing live target ${backend}: loopback only, and port 8080 is reserved.`);
}

export default defineConfig({
  testDir: './e2e-live',
  testMatch: /.*\.live\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: './test-results/live',
  reporter: 'list',
  use: { baseURL: 'http://localhost:5180', trace: 'retain-on-failure' },
  webServer: {
    command: `VITE_PROXY_TARGET=${backend} npx vite --port 5180 --strictPort`,
    url: 'http://localhost:5180',
    reuseExistingServer: false,
    timeout: 30000,
  },
  projects: [{ name: 'msedge', use: { ...devices['Desktop Edge'], channel: 'msedge' } }],
});
