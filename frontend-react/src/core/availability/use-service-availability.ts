import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isServiceUnavailable } from '../api/api-error';
import { useBackendRecovery } from './use-backend-recovery';

export type ServiceAvailability = 'ok' | 'unavailable' | 'recovered';
export const RECOVERED_NOTICE_MS = 8_000;

/**
 * Tracks whether the backend could not answer a request made by the signed-in app.
 * It never touches the session: an outage is not a 401, so the user stays signed in, and it never resends mutations.
 * On recovery it refetches only queries that are currently in error; unsaved form input is left alone (no page reload).
 */
export function useServiceAvailability() {
  const client = useQueryClient();
  const [state, setState] = useState<ServiceAvailability>('ok');
  const recovered = useBackendRecovery(state === 'unavailable');

  useEffect(() => {
    const onEvent = (event: { type: string; action?: { type: string; error?: unknown } }) => {
      if (event.type !== 'updated' || !event.action) return;
      if (event.action.type === 'error' && isServiceUnavailable(event.action.error)) setState((s) => (s === 'unavailable' ? s : 'unavailable'));
      else if (event.action.type === 'success') setState((s) => (s === 'unavailable' ? 'ok' : s));
    };
    const stopQueries = client.getQueryCache().subscribe(onEvent);
    const stopMutations = client.getMutationCache().subscribe(onEvent);
    return () => { stopQueries(); stopMutations(); };
  }, [client]);

  const refetchFailed = () => { void client.refetchQueries({ type: 'active', predicate: (query) => query.state.status === 'error' }); };

  useEffect(() => {
    if (!recovered) return;
    setState('recovered');
    void client.refetchQueries({ type: 'active', predicate: (query) => query.state.status === 'error' });
  }, [recovered, client]);

  useEffect(() => {
    if (state !== 'recovered') return;
    const timer = setTimeout(() => setState('ok'), RECOVERED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  return { state, retry: refetchFailed, dismiss: () => setState('ok') };
}
