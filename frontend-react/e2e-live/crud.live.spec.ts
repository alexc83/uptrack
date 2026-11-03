import { execFileSync } from 'node:child_process';
import { test, expect, type Page } from '@playwright/test';

/** Read-only SQL against the DISPOSABLE database only (never any other DB). */
const DB = process.env.LIVE_DB ?? 'uptrack_m13_acceptance';
if (DB === 'uptrack_migration_test') throw new Error('Live spec must not touch the shared demo database.');
const sql = (q: string) => execFileSync('psql', ['-h', '127.0.0.1', '-d', DB, '-Atc', q], { encoding: 'utf8' }).trim();

const run = Date.now().toString(36);
const A = { name: `Live A ${run}`, email: `live-a-${run}@example.test`, pw: 'Live-Throwaway-1!', pw2: 'Live-Changed-2!' };
const B = { name: `Live B ${run}`, email: `live-b-${run}@example.test`, pw: 'Live-Throwaway-1!' };
const c1 = `Live Course One ${run}`;
const c2 = `Live Course Two ${run}`;
const credName = `Live License ${run}`;
const future = new Date(Date.now() + 400 * 864e5).toISOString().slice(0, 10);

test.describe.configure({ mode: 'serial' });
const consoleErrors: string[] = [];
let page: Page;
let credId = '';

test.beforeAll(async ({ browser }) => {
  page = await (await browser.newContext()).newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(String(e)));
});
test.afterAll(async () => {
  expect(consoleErrors.filter(t => !/Failed to load resource.*(401|404|400|409)/.test(t)), 'unexpected console errors').toEqual([]);
  await page.context().close();
});

async function register(u: { name: string; email: string; pw: string }) {
  await page.goto('/?auth=register');
  const d = page.getByRole('dialog', { name: 'Sign up' });
  await d.getByLabel('Name').fill(u.name);
  await d.getByLabel('Email').fill(u.email);
  await d.getByLabel('Password').fill(u.pw);
  await d.getByLabel('Password').press('Enter');
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function logout() {
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).getByRole('button').click();
  await page.getByRole('dialog', { name: 'Log out' }).getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$|\/\?/);
  await expect(page.getByTestId('desktop-sidebar')).toHaveCount(0);
}
async function login(email: string, password: string) {
  await page.goto('/?auth=login');
  const d = page.getByRole('dialog', { name: 'Log in' });
  await d.getByLabel('Email').fill(email);
  await d.getByLabel('Password').fill(password);
  await d.getByLabel('Password').press('Enter');
}

test('register through the UI persists a hashed account and lands on an empty dashboard', async () => {
  await register(A);
  await expect(page.getByRole('group', { name: 'Total Credentials: 0' })).toBeVisible();
  expect(sql(`select count(*) from users where email='${A.email}'`)).toBe('1');
  expect(sql(`select password from users where email='${A.email}'`)).toMatch(/^\$2[aby]\$/); // BCrypt, never plaintext
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['uptrack_token']);
});

test('duplicate registration surfaces the server message', async ({ browser }) => {
  const p = await (await browser.newContext()).newPage();
  await p.goto('/?auth=register');
  const d = p.getByRole('dialog', { name: 'Sign up' });
  await d.getByLabel('Name').fill('Dup');
  await d.getByLabel('Email').fill(A.email);
  await d.getByLabel('Password').fill(A.pw);
  await d.getByLabel('Password').press('Enter');
  await expect(d.getByRole('alert').filter({ hasText: 'Email is already in use.' })).toBeVisible();
  await p.context().close();
});

test('credential create persists to PostgreSQL; edit; filters', async () => {
  await page.goto('/credentials');
  await page.getByRole('button', { name: 'Add Credential', exact: true }).first().click();
  const f = page.getByRole('dialog', { name: 'Add credential' });
  await f.getByLabel('Credential name', { exact: true }).fill(credName);
  await f.getByLabel('Type', { exact: true }).selectOption('LICENSE');
  await f.getByLabel('Issuing organization').fill('Live Board');
  await f.getByLabel('Expiration date').fill(future);
  await f.getByLabel('Renewal cycle (months)').fill('24');
  await f.getByLabel('Required CE hours').fill('10.5');
  await f.getByRole('button', { name: 'Save Credential' }).click();
  await expect(f).toHaveCount(0);
  await expect(page.getByRole('button', { name: credName, exact: true })).toBeVisible();
  expect(sql(`select name||'|'||requiredcehours||'|'||renewal_cycle_months from credentials where name='${credName}'`)).toMatch(/^.+\|10\.5\d*\|24$/);
  credId = sql(`select id from credentials where name='${credName}'`);
  // fresh navigation shows the persisted row (server state, not cache)
  await page.reload();
  await expect(page.getByRole('button', { name: credName, exact: true })).toBeVisible();
  // search and filter against the real filtering endpoint
  await page.getByRole('searchbox').fill('live board');
  await expect(page.getByRole('button', { name: credName, exact: true })).toBeVisible();
  await page.getByRole('group', { name: 'Status', exact: true }).getByRole('button', { name: 'Expired' }).click();
  await expect(page.getByText('No credentials match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();
  // edit
  await page.getByRole('button', { name: credName, exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Credential details' });
  await drawer.getByRole('button', { name: 'Edit Credential' }).click();
  await page.getByLabel('Required CE hours').fill('8');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(drawer.getByRole('heading', { name: credName })).toBeVisible();
  await expect.poll(() => sql(`select requiredcehours from credentials where id='${credId}'`)).toMatch(/^8(\.0+)?$/);
});

test('CE record create/edit persists; credential progress and report recompute', async () => {
  await page.goto('/ce-records');
  await page.getByRole('button', { name: 'Add CE Record' }).first().click();
  const dlg = page.getByRole('dialog', { name: 'Add CE record' });
  await dlg.getByLabel('Credential', { exact: true }).selectOption(credId);
  await dlg.getByLabel('Title', { exact: true }).fill(c1);
  await dlg.getByLabel('Provider', { exact: true }).fill('Live Provider');
  await dlg.getByLabel('Hours', { exact: true }).fill('3.5');
  await dlg.getByLabel('Date completed', { exact: true }).fill('2026-01-15');
  await dlg.getByRole('button', { name: 'Save CE Record' }).click();
  await expect(dlg).toHaveCount(0);
  await expect(page.getByRole('row', { name: new RegExp(c1) })).toBeVisible();
  expect(sql(`select hours from ce_records where title='${c1}'`)).toMatch(/^3\.5/);
  // second record
  await page.getByRole('button', { name: 'Add CE Record' }).first().click();
  await dlg.getByLabel('Credential', { exact: true }).selectOption(credId);
  await dlg.getByLabel('Title', { exact: true }).fill(c2);
  await dlg.getByLabel('Provider', { exact: true }).fill('Live Provider');
  await dlg.getByLabel('Hours', { exact: true }).fill('2');
  await dlg.getByLabel('Date completed', { exact: true }).fill('2026-02-15');
  await dlg.getByRole('button', { name: 'Save CE Record' }).click();
  await expect(page.getByText(/Showing 1–2 of 2 records/)).toBeVisible();
  // edit record one: 3.5 -> 4.5
  await page.getByRole('row', { name: new RegExp(c1) }).click();
  const drawer = page.getByRole('dialog', { name: 'CE record details' });
  await drawer.getByRole('button', { name: 'Edit CE Record' }).click();
  await page.getByLabel('Hours', { exact: true }).fill('4.5');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(drawer.getByRole('heading', { name: c1 })).toBeVisible();
  expect(sql(`select sum(hours) from ce_records where credential_id='${credId}'`)).toMatch(/^6\.5/);
});

test('CE compliance report shows server-calculated totals; print invokes window.print', async () => {
  await page.addInitScript(() => { (window as unknown as { __printed: number }).__printed = 0; window.print = () => { (window as unknown as { __printed: number }).__printed += 1; }; });
  await page.goto(`/credentials/${credId}/ce-report?returnTo=%2Fcredentials`);
  await expect(page.getByRole('heading', { level: 1, name: credName })).toBeVisible();
  const body = page.locator('body');
  await expect(body).toContainText(c1);
  await expect(body).toContainText(c2);
  await expect(body).toContainText('6.5');   // earned 4.5 + 2
  await expect(body).toContainText('1.5');   // remaining 8 - 6.5
  await page.getByRole('button', { name: /Print Report/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBeGreaterThan(0);
});

test('dashboard reflects live aggregates', async () => {
  await page.goto('/dashboard');
  await expect(page.getByRole('group', { name: 'Total Credentials: 1' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Recent Activity' })).toContainText(`${credName} - 4.5 hrs`);
  await expect(page.getByRole('region', { name: 'Recent Activity' })).toContainText(`${credName} - 2 hrs`);
  // M13 parity fix: dashboard Add CE Record (enabled once the account has a credential) persists through the real backend
  const add = page.getByRole('button', { name: 'Add CE Record' });
  await expect(add).toBeEnabled();
  await add.click();
  const dlg = page.getByRole('dialog', { name: 'Add CE record' });
  await dlg.getByLabel('Credential', { exact: true }).selectOption(credId);
  await dlg.getByLabel('Title', { exact: true }).fill(`Live Dash CE ${run}`);
  await dlg.getByLabel('Provider', { exact: true }).fill('Dash Provider');
  await dlg.getByLabel('Hours', { exact: true }).fill('1');
  await dlg.getByLabel('Date completed', { exact: true }).fill('2026-03-01');
  await dlg.getByRole('button', { name: 'Save CE Record' }).click();
  await expect(dlg).toHaveCount(0);
  expect(sql(`select count(*) from ce_records where title='Live Dash CE ${run}'`)).toBe('1');
  await expect(page.getByRole('region', { name: 'Recent Activity' })).toContainText(`${credName} - 1 hr`); // dashboard refreshed by invalidation
});

test('session survives reload; deep link works; logout clears; B sees none of A (no cache leak in same SPA)', async () => {
  await page.reload();
  await expect(page.getByTestId('desktop-sidebar')).toBeVisible();
  await page.goto('/credentials');
  await expect(page.getByRole('button', { name: credName, exact: true })).toBeVisible();
  await logout();
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBeNull();
  // protected deep link as guest -> login with returnTo
  await page.goto(`/credentials/${credId}/ce-report`);
  await expect(page).toHaveURL(/auth=login&returnTo=/);
  // register B in the same SPA instance without a hard reload of the bundle
  await page.goto('/?auth=register');
  const d = page.getByRole('dialog', { name: 'Sign up' });
  await d.getByLabel('Name').fill(B.name);
  await d.getByLabel('Email').fill(B.email);
  await d.getByLabel('Password').fill(B.pw);
  await d.getByLabel('Password').press('Enter');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('group', { name: 'Total Credentials: 0' })).toBeVisible();
  await page.goto('/credentials');
  await expect(page.getByRole('button', { name: credName, exact: true })).toHaveCount(0);
  await page.goto('/ce-records');
  await expect(page.locator('body')).not.toContainText(`Live Course`);
  // B opens A's report and credential via direct URL: no data revealed
  await page.goto(`/credentials/${credId}/ce-report`);
  await expect(page.locator('body')).not.toContainText(credName);
  await expect(page.locator('body')).not.toContainText(c1);
  await page.goto(`/credentials?credentialId=${credId}`);
  await expect(page.getByRole('dialog', { name: 'Credential details' })).toContainText('Credential not found'); // 404 for a foreign id
  await expect(page.locator('body')).not.toContainText(credName);
  await page.getByRole('button', { name: 'Close drawer' }).click();
  await logout();
});

test('SPA account switch without reload shows no stale data (login dialog, same document)', async () => {
  await login(A.email, A.pw);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: 'Credentials', exact: true }).first().click();
  await expect(page.getByRole('button', { name: credName, exact: true })).toBeVisible();
  await logout();
  await login(B.email, B.pw);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: 'Credentials', exact: true }).first().click();
  await expect(page.getByText(/No credentials/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: credName, exact: true })).toHaveCount(0);
  await logout();
});

test('wrong password shows an error; tampered stored token is treated as expired', async () => {
  await login(A.email, 'definitely-wrong-1');
  await expect(page.getByRole('dialog', { name: 'Log in' }).getByRole('alert')).toBeVisible();
  await login(A.email, A.pw);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.evaluate(() => localStorage.setItem('uptrack_token', localStorage.getItem('uptrack_token')!.slice(0, -4) + 'AAAA'));
  await page.goto('/settings');
  await expect(page).toHaveURL(/auth=login&returnTo=%2Fsettings/);
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBeNull();
});

test('settings: profile update persists; duplicate email rejected; password change end to end', async () => {
  await login(A.email, A.pw);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/settings');
  await page.getByLabel('Name').fill(`  ${A.name} Renamed  `);
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('status')).toHaveText('Profile updated');
  expect(sql(`select name from users where email='${A.email}'`)).toBe(`${A.name} Renamed`);
  await expect(page.getByTestId('desktop-sidebar')).toContainText(`${A.name} Renamed`);
  // email already used by B
  await page.getByLabel('Email').fill(B.email);
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('alert').first()).toContainText(/already in use/i);
  expect(sql(`select email from users where email='${A.email}'`)).toBe(A.email);
  await page.reload();
  // password change
  const hashBefore = sql(`select password from users where email='${A.email}'`);
  await page.getByRole('button', { name: 'Change Password' }).click();
  const dlg = page.getByRole('dialog', { name: 'Change Password' });
  await dlg.getByLabel('Current Password', { exact: true }).fill('not-the-password-1');
  await dlg.getByLabel('New Password', { exact: true }).fill(A.pw2);
  await dlg.getByLabel('Confirm New Password', { exact: true }).fill(A.pw2);
  await dlg.getByRole('button', { name: 'Update Password' }).click();
  await expect(dlg.getByRole('alert')).toContainText(/incorrect/i);
  await dlg.getByLabel('Current Password', { exact: true }).fill(A.pw);
  await dlg.getByRole('button', { name: 'Update Password' }).click();
  await expect(dlg).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Password updated');
  expect(sql(`select password from users where email='${A.email}'`)).not.toBe(hashBefore);
  await logout();
  await login(A.email, A.pw);
  await expect(page.getByRole('dialog', { name: 'Log in' }).getByRole('alert')).toBeVisible();
  await login(A.email, A.pw2);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('delete CE and credential through the UI; DB rows removed (cascade)', async () => {
  await page.goto('/ce-records');
  await page.getByRole('row', { name: new RegExp(c2) }).click();
  const drawer = page.getByRole('dialog', { name: 'CE record details' });
  await drawer.getByRole('button', { name: 'Delete CE Record' }).click();
  await page.getByRole('dialog', { name: 'Delete CE record?' }).getByRole('button', { name: 'Delete CE Record' }).click();
  await expect(drawer).toHaveCount(0);
  expect(sql(`select count(*) from ce_records where title='${c2}'`)).toBe('0');
  await page.goto('/credentials');
  await page.getByRole('button', { name: credName, exact: true }).click();
  const cd = page.getByRole('dialog', { name: 'Credential details' });
  await cd.getByRole('button', { name: 'Delete Credential' }).click();
  await page.getByRole('dialog', { name: 'Delete credential?' }).getByRole('button', { name: 'Delete Credential' }).click();
  await expect(cd).toHaveCount(0);
  expect(sql(`select count(*) from credentials where id='${credId}'`)).toBe('0');
  expect(sql(`select count(*) from ce_records where credential_id='${credId}'`)).toBe('0'); // cascade
  await page.goto('/ce-records');
  await expect(page.locator('body')).not.toContainText(c1);
});
