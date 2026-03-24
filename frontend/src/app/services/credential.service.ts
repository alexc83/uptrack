import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_BASE_URL } from '../core/api/api.config';
import { buildApiUrl, buildHttpParams } from '../core/api/api.helpers';
import {
  Credential,
  CredentialDetail,
  CredentialFilters,
  CredentialRequest,
} from '../models/credential.models';
import { CeReportResponse } from '../models/ce-report.models';
import { CeRecordDetail } from '../models/ce-record.models';

@Injectable({ providedIn: 'root' })
export class CredentialService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly credentialsUrl = buildApiUrl(this.apiBaseUrl, '/credentials');

  getCredentials(filters?: CredentialFilters) {
    return this.http.get<Credential[]>(this.credentialsUrl, {
      params: buildHttpParams(filters),
    });
  }

  getCredentialById(id: string) {
    return this.http.get<CredentialDetail>(buildApiUrl(this.credentialsUrl, `/${id}`));
  }

  createCredential(payload: CredentialRequest) {
    return this.http.post<CredentialDetail>(this.credentialsUrl, payload);
  }

  updateCredential(id: string, payload: CredentialRequest) {
    return this.http.put<CredentialDetail>(buildApiUrl(this.credentialsUrl, `/${id}`), payload);
  }

  deleteCredential(id: string) {
    return this.http.delete<void>(buildApiUrl(this.credentialsUrl, `/${id}`));
  }

  getCredentialCeRecords(credentialId: string, params?: Record<string, string | number | boolean | null | undefined>) {
    return this.http.get<CeRecordDetail[]>(buildApiUrl(this.credentialsUrl, `/${credentialId}/ce-records`), {
      params: buildHttpParams(params),
    });
  }

  getCredentialCeReport(credentialId: string) {
    return this.http.get<CeReportResponse>(
      buildApiUrl(this.credentialsUrl, `/${credentialId}/ce-report`),
    );
  }
}
