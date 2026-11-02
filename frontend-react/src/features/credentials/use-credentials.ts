import { useQuery } from '@tanstack/react-query';
import { credentialsApi } from '../../core/api/credentials-api';
import { queryKeys } from '../../core/query/query-keys';
import type { CredentialFilters } from '../../lib/dto/credentials';

export function useCredentials(filters: CredentialFilters) {
  return useQuery({ queryKey: queryKeys.credentials(filters), queryFn: ({ signal }) => credentialsApi.list(filters, { signal }) });
}
export function useCredential(id: string) {
  return useQuery({ queryKey: queryKeys.credential(id), queryFn: ({ signal }) => credentialsApi.get(id, { signal }) });
}
