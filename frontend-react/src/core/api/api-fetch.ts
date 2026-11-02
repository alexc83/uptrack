import { apiBaseUrl, isPublicApiPath } from './api-config';
import { getApiAuthRegistration, type ApiAuthRegistration } from './api-auth';
import { ApiError, errorMessage, isAbortError, networkMessage } from './api-error';
import { buildApiUrl, type QueryParams } from './api-url';

type RequestBody = { json?: unknown; formData?: never } | { json?: never; formData?: FormData };
export type ApiRequestOptions = RequestBody & {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: QueryParams;
  headers?: HeadersInit;
  signal?: AbortSignal;
};
export interface ApiFetch {
  <T>(path: string, options?: ApiRequestOptions & { response?: 'json' }): Promise<T>;
  (path: string, options: ApiRequestOptions & { response: 'empty' }): Promise<void>;
}
interface ApiClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  getAuth?: () => ApiAuthRegistration | undefined;
}
export interface RequestOptions { signal?: AbortSignal }

export function createApiClient({ baseUrl = apiBaseUrl, fetch: fetchImpl, getAuth = getApiAuthRegistration }: ApiClientOptions = {}): ApiFetch {
  async function request<T>(path: string, options: ApiRequestOptions & { response?: 'json' | 'empty' } = {}): Promise<T | void> {
    const { signal } = options;
    signal?.throwIfAborted();
    const url = buildApiUrl(baseUrl, path, options.query);
    const method = options.method ?? 'GET';
    const hasJson = options.json !== undefined;
    const hasForm = options.formData !== undefined;
    if ((hasJson && hasForm) || (method === 'GET' && (hasJson || hasForm))) throw new TypeError('Invalid API request body.');
    const headers = new Headers(options.headers);
    headers.delete('Authorization');
    headers.delete('Content-Type');
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    let body: BodyInit | undefined;
    if (hasJson) {
      body = JSON.stringify(options.json);
      if (body === undefined) throw new TypeError('The API JSON body is not serializable.');
      headers.set('Content-Type', 'application/json');
    } else if (hasForm) body = options.formData;
    const publicRequest = isPublicApiPath(path);
    const registration = publicRequest ? undefined : getAuth();
    const token = registration?.adapter.getToken() ?? null;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try {
      response = await (fetchImpl ?? globalThis.fetch)(url, { method, headers, body, signal, redirect: 'error', credentials: 'same-origin' });
      signal?.throwIfAborted();
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) throw error;
      throw new ApiError('network', 0, networkMessage);
    }
    function fail(details?: unknown): never {
      const error = new ApiError(response.ok ? 'response' : 'http', response.status, errorMessage(details), details);
      if (!publicRequest && response.status === 401 && registration) {
        try {
          if (getAuth() === registration && registration.adapter.getToken() === token) registration.adapter.onUnauthorized?.(error);
        } catch { /* Optional notifications must not replace the original HTTP error. */ }
      }
      throw error;
    }
    if (response.ok && options.response === 'empty') return;
    if (response.ok && (response.status === 204 || response.status === 205)) return fail();
    let text: string;
    try {
      text = await response.text();
      signal?.throwIfAborted();
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) throw error;
      return fail();
    }
    let data: unknown;
    try { data = JSON.parse(text); }
    catch { return fail(text || undefined); }
    if (!response.ok) return fail(data);
    // T describes the endpoint contract; JSON parsing is not DTO validation.
    return data as T;
  }
  return request as ApiFetch;
}

// Construction is inert. Fetch and the optional auth registration are read only
// when invoked; M06 will register session callbacks without storage in transport.
export const apiFetch = createApiClient();
