import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageContainer } from '../../shared/layout/page-container';
import { PageHeader } from '../../shared/layout/page-header';

const SharedUiPreview = import.meta.env.DEV ? lazy(() => import('./shared-ui-preview').then(module => ({ default: module.SharedUiPreview }))) : null;
const pages: Record<string, { title: string; milestone: string }> = {
  '/preview': { title: 'Shared UI preview', milestone: 'presentation' },
};
export function ShellPlaceholder() {
  const { pathname } = useLocation();
  const page = pages[pathname] ?? { title: 'Component preview', milestone: 'preview' };
  useEffect(() => { document.title = `${page.title} — UpTrack`; }, [page.title]);
  return <PageContainer><PageHeader eyebrow="Component preview" title={page.title} description="Preview workspace for shared UI components and design patterns." /><p className="rounded-xl border border-ut-border bg-ut-surface p-4 text-sm text-ut-muted">This development workspace demonstrates shared UI components and interaction patterns. No account or business data is loaded.</p>{pathname === '/preview' && SharedUiPreview && <Suspense fallback={<p role="status">Loading presentation preview</p>}><SharedUiPreview /></Suspense>}</PageContainer>;
}
