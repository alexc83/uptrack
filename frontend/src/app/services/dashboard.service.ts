import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_BASE_URL } from '../core/api/api.config';
import { buildApiUrl } from '../core/api/api.helpers';
import { Dashboard } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly dashboardUrl = buildApiUrl(this.apiBaseUrl, '/dashboard');

  getDashboard() {
    return this.http.get<Dashboard>(this.dashboardUrl);
  }
}
