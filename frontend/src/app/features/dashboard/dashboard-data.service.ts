import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { CeRecord } from '../../models/ce-record.model';
import { Credential } from '../../models/credential.model';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private readonly http = inject(HttpClient);

  getCredentials(userId: string) {
    return this.http.get<Credential[]>('/api/credentials', {
      params: { userId },
    });
  }

  getCeRecords() {
    return this.http.get<CeRecord[]>('/api/ce-records');
  }
}
