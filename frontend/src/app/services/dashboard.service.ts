import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { API_BASE_URL } from '../core/api/api.config';
import { buildApiUrl } from '../core/api/api.helpers';
import { CeRecord } from '../models/ce-record.models';
import { Dashboard, DashboardData } from '../models/dashboard.models';
import { Credential } from '../models/credential.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly dashboardUrl = buildApiUrl(this.apiBaseUrl, '/dashboard');

  getDashboard() {
    return this.http.get<Dashboard>(this.dashboardUrl).pipe(map((dashboard) => {
      const credentials = dedupeCredentials([
        ...dashboard.upcomingExpirations,
        ...dashboard.ceAttention,
      ]);

      const dashboardData: DashboardData = {
        dashboard,
        credentials,
        ceRecords: flattenCeRecords(credentials),
      };

      return dashboardData;
    }));
  }
}

function flattenCeRecords(credentials: Credential[]): CeRecord[] {
  return credentials.flatMap((credential) =>
    (credential.ceRecords ?? []).map((record) => ({
      ...record,
      credentialId: credential.id,
    })),
  );
}

function dedupeCredentials(credentials: Credential[]): Credential[] {
  return Array.from(
    credentials.reduce((map, credential) => map.set(credential.id, credential), new Map<string, Credential>()).values(),
  );
}
