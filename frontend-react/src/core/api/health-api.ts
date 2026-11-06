import { ApiError } from './api-error';
import { apiFetch } from './api-fetch';

const HEALTH_CHECK_TIMEOUT_MS = 5_000;

/**
 * True when the backend reports it can serve requests (`/api/health/ready`: process up and database reachable).
 * Falls back to the liveness endpoint only when readiness is not deployed yet (404), e.g. frontend ahead of backend.
 * Never throws for an unreachable service; an aborted check rethrows so callers can stop cleanly.
 */
export async function checkBackendReady(signal?: AbortSignal): Promise<boolean> {
  try {
    await apiFetch<unknown>('/health/ready', { signal, timeoutMs: HEALTH_CHECK_TIMEOUT_MS });
    return true;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ApiError && error.kind === 'http' && error.status === 404) {
      try { await apiFetch<unknown>('/health', { signal, timeoutMs: HEALTH_CHECK_TIMEOUT_MS }); return true; } catch { return false; }
    }
    return false;
  }
}
