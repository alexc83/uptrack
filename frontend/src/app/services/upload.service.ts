import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_BASE_URL } from '../core/api/api.config';
import { buildApiUrl } from '../core/api/api.helpers';
import { CertificateUploadResponse } from '../models/upload.models';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly certificateUploadUrl = buildApiUrl(this.apiBaseUrl, '/uploads/certificates');

  uploadCertificate(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<CertificateUploadResponse>(this.certificateUploadUrl, formData);
  }
}
