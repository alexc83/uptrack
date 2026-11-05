import type { Locator } from '@playwright/test';
import { test, expect, signIn } from './helpers';
import { credentialId, record, recordId } from '../src/test/fixtures/api-fixtures';
import { ceRecordApiFixture } from './ce-record-fixtures';

async function fillCeForm(form: Locator, title = 'New course') {
  await form.getByLabel('Credential', { exact: true }).selectOption(credentialId);
  await form.getByLabel('Title', { exact: true }).fill(` ${title} `);
  await form.getByLabel('Provider', { exact: true }).fill(' New provider ');
  await form.getByLabel('Hours', { exact: true }).fill('4.5');
  await form.getByLabel('Date completed', { exact: true }).fill('2026-02-01');
}
test.beforeEach(async ({ page }) => { await signIn(page); });

test('list, filters, create with certificate upload, detail, edit and delete', async ({ page }) => {
  const api = await ceRecordApiFixture(page);
  await page.goto('/ce-records');
  await expect(page.getByRole('heading', { level: 1, name: 'CE Records' })).toBeVisible();
  const row = page.getByRole('row', { name: /Fixture record/ });
  await expect(row).toBeVisible();
  await expect(page.getByText('Showing 1–1 of 1 record')).toBeVisible();
  await expect(page.getByRole('region', { name: 'CE summary' }).getByText('Missing Certificates')).toBeVisible();
  // Search and certificate filters
  await page.getByRole('searchbox').fill('nope');
  await expect(page.getByText('No records match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear Filters' }).click();
  await expect(row).toBeVisible();
  await page.getByRole('group', { name: 'Certificate' }).getByRole('button', { name: 'On file' }).click();
  await expect(page.getByText('No records match these filters')).toBeVisible();
  await page.getByRole('group', { name: 'Certificate' }).getByRole('button', { name: 'All' }).click();
  await expect(row).toBeVisible();
  // Create with certificate upload
  await page.getByRole('button', { name: 'Add CE Record' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add CE record' });
  await fillCeForm(dialog);
  await dialog.getByLabel('Certificate').setInputFiles({ name: 'cert.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') });
  await expect(dialog.getByText('Certificate uploaded successfully.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Save CE Record' }).click();
  await expect(dialog).toHaveCount(0);
  expect(api.uploads).toEqual(['cert.pdf']);
  expect(api.writes[0]).toEqual({ method: 'POST', request: { title: 'New course', provider: 'New provider', hours: 4.5, dateCompleted: '2026-02-01', credentialId, certificateAssetId: 'asset-cert.pdf', certificateUrl: null, certificatePublicId: 'pub-cert.pdf', certificateResourceType: 'raw', certificateOriginalFilename: 'cert.pdf' } });
  const newRow = page.getByRole('row', { name: /New course/ });
  await expect(newRow).toBeVisible();
  await expect(page.getByText('Showing 1–2 of 2 records')).toBeVisible();
  // Detail drawer, inline edit, delete with confirmation
  await newRow.click();
  const drawer = page.getByRole('dialog', { name: 'CE record details' });
  await expect(drawer.getByRole('heading', { name: 'New course' })).toBeVisible();
  const viewButton = drawer.getByRole('button', { name: 'View certificate' });
  await expect(viewButton).toBeVisible();
  const popupPromise = page.waitForEvent('popup');
  await viewButton.click();
  const popup = await popupPromise;
  await popup.close();
  expect(api.certificateUrlReads).toBe(1); // short-lived URL fetched on demand, not stored
  await drawer.getByRole('button', { name: 'Edit CE Record' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Edited course');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(drawer.getByRole('heading', { name: 'Edited course' })).toBeVisible();
  expect(api.writes[1]?.method).toBe('PUT');
  expect(api.writes[1]?.request).toMatchObject({ title: 'Edited course', credentialId, certificateUrl: null, certificateAssetId: 'asset-cert.pdf' });
  await drawer.getByRole('button', { name: 'Delete CE Record' }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete CE record?' });
  await expect(confirm.getByText(/linked credential totals will refresh/)).toBeVisible();
  await confirm.getByRole('button', { name: 'Delete CE Record' }).click();
  await expect(drawer).toHaveCount(0);
  expect(api.writes.map(item => item.method)).toEqual(['POST', 'PUT', 'DELETE']);
  await expect(page.getByRole('row', { name: /Edited course/ })).toHaveCount(0);
  await expect(row).toBeVisible();
});

test('invalid form sends nothing; unsupported upload, failed upload/create/delete surface inline errors', async ({ page }) => {
  const api = await ceRecordApiFixture(page);
  await page.goto('/ce-records');
  await page.getByRole('button', { name: 'Add CE Record' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add CE record' });
  await dialog.getByRole('button', { name: 'Save CE Record' }).click();
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog.getByRole('alert').first()).toHaveText('This field is required.');
  expect(api.writes).toHaveLength(0);
  await dialog.getByLabel('Certificate').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
  await expect(dialog.getByText('Unsupported file type. Please choose a PDF or common image file.')).toBeVisible();
  expect(api.uploads).toHaveLength(0);
  api.uploadStatus = 413;
  await dialog.getByLabel('Certificate').setInputFiles({ name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  await expect(dialog.getByText('Fixture operation failed').first()).toBeVisible();
  api.uploadStatus = 201;
  await fillCeForm(dialog);
  api.nextWriteStatus = 400;
  await dialog.getByRole('button', { name: 'Save CE Record' }).click();
  await expect(dialog.getByText('Fixture operation failed').first()).toBeVisible();
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(' New course ');
  expect(api.writes).toHaveLength(1);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('row', { name: /Fixture record/ }).click();
  const drawer = page.getByRole('dialog', { name: 'CE record details' });
  await expect(drawer.getByRole('heading', { name: 'Fixture record' })).toBeVisible();
  await drawer.getByRole('button', { name: 'Delete CE Record' }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete CE record?' });
  api.nextWriteStatus = 403;
  await confirm.getByRole('button', { name: 'Delete CE Record' }).click();
  await expect(confirm.getByRole('alert')).toHaveText('Fixture operation failed');
  await expect(confirm).toBeVisible();
  expect(api.writes.map(item => item.method)).toEqual(['POST', 'DELETE']);
});

test('deep link opens the record drawer and consumes only recordId', async ({ page }) => {
  await ceRecordApiFixture(page);
  await page.goto(`/app/ce-records?keep=yes&recordId=${recordId}#top`);
  const drawer = page.getByRole('dialog', { name: 'CE record details' });
  await expect(drawer.getByRole('heading', { name: 'Fixture record' })).toBeVisible();
  await expect(page).toHaveURL(/\/ce-records\?keep=yes#top$/);
  await drawer.getByRole('button', { name: 'Close drawer' }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Fixture record/ })).toBeVisible();
  expect(record.title).toBe('Fixture record');
});
