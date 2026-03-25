import { User } from './auth.models';

export interface UpdateProfileRequest {
  name: string;
  email: string;
}

export type UserProfileResponse = User;
