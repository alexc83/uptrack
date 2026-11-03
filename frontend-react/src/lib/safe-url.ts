/**
 * Returns the URL unchanged only when it parses as an absolute http(s) URL, otherwise null.
 * Certificate URLs come from the API and are rendered as links; Angular's built-in URL sanitizer neutralised
 * non-http(s) schemes (e.g. `data:`), so the React app must do the same explicitly (M13).
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:' ? value : null;
  } catch {
    return null;
  }
}
