import { inject, Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { User } from '../../models/user.model';
import { ApiErrorResponse, AuthLoginRequest, AuthRegisterRequest } from './auth.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private static readonly TOKEN_STORAGE_KEY = 'uptrack_token';

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(localStorage.getItem(AuthStore.TOKEN_STORAGE_KEY));
  readonly currentUser = signal<User | null>(null);
  readonly isLoading = signal(false);
  readonly authError = signal<string | null>(null);
  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());

  async bootstrap(): Promise<void> {
    const token = this.token();
    if (!token) {
      return;
    }

    this.isLoading.set(true);

    try {
      const user = await firstValueFrom(this.authService.me());
      this.currentUser.set(user);
    } catch {
      this.clearSession();
    } finally {
      this.isLoading.set(false);
    }
  }

  async login(payload: AuthLoginRequest): Promise<boolean> {
    return this.establishSession(() => this.authService.login(payload));
  }

  async register(payload: AuthRegisterRequest): Promise<boolean> {
    return this.establishSession(() => this.authService.register(payload));
  }

  clearAuthError(): void {
    this.authError.set(null);
  }

  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/');
  }

  handleUnauthorized(): void {
    if (!this.token()) {
      return;
    }

    this.clearSession();
    void this.router.navigateByUrl('/');
  }

  private async establishSession(request: () => ReturnType<AuthService['login']>): Promise<boolean> {
    this.isLoading.set(true);
    this.authError.set(null);

    try {
      const response = await firstValueFrom(request());
      this.token.set(response.token);
      this.currentUser.set(response.user);
      localStorage.setItem(AuthStore.TOKEN_STORAGE_KEY, response.token);
      return true;
    } catch (error) {
      this.authError.set(this.getFriendlyErrorMessage(error));
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  private clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    this.authError.set(null);
    localStorage.removeItem(AuthStore.TOKEN_STORAGE_KEY);
  }

  private getFriendlyErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Something went wrong. Please try again.';
    }

    if (error.status === 0) {
      return 'Unable to reach the server right now. Please try again.';
    }

    const message = (error.error as ApiErrorResponse | undefined)?.message;
    return message ?? 'Something went wrong. Please try again.';
  }
}
