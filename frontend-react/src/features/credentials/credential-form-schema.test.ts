import { describe, expect, it } from 'vitest';
import { credentialRequest } from '../../test/fixtures/api-fixtures';
import { credentialSchema } from './credential-form-schema';

describe('credential contract validation', () => {
  it('trims strings, accepts past/leap dates and decimal hours outside half-hour steps', () => {
    expect(credentialSchema.parse({ ...credentialRequest, name: ' Name ', issuingOrganization: ' Org ', expirationDate: '2024-02-29', requiredCEHours: 12.34 })).toMatchObject({ name: 'Name', issuingOrganization: 'Org', requiredCEHours: 12.34 });
  });
  it.each([
    { name: '   ' }, { name: 'n'.repeat(181) }, { issuingOrganization: ' ' }, { issuingOrganization: 'o'.repeat(181) },
    { type: '' }, { type: 'OTHER' }, { expirationDate: '' }, { expirationDate: '2025-02-29' }, { expirationDate: '2026-04-31' }, { expirationDate: '0000-01-01' }, { expirationDate: '2026-1-1' },
    { renewalCycleMonths: 0 }, { renewalCycleMonths: 1.5 }, { renewalCycleMonths: NaN }, { renewalCycleMonths: Infinity },
    { requiredCEHours: -1 }, { requiredCEHours: NaN }, { requiredCEHours: Infinity }, { requiredCEHours: 1000 }, { requiredCEHours: 1.001 }, { requiredCEHours: 1.00000000001 },
  ])('rejects invalid input %j', patch => {
    expect(credentialSchema.safeParse({ ...credentialRequest, ...patch }).success).toBe(false);
  });
  it.each([0, 0.01, 0.29, 999.99])('accepts valid CE boundary %s', requiredCEHours => {
    expect(credentialSchema.safeParse({ ...credentialRequest, name: 'n'.repeat(180), issuingOrganization: 'o'.repeat(180), requiredCEHours }).success).toBe(true);
  });
});
