import { useQuery } from '@tanstack/react-query';
import { ceRecordsApi } from '../../core/api/ce-records-api';
import { queryKeys } from '../../core/query/query-keys';

export function useCERecord(id: string) {
  return useQuery({ queryKey: queryKeys.ceRecord(id), queryFn: ({ signal }) => ceRecordsApi.get(id, { signal }) });
}
