import { Spinner } from 'flowbite-react';
import { Skeleton } from '../../shared/ui/skeleton';

/** Shape-matched placeholders; no numbers are shown until the API answers. */
export function DashboardSkeleton() {
  return (
    <section aria-busy="true" aria-label="Dashboard" className="flex flex-col gap-4">
      <p role="status" className="flex items-center gap-3 text-sm text-ut-muted"><Spinner size="sm" aria-hidden="true" />Loading dashboard…</p>
      <div aria-hidden="true" className="grid grid-cols-4 gap-4 [@media(width<=1200px)]:grid-cols-2 [@media(width<=768px)]:grid-cols-1">{[1, 2, 3, 4].map(n => <Skeleton key={n} className="h-33 rounded-3xl" />)}</div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 [@media(width<=1200px)]:grid-cols-1"><Skeleton className="h-96 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>
      <div aria-hidden="true"><Skeleton className="h-72 rounded-3xl" /></div>
    </section>
  );
}
