import type { DashboardResponse } from '../../lib/dto/dashboard';
import { apiFetch, type RequestOptions } from './api-fetch';
export const dashboardApi = { get: (options?: RequestOptions) => apiFetch<DashboardResponse>('/dashboard', options) };
