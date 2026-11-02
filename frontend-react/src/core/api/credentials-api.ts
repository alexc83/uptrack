import type { CredentialFilters, CredentialRequest, CredentialResponse } from '../../lib/dto/credentials';
import type { CERecordResponse } from '../../lib/dto/ce-records';
import type { CEReportResponse } from '../../lib/dto/ce-report';
import { apiFetch, type RequestOptions } from './api-fetch';
const resource = (id: string) => `/credentials/${encodeURIComponent(id)}`;
export const credentialsApi = {
  list: (filters: CredentialFilters = {}, options?: RequestOptions) => {
    const { status, type, search } = filters;
    return apiFetch<CredentialResponse[]>('/credentials', { ...options, query: { status, type, search } });
  },
  get: (id: string, options?: RequestOptions) => apiFetch<CredentialResponse>(resource(id), options),
  create: (json: CredentialRequest, options?: RequestOptions) => apiFetch<CredentialResponse>('/credentials', { ...options, method: 'POST', json }),
  update: (id: string, json: CredentialRequest, options?: RequestOptions) => apiFetch<CredentialResponse>(resource(id), { ...options, method: 'PUT', json }),
  delete: (id: string, options?: RequestOptions) => apiFetch(resource(id), { ...options, method: 'DELETE', response: 'empty' }),
  getCERecords: (id: string, options?: RequestOptions) => apiFetch<CERecordResponse[]>(`${resource(id)}/ce-records`, options),
  getCEReport: (id: string, options?: RequestOptions) => apiFetch<CEReportResponse>(`${resource(id)}/ce-report`, options),
};
