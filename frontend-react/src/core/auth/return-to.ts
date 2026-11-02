import { matchRoutes } from 'react-router-dom';

// Internal destinations that a login may restore. Mirrors the protected route table in app/router.tsx.
const PROTECTED_PATTERNS = [
  { path: '/dashboard' },
  { path: '/credentials' },
  { path: '/ce-records' },
  { path: '/settings' },
  { path: '/credentials/:credentialId/ce-report' },
];
export const DEFAULT_AUTHENTICATED_PATH = '/dashboard';
const MAX_LENGTH = 2048;
const ORIGIN = 'http://return-to.invalid';
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\u0000- \u007f\\]/;

/**
 * Returns a same-origin, known protected path (+ search + hash) or null.
 * Rejects absolute/protocol-relative URLs, backslashes, control characters, encoded tricks and unknown routes.
 */
export function parseReturnTo(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_LENGTH) return null;
  if (FORBIDDEN.test(value) || !value.startsWith('/') || value.startsWith('//')) return null;
  let url: URL;
  try {
    url = new URL(value, ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== ORIGIN) return null;
  // Only the path is re-checked after decoding; query values may legitimately contain encoded spaces etc.
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (FORBIDDEN.test(decodedPath) || decodedPath.startsWith('//')) return null;
  if (!matchRoutes(PROTECTED_PATTERNS, url.pathname)) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function resolveReturnTo(value: string | null | undefined): string {
  return parseReturnTo(value) ?? DEFAULT_AUTHENTICATED_PATH;
}

/** Builds the guest redirect target. Only `/` carries the optional `auth` and `returnTo` parameters. */
export function buildAuthRedirect(location: { pathname: string; search: string; hash: string }, mode: 'login' | 'register' = 'login'): string {
  const params = new URLSearchParams({ auth: mode });
  const target = parseReturnTo(`${location.pathname}${location.search}${location.hash}`);
  if (target) params.set('returnTo', target);
  return `/?${params.toString()}`;
}
