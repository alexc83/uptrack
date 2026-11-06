import { helpArticles, type HelpArticle } from './help-content';

export interface HelpSearchResult { article: HelpArticle; snippet: string; score: number }

const tokenize = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function snippetFor(article: HelpArticle, terms: string[]): string {
  const text = article.searchText;
  const lower = text.toLowerCase();
  const at = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (at === undefined) return article.description;
  const start = Math.max(0, at - 50);
  return `${start > 0 ? '…' : ''}${text.slice(start, start + 140).trim()}${start + 140 < text.length ? '…' : ''}`;
}

/** Client-side full-text search: every query term must match; titles and headings rank above body text. Nothing leaves the browser. */
export function searchHelp(query: string, articles: HelpArticle[] = helpArticles): HelpSearchResult[] {
  const terms = tokenize(query);
  if (!terms.length) return [];
  const results: HelpSearchResult[] = [];
  for (const article of articles) {
    const title = article.title.toLowerCase();
    const headings = article.headings.map((h) => h.text.toLowerCase()).join(' ');
    const body = article.searchText.toLowerCase();
    const category = article.categoryTitle.toLowerCase();
    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      const inTitle = title.includes(term);
      const inHeadings = headings.includes(term);
      const inBody = body.includes(term);
      const inCategory = category.includes(term);
      if (!inTitle && !inHeadings && !inBody && !inCategory) { matchedAll = false; break; }
      score += (inTitle ? 10 : 0) + (inHeadings ? 4 : 0) + (inCategory ? 2 : 0) + (inBody ? 1 : 0);
    }
    if (matchedAll) results.push({ article, snippet: snippetFor(article, terms), score });
  }
  return results.sort((a, b) => b.score - a.score || helpArticles.indexOf(a.article) - helpArticles.indexOf(b.article));
}
