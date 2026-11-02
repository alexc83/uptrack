import { ArrowRight, Bookmark, Clock, CircleX, Shield, TriangleAlert } from 'lucide-react';
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import type { ExpirationRowView } from './dashboard-view';
import { cardClass, rowFocus, toneSurface } from './tone';

export function ExpirationPill({ row }: { row: Pick<ExpirationRowView, 'badgeLabel' | 'badgeTone'> }) {
  const Icon = row.badgeTone === 'expired' ? CircleX : Clock;
  return <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold ${toneSurface[row.badgeTone]}`}><Icon aria-hidden="true" className="size-3.5" />{row.badgeLabel}</span>;
}

export const SeeMoreButton = forwardRef<HTMLButtonElement, { label: string; ariaLabel: string; onClick: () => void }>(function SeeMoreButton({ label, ariaLabel, onClick }, ref) {
  return (
    <button ref={ref} type="button" aria-label={ariaLabel} onClick={onClick} className={`m-4 flex min-h-11 w-[calc(100%-2rem)] cursor-pointer items-center justify-between rounded-2xl border border-dashed border-ut-border bg-ut-main px-4 py-3 text-sm font-semibold text-ut-primary ${rowFocus}`}>
      <span>{label}</span><ArrowRight aria-hidden="true" className="size-4" />
    </button>
  );
});

export function ExpirationsPanel({ rows, overflow, onSeeMore, seeMoreRef }: { rows: ExpirationRowView[]; overflow: number; onSeeMore: () => void; seeMoreRef?: React.Ref<HTMLButtonElement> }) {
  return (
    <section aria-labelledby="expirations-heading" className={cardClass}>
      <header className="flex min-h-[4.9rem] items-center justify-between gap-4 border-b border-ut-border px-6 py-4 [@media(width<=768px)]:min-h-0 [@media(width<=768px)]:px-4">
        <div className="flex items-center gap-3"><TriangleAlert aria-hidden="true" className="size-5 text-[var(--ut-status-expiring-text)]" /><h2 id="expirations-heading" className="text-lg font-bold">Upcoming Expirations</h2></div>
        <span className="text-sm whitespace-nowrap text-ut-muted">Next 90 days</span>
      </header>
      {rows.length > 0 ? (
        <>
          <ul>
            {rows.map(row => (
              <li key={row.id} className="border-t border-ut-border first:border-t-0">
                <Link to={row.href} className={`flex min-h-11 items-start justify-between gap-4 px-6 py-4 hover:bg-ut-hover [@media(width<=768px)]:flex-col [@media(width<=768px)]:px-4 ${rowFocus} ${row.highlighted ? 'border-l-[3px] border-l-[var(--ut-status-expiring-text)] pl-[calc(1.5rem-3px)] [@media(width<=768px)]:pl-[calc(1rem-3px)]' : ''}`}>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold">{row.name}</span>
                      <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-ut-hover px-3.5 py-1 text-xs font-semibold text-ut-muted"><Shield aria-hidden="true" className="size-3.5" />{row.typeLabel}</span>
                    </span>
                    <span className="mt-2 block text-sm text-ut-muted">{row.organization}</span>
                    {row.ceStillNeeded && <span className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-ut-primary-subtle px-3 py-1 text-xs font-bold text-ut-primary"><Bookmark aria-hidden="true" className="size-3.5" />{row.ceStillNeeded} CE hrs still needed</span>}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-2 [@media(width<=768px)]:items-start">
                    <ExpirationPill row={row} />
                    <span className="text-sm text-ut-muted"><span className="sr-only">Expires </span>{row.dateLabel}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {overflow > 0 && <SeeMoreButton ref={seeMoreRef} label={`See ${overflow} more expirations`} ariaLabel="See more upcoming expirations" onClick={onSeeMore} />}
        </>
      ) : (
        <div className="flex min-h-56 flex-col justify-center gap-1 px-6 py-5 text-center text-ut-muted"><strong className="text-base text-ut-text">No upcoming expirations</strong><p className="text-sm">Nothing is due in the next 90 days.</p></div>
      )}
    </section>
  );
}
