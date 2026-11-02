import type { ChangePasswordRequest, UpdateProfileRequest, UserProfileResponse } from '../../lib/dto/users';
import { apiFetch, type RequestOptions } from './api-fetch';
export const usersApi = {
  getProfile: (options?: RequestOptions) => apiFetch<UserProfileResponse>('/users/me', options),
  updateProfile: (json: UpdateProfileRequest, options?: RequestOptions) => apiFetch<UserProfileResponse>('/users/me', { ...options, method: 'PUT', json }),
  changePassword: (json: ChangePasswordRequest, options?: RequestOptions) => apiFetch('/users/me/password', { ...options, method: 'PUT', json, response: 'empty' }),
};
