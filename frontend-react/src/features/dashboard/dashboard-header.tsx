import { PageHeader } from '../../shared/layout/page-header';

export function DashboardHeader({ greeting, firstName, dateLabel }: { greeting: string | null; firstName: string; dateLabel: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Dashboard"
        title="Live compliance overview"
        description="Monitor credential urgency, CE progress, and recent activity from one live dashboard."
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
