import { ApiId, IsoDateTime } from './common.models';

export interface User {
  id: ApiId;
  name: string;
  email: string;
  createdAt: IsoDateTime;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
