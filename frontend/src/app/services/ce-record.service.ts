import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_BASE_URL } from '../core/api/api.config';
import { buildApiUrl } from '../core/api/api.helpers';
import { CeRecordRequest, CeRecordResponse } from '../models/ce-record.models';

type CreateCeRecordPayload = Omit<CeRecordRequest, 'credentialId'>;

@Injectable({ providedIn: 'root' })
export class CeRecordService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly ceRecordsUrl = buildApiUrl(this.apiBaseUrl, '/ce-records');

  createCeRecord(credentialId: string, payload: CreateCeRecordPayload) {
    return this.http.post<CeRecordResponse>(this.ceRecordsUrl, {
      ...payload,
      credentialId,
    });
  }

  updateCeRecord(id: string, payload: CeRecordRequest) {
    return this.http.put<CeRecordResponse>(buildApiUrl(this.ceRecordsUrl, `/${id}`), payload);
  }

  deleteCeRecord(id: string) {
    return this.http.delete<void>(buildApiUrl(this.ceRecordsUrl, `/${id}`));
  }
}
