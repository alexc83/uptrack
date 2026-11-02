import type { CertificateUploadResponse } from '../../lib/dto/uploads';
import { apiFetch, type RequestOptions } from './api-fetch';
export const uploadsApi = {
  uploadCertificate: (file: File, options?: RequestOptions) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<CertificateUploadResponse>('/uploads/certificates', { ...options, method: 'POST', formData });
  },
};
