import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { adjacentArticles, findHelpArticle, findHelpCategory, helpArticlePath, helpCategories, relatedArticles, type HelpArticle, type HelpCategory } from './help-content';
import { HelpMarkdown } from './help-markdown';
import { HelpToc } from './help-toc';

const TITLE_SUFFIX = 'UpTrack Help Center';
const linkClass = 'text-[var(--ut-landing-primary)] no-underline hover:underline';
const cardClass = 'block rounded-[1rem] border border-[var(--ut-landing-card-border)] bg-[var(--ut-landing-surface)] p-4 no-underline transition-colors hover:border-[var(--ut-landing-primary)]';

/** Sets the document title and meta description for the current page, restoring the previous description on leave. */
function usePageMeta(title: string, description: string) {
  const { key, hash } = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = title;
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !meta;
    const previous = meta?.content;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = description;
    return () => { if (created) meta.remove(); else if (previous !== undefined) meta.content = previous; };
  }, [title, description]);
  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
    // Move focus to the page heading after in-app navigation (not on first load) so keyboard and screen-reader users land on the new content.
    if (key !== 'default') headingRef.current?.focus({ preventScroll: true });
  }, [key, hash]);
  return headingRef;
}

function Breadcrumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return <nav aria-label="Breadcrumb" className="mb-5 text-[0.85rem] text-[var(--ut-landing-muted)]">
    <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
      {trail.map((item, i) => <li key={item.label} className="flex items-center gap-1">
        {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
        {item.to ? <Link to={item.to} className={linkClass}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
      </li>)}
    </ol>
  </nav>;
}

function Main({ children }: { children: ReactNode }) {
  return <main id="help-main" tabIndex={-1} className="min-w-0 py-8 outline-none lg:py-10">{children}</main>;
}

export function HelpHomePage() {
  const h1 = usePageMeta(`${TITLE_SUFFIX} — UpTrack`, 'Step-by-step guides for tracking credentials, recording continuing education and managing your UpTrack account.');
  return <Main>
    <h1 ref={h1} tabIndex={-1} className="m-0 text-[clamp(2rem,4vw,2.8rem)] font-bold leading-[1.1] tracking-[-0.04em] text-[var(--ut-landing-heading)] outline-none">UpTrack Help Center</h1>
    <p className="mb-8 mt-3 max-w-[38rem] text-[1.1rem] leading-[1.6] text-[var(--ut-landing-muted)]">Guides for tracking credentials, recording continuing education and managing your account. Search or choose a topic to get started.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {helpCategories.map((category) => <section key={category.slug} aria-labelledby={`cat-${category.slug}`} className="rounded-[1rem] border border-[var(--ut-landing-card-border)] bg-[var(--ut-landing-surface)] p-5">
        <h2 id={`cat-${category.slug}`} className="m-0 text-[1.1rem] font-semibold"><Link to={`/help/${category.slug}`} className="text-[var(--ut-landing-heading)] no-underline hover:underline">{category.title}</Link></h2>
        <ul className="mb-0 mt-3 list-none space-y-1.5 p-0">
          {category.articles.map((a) => <li key={a.id}><Link to={helpArticlePath(a)} className={`${linkClass} text-[0.95rem]`}>{a.title}</Link></li>)}
        </ul>
      </section>)}
    </div>
  </Main>;
}

export function HelpCategoryPage() {
  const category = findHelpCategory(useParams().category);
  return category ? <CategoryView category={category} /> : <HelpNotFound />;
}

function CategoryView({ category }: { category: HelpCategory }) {
  const h1 = usePageMeta(`${category.title} — ${TITLE_SUFFIX}`, `UpTrack Help Center articles about ${category.title.toLowerCase()}.`);
  return <Main>
    <Breadcrumbs trail={[{ label: 'Help Center', to: '/help' }, { label: category.title }]} />
    <h1 ref={h1} tabIndex={-1} className="m-0 text-[clamp(1.9rem,4vw,2.5rem)] font-bold tracking-[-0.04em] text-[var(--ut-landing-heading)] outline-none">{category.title}</h1>
    <ul className="mt-6 grid list-none gap-3 p-0">
      {category.articles.map((a) => <li key={a.id}><Link to={helpArticlePath(a)} className={cardClass}>
        <span className="block font-semibold text-[var(--ut-landing-heading)]">{a.title}</span>
        <span className="mt-1 line-clamp-2 block text-[0.92rem] text-[var(--ut-landing-muted)]">{a.description}</span>
      </Link></li>)}
    </ul>
  </Main>;
}

function HelpNotFound() {
  const headingRef = usePageMeta(`Not found — ${TITLE_SUFFIX}`, 'This Help Center page could not be found.');
  return <Main>
    <h1 ref={headingRef} tabIndex={-1} className="m-0 text-[2rem] font-bold text-[var(--ut-landing-heading)] outline-none">Page not found</h1>
    <p className="mt-3 text-[var(--ut-landing-muted)]">We couldn’t find that Help Center page. Try searching, or <Link to="/help" className={`${linkClass} underline`}>browse all topics</Link>.</p>
  </Main>;
}

function ArticleView({ article }: { article: HelpArticle }) {
  const h1 = usePageMeta(`${article.title} — ${TITLE_SUFFIX}`, article.description);
  const related = relatedArticles(article);
  const { previous, next } = adjacentArticles(article);
  return <>
    <Main>
      <Breadcrumbs trail={[{ label: 'Help Center', to: '/help' }, { label: article.categoryTitle, to: `/help/${article.categorySlug}` }, { label: article.title }]} />
      <article className="max-w-[44rem] text-[1.04rem] leading-[1.75] text-[var(--ut-landing-text)]">
        <h1 ref={h1} tabIndex={-1} className="m-0 mb-5 text-[clamp(1.9rem,4vw,2.5rem)] font-bold leading-[1.15] tracking-[-0.04em] text-[var(--ut-landing-heading)] outline-none">{article.title}</h1>
        <HelpMarkdown blocks={article.blocks} />
      </article>
      {related.length > 0 && <section aria-labelledby="related-heading" className="mt-12 max-w-[44rem] border-t border-[var(--ut-landing-card-border)] pt-6">
        <h2 id="related-heading" className="m-0 mb-3 text-[1.2rem] font-semibold text-[var(--ut-landing-heading)]">Related articles</h2>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {related.map((r) => <li key={r.id}><Link to={helpArticlePath(r)} className={cardClass}>
            <span className="block text-[0.72rem] font-bold uppercase tracking-wide text-[var(--ut-landing-muted)]">{r.categoryTitle}</span>
            <span className="block font-semibold text-[var(--ut-landing-heading)]">{r.title}</span>
          </Link></li>)}
        </ul>
      </section>}
      <nav aria-label="Article pagination" className="mt-8 flex max-w-[44rem] flex-wrap justify-between gap-3">
        {previous ? <Link to={helpArticlePath(previous)} rel="prev" className={`${cardClass} flex items-center gap-2`}><ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" /><span><span className="block text-[0.75rem] text-[var(--ut-landing-muted)]">Previous</span><span className="font-semibold text-[var(--ut-landing-heading)]">{previous.title}</span></span></Link> : <span />}
        {next && <Link to={helpArticlePath(next)} rel="next" className={`${cardClass} ml-auto flex items-center gap-2 text-right`}><span><span className="block text-[0.75rem] text-[var(--ut-landing-muted)]">Next</span><span className="font-semibold text-[var(--ut-landing-heading)]">{next.title}</span></span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>}
      </nav>
    </Main>
    <div className="hidden py-10 xl:block"><HelpToc headings={article.headings} articleKey={article.id} /></div>
  </>;
}

export function HelpArticlePage() {
  const { category, slug } = useParams();
  const article = findHelpArticle(category, slug);
  return article ? <ArticleView key={article.id} article={article} /> : <HelpNotFound />;
}
