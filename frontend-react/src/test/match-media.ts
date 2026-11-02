import { vi } from 'vitest';

export function installMatchMedia(initialWidth = 1280, dark = false) {
  let width = initialWidth;
  const queries = new Map<string, { media: MediaQueryList; listeners: Set<(event: MediaQueryListEvent) => void> }>();
  const matches = (query: string) => query.includes('prefers-color-scheme') ? dark : query.includes('max-width: 768px') ? width <= 768 : false;
  vi.stubGlobal('matchMedia', (query: string) => {
    const existing = queries.get(query);
    if (existing) return existing.media;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const media = { media: query, matches: matches(query), onchange: null, addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener), removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener), addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener), removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener), dispatchEvent: () => true } as MediaQueryList;
    queries.set(query, { media, listeners });
    return media;
  });
  return (nextWidth: number) => {
    width = nextWidth;
    for (const [query, { media, listeners }] of queries) {
      Object.defineProperty(media, 'matches', { value: matches(query), configurable: true });
      listeners.forEach(listener => listener({ matches: media.matches, media: query } as MediaQueryListEvent));
    }
  };
}
