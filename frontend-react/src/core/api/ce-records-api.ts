import type { CERecordRequest, CERecordResponse, CertificateDeliveryUrl } from '../../lib/dto/ce-records';
import { apiFetch, type RequestOptions } from './api-fetch';
const resource = (id: string) => `/ce-records/${encodeURIComponent(id)}`;
export const ceRecordsApi = {
  get: (id: string, options?: RequestOptions) => apiFetch<CERecordResponse>(resource(id), options),
  create: (json: CERecordRequest, options?: RequestOptions) => apiFetch<CERecordResponse>('/ce-records', { ...options, method: 'POST', json }),
  update: (id: string, json: CERecordRequest, options?: RequestOptions) => apiFetch<CERecordResponse>(resource(id), { ...options, method: 'PUT', json }),
  delete: (id: string, options?: RequestOptions) => apiFetch(resource(id), { ...options, method: 'DELETE', response: 'empty' }),
  // Phase 3 (#23): ownership-checked short-lived authenticated delivery URL (bearer JWT; not a stored link).
  getCertificateUrl: (id: string, options?: RequestOptions) => apiFetch<CertificateDeliveryUrl>(`${resource(id)}/certificate-url`, options),
};
