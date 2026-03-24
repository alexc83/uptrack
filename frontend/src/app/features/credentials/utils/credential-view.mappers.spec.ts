import { buildCredentialListCardViews } from './credential-view.mappers';

describe('buildCredentialListCardViews', () => {
  it('maps credential summaries into card views with status and CE progress labels', () => {
    const [view] = buildCredentialListCardViews(
      [
        {
          id: 'cred-1',
          name: 'RN License',
          type: 'LICENSE',
          issuingOrganization: 'Texas Board of Nursing',
          expirationDate: '2026-04-10',
          renewalCycleMonths: 24,
          requiredCEHours: 20,
          status: 'EXPIRING_SOON',
          ceHoursEarned: 12,
          ceProgress: 0.6,
          ceRecords: [],
        },
      ],
      new Date('2026-03-23T12:00:00'),
    );

    expect(view.name).toBe('RN License');
    expect(view.typeLabel).toBe('License');
    expect(view.statusLabel).toBe('18d left');
    expect(view.statusTone).toBe('expiring');
    expect(view.ceHoursLabel).toBe('12 / 20 hours');
    expect(view.cePercentLabel).toBe('60% complete');
    expect(view.cePercent).toBe(60);
  });

  it('marks credentials with no CE requirement as complete', () => {
    const [view] = buildCredentialListCardViews(
      [
        {
          id: 'cred-2',
          name: 'BLS Certification',
          type: 'CERTIFICATION',
          issuingOrganization: 'AHA',
          expirationDate: '2026-08-01',
          renewalCycleMonths: 24,
          requiredCEHours: 0,
          status: 'ACTIVE',
          ceHoursEarned: 0,
          ceProgress: 0,
          ceRecords: [],
        },
      ],
      new Date('2026-03-23T12:00:00'),
    );

    expect(view.ceHoursLabel).toBe('No CE required');
    expect(view.cePercentLabel).toBe('Complete');
    expect(view.cePercent).toBe(100);
    expect(view.ceProgressTone).toBe('active');
  });
});
