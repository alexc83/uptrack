import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_BASE_URL } from '../core/api/api.config';
import { buildApiUrl } from '../core/api/api.helpers';
import { ChangePasswordRequest, UpdateProfileRequest, UserProfileResponse } from '../models/user-profile.models';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly usersUrl = buildApiUrl(this.apiBaseUrl, '/users');

  getCurrentProfile() {
    return this.http.get<UserProfileResponse>(buildApiUrl(this.usersUrl, '/me'));
  }

  updateCurrentProfile(payload: UpdateProfileRequest) {
    return this.http.put<UserProfileResponse>(buildApiUrl(this.usersUrl, '/me'), payload);
  }

  changePassword(payload: ChangePasswordRequest) {
    return this.http.put<void>(buildApiUrl(this.usersUrl, '/me/password'), payload);
  }
}
