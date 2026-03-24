import { buildCeRecordListItemViews } from './ce-record-view.mappers';

describe('buildCeRecordListItemViews', () => {
  it('maps CE records with linked credential context and certificate labels', () => {
    const [view] = buildCeRecordListItemViews([
      {
        id: 'ce-1',
        title: 'ACLS Renewal',
        provider: 'AHA',
        hours: 4,
        dateCompleted: '2026-03-10',
        certificateUrl: 'https://example.com/cert.pdf',
        credentialId: 'cred-1',
        credentialName: 'ACLS Certification',
        credentialOrganization: 'American Heart Association',
      },
    ]);

    expect(view.completedDateLabel).toBe('Mar 10, 2026');
    expect(view.hoursLabel).toBe('4 hrs');
    expect(view.credentialName).toBe('ACLS Certification');
    expect(view.certificateLabel).toBe('On file');
    expect(view.hasCertificate).toBe(true);
  });
});
