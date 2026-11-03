import type { Page, Route } from '@playwright/test';
import { test, expect, allowApi, capture, e2eToken, e2eUser, mockCredentialReads, mockDashboard, noOverflow, signIn } from './helpers';

// All traffic below is mocked at the browser; the default fixture still fails the test on any undeclared /api call.
const origin = 'http://localhost:5173';
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const errorBody = (status: number, message: string) => ({ status, error: 'Error', message, timestamp: '2026-01-01T00:00:00Z' });

async function mock(page: Page, method: string, path: string, handler: (route: Route) => Promise<void> | void) {
  allowApi(page, method, `/api${path}`);
  await page.route(new RegExp(`^${origin}/api${path}$`), route => (route.request().method() === method ? handler(route) : route.fallback()));
}
async function mockLogin(page: Page, seen: Array<{ authorization: string | undefined; body: unknown }> = []) {
  await mock(page, 'POST', '/auth/login', route => {
    const request = route.request();
    seen.push({ authorization: request.headers()['authorization'], body: request.postDataJSON() });
    return json(route, 200, { token: e2eToken, user: e2eUser });
  });
  return seen;
}
const dialogName = (name: string) => ({ name });

// M08: /dashboard is the real page and makes one GET /api/dashboard; it is mocked (empty account) for every auth scenario.
test.beforeEach(async ({ page }) => { await mockDashboard(page); await mockCredentialReads(page); });

test('guest deep link opens the login dialog with a validated returnTo, then restores the page after login', async ({ page }) => {
  const seen = await mockLogin(page);
  await page.goto('/credentials?credentialId=abc#top');
  await expect(page).toHaveURL(/\/\?auth=login&returnTo=%2Fcredentials%3FcredentialId%3Dabc%23top$/);
  const dialog = page.getByRole('dialog', dialogName('Log in'));
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Email')).toBeFocused();
  await dialog.getByLabel('Email').fill('test.user@example.test');
  await dialog.getByLabel('Password').fill('secret');
  await dialog.getByLabel('Password').press('Enter');
  await expect(page.getByRole('dialog', { name: 'Credential details' })).toBeVisible();
  await expect(page).toHaveURL(/\/credentials#top$/);
  await expect(page.getByTestId('desktop-sidebar')).toBeVisible();
  expect(seen).toHaveLength(1);
  expect(seen[0]?.authorization, 'login must never carry a bearer token').toBeUndefined();
  expect(seen[0]?.body).toEqual({ email: 'test.user@example.test', password: 'secret' });
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBe(e2eToken);
});

test('an existing invalid bearer token is never sent to login, and a stale /auth/me 401 does not block login', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('uptrack_token', 'stale.invalid.token'));
  await mock(page, 'GET', '/auth/me', route => json(route, 401, errorBody(401, 'Authentication is required.')));
  const seen = await mockLogin(page);
  await page.goto('/');
  const dialogLocator = page.getByRole('button', { name: 'Log in' });
  await dialogLocator.click();
  await expect(page.getByText('Your session expired. Please log in again.')).toBeVisible();
  await page.getByLabel('Email').fill('test.user@example.test');
  await page.getByLabel('Password').fill('secret');
  await page.getByLabel('Password').press('Enter');
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(seen[0]?.authorization).toBeUndefined();
});

test('invalid credentials show the server message and keep the dialog open', async ({ page }) => {
  await mock(page, 'POST', '/auth/login', route => json(route, 401, errorBody(401, 'Invalid email or password.')));
  await page.goto('/?auth=login');
  await page.getByLabel('Email').fill('test.user@example.test');
  await page.getByLabel('Password').fill('wrong');
  await page.getByLabel('Password').press('Enter');
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password.' })).toBeVisible();
  await expect(page.getByRole('dialog', dialogName('Log in'))).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in', exact: true }).last()).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBeNull();
});

test('registration: client validation, then success; duplicate email is a banner', async ({ page }) => {
  let attempt = 0;
  await mock(page, 'POST', '/auth/register', route => {
    attempt += 1;
    return attempt === 1 ? json(route, 400, errorBody(400, 'Email is already in use.')) : json(route, 201, { token: e2eToken, user: e2eUser });
  });
  await page.goto('/?auth=register');
  const dialog = page.getByRole('dialog', dialogName('Sign up'));
  await dialog.getByRole('button', { name: 'Sign up' }).first().click();
  await expect(dialog.getByText('This field is required.').first()).toBeVisible();
  await dialog.getByLabel('Name').fill('Test User');
  await dialog.getByLabel('Email').fill('test.user@example.test');
  await dialog.getByLabel('Password').fill('short');
  await dialog.getByLabel('Password').press('Enter');
  await expect(dialog.getByText('Password must be at least 8 characters.')).toBeVisible();
  expect(attempt).toBe(0);
  await dialog.getByLabel('Password').fill('long-enough-1');
  await dialog.getByLabel('Password').press('Enter');
  await expect(dialog.getByRole('alert').filter({ hasText: 'Email is already in use.' })).toBeVisible();
  await dialog.getByLabel('Password').press('Enter');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('unsafe returnTo values never leave the origin', async ({ page }) => {
  await mockLogin(page);
  for (const bad of ['//evil.example/x', 'https://evil.example', '/%2F%2Fevil.example', '/\\evil.example']) {
    await page.goto(`/?auth=login&returnTo=${encodeURIComponent(bad)}`);
    await page.getByLabel('Email').fill('test.user@example.test');
    await page.getByLabel('Password').fill('secret');
    await page.getByLabel('Password').press('Enter');
    await expect(page).toHaveURL(`${origin}/dashboard`);
    await page.evaluate(() => localStorage.removeItem('uptrack_token'));
  }
});

test('reload restores a valid session with exactly one /auth/me and no flash of the landing view', async ({ page }) => {
  let meCalls = 0;
  await signIn(page);
  await page.unroute(/^http:\/\/localhost:5173\/api\/auth\/me$/);
  await mock(page, 'GET', '/auth/me', async route => { meCalls += 1; await new Promise(resolve => setTimeout(resolve, 300)); await json(route, 200, e2eUser); });
  await page.goto('/dashboard');
  await expect(page.getByText('Checking your session…')).toBeVisible();
  await expect(page.getByTestId('desktop-sidebar')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Live compliance overview' })).toBeVisible();
  expect(meCalls).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Live compliance overview' })).toBeVisible();
  expect(meCalls).toBe(2);
  await expect(page.getByText('Test User').first()).toBeVisible();
});

test('an authenticated user is redirected away from / and legacy URLs keep their query string', async ({ page }) => {
  await signIn(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
  // Let the dashboard's own reads finish: navigating away mid-flight makes WebKit log aborted-fetch "access control" errors.
  await page.waitForLoadState('networkidle');
  await page.goto('/app/credentials?credentialId=preview');
  await expect(page.getByRole('dialog', { name: 'Credential details' })).toBeVisible();
  await expect(page).toHaveURL(/\/credentials$/);
  await page.goto('/credentials/preview/ce-report?returnTo=%2Fcredentials');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fixture credential');
  await expect(page.getByRole('navigation')).toHaveCount(0);
});

test('guest CE report URL is protected', async ({ page }) => {
  await page.goto('/credentials/preview/ce-report?returnTo=%2Fcredentials');
  await expect(page).toHaveURL(/\/\?auth=login&returnTo=%2Fcredentials%2Fpreview%2Fce-report%3FreturnTo%3D%252Fcredentials$/);
  await expect(page.getByRole('heading', { name: 'CE Report' })).toHaveCount(0);
});

test('expired token on reload: login dialog with the expired notice, token removed', async ({ page }) => {
  await signIn(page);
  await page.unroute(/^http:\/\/localhost:5173\/api\/auth\/me$/);
  await mock(page, 'GET', '/auth/me', route => json(route, 401, errorBody(401, 'Authentication is required.')));
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/\?auth=login&returnTo=%2Fsettings$/);
  await expect(page.getByText('Your session expired. Please log in again.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBeNull();
});

test('server outage during startup keeps the token and offers Try again / Sign out', async ({ page }) => {
  await signIn(page);
  await page.unroute(/^http:\/\/localhost:5173\/api\/auth\/me$/);
  let outage = true;
  await mock(page, 'GET', '/auth/me', route => (outage ? json(route, 503, errorBody(503, 'down')) : json(route, 200, e2eUser)));
  await page.goto('/dashboard');
  await expect(page.getByText("We couldn't verify your session")).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBe(e2eToken);
  outage = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Live compliance overview' })).toBeVisible();
});

test('logout asks for confirmation, clears the token and cannot be bypassed with Back', async ({ page }) => {
  await signIn(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  const dialog = page.getByRole('dialog', dialogName('Log out'));
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await dialog.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(`${origin}/`);
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBeNull();
  await page.goBack();
  await expect(page).not.toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId('desktop-sidebar')).toHaveCount(0);
});

test('a protected 401 during use ends the session and returns to the login dialog for that page', async ({ page }) => {
  await signIn(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Live compliance overview' })).toBeVisible();
  await mock(page, 'GET', '/credentials', route => json(route, 401, errorBody(401, 'Authentication is required.')));
  // Placeholders make no API calls, so drive the app's real transport module (same instance the session adapter is registered on).
  await page.evaluate(async modulePath => {
    const { apiFetch } = await import(modulePath) as typeof import('../src/core/api/api-fetch');
    await apiFetch('/credentials').catch(() => undefined);
  }, '/src/core/api/api-fetch.ts');
  await expect(page).toHaveURL(/\/\?auth=login&returnTo=%2Fdashboard$/);
  await expect(page.getByText('Your session expired. Please log in again.')).toBeVisible();
});

for (const width of [375, 768, 1280]) {
  test(`login and sign-up dialogs fit and are operable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/?auth=login');
    await expect(page.getByRole('dialog', dialogName('Log in'))).toBeVisible();
    await noOverflow(page);
    await capture(page, `m06-login-${width}`);
    await page.getByRole('dialog').getByRole('button', { name: 'Sign up' }).click();
    await expect(page.getByRole('dialog', dialogName('Sign up'))).toBeVisible();
    await noOverflow(page);
    for (const control of await page.getByRole('dialog').locator('input, button').all()) {
      const box = await control.boundingBox();
      if (box) expect(box.height).toBeGreaterThanOrEqual(40);
    }
    await capture(page, `m06-signup-${width}`);
  });
}

test('keyboard: Tab order, Escape closes and focus returns to the Log in button', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Log in' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', dialogName('Log in'));
  await expect(dialog.getByLabel('Email')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByLabel('Password')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(`${origin}/`);
});
