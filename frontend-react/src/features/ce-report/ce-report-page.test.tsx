import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { credentialsApi } from '../../core/api/credentials-api';
import { ApiError } from '../../core/api/api-error';
import { ceReport, credentialId, deferred } from '../../test/fixtures/api-fixtures';
import { renderWithProviders } from '../../test/render-with-providers';
import type { CEReportResponse } from '../../lib/dto/ce-report';
import { CEReportPage } from './ce-report-page';
import {
  normalizeReportReturnTo,
  reportCertificateLabel,
  reportProgressPercent,
  reportStatusLabel,
  reportStatusTone,
  reportSummaryFields,
} from './ce-report-view';

const report = (): CEReportResponse => structuredClone(ceReport);
const reportRoutes = (element = <CEReportPage />) => [{ path: '/credentials/:credentialId/ce-report', element }];
const open = (path = `/credentials/${credentialId}/ce-report?returnTo=%2Fcredentials`) =>
  renderWithProviders(null, { routes: reportRoutes(), path, session: 'authenticated' });

beforeEach(() => {
  vi.spyOn(credentialsApi, 'getCEReport').mockResolvedValue(report());
});
afterEach(() => {
  document.documentElement.classList.remove('dark');
  vi.restoreAllMocks();
});

describe('report return-to normalization', () => {
  it.each([
    ['/credentials', '/credentials'],
    ['/dashboard?tab=1#top', '/dashboard?tab=1#top'],
    ['/credentials/abc/ce-report?returnTo=%2Fcredentials', '/credentials/abc/ce-report?returnTo=%2Fcredentials'],
  ])('accepts %s', (value, expected) => expect(normalizeReportReturnTo(value)).toBe(expected));
  it.each([['https://evil.test/x'], ['//evil.test/x'], ['dashboard'], [''], [null]])('falls back to /credentials for %s', value => {
    expect(normalizeReportReturnTo(value)).toBe('/credentials');
  });
});

describe('report view mapping', () => {
  it('computes progress percent with the not-required and over-100 rules', () => {
    expect(reportProgressPercent(report())).toBe(100);
    expect(reportProgressPercent({ ...report(), summary: { ...report().summary, progress: 0.6 } })).toBe(60);
    expect(reportProgressPercent({ ...report(), credential: { ...report().credential, requiredCEHours: 0 } })).toBe(100);
  });
  it('maps status labels and tones', () => {
    expect([reportStatusLabel('ACTIVE'), reportStatusLabel('EXPIRING_SOON'), reportStatusLabel('EXPIRED')]).toEqual(['Active', 'Expiring Soon', 'Expired']);
    expect([reportStatusTone('ACTIVE'), reportStatusTone('EXPIRING_SOON'), reportStatusTone('EXPIRED')]).toEqual(['active', 'expiring', 'expired']);
  });
  it('labels certificates by attachment', () => {
    expect(reportCertificateLabel('https://files.example.test/c.pdf')).toBe('On file');
    expect(reportCertificateLabel(null)).toBe('Not attached');
    expect(reportCertificateLabel(undefined)).toBe('Not attached');
  });
  it('builds the eight summary fields with singular/plural records', () => {
    const fields = reportSummaryFields(report());
    expect(fields.map(field => field.label)).toEqual(['Credential Type', 'Issuing Organization', 'Expiration Date', 'Current Status', 'Required CE Hours', 'Earned CE Hours', 'Remaining Hours', 'CE Record Count']);
    expect(Object.fromEntries(fields.map(field => [field.label, field.value]))).toMatchObject({
      'Credential Type': 'License',
      'Expiration Date': 'Jan 1, 2027',
      'Current Status': 'Active',
      'Required CE Hours': '10 hours',
      'Earned CE Hours': '15 hours',
      'Remaining Hours': '0 hours',
      'CE Record Count': '1 record',
    });
    const plural = reportSummaryFields({ ...report(), summary: { ...report().summary, recordCount: 2 } });
    expect(plural.find(field => field.label === 'CE Record Count')?.value).toBe('2 records');
    const notRequired = reportSummaryFields({ ...report(), credential: { ...report().credential, requiredCEHours: 0 } });
    expect(notRequired.find(field => field.label === 'Required CE Hours')?.value).toBe('Not required');
    expect(notRequired.find(field => field.label === 'Remaining Hours')?.value).toBe('0 hours');
  });
});

describe('CE report page', () => {
  it('renders the sheet with totals matching the API response', async () => {
    open();
    expect(await screen.findByRole('heading', { level: 1, name: 'Fixture credential' })).toBeVisible();
    expect(document.title).toBe('CE Report — UpTrack');
    expect(credentialsApi.getCEReport).toHaveBeenCalledWith(credentialId, { signal: expect.objectContaining({ aborted: false }) });
    expect(screen.getByText('UpTrack CE Report')).toBeVisible();
    expect(screen.getAllByText('Fixture organization')).toHaveLength(2);
    expect(screen.getAllByText('Active')).toHaveLength(2);
    expect(screen.getByText('Fixture User')).toBeVisible();
    expect(screen.getByText('15 / 10 hours')).toBeVisible();
    expect(screen.getByText('100% Complete')).toBeVisible();
    const meter = screen.getByRole('progressbar', { name: 'CE progress' });
    expect(meter).toHaveAttribute('aria-valuenow', '100');
    const table = screen.getByRole('table');
    expect(within(table).getByRole('row', { name: /Fixture record/ })).toBeVisible();
    expect(within(table).getByText('Fixture provider')).toBeVisible();
    expect(within(table).getByText('Jan 1, 2026')).toBeVisible();
    expect(within(table).getByText('Not attached')).toBeVisible();
    expect(screen.getByText('Generated from UpTrack')).toBeVisible();
    expect(screen.getByText(/^\w{3} \d{1,2}, \d{4},/)).toBeVisible();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
  it('shows loading, then the empty-records state without a table', async () => {
    const pending = deferred<CEReportResponse>();
    vi.mocked(credentialsApi.getCEReport).mockReturnValueOnce(pending.promise);
    open();
    expect(await screen.findByRole('status')).toHaveTextContent('Loading CE report…');
    expect(screen.getByRole('button', { name: 'Print Report' })).toBeDisabled();
    pending.resolve({ ...report(), summary: { totalHoursEarned: 0, remainingHours: 10, recordCount: 0, progress: 0 }, records: [] });
    expect(await screen.findByText('No CE records on file')).toBeVisible();
    expect(screen.getByText(/no continuing education records attached yet/)).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('0% Complete')).toBeVisible();
  });
  it('shows the server error with Back and Retry, and Retry reloads', async () => {
    vi.mocked(credentialsApi.getCEReport).mockRejectedValueOnce(new ApiError('http', 404, 'Credential not found'));
    const { router, user } = open(`/credentials/${credentialId}/ce-report?returnTo=%2Fdashboard`);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('CE report unavailable')).toBeVisible();
    expect(within(alert).getByText('Credential not found')).toBeVisible();
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(credentialsApi.getCEReport).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('heading', { level: 1, name: 'Fixture credential' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
  });
  it('falls back to /credentials for an invalid returnTo', async () => {
    const { router, user } = open(`/credentials/${credentialId}/ce-report?returnTo=https%3A%2F%2Fevil.test`);
    await screen.findByRole('heading', { level: 1, name: 'Fixture credential' });
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/credentials'));
  });
  it('prints without dark mode and restores it after printing', async () => {
    document.documentElement.classList.add('dark');
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 0; });
    const { user } = open();
    await screen.findByRole('heading', { level: 1, name: 'Fixture credential' });
    await user.click(screen.getByRole('button', { name: 'Print Report' }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.querySelector('.ce-report-printing')).not.toBeNull();
    window.dispatchEvent(new Event('afterprint'));
    await waitFor(() => expect(document.querySelector('.ce-report-printing')).toBeNull());
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
  it('renders the not-required variants when the credential needs no CE', async () => {
    vi.mocked(credentialsApi.getCEReport).mockResolvedValueOnce({
      ...report(),
      credential: { ...report().credential, requiredCEHours: 0 },
      summary: { totalHoursEarned: 3, remainingHours: 0, recordCount: 1, progress: 1 },
    });
    open();
    await screen.findByRole('heading', { level: 1, name: 'Fixture credential' });
    expect(screen.getByText('Not required')).toBeVisible();
    expect(screen.getByText('100% Complete')).toBeVisible();
  });
});
