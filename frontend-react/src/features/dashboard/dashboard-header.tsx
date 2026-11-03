import { useMemo } from 'react';
import { PageHeader } from '../../shared/layout/page-header';
import { AddCERecordAction } from '../ce-records/ce-record-form-dialog';
import { CERecordSessionBoundary } from '../ce-records/ce-record-session-boundary';
import { buildCERecordCredentialOptions } from '../ce-records/ce-record-view';
import { AddCredentialAction } from '../credentials/credential-form-dialog';
import { useCredentials } from '../credentials/use-credentials';

/** M13: restores the Angular dashboard "Add CE Record" action (disabled until the account has a credential). */
function DashboardAddCERecord() {
  const query = useCredentials({});
  const options = useMemo(() => buildCERecordCredentialOptions(query.data ?? []), [query.data]);
  return <AddCERecordAction credentialOptions={options} />;
}

export function DashboardHeader({ greeting, firstName, dateLabel }: { greeting: string | null; firstName: string; dateLabel: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Dashboard"
        title="Live compliance overview"
        description="Monitor credential urgency, CE progress, and recent activity from one live dashboard."
        actions={<><CERecordSessionBoundary><DashboardAddCERecord /></CERecordSessionBoundary><AddCredentialAction /></>}
      />
      {greeting && (
        <p className="flex flex-col gap-1">
          <strong className="text-2xl font-bold leading-tight">{greeting}, {firstName} <span aria-hidden="true">👋</span></strong>
          <span className="text-ut-muted">{dateLabel}</span>
        </p>
      )}
    </div>
  );
}
