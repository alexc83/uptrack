import manifestJson from '../../../../context/p02-help-center/article-manifest.json';
import { inlineText, parseMarkdown, type Block } from './markdown';

/**
 * The approved P02 manifest is the single source for categories, ordering, slugs and related articles;
 * the approved Markdown files are the article text. Nothing is duplicated here. Provenance and review
 * metadata in the manifest are intentionally never exposed.
 */
const sources = import.meta.glob('../../../../context/p02-help-center/articles/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

interface ManifestArticle { id: string; category: string; slug: string; title: string; path: string; related_article_ids: string[] }
interface ManifestCategory { slug: string; title: string; order: number; article_ids: string[] }
const manifest = manifestJson as unknown as { categories: ManifestCategory[]; articles: ManifestArticle[] };

export interface HelpHeading { id: string; text: string }
export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryTitle: string;
  path: string;
  /** Body blocks without the leading title and without the authored "Related articles" list (rendered from the manifest). */
  blocks: Block[];
  headings: HelpHeading[];
  description: string;
  searchText: string;
  relatedIds: string[];
}
export interface HelpCategory { slug: string; title: string; articles: HelpArticle[] }

function sourceFor(path: string): string {
  const key = Object.keys(sources).find((k) => k.endsWith(`/p02-help-center/${path}`));
  const text = key ? sources[key] : undefined;
  if (text === undefined) throw new Error(`Help Center article source missing for ${path}`);
  return text;
}

function buildArticle(entry: ManifestArticle, categoryTitle: string): HelpArticle {
  const parsed = parseMarkdown(sourceFor(entry.path));
  const first = parsed[0];
  const rest = first && first.type === 'heading' && first.level === 1 ? parsed.slice(1) : parsed;
  const relatedAt = rest.findIndex((b) => b.type === 'heading' && b.level === 2 && b.text.toLowerCase() === 'related articles');
  const blocks = relatedAt === -1 ? rest : rest.slice(0, relatedAt);
  const headings = blocks.flatMap((b) => (b.type === 'heading' && b.level === 2 ? [{ id: b.id, text: b.text }] : []));
  const paragraph = blocks.find((b) => b.type === 'paragraph');
  const bodyText = blocks.map((b) => (b.type === 'list' ? b.items.map(inlineText).join(' ') : b.type === 'paragraph' ? inlineText(b.children) : b.text)).join(' ');
  return {
    id: entry.id, slug: entry.slug, title: entry.title, categorySlug: entry.category, categoryTitle, path: entry.path,
    blocks, headings,
    description: paragraph && paragraph.type === 'paragraph' ? inlineText(paragraph.children) : entry.title,
    searchText: bodyText,
    relatedIds: entry.related_article_ids,
  };
}

const byId = new Map(manifest.articles.map((a) => [a.id, a]));
export const helpCategories: HelpCategory[] = [...manifest.categories]
  .sort((a, b) => a.order - b.order)
  .map((category) => ({
    slug: category.slug,
    title: category.title,
    articles: category.article_ids.map((id) => {
      const entry = byId.get(id);
      if (!entry) throw new Error(`Help Center manifest references unknown article ${id}`);
      return buildArticle(entry, category.title);
    }),
  }));

export const helpArticles: HelpArticle[] = helpCategories.flatMap((c) => c.articles);
const articleById = new Map(helpArticles.map((a) => [a.id, a]));

export const helpArticlePath = (article: Pick<HelpArticle, 'categorySlug' | 'slug'>) => `/help/${article.categorySlug}/${article.slug}`;
export const findHelpCategory = (slug: string | undefined) => helpCategories.find((c) => c.slug === slug);
export const findHelpArticle = (category: string | undefined, slug: string | undefined) => helpArticles.find((a) => a.categorySlug === category && a.slug === slug);
export const relatedArticles = (article: HelpArticle): HelpArticle[] => article.relatedIds.flatMap((id) => { const a = articleById.get(id); return a ? [a] : []; });
export function adjacentArticles(article: HelpArticle): { previous?: HelpArticle; next?: HelpArticle } {
  const i = helpArticles.indexOf(article);
  return { previous: helpArticles[i - 1], next: helpArticles[i + 1] };
}
