import type { AuthLoginRequest, AuthRegisterRequest, AuthResponse, UserResponse } from '../../lib/dto/auth';
import { apiFetch, type RequestOptions } from './api-fetch';
export const authApi = {
  login: (json: AuthLoginRequest, options?: RequestOptions) => apiFetch<AuthResponse>('/auth/login', { ...options, method: 'POST', json }),
  register: (json: AuthRegisterRequest, options?: RequestOptions) => apiFetch<AuthResponse>('/auth/register', { ...options, method: 'POST', json }),
  me: (options?: RequestOptions) => apiFetch<UserResponse>('/auth/me', options),
};
