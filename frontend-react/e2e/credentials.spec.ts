import type { Locator } from '@playwright/test';
import { test, expect, activateWithKeyboard, expectOverlayClosed, allowApi, capture, e2eUser, noOverflow, setTheme, signIn } from './helpers';
import { credential } from '../src/test/fixtures/api-fixtures';
import { credentialApiFixture } from './credential-fixtures';

async function fill(form: Locator, name = 'New credential') {
  await expect(form.getByLabel('Credential name', { exact: true })).toBeFocused();
  await form.getByLabel('Credential name', { exact: true }).fill(` ${name} `);
  await form.getByLabel('Type', { exact: true }).selectOption('LICENSE');
  await form.getByLabel('Issuing organization').fill(' New organization ');
  await form.getByLabel('Expiration date').fill('2028-02-29');
  await form.getByLabel('Renewal cycle (months)').fill('24');
  await form.getByLabel('Required CE hours').fill('12.34');
}
test.beforeEach(async ({ page }) => { await signIn(page); });

test('create, refresh, detail, inline edit/cancel, cascading delete and protected report link', async ({ page }) => {
  const api = await credentialApiFixture(page);
  await page.goto('/credentials');
  await page.getByRole('button', { name: 'Add Credential', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Add credential' });
  await expect(form.getByLabel('Credential name')).toBeFocused();
  await fill(form);
  await form.getByRole('button', { name: 'Save Credential' }).click();
  await expect(form).toHaveCount(0);
  expect(api.writes[0]).toEqual({ method: 'POST', request: { name: 'New credential', type: 'LICENSE', issuingOrganization: 'New organization', expirationDate: '2028-02-29', renewalCycleMonths: 24, requiredCEHours: 12.34 } });
  await expect(page.getByRole('button', { name: 'New credential', exact: true })).toBeVisible();
  await page.reload();
  await activateWithKeyboard(page, page.getByRole('button', { name: 'New credential', exact: true }));
  const drawer = page.getByRole('dialog', { name: 'Credential details' });
  await expect(drawer.getByText('Fixture record', { exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Add CE|Edit CE/ })).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Edit Credential' }).click();
  await page.getByLabel('Credential name').fill('Discard');
  await page.getByRole('button', { name: 'Cancel Edit' }).click();
  expect(api.writes).toHaveLength(1);
  await drawer.getByRole('button', { name: 'Edit Credential' }).click();
  await expect(page.getByLabel('Credential name')).toHaveValue('New credential');
  await page.getByLabel('Credential name').fill('Edited credential');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(drawer.getByRole('heading', { name: 'Edited credential' })).toBeVisible();
  await drawer.getByRole('link', { name: 'Open CE Report' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Edited credential' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page).toHaveURL(/\/ce-report\?returnTo=%2Fcredentials$/);
  await page.goBack();
  await page.getByRole('button', { name: 'Edited credential', exact: true }).click();
  await activateWithKeyboard(page, drawer.getByRole('button', { name: 'Delete Credential' }));
  const confirm = page.getByRole('dialog', { name: 'Delete credential?' });
  await expect(confirm.getByText(/any linked CE records/)).toBeVisible();
  await expect(confirm.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(confirm).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: 'Delete Credential' })).toBeFocused();
  await drawer.getByRole('button', { name: 'Delete Credential' }).click();
  await confirm.getByRole('button', { name: 'Delete Credential' }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Edited credential', exact: true })).toHaveCount(0);
  expect(api.writes.map(item => item.method)).toEqual(['POST', 'PUT', 'DELETE']);
});

test('250 ms search combines name/organization, status/type and Clear without userId', async ({ page }) => {
  const api = await credentialApiFixture(page);
  await page.goto('/credentials');
  await expect(page.getByRole('button', { name: credential.name, exact: true })).toBeVisible();
  const initial = api.queries.length;
  await page.getByRole('searchbox').fill(' Fixture organization ');
  expect(api.queries).toHaveLength(initial);
  await expect.poll(() => api.queries.at(-1)?.get('search')).toBe('Fixture organization');
  await page.getByRole('group', { name: 'Status', exact: true }).getByRole('button', { name: 'Expired' }).click();
  await page.getByRole('group', { name: 'Type', exact: true }).getByRole('button', { name: 'License' }).click();
  await expect.poll(() => api.queries.at(-1)?.get('type')).toBe('LICENSE');
  expect(api.queries.at(-1)?.get('status')).toBe('EXPIRED');
  await expect(page.getByText('No credentials match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.getByRole('button', { name: credential.name, exact: true })).toBeVisible();
  expect(api.queries.every(query => !query.has('userId'))).toBe(true);
});

test('invalid forms send nothing; failed create/edit/delete retain values and show inline errors', async ({ page }) => {
  const api = await credentialApiFixture(page);
  await page.goto('/credentials');
  await page.getByRole('button', { name: 'Add Credential', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Add credential' });
  await form.getByRole('button', { name: 'Save Credential' }).click();
  await expect(form.getByLabel('Credential name')).toHaveAttribute('aria-invalid', 'true');
  expect(api.writes).toHaveLength(0);
  await fill(form);
  await form.getByLabel('Required CE hours').fill('1.001');
  await form.getByRole('button', { name: 'Save Credential' }).click();
  await expect(form.getByText('Use no more than two decimal places.')).toBeVisible();
  expect(api.writes).toHaveLength(0);
  await form.getByLabel('Required CE hours').fill('12.34');
  api.nextWriteStatus = 400;
  await form.getByRole('button', { name: 'Save Credential' }).click();
  await expect(form.getByRole('alert')).toHaveText('Fixture operation failed');
  await expect(form.getByLabel('Credential name')).toHaveValue(' New credential ');
  await form.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: credential.name, exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Credential details' });
  await drawer.getByRole('button', { name: 'Edit Credential' }).click();
  await page.getByLabel('Credential name').fill('Keep this edit');
  api.nextWriteStatus = 403;
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit credential', exact: true }).getByRole('alert')).toHaveText('Fixture operation failed');
  await expect(page.getByLabel('Credential name')).toHaveValue('Keep this edit');
  await page.getByRole('button', { name: 'Cancel Edit' }).click();
  await drawer.getByRole('button', { name: 'Delete Credential' }).click();
  api.nextWriteStatus = 403;
  const confirm = page.getByRole('dialog', { name: 'Delete credential?' });
  await confirm.getByRole('button', { name: 'Delete Credential' }).click();
  await expect(confirm.getByRole('alert')).toHaveText('Fixture operation failed');
  await expect(confirm).toBeVisible();
});

test('initial loading/error/retry, background failure and empty-account states', async ({ page }) => {
  const api = await credentialApiFixture(page);
  let release!: () => void;
  api.holdRead = new Promise<void>(resolve => { release = resolve; });
  await page.goto('/credentials');
  await expect(page.getByText('Loading credentials…')).toBeVisible();
  api.listStatus = 403;
  release();
  api.holdRead = null;
  await expect(page.getByText('Credentials unavailable')).toBeVisible();
  api.listStatus = 200;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('button', { name: credential.name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add Credential', exact: true }).click();
  await fill(page.getByRole('dialog', { name: 'Add credential' }));
  api.listStatus = 403;
  await page.getByRole('button', { name: 'Save Credential' }).click();
  await expect(page.getByText('Credentials may be out of date')).toBeVisible();
  await expect(page.getByRole('button', { name: credential.name, exact: true })).toBeVisible();
  api.listStatus = 200;
  api.credentials = [];
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('No credentials yet')).toBeVisible();
});

test('deep links consume only credentialId, retain hash/query, repeat and handle missing credentials', async ({ page }) => {
  const api = await credentialApiFixture(page);
  await page.goto(`/app/credentials?keep=yes&credentialId=${credential.id}#top`);
  const drawer = page.getByRole('dialog', { name: 'Credential details' });
  await expect(drawer.getByText('Fixture record', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/credentials\?keep=yes#top$/);
  await drawer.getByRole('button', { name: 'Close drawer' }).click();
  await page.goto('/credentials?keep=yes&credentialId=missing#top');
  await expect(drawer.getByText('Credential unavailable')).toBeVisible();
  await expect(page).toHaveURL(/\/credentials\?keep=yes#top$/);
  api.credentials.push({ ...credential, id: 'missing' });
  await drawer.getByRole('button', { name: 'Retry' }).click();
  await expect(drawer.getByText('Fixture record', { exact: true })).toBeVisible();
});

test('dashboard Add Credential refreshes the dashboard; the header credential read feeds Add CE Record (M13)', async ({ page }) => {
  const api = await credentialApiFixture(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('group', { name: 'Total Credentials: 1' })).toBeVisible();
  const initialReads = api.dashboardReads;
  await page.getByRole('button', { name: 'Add Credential' }).click();
  await fill(page.getByRole('dialog', { name: 'Add credential' }));
  await page.getByRole('button', { name: 'Save Credential' }).click();
  await expect(page.getByRole('group', { name: 'Total Credentials: 2' })).toBeVisible();
  expect(api.dashboardReads).toBe(initialReads + 1);
  // M13 parity fix: Add CE Record needs the credential list (Angular parity); it is an unfiltered caller-scoped read.
  expect(api.queries.every(query => !query.has('userId') && !query.has('search'))).toBe(true);
  await expect(page.getByRole('button', { name: 'Add CE Record' })).toBeEnabled();
});

for (const kind of ['create', 'edit', 'delete'] as const) {
  test(`${kind} pending blocks dismissal/duplicates and late response cannot affect replacement account`, async ({ page }) => {
    const api = await credentialApiFixture(page);
    let release!: () => void;
    api.holdWrite = new Promise<void>(resolve => { release = resolve; });
    await page.goto('/credentials');
    if (kind === 'create') {
      await page.getByRole('button', { name: 'Add Credential', exact: true }).click();
      await fill(page.getByRole('dialog', { name: 'Add credential' }), 'Old A draft');
      await page.getByRole('button', { name: 'Save Credential' }).click();
    } else {
      await page.getByRole('button', { name: credential.name, exact: true }).click();
      const drawer = page.getByRole('dialog', { name: 'Credential details' });
      if (kind === 'edit') {
        await drawer.getByRole('button', { name: 'Edit Credential' }).click();
        await page.getByLabel('Credential name').fill('Old A draft');
        await page.getByRole('button', { name: 'Save Changes' }).click();
      } else {
        await drawer.getByRole('button', { name: 'Delete Credential' }).click();
        await page.getByRole('dialog', { name: 'Delete credential?' }).getByRole('button', { name: 'Delete Credential' }).click();
      }
    }
    await expect.poll(() => api.writes.length).toBe(1);
    const pending = page.getByRole('button', { name: kind === 'delete' ? 'Deleting…' : 'Saving…' });
    await expect(pending).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(pending).toBeVisible();
    await page.getByRole('button', { name: kind === 'edit' ? 'Close drawer' : 'Close', exact: true }).last().click();
    await expect(pending).toBeVisible();
    const accountB = { ...e2eUser, id: '00000000-0000-4000-8000-000000000099', name: 'Account B' };
    allowApi(page, 'GET', '/api/auth/me');
    await page.route('**/api/auth/me', route => route.fulfill({ json: accountB }));
    // Hold old response bytes separately; B owns a new fixture list. Old success must not invalidate it.
    api.nextWriteStatus = 403;
    api.credentials = [{ ...credential, name: 'B credential' }];
    await page.evaluate(() => {
      localStorage.setItem('uptrack_token', 'b.fixture.token');
      window.dispatchEvent(new StorageEvent('storage', { key: 'uptrack_token', newValue: 'b.fixture.token' }));
    });
    await expect(page.getByRole('button', { name: 'B credential', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const readsBeforeRelease = api.queries.length;
    const oldResponse = page.waitForResponse(response => response.request().method() !== 'GET' && response.url().includes('/api/credentials'));
    release();
    await oldResponse;
    await expect(page.getByRole('button', { name: 'B credential', exact: true })).toBeVisible();
    await expect(page.getByText('Old A draft')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(api.queries).toHaveLength(readsBeforeRelease);
  });
}

for (const theme of ['light', 'dark'] as const) for (const width of [375, 768, 769, 1280]) {
  test(`${theme} ${width}px credentials, form and drawer have no overflow`, async ({ page }) => {
    await credentialApiFixture(page);
    await setTheme(page, theme);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/credentials');
    await expect(page.getByRole('button', { name: credential.name, exact: true })).toBeVisible();
    await noOverflow(page);
    await capture(page, `m09-${theme}-${width}-list`);
    await activateWithKeyboard(page, page.getByRole('button', { name: 'Add Credential', exact: true }));
    const form = page.getByRole('dialog', { name: 'Add credential' });
    await expect(form.getByLabel('Credential name')).toBeFocused();
    await noOverflow(page);
    await expect.poll(() => form.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await capture(page, `m09-${theme}-${width}-create`);
    await page.keyboard.press('Escape');
    await expectOverlayClosed(page, form, page.getByRole('button', { name: 'Add Credential', exact: true }));
    await activateWithKeyboard(page, page.getByRole('button', { name: credential.name, exact: true }));
    await expect(page.getByRole('dialog', { name: 'Credential details' }).getByText('Fixture record', { exact: true })).toBeVisible();
    await noOverflow(page);
    await expect.poll(() => page.getByRole('dialog', { name: 'Credential details' }).evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await capture(page, `m09-${theme}-${width}-detail`);
    await page.keyboard.press('Escape');
    await expectOverlayClosed(page, page.getByRole('dialog', { name: 'Credential details' }), page.getByRole('button', { name: credential.name, exact: true }));
  });
}
