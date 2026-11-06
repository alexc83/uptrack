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
