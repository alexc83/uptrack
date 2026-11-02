import { File, FileText, Plus, type LucideIcon } from 'lucide-react';
import type { ActivityIconKey, ActivityRowView } from './dashboard-view';
import { cardClass } from './tone';

const icons: Record<ActivityIconKey, LucideIcon> = { file: FileText, plus: Plus, generic: File };

export function RecentActivityPanel({ rows }: { rows: ActivityRowView[] }) {
  return (
    <section aria-labelledby="activity-heading" className={cardClass}>
      <header className="flex min-h-[4.9rem] items-center gap-3 border-b border-ut-border px-6 py-4 [@media(width<=768px)]:min-h-0 [@media(width<=768px)]:px-4">
        <FileText aria-hidden="true" className="size-5 text-ut-primary" /><h2 id="activity-heading" className="text-lg font-bold">Recent Activity</h2>
      </header>
      {rows.length > 0 ? (
        <ul>
          {rows.map(row => {
            const Icon = icons[row.icon];
            return (
              <li key={row.id} className="flex items-center justify-between gap-4 border-t border-ut-border px-6 py-4 first:border-t-0 [@media(width<=768px)]:flex-col [@media(width<=768px)]:items-start [@media(width<=768px)]:px-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span aria-hidden="true" className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-ut-hover text-ut-muted"><Icon className="size-5" /></span>
                  <div className="min-w-0"><h3 className="font-semibold">{row.title}</h3><p className="mt-1 text-sm break-words text-ut-muted">{row.subtitle}</p></div>
                </div>
                <span className="text-sm font-medium whitespace-nowrap text-ut-muted">{row.relativeTime}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="p-6"><strong className="mb-1 block text-base">No recent activity</strong><p className="text-sm text-ut-muted">New CE completions and certificate uploads will appear here.</p></div>
      )}
    </section>
  );
}
