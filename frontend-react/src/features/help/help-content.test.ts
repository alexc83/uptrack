import { describe, expect, it } from 'vitest';
import manifest from '../../../../context/p02-help-center/article-manifest.json';
import { findHelpArticle, helpArticlePath, helpArticles, helpCategories, relatedArticles } from './help-content';

const rawSources = import.meta.glob('../../../../context/p02-help-center/articles/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('Help Center content', () => {
  it('renders all 20 manifest articles in the manifest category and article order', () => {
    expect(helpArticles).toHaveLength(20);
    expect(helpCategories.map((c) => c.title)).toEqual(['Getting Started', 'Credentials', 'Continuing Education', 'Certificates', 'Dashboard', 'Account Settings', 'Troubleshooting']);
    expect(helpArticles.map((a) => a.id)).toEqual(manifest.categories.flatMap((c) => c.article_ids));
    expect(new Set(helpArticles.map(helpArticlePath)).size).toBe(20);
  });

  it('uses a manifest title that matches each Markdown H1 and non-empty bodies', () => {
    for (const article of helpArticles) {
      const raw = Object.entries(rawSources).find(([key]) => key.endsWith(`/${article.path}`))?.[1] ?? '';
      expect(raw.split('\n')[0]).toBe(`# ${article.title}`);
      expect(article.blocks.length).toBeGreaterThan(1);
      expect(article.headings.length).toBeGreaterThan(0);
    }
  });

  it('resolves every related-article reference from the manifest and keeps the authored list out of the body', () => {
    for (const article of helpArticles) {
      expect(relatedArticles(article).map((r) => r.id)).toEqual(article.relatedIds);
      expect(article.relatedIds.length).toBeGreaterThan(0);
      expect(article.blocks.some((b) => b.type === 'heading' && b.text === 'Related articles')).toBe(false);
    }
  });

  it('does not expose editorial provenance in article text', () => {
    const text = helpArticles.map((a) => a.searchText).join(' ').toLowerCase();
    for (const term of ['owner_accepted', 'reconstruct', 'editorial', 'provenance', 'runtime qa']) expect(text).not.toContain(term);
  });

  it('finds articles by category and slug', () => {
    expect(findHelpArticle('credentials', 'add-a-credential')?.title).toBe('Add a Credential');
    expect(findHelpArticle('credentials', 'nope')).toBeUndefined();
  });
});
