import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { buildApiUrl } from '../api/api.helpers';
import { API_BASE_URL } from '../api/api.config';
import { AuthLoginRequest, AuthRegisterRequest, AuthResponse } from './auth.models';
import { User } from '../../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly authUrl = buildApiUrl(this.apiBaseUrl, '/auth');

  login(payload: AuthLoginRequest) {
    return this.http.post<AuthResponse>(buildApiUrl(this.authUrl, '/login'), payload);
  }

  register(payload: AuthRegisterRequest) {
    return this.http.post<AuthResponse>(buildApiUrl(this.authUrl, '/register'), payload);
  }

  me() {
    return this.http.get<User>(buildApiUrl(this.authUrl, '/me'));
  }
}
