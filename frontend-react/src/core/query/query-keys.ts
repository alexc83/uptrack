import type { CredentialFilters } from '../../lib/dto/credentials';
export function normalizeCredentialFilters(filters: CredentialFilters = {}): CredentialFilters {
  const result: CredentialFilters = {};
  if (filters.status) result.status = filters.status;
  if (filters.type) result.type = filters.type;
  if (filters.search !== undefined && filters.search !== '') result.search = filters.search;
  return result;
}
export const queryKeys = {
  authMe: () => ['auth', 'me'] as const,
  dashboard: () => ['dashboard'] as const,
  credentialsRoot: () => ['credentials'] as const,
  credentials: (filters?: CredentialFilters) => ['credentials', normalizeCredentialFilters(filters)] as const,
  credential: (id: string) => ['credential', id] as const,
  credentialCERecords: (id: string) => ['credential', id, 'ce-records'] as const,
  credentialCEReport: (id: string) => ['credential', id, 'ce-report'] as const,
  ceRecordsRoot: () => ['ce-record'] as const,
  ceRecord: (id: string) => ['ce-record', id] as const,
  profile: () => ['profile'] as const,
};
