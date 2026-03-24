import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthStore } from './auth.store';

const PUBLIC_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/health'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authStore = inject(AuthStore);
  const token = authStore.token();
  const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) => request.url.startsWith(endpoint));

  const authenticatedRequest =
    token && !isPublicEndpoint
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        authStore.handleUnauthorized();
      }

      return throwError(() => error);
    }),
  );
};
