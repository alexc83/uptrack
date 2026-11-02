import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SeeMoreButton } from './expirations-panel';
import type { CeNeededRowView } from './dashboard-view';
import { cardClass, rowFocus, toneFill, toneText } from './tone';

export function CeProgressTrack({ percent, tone, label }: { percent: number; tone: CeNeededRowView['tone']; label: string }) {
  return (
    <span role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${percent}%`} className="block h-2.5 w-full overflow-hidden rounded-full bg-ut-hover">
      <span className={`block h-full rounded-full ${toneFill[tone]}`} style={{ width: `${percent}%` }} />
    </span>
  );
}

export function CeNeededPanel({ rows, total, overflow, onSeeMore, seeMoreRef }: { rows: CeNeededRowView[]; total: number; overflow: number; onSeeMore: () => void; seeMoreRef?: React.Ref<HTMLButtonElement> }) {
  return (
    <section aria-labelledby="ce-needed-heading" className={cardClass}>
      <header className="flex min-h-[4.9rem] items-center justify-between gap-4 border-b border-ut-border px-6 py-4 [@media(width<=768px)]:min-h-0 [@media(width<=768px)]:px-4">
        <div className="flex items-center gap-3">
          <BookOpen aria-hidden="true" className="size-5 text-ut-primary" />
          <div><h2 id="ce-needed-heading" className="text-lg font-bold">CEs Still Needed</h2><p className="text-[0.82rem] font-medium text-ut-muted">Handle these first</p></div>
        </div>
        <span className="text-sm whitespace-nowrap text-ut-muted">{total} {total === 1 ? 'item' : 'items'}</span>
      </header>
      {rows.length > 0 ? (
        <>
          <ul>
            {rows.map(row => (
              <li key={row.id} className="border-t border-ut-border first:border-t-0">
                <Link to={row.href} className={`block min-h-11 px-5 py-4 hover:bg-ut-hover [@media(width<=768px)]:px-4 ${rowFocus}`}>
                  <span className="flex items-baseline justify-between gap-3 [@media(width<=768px)]:flex-col [@media(width<=768px)]:items-start">
                    <span className="font-semibold">{row.name}</span>
                    <span className={`text-sm font-bold ${toneText[row.tone]}`}><span className="sr-only">Progress </span>{row.percentLabel}</span>
                  </span>
                  <span className="mt-3 block"><CeProgressTrack percent={row.percent} tone={row.tone} label={`${row.name} CE progress`} /></span>
                  <span className="mt-3 flex justify-between gap-3 text-sm font-semibold text-ut-muted [@media(width<=768px)]:flex-col"><span>{row.dueLabel}</span><span>{row.hoursLabel}</span></span>
                </Link>
              </li>
            ))}
          </ul>
          {overflow > 0 && <SeeMoreButton ref={seeMoreRef} label={`See ${overflow} more pending CE items`} ariaLabel="See more pending CE items" onClick={onSeeMore} />}
        </>
      ) : (
        <div className="flex min-h-56 flex-col justify-center gap-1 px-6 py-5 text-center text-ut-muted"><strong className="text-base text-ut-text">No pending CE items</strong><p className="text-sm">All required CE work is currently up to date.</p></div>
      )}
    </section>
  );
}
