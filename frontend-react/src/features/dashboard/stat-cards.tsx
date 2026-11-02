import { CircleCheck, CircleX, Shield, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { StatCardView } from './dashboard-view';
import { cardClass, toneSurface } from './tone';

const icons: Record<StatCardView['key'], LucideIcon> = { total: Shield, active: CircleCheck, expiring: TriangleAlert, expired: CircleX };

export function StatCards({ stats }: { stats: StatCardView[] }) {
  return (
    <section aria-label="Credential summary" className="grid grid-cols-4 gap-4 [@media(width<=1200px)]:grid-cols-2 [@media(width<=768px)]:grid-cols-1">
      {stats.map(stat => {
        const Icon = icons[stat.key];
        return (
          <div key={stat.key} role="group" aria-label={`${stat.label}: ${stat.value}`} className={`${cardClass} flex items-center justify-between gap-4 p-5 [@media(width<=768px)]:p-4`}>
            <div>
              <p className="text-base font-medium text-ut-muted [@media(width<=768px)]:text-[0.94rem]" aria-hidden="true">{stat.label}</p>
              <p className="mt-2 text-4xl leading-none font-bold tracking-tight" aria-hidden="true">{stat.value}</p>
            </div>
            <span aria-hidden="true" className={`inline-flex size-16 items-center justify-center rounded-2xl [@media(width<=768px)]:size-14 ${toneSurface[stat.tone]}`}><Icon className="size-6" /></span>
          </div>
        );
      })}
    </section>
  );
}
