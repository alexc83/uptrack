import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { API_BASE_URL } from '../api/api.config';
import { isApiRequest, isPublicApiRequest } from '../api/api.helpers';
import { AuthStore } from './auth.store';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authStore = inject(AuthStore);
  const apiBaseUrl = inject(API_BASE_URL);
  const token = authStore.token();
  const isPublicEndpoint = isPublicApiRequest(request.url);
  const shouldAttachToken = token && isApiRequest(request.url, apiBaseUrl) && !isPublicEndpoint;

  const authenticatedRequest =
    shouldAttachToken
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
