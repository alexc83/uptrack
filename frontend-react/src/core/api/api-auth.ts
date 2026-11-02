import type { ApiError } from './api-error';
export interface ApiAuthAdapter {
  getToken: () => string | null;
  onUnauthorized?: (error: ApiError) => void;
}
export interface ApiAuthRegistration { readonly adapter: ApiAuthAdapter }
let current: ApiAuthRegistration | undefined;
export function getApiAuthRegistration(): ApiAuthRegistration | undefined { return current; }
export function registerApiAuth(adapter: ApiAuthAdapter): () => void {
  const registration = { adapter };
  current = registration;
  return () => { if (current === registration) current = undefined; };
}
