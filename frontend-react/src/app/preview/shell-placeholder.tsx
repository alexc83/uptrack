import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageContainer } from '../../shared/layout/page-container';
import { PageHeader } from '../../shared/layout/page-header';

const SharedUiPreview = import.meta.env.DEV ? lazy(() => import('./shared-ui-preview').then(module => ({ default: module.SharedUiPreview }))) : null;
const pages: Record<string, { title: string; milestone: string }> = {
  '/ce-records': { title: 'CE Records', milestone: 'M10' },
  '/settings': { title: 'Settings', milestone: 'M12' },
};
export function ShellPlaceholder() {
  const { pathname } = useLocation();
  const page = pages[pathname] ?? { title: 'Migration preview', milestone: 'a later milestone' };
  useEffect(() => { document.title = `${page.title} — UpTrack`; }, [page.title]);
  return <PageContainer><PageHeader eyebrow="Migration preview" title={page.title} description="Migration preview — feature not implemented." /><p className="rounded-xl border border-ut-border bg-ut-surface p-4 text-sm text-ut-muted">This page is reserved for {page.milestone}. Authentication will be added in M06. No account or business data is loaded.</p>{pathname === '/settings' && SharedUiPreview && <Suspense fallback={<p role="status">Loading presentation preview</p>}><SharedUiPreview /></Suspense>}</PageContainer>;
}
