export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '/api';
const publicPaths = new Set(['/auth/login', '/auth/register', '/health', '/health/ready']);
export function isPublicApiPath(path: string): boolean {
  return publicPaths.has(`/${decodeURIComponent(path).replace(/^\/+/, '')}`);
}
