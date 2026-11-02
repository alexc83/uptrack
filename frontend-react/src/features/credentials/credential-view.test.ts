import { expect, it } from 'vitest';
import { credential } from '../../test/fixtures/api-fixtures';
import { credentialReportHref, credentialView, sortCredentials } from './credential-view';

it('sorts expiry ascending without modifying cached input', () => {
  const input = Object.freeze([credential, { ...credential, id: 'earlier', expirationDate: '2020-01-01' }]);
  expect(sortCredentials([...input]).map(item => item.id)).toEqual(['earlier', credential.id]);
  expect(input[0]).toBe(credential);
});
it.each([[-1, 'Expired'], [0, '0d left'], [90, '90d left'], [91, 'Active']])('preserves status/day display at %s days', (days, label) => {
  const now = new Date(2026, 0, 1);
  const date = new Date(2026, 0, 1 + days);
  const expirationDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  expect(credentialView({ ...credential, expirationDate, status: days < 0 ? 'EXPIRED' : days <= 90 ? 'EXPIRING_SOON' : 'ACTIVE' }, now).statusLabel).toBe(label);
});
it('caps progress, preserves source hour formatting and treats zero requirement as complete', () => {
  expect(credentialView({ ...credential, ceHoursEarned: 12.34, ceProgress: 1.234 })).toMatchObject({ percent: 100, hoursLabel: '12.3 / 10 hours', tone: 'active' });
  expect(credentialView({ ...credential, requiredCEHours: 0, ceProgress: 0 })).toMatchObject({ percent: 100, hoursLabel: 'No CE required', progressLabel: 'Complete' });
});
it('preserves browser/server date disagreement and encodes report links', () => {
  expect(credentialView({ ...credential, status: 'ACTIVE', expirationDate: '2020-01-01' }).statusLabel).toBe('Expired');
  expect(credentialReportHref('a/b')).toBe('/credentials/a%2Fb/ce-report?returnTo=%2Fcredentials');
});
