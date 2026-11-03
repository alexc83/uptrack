import type { Page } from '@playwright/test';
import { test, expect, allowApi, noOverflow, signIn } from './helpers';
import { ceReport, credentialId } from '../src/test/fixtures/api-fixtures';

/** Synthetic report fixture; never forwards requests to the backend. */
async function ceReportFixture(page: Page) {
  const state = { status: 200, reads: [] as string[] };
  allowApi(page, 'GET', `/api/credentials/${credentialId}/ce-report`);
  allowApi(page, 'GET', '/api/credentials');
  await page.route(`http://localhost:5173/api/credentials/${credentialId}/ce-report`, async route => {
    state.reads.push(route.request().url());
    if (state.status !== 200) return route.fulfill({ status: state.status, json: { status: state.status, error: 'Fixture error', message: 'Credential not found', timestamp: '2026-01-01T00:00:00Z' } });
    return route.fulfill({ json: structuredClone(ceReport) });
  });
  await page.route('http://localhost:5173/api/credentials', route => route.fulfill({ json: [] }));
  return state;
}

test.beforeEach(async ({ page }) => { await signIn(page); });

test('report renders API totals and Back follows returnTo', async ({ page }) => {
  const api = await ceReportFixture(page);
  await page.goto(`/credentials/${credentialId}/ce-report?returnTo=%2Fcredentials`);
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture credential' })).toBeVisible();
  expect(api.reads.length).toBeGreaterThanOrEqual(1);
  for (const url of api.reads) {
    const parsed = new URL(url);
    expect(parsed.pathname).toBe(`/api/credentials/${credentialId}/ce-report`);
    expect(parsed.search).toBe('');
  }
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByText('15 / 10 hours')).toBeVisible();
  await expect(page.getByText('100% Complete')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'CE progress' })).toHaveAttribute('aria-valuenow', '100');
  await expect(page.getByRole('row', { name: /Fixture record/ })).toBeVisible();
  await expect(page.getByText('Not attached')).toBeVisible();
  await expect(page.getByText('Generated from UpTrack')).toBeVisible();
  await expect(page).toHaveTitle('CE Report — UpTrack');
  await noOverflow(page);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/credentials$/);
});

test('missing report shows error with retry; invalid returnTo falls back to credentials', async ({ page }) => {
  const api = await ceReportFixture(page);
  api.status = 404;
  await page.goto(`/credentials/${credentialId}/ce-report?returnTo=https%3A%2F%2Fevil.test`);
  const alert = page.getByRole('alert');
  await expect(alert.getByText('CE report unavailable')).toBeVisible();
  await expect(alert.getByText('Credential not found')).toBeVisible();
  api.status = 200;
  await alert.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture credential' })).toBeVisible();
  expect(api.reads.length).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/credentials$/);
});

test('print media hides screen controls; narrow viewport stacks without overflow', async ({ page }) => {
  await ceReportFixture(page);
  await page.goto(`/credentials/${credentialId}/ce-report?returnTo=%2Fcredentials`);
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture credential' })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Back' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Print Report' })).toBeHidden();
  await expect(page.locator('.ce-report-records thead')).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.locator('.ce-report-records thead')).toBeHidden();
  await expect(page.getByRole('row', { name: /Fixture record/ })).toBeVisible();
  await noOverflow(page);
});
