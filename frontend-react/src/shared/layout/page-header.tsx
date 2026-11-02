import type { ReactNode } from 'react';
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0">{eyebrow && <p className="mb-2 text-xs font-bold tracking-[0.15em] text-ut-primary uppercase">{eyebrow}</p>}<h1 tabIndex={-1} className="text-3xl font-bold tracking-tight [@media(width>768px)]:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-ut-muted">{description}</p>}</div>
    {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
  </header>;
}
