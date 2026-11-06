import { test, expect, allowApi, e2eToken, e2eUser, mockCredentialReads, mockDashboard } from './helpers';
import type { Page, Route } from '@playwright/test';

const origin = 'http://localhost:5173';
async function mock(page: Page, method: string, path: string, handler: (route: Route) => Promise<void>) {
  allowApi(page, method, `/api${path}`);
  await page.route(new RegExp(`^${origin}/api${path}$`), route => (route.request().method() === method ? handler(route) : route.fallback()));
}
const unavailable = "UpTrack is temporarily unavailable. We're having trouble connecting to the server.";

test.beforeEach(async ({ page }) => { await mockDashboard(page); await mockCredentialReads(page); });

test('a 503 from the gateway during login shows an availability message, then a manual retry signs in', async ({ page }) => {
  let attempts = 0;
  await mock(page, 'POST', '/auth/login', route => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 503, contentType: 'text/html', body: '<html>Service Unavailable</html>' })
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: e2eToken, user: e2eUser }) });
  });
  await page.goto('/?auth=login');
  const dialog = page.getByRole('dialog', { name: 'Log in' });
  await dialog.getByLabel('Email').fill('test.user@example.test');
  await dialog.getByLabel('Password').fill('secret12');
  await dialog.getByLabel('Password').press('Enter');
  await expect(dialog.getByRole('alert')).toContainText(unavailable);
  await expect(dialog.getByRole('alert')).toContainText('Please try again shortly.');
  const retry = dialog.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeEnabled();
  expect(attempts).toBe(1);
  await expect(dialog.getByLabel('Email')).toHaveValue('test.user@example.test');
  await retry.click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(attempts).toBe(2);
});

test('a network failure during sign up never leaves the button disabled', async ({ page }) => {
  await mock(page, 'POST', '/auth/register', route => route.abort('connectionrefused'));
  await page.goto('/?auth=register');
  const dialog = page.getByRole('dialog', { name: 'Sign up' });
  await dialog.getByLabel('Name').fill('Pat Example');
  await dialog.getByLabel('Email').fill('pat@example.test');
  await dialog.getByLabel('Password').fill('secret12');
  await dialog.getByLabel('Password').press('Enter');
  await expect(dialog.getByRole('alert')).toContainText(unavailable);
  await expect(dialog.getByRole('button', { name: 'Try again' })).toBeEnabled();
});

test('the signed-in app stays signed in when the backend is unreachable and offers a retry', async ({ page }) => {
  await page.addInitScript(token => { try { localStorage.setItem('uptrack_token', token); } catch { /* ignore */ } }, e2eToken);
  await mock(page, 'GET', '/auth/me', route => route.abort('connectionrefused'));
  await page.goto('/dashboard');
  await expect(page.getByText("We couldn't verify your session")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('alert')).toContainText('Your sign-in is kept.');
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBe(e2eToken);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('a login that never answers shows the slow notice at 10s and ends at 25s with Try again, without resubmitting', async ({ page }) => {
  let attempts = 0;
  const health: string[] = [];
  await mock(page, 'POST', '/auth/login', () => { attempts += 1; return new Promise<void>(() => undefined); }); // never fulfilled: a hung connection
  await mock(page, 'GET', '/health/ready', route => { health.push(new URL(route.request().url()).origin); return route.fulfill({ status: 503, contentType: 'text/html', body: 'down' }); });
  await page.clock.install();
  await page.goto('/?auth=login');
  const dialog = page.getByRole('dialog', { name: 'Log in' });
  await dialog.getByLabel('Email').fill('test.user@example.test');
  await dialog.getByLabel('Password').fill('secret12');
  await dialog.getByLabel('Password').press('Enter');
  await expect(dialog.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
  await page.clock.runFor(9_000);
  await expect(dialog.getByText('The server is taking longer than expected. Your request is still processing.')).toHaveCount(0);
  await page.clock.runFor(2_000);
  await expect(dialog.getByText('The server is taking longer than expected. Your request is still processing.')).toBeVisible();
  await page.clock.runFor(15_000);
  await expect(dialog.getByRole('alert')).toContainText("UpTrack didn't respond in time.");
  await expect(dialog.getByRole('button', { name: 'Try again' })).toBeEnabled();
  await expect(dialog.getByText('The server is taking longer than expected.')).toHaveCount(0);
  const before = health.length;
  for (let tick = 1; tick <= 4; tick += 1) {
    await page.clock.runFor(15_000);
    await expect.poll(() => health.length).toBeGreaterThanOrEqual(before + tick);
  }
  expect(attempts).toBe(1);
  // Recovery observation: same-origin proxy only (never the Render host), about one check per 15s, none before the outage.
  expect(health.length).toBeLessThanOrEqual(before + 5); // about one check per 15s tick, never bursts
  expect(new Set(health)).toEqual(new Set([origin]));
});

test('returning-user session check that never answers ends after 20s with the sign-in kept', async ({ page }) => {
  await page.addInitScript(token => { try { localStorage.setItem('uptrack_token', token); } catch { /* ignore */ } }, e2eToken);
  await mock(page, 'GET', '/auth/me', () => new Promise<void>(() => undefined));
  await page.clock.install();
  await page.goto('/dashboard');
  await expect(page.getByText('Checking your session…')).toBeVisible();
  await page.clock.runFor(11_000);
  await expect(page.getByText('The server is taking longer than expected. Your request is still processing.')).toBeVisible();
  await page.clock.runFor(10_000);
  await expect(page.getByText("We couldn't verify your session")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBe(e2eToken);
});

test('an old tab whose page chunk is gone recommends a refresh instead of a broken screen, and keeps the session', async ({ page }) => {
  await page.addInitScript(token => { try { localStorage.setItem('uptrack_token', token); } catch { /* ignore */ } }, e2eToken);
  allowApi(page, 'GET', '/api/auth/me');
  await page.route(/^http:\/\/localhost:5173\/api\/auth\/me$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(e2eUser) }));
  await page.route(/dashboard-page/, route => route.abort('failed')); // the chunk of the previous deployment no longer exists
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'A new version of UpTrack is available' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBe(e2eToken);
});
