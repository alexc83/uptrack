import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { AuthLoginRequest, AuthRegisterRequest, AuthResponse } from './auth.models';
import { User } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  login(payload: AuthLoginRequest) {
    return this.http.post<AuthResponse>('/api/auth/login', payload);
  }

  register(payload: AuthRegisterRequest) {
    return this.http.post<AuthResponse>('/api/auth/register', payload);
  }

  me() {
    return this.http.get<User>('/api/auth/me');
  }
}
