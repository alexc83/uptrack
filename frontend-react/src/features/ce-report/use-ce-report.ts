import { useQuery } from '@tanstack/react-query';
import { credentialsApi } from '../../core/api/credentials-api';
import { queryKeys } from '../../core/query/query-keys';

export function useCEReport(id: string) {
  return useQuery({
    queryKey: queryKeys.credentialCEReport(id),
    queryFn: ({ signal }) => credentialsApi.getCEReport(id, { signal }),
    enabled: id.length > 0,
  });
}
