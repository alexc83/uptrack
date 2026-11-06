import { useEffect, useState } from 'react';
import type { HelpHeading } from './help-content';

export function HelpToc({ headings, articleKey }: { headings: HelpHeading[]; articleKey: string }) {
  const [tracked, setTracked] = useState<{ key: string; id: string }>({ key: articleKey, id: headings[0]?.id ?? '' });
  const activeId = tracked.key === articleKey ? tracked.id : headings[0]?.id ?? '';

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id); }
      const current = headings.find((h) => visible.has(h.id));
      if (current) setTracked({ key: articleKey, id: current.id });
    }, { rootMargin: '-80px 0px -65% 0px' });
    for (const h of headings) { const el = document.getElementById(h.id); if (el) observer.observe(el); }
    return () => observer.disconnect();
  }, [headings, articleKey]);

  if (!headings.length) return null;
  return <nav aria-label="On this page" className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
    <h2 className="m-0 mb-3 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[var(--ut-landing-muted)]">On this page</h2>
    <ul className="m-0 list-none space-y-1 border-l border-[var(--ut-landing-card-border)] p-0">
      {headings.map((h) => {
        const active = h.id === activeId;
        return <li key={h.id}><a href={`#${h.id}`} aria-current={active ? 'location' : undefined} onClick={() => setTracked({ key: articleKey, id: h.id })} className={`-ml-px block border-l-2 py-1 pl-3 text-[0.85rem] leading-snug no-underline ${active ? 'border-[var(--ut-landing-primary)] font-semibold text-[var(--ut-landing-heading)]' : 'border-transparent text-[var(--ut-landing-muted)] hover:text-[var(--ut-landing-heading)]'}`}>{h.text}</a></li>;
      })}
    </ul>
  </nav>;
}
