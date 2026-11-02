import type { UserResponse } from './auth';
export type UserProfileResponse = UserResponse;
export interface UpdateProfileRequest { name: string; email: string }
export interface ChangePasswordRequest { currentPassword: string; newPassword: string }
