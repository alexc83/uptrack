import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '../../shared/layout/page-container';
import { StateBlock } from '../../shared/ui/state-block';
import { CeNeededPanel } from './ce-needed-panel';
import { CredentialListDrawer, type ListDrawerContent } from './credential-list-drawer';
import { DashboardHeader } from './dashboard-header';
import { DashboardSkeleton } from './dashboard-skeleton';
import { ExpirationsPanel } from './expirations-panel';
import { RecentActivityPanel } from './recent-activity-panel';
import { StatCards } from './stat-cards';
import { useDashboard } from './use-dashboard';

type DrawerKind = 'expiring' | 'needs-ce';

export function DashboardPage() {
  const state = useDashboard();
  const [drawer, setDrawer] = useState<DrawerKind | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const expirationsMore = useRef<HTMLButtonElement>(null);
  const ceMore = useRef<HTMLButtonElement>(null);
  useEffect(() => { document.title = 'Dashboard — UpTrack'; }, []);

  const view = state.status === 'ready' ? state.view : null;
  const openDrawer = (kind: DrawerKind) => { openerRef.current = kind === 'expiring' ? expirationsMore.current : ceMore.current; setDrawer(kind); };
  const content: ListDrawerContent | null = !view || !drawer ? null
    : drawer === 'expiring' ? { kind: 'expiring', view: view.expirationsDrawer } : { kind: 'needs-ce', view: view.ceNeededDrawer };

  return (
    <PageContainer>
      <DashboardHeader greeting={view?.greeting ?? null} firstName={view?.firstName ?? ''} dateLabel={view?.dateLabel ?? null} />
      {state.status === 'loading' && <DashboardSkeleton />}
      {state.status === 'error' && (
        <StateBlock kind="error" title="Dashboard unavailable" message="We could not load the dashboard right now. Please try again." action={{ label: state.retrying ? 'Retrying…' : 'Retry', onClick: state.retry }} />
      )}
      {view && state.status === 'ready' && (
        <div className="ut-fade-in flex flex-col gap-6">
          {state.refreshFailed && (
            <StateBlock kind="error" title="Dashboard may be out of date" message="We could not refresh the dashboard. Showing the last data loaded." action={{ label: state.retrying ? 'Retrying…' : 'Retry', onClick: state.retry }} />
          )}
          {view.isEmpty && (
            <section role="status" className="rounded-2xl border border-ut-border bg-ut-surface px-5 py-4">
              <strong className="block">No credentials yet</strong>
              <p className="text-ut-muted">Add your first credential to start tracking expirations, CE progress, and renewal activity here.</p>
            </section>
          )}
          <StatCards stats={view.stats} />
          <div className="grid grid-cols-2 gap-4 [@media(width<=1200px)]:grid-cols-1">
            <ExpirationsPanel rows={view.expirations} overflow={view.expirationsOverflow} onSeeMore={() => openDrawer('expiring')} seeMoreRef={expirationsMore} />
            <CeNeededPanel rows={view.ceNeeded} total={view.ceNeededTotal} overflow={view.ceNeededOverflow} onSeeMore={() => openDrawer('needs-ce')} seeMoreRef={ceMore} />
          </div>
          <RecentActivityPanel rows={view.activity} />
        </div>
      )}
      <CredentialListDrawer content={content} onClose={() => setDrawer(null)} returnFocusRef={openerRef} />
    </PageContainer>
  );
}
