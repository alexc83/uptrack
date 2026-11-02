import type { ApiId, IsoDateTime } from './common';
export interface UserResponse {
  id: ApiId;
  name: string;
  email: string;
  createdAt: IsoDateTime;
}
export interface AuthLoginRequest { email: string; password: string }
export interface AuthRegisterRequest extends AuthLoginRequest { name: string }
export interface AuthResponse { token: string; user: UserResponse }
