export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export function buildApiUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const origin = globalThis.location?.origin ?? 'http://localhost';
  if (!baseUrl || baseUrl.startsWith('//') || baseUrl.includes('\\') || /[?#]/.test(baseUrl) || (!baseUrl.startsWith('/') && !/^https?:\/\//.test(baseUrl))) throw new TypeError('Invalid API base URL.');
  const base = new URL(baseUrl, origin);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new TypeError('Invalid API base URL.');
  if (!path || path.startsWith('//') || /[\\?#]/.test(path) || /^[a-z][a-z\d+.-]*:/i.test(path)) throw new TypeError('API requests require a relative resource path.');
  let decoded: string;
  try { decoded = decodeURIComponent(path); } catch { throw new TypeError('Invalid API resource path.'); }
  if (decoded.includes('\\') || decoded.split('/').some(part => part === '.' || part === '..')) throw new TypeError('API paths cannot escape the configured base.');
  const prefix = base.pathname.replace(/\/+$/, '');
  const url = new URL(`${base.origin}${prefix}/${path.replace(/^\/+/, '')}`);
  if (url.origin !== base.origin || !url.pathname.startsWith(`${prefix}/`)) throw new TypeError('API paths cannot escape the configured target.');
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.href;
}
