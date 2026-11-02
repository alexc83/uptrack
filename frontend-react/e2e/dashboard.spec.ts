import type { Page } from '@playwright/test';
import { test, expect, allowApi, capture, mockCredentialReads, mockDashboard, noOverflow, setTheme, signIn } from './helpers';
import { dashboardNow, emptyDashboard, overflowDashboard, populatedDashboard } from '../src/test/fixtures/dashboard-fixtures';

// All /api traffic is mocked at the browser; the default-deny fixture still fails any undeclared request.
// Screenshots go to test-results/evidence as candidate review evidence only (never compared to goldens).
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(dashboardNow);
  await signIn(page);
  await mockCredentialReads(page);
});

const widths = [375, 768, 769, 1280] as const;

async function open(page: Page, width: number, theme: 'light' | 'dark', body: unknown) {
  await page.setViewportSize({ width, height: 900 });
  await setTheme(page, theme);
  await mockDashboard(page, body);
  await page.goto('/dashboard');
}

for (const theme of ['light', 'dark'] as const) {
  for (const width of widths) {
    test(`populated dashboard ${theme} ${width}px: content, layout, targets and no overflow`, async ({ page }) => {
      await open(page, width, theme, populatedDashboard());
      await expect(page.getByRole('heading', { level: 1, name: 'Live compliance overview' })).toBeVisible();
      await expect(page).toHaveTitle('Dashboard — UpTrack');
      if (width > 768) await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page'); // off-canvas navigation at <=768px
      await expect(page.getByRole('group', { name: 'Total Credentials: 4' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Upcoming Expirations' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'CEs Still Needed' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Recent Activity' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Credential' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add CE Record' })).toHaveCount(0);
      await noOverflow(page);
      // Stat cards: 4 columns above 1200px, 2 up to 1200px, 1 up to 768px (Angular proportions).
      const boxes = await page.getByRole('group').evaluateAll(nodes => nodes.map(node => { const { x, y } = node.getBoundingClientRect(); return { x: Math.round(x), y: Math.round(y) }; }));
      const columns = new Set(boxes.map(box => box.x)).size;
      expect(columns).toBe(width > 1200 ? 4 : width > 768 ? 2 : 1);
      for (const link of await page.getByRole('region', { name: 'Upcoming Expirations' }).getByRole('link').all()) {
        expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      }
      await capture(page, `m08-dashboard-populated-${theme}-${width}`);
      await page.getByRole('region', { name: 'Recent Activity' }).scrollIntoViewIfNeeded();
      await noOverflow(page);
      await capture(page, `m08-dashboard-populated-${theme}-${width}-activity`);
    });

    test(`empty account ${theme} ${width}px shows guidance, zero metrics and no error`, async ({ page }) => {
      await open(page, width, theme, emptyDashboard);
      await expect(page.getByText('No credentials yet')).toBeVisible();
      await expect(page.getByRole('group', { name: 'Total Credentials: 0' })).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await noOverflow(page);
      await capture(page, `m08-dashboard-empty-${theme}-${width}`);
    });
  }
}

test('loading shows an accessible skeleton and no metrics until the response arrives', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  let release: () => void = () => undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  allowApi(page, 'GET', '/api/dashboard');
  await page.route(/^http:\/\/localhost:5173\/api\/dashboard$/, async route => { await gate; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(populatedDashboard()) }); });
  await page.goto('/dashboard');
  await expect(page.getByText('Loading dashboard…')).toBeVisible();
  await expect(page.getByRole('group')).toHaveCount(0);
  await capture(page, 'm08-dashboard-loading-light-1280');
  release();
  await expect(page.getByRole('group', { name: 'Total Credentials: 4' })).toBeVisible();
  await expect(page.getByText('Loading dashboard…')).toHaveCount(0);
});

test('a failure shows a retryable error, then Retry recovers without signing out', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  let fail = true;
  allowApi(page, 'GET', '/api/dashboard');
  await page.route(/^http:\/\/localhost:5173\/api\/dashboard$/, route => (fail
    ? route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: 403, error: 'Forbidden', message: 'nope', timestamp: '2026-01-01T00:00:00Z' }) })
    : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(populatedDashboard()) })));
  await page.goto('/dashboard');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Dashboard unavailable');
  await expect(page.getByRole('group')).toHaveCount(0);
  await capture(page, 'm08-dashboard-error-light-1280');
  fail = false;
  await alert.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('group', { name: 'Total Credentials: 4' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('server errors are retried by the shared policy before the error is shown', async ({ page }) => {
  test.setTimeout(30_000);
  let requests = 0;
  allowApi(page, 'GET', '/api/dashboard');
  await page.route(/^http:\/\/localhost:5173\/api\/dashboard$/, route => { requests += 1; return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: 500, error: 'Server', message: 'boom', timestamp: '2026-01-01T00:00:00Z' }) }); });
  await page.goto('/dashboard');
  await expect(page.getByRole('alert')).toContainText('Dashboard unavailable', { timeout: 15_000 });
  // Initial attempt + two retries (HTTP 5xx only). The dev server runs StrictMode, whose discarded first mount adds one aborted request.
  expect(requests).toBeGreaterThanOrEqual(3);
  expect(requests).toBeLessThanOrEqual(4);
});

test('"See more" opens the overflow drawer, rows deep-link, Escape returns focus', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockDashboard(page, overflowDashboard());
  await page.goto('/dashboard');
  const trigger = page.getByRole('button', { name: 'See more upcoming expirations' });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'All Upcoming Expirations' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('link')).toHaveCount(5);
  await capture(page, 'm08-dashboard-drawer-light-1280');
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await drawer.getByRole('link').first().click();
  await expect(page.getByRole('dialog', { name: 'Credential details' })).toBeVisible();
  await expect(page).toHaveURL(/\/credentials$/);
});

test('mobile drawer fits at 375px without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await setTheme(page, 'dark');
  await mockDashboard(page, overflowDashboard());
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'See more pending CE items' }).click();
  const drawer = page.getByRole('dialog', { name: 'Credentials Needing CE Attention' });
  await expect(drawer).toBeVisible();
  expect((await drawer.boundingBox())?.width).toBeLessThanOrEqual(375);
  await noOverflow(page);
  await capture(page, 'm08-dashboard-drawer-dark-375');
});

test('a protected 401 from the dashboard ends the session and offers login for /dashboard', async ({ page }) => {
  allowApi(page, 'GET', '/api/dashboard');
  await page.route(/^http:\/\/localhost:5173\/api\/dashboard$/, route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ status: 401, error: 'Unauthorized', message: 'Authentication is required.', timestamp: '2026-01-01T00:00:00Z' }) }));
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/\?auth=login&returnTo=%2Fdashboard$/);
  await expect(page.getByText('Your session expired. Please log in again.')).toBeVisible();
  await expect(page.getByText('Dashboard unavailable')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBeNull();
});

test('keyboard users reach dashboard rows with a visible focus indicator', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockDashboard(page, populatedDashboard());
  await page.goto('/dashboard');
  const row = page.getByRole('region', { name: 'Upcoming Expirations' }).getByRole('link').first();
  await row.focus();
  await expect(row).toBeFocused();
  expect(await row.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Credential details' })).toBeVisible();
  await expect(page).toHaveURL(/\/credentials$/);
});

test('guest cannot see protected dashboard content', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.removeItem('uptrack_token'); } catch { /* storage unavailable */ } });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/\?auth=login&returnTo=%2Fdashboard$/);
  await expect(page.getByRole('heading', { name: 'Live compliance overview' })).toHaveCount(0);
});
