import { Link } from 'react-router-dom';
import { helpArticlePath, helpCategories } from './help-content';

export function HelpCategoryNav({ activeArticleId, activeCategory, onNavigate }: { activeArticleId?: string; activeCategory?: string; onNavigate: () => void }) {
  return <nav aria-label="Help Center categories" className="mt-5">
    <ul className="m-0 list-none space-y-5 p-0">
      {helpCategories.map((category) => <li key={category.slug}>
        <Link to={`/help/${category.slug}`} onClick={onNavigate} aria-current={activeCategory === category.slug && !activeArticleId ? 'page' : undefined} className="mb-1 block px-2 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[var(--ut-landing-muted)] no-underline hover:text-[var(--ut-landing-heading)]">{category.title}</Link>
        <ul className="m-0 list-none space-y-0.5 p-0">
          {category.articles.map((article) => {
            const active = article.id === activeArticleId;
            return <li key={article.id}>
              <Link to={helpArticlePath(article)} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`flex min-h-10 items-center rounded-[0.6rem] border-l-2 px-3 py-1.5 text-[0.92rem] leading-snug no-underline ${active ? 'border-[var(--ut-landing-primary)] bg-[var(--ut-landing-surface-soft)] font-semibold text-[var(--ut-landing-heading)]' : 'border-transparent text-[var(--ut-landing-subtle)] hover:bg-[var(--ut-landing-surface-soft)] hover:text-[var(--ut-landing-heading)]'}`}>{article.title}</Link>
            </li>;
          })}
        </ul>
      </li>)}
    </ul>
  </nav>;
}
