import type { AuthLoginRequest, AuthRegisterRequest, AuthResponse, UserResponse } from '../../lib/dto/auth';
import { apiFetch, type RequestOptions } from './api-fetch';

/** Hard limits so a deploying or unreachable backend can never leave login/registration/session checks pending forever. */
export const AUTH_REQUEST_TIMEOUT_MS = 25_000;
export const SESSION_CHECK_TIMEOUT_MS = 20_000;

export const authApi = {
  login: (json: AuthLoginRequest, options?: RequestOptions) => apiFetch<AuthResponse>('/auth/login', { timeoutMs: AUTH_REQUEST_TIMEOUT_MS, ...options, method: 'POST', json }),
  register: (json: AuthRegisterRequest, options?: RequestOptions) => apiFetch<AuthResponse>('/auth/register', { timeoutMs: AUTH_REQUEST_TIMEOUT_MS, ...options, method: 'POST', json }),
  me: (options?: RequestOptions) => apiFetch<UserResponse>('/auth/me', { timeoutMs: SESSION_CHECK_TIMEOUT_MS, ...options }),
};
