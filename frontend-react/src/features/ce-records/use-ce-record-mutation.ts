import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../core/api/api-error';
import { ceRecordsApi } from '../../core/api/ce-records-api';
import { useSession } from '../../core/auth/session-context';
import type { SessionGuard } from '../../core/auth/session-store';
import { invalidateCERecordData, invalidateCredentialData } from '../../core/query/invalidation';
import { queryKeys } from '../../core/query/query-keys';
import type { CERecordRequest, CERecordResponse } from '../../lib/dto/ce-records';

type Operation =
  | { kind: 'create'; request: CERecordRequest }
  | { kind: 'edit'; id: string; request: CERecordRequest }
  | { kind: 'delete'; id: string; credentialId: string };
type Variables = { operation: Operation; guard: SessionGuard };

export function useCERecordMutation() {
  const client = useQueryClient();
  const { captureSession } = useSession();
  const busy = useRef(false);
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: async ({ operation, guard }: Variables): Promise<CERecordResponse | undefined> => {
      // A mutation paused offline must never resume using a replacement account's token.
      if (!guard.isCurrent()) throw new DOMException('Session changed', 'AbortError');
      if (operation.kind === 'create') return ceRecordsApi.create(operation.request);
      if (operation.kind === 'edit') return ceRecordsApi.update(operation.id, operation.request);
      await ceRecordsApi.delete(operation.id);
      return undefined;
    },
    onSuccess: async (data, { operation, guard }) => {
      if (!guard.isCurrent()) return;
      const credentialId = operation.kind === 'delete' ? operation.credentialId : operation.request.credentialId;
      const recordId = operation.kind === 'create' ? data?.id : operation.id;
      if (operation.kind === 'delete' && recordId) {
        // Cancel before eviction so late reads cannot restore the deleted row.
        await Promise.all([
          client.cancelQueries({ queryKey: queryKeys.ceRecord(recordId) }),
          client.cancelQueries({ queryKey: queryKeys.ceRecordsRoot() }),
        ]);
        if (!guard.isCurrent()) return;
        client.removeQueries({ queryKey: queryKeys.ceRecord(recordId) });
        client.removeQueries({ queryKey: queryKeys.ceRecordsRoot() });
      }
      if (!guard.isCurrent()) return;
      if (recordId) await invalidateCERecordData(client, [credentialId], [recordId]);
      else await invalidateCredentialData(client, [credentialId]);
    },
  });
  async function run(operation: Operation): Promise<boolean> {
    if (busy.current) return false;
    const guard = captureSession();
    if (!guard.isCurrent()) return false;
    busy.current = true;
    setError(undefined);
    try {
      await mutation.mutateAsync({ operation, guard });
      return guard.isCurrent();
    } catch (cause) {
      if (guard.isCurrent()) setError(cause instanceof ApiError ? cause.message : 'We could not save this CE record right now. Please try again.');
      return false;
    } finally {
      busy.current = false;
    }
  }
  return { run, pending: mutation.isPending, isBusy: () => busy.current, error, clearError: () => setError(undefined) };
}
