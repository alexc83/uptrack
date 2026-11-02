import { useEffect } from 'react';
import { PageContainer } from '../../shared/layout/page-container';
import { PageHeader } from '../../shared/layout/page-header';
export function ReportPlaceholder() {
  useEffect(() => { document.title = 'CE Report preview — UpTrack'; }, []);
  return <main><PageContainer><PageHeader eyebrow="Migration preview" title="CE Report" description="Migration preview — feature not implemented." /><p className="text-ut-muted">Standalone report layout reserved for M11. No report data, printing, or return navigation is implemented.</p></PageContainer></main>;
}
