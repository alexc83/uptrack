import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';

import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  await authStore.bootstrap();
  return authStore.isAuthenticated() ? true : router.createUrlTree(['/']);
};

export const authChildGuard: CanActivateChildFn = (route, state) => authGuard(route, state);

export const landingRedirectGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  await authStore.bootstrap();
  return authStore.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
