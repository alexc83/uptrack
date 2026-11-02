import { Link } from 'react-router-dom';
import { DrawerShell } from '../../shared/ui/drawer-shell';
import { CeProgressTrack } from './ce-needed-panel';
import { ExpirationPill } from './expirations-panel';
import type { CeNeededRowView, ExpirationRowView, ListDrawerView } from './dashboard-view';
import { rowFocus, toneSurface, toneText } from './tone';

export type ListDrawerContent = { kind: 'expiring'; view: ListDrawerView<ExpirationRowView> } | { kind: 'needs-ce'; view: ListDrawerView<CeNeededRowView> };

const itemClass = `block min-h-11 rounded-2xl border border-ut-border bg-ut-surface p-4 hover:border-ut-primary ${rowFocus}`;
const chip = 'inline-flex min-h-8 items-center rounded-full bg-ut-hover px-3 py-1 text-xs font-bold text-ut-muted';

/** Overflow list for the dashboard panels. Credential detail/edit/delete drawers belong to M09/M10; rows deep-link instead. */
export function CredentialListDrawer({ content, onClose, returnFocusRef }: { content: ListDrawerContent | null; onClose: () => void; returnFocusRef: React.RefObject<HTMLElement | null> }) {
  return (
    <DrawerShell open={content !== null} onClose={onClose} title={content?.view.title ?? ''} returnFocusRef={returnFocusRef}>
      {content && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ut-muted">{content.view.subtitle}</p>
          {content.view.rows.length === 0 ? (
            <div className="py-8 text-center text-ut-muted"><strong className="block text-ut-text">No items to review</strong><p className="text-sm">This list is empty right now.</p></div>
          ) : (
            <ul className="flex flex-col gap-3">
              {content.kind === 'expiring'
                ? content.view.rows.map(row => (
                  <li key={row.id}>
                    <Link to={row.href} className={itemClass}>
                      <span className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block">{row.name}</strong><span className="mt-1 block text-sm text-ut-muted">{row.organization}</span></span><ExpirationPill row={row} /></span>
                      <span className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ut-muted"><span className={chip}>{row.typeLabel}</span><span>Expires {row.dateLabel}</span></span>
                      {row.ceStillNeeded && <span className={`mt-3 inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-bold ${toneSurface.primary}`}>{row.ceStillNeeded} hrs remaining</span>}
                    </Link>
                  </li>
                ))
                : content.view.rows.map(row => (
                  <li key={row.id}>
                    <Link to={row.href} className={itemClass}>
                      <span className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block">{row.name}</strong><span className="mt-1 block text-sm text-ut-muted">{row.organization}</span></span><span className={`text-sm font-bold ${toneText[row.tone]}`}>{row.percentLabel}</span></span>
                      <span className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ut-muted"><span className={chip}>{row.typeLabel}</span><span>{row.hoursLabel.replace('/', ' / ').replace(' hrs', ' hours')}</span></span>
                      <span className="mt-3 block"><CeProgressTrack percent={row.percent} tone={row.tone} label={`${row.name} CE progress`} /></span>
                      <span className="mt-2 flex justify-between text-xs font-semibold text-ut-muted"><span>{row.percent}% complete</span><span>{row.remainingHours} hrs remaining</span></span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </DrawerShell>
  );
}
