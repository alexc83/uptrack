import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../core/api/api-error';
import { credentialsApi } from '../../core/api/credentials-api';
import { useSession } from '../../core/auth/session-context';
import type { SessionGuard } from '../../core/auth/session-store';
import { invalidateCredentialData } from '../../core/query/invalidation';
import { queryKeys } from '../../core/query/query-keys';
import type { CredentialRequest, CredentialResponse } from '../../lib/dto/credentials';

type Operation = { kind: 'create'; request: CredentialRequest } | { kind: 'edit'; id: string; request: CredentialRequest } | { kind: 'delete'; id: string };
type Variables = { operation: Operation; guard: SessionGuard };

export function useCredentialMutation() {
  const client = useQueryClient();
  const { captureSession } = useSession();
  const busy = useRef(false);
  const [error, setError] = useState<string>();
  const mutation = useMutation({
    mutationFn: async ({ operation, guard }: Variables): Promise<CredentialResponse | undefined> => {
      // A mutation paused offline must never resume using a replacement account's token.
      if (!guard.isCurrent()) throw new DOMException('Session changed', 'AbortError');
      if (operation.kind === 'create') return credentialsApi.create(operation.request);
      if (operation.kind === 'edit') return credentialsApi.update(operation.id, operation.request);
      await credentialsApi.delete(operation.id);
      return undefined;
    },
    onSuccess: async (data, { operation, guard }) => {
      if (!guard.isCurrent()) return;
      const id = operation.kind === 'create' ? data?.id : operation.id;
      if (!id) return;
      if (operation.kind === 'delete') {
        // Cancel before eviction so late reads cannot restore cascaded/deleted data.
        await Promise.all([
          client.cancelQueries({ queryKey: queryKeys.credential(id) }),
          client.cancelQueries({ queryKey: queryKeys.ceRecordsRoot() }),
        ]);
        if (!guard.isCurrent()) return;
        client.removeQueries({ queryKey: queryKeys.credential(id) });
        // Nested records may be incomplete or stale. Evict all CE details, never retain a known-deleted row.
        client.removeQueries({ queryKey: queryKeys.ceRecordsRoot() });
      }
      if (guard.isCurrent()) await invalidateCredentialData(client, [id]);
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
      if (guard.isCurrent()) setError(cause instanceof ApiError ? cause.message : 'We could not save this change right now. Please try again.');
      return false;
    } finally {
      busy.current = false;
    }
  }
  return { run, pending: mutation.isPending, isBusy: () => busy.current, error, clearError: () => setError(undefined) };
}
