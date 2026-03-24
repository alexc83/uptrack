import { HttpErrorResponse, HttpParams } from '@angular/common/http';

import { ApiErrorResponse } from './api-error.model';

type QueryParamValue = string | number | boolean | null | undefined;

export function buildApiUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = trimTrailingSlash(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!normalizedBaseUrl) {
    return normalizedPath;
  }

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function buildHttpParams<T extends object>(params?: T): HttpParams {
  if (!params) {
    return new HttpParams();
  }

  return (Object.entries(params) as Array<[string, QueryParamValue]>).reduce((httpParams, [key, value]) => {
    if (value === null || value === undefined || value === '') {
      return httpParams;
    }

    return httpParams.set(key, String(value));
  }, new HttpParams());
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return 'Unable to reach the server right now. Please try again.';
  }

  const apiError = error.error as ApiErrorResponse | undefined;
  return apiError?.message ?? fallback;
}

export function isApiRequest(url: string, baseUrl: string): boolean {
  const requestPath = getUrlPath(url);
  const apiPath = trimTrailingSlash(getUrlPath(baseUrl));

  return apiPath ? requestPath.startsWith(apiPath) : requestPath.startsWith('/api');
}

export function isPublicApiRequest(url: string): boolean {
  const path = getUrlPath(url);
  return PUBLIC_API_PATHS.has(path);
}

function getUrlPath(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return new URL(url).pathname;
  }

  if (url.startsWith('/')) {
    return url.split('?')[0] ?? url;
  }

  return new URL(url, 'http://localhost').pathname;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

const PUBLIC_API_PATHS = new Set(['/api/auth/login', '/api/auth/register', '/api/health']);
