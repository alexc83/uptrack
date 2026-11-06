import { describe, expect, it } from 'vitest';
import { helpArticles } from './help-content';
import { searchHelp } from './help-search';

describe('searchHelp', () => {
  it('returns nothing for an empty query', () => expect(searchHelp('  ')).toEqual([]));
  it('ranks title matches first', () => {
    const results = searchHelp('delete a credential');
    expect(results[0]?.article.slug).toBe('delete-a-credential');
  });
  it('matches body text, requires every term and returns snippets', () => {
    const results = searchHelp('caps lock');
    expect(results.map((r) => r.article.slug)).toContain('cannot-log-in');
    expect(results[0]?.snippet.length).toBeGreaterThan(0);
    expect(searchHelp('caps lock zzzzqqq')).toEqual([]);
  });
  it('can find every article by its exact title', () => {
    for (const article of helpArticles) expect(searchHelp(article.title).map((r) => r.article.id)).toContain(article.id);
  });
});
