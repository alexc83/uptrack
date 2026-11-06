import { useEffect, useState } from 'react';
import { checkBackendReady } from '../api/health-api';

export const RECOVERY_INTERVAL_MS = 15_000;

/**
 * Low-frequency readiness polling while `active`. It only observes: it never resubmits credentials or user data.
 * - one request at a time; hidden tabs are skipped and a check runs as soon as the tab becomes visible again;
 * - stops by itself once the backend is ready, and on deactivation/unmount (the in-flight check is aborted).
 * Returns true after the backend reported ready during the current activation.
 */
export function useBackendRecovery(active: boolean, check: (signal: AbortSignal) => Promise<boolean> = checkBackendReady, intervalMs = RECOVERY_INTERVAL_MS): boolean {
  const [recovered, setRecovered] = useState(false);
  useEffect(() => {
    setRecovered(false);
    if (!active) return;
    let stopped = false;
    let inFlight: AbortController | null = null;
    const run = async () => {
      if (stopped || inFlight || document.visibilityState === 'hidden') return;
      const controller = new AbortController();
      inFlight = controller;
      try {
        if (await check(controller.signal) && !stopped) { stopped = true; setRecovered(true); }
      } catch { /* aborted or failed: try again on the next tick */ }
      finally { if (inFlight === controller) inFlight = null; }
    };
    const timer = setInterval(() => void run(), intervalMs);
    const onVisible = () => { if (document.visibilityState === 'visible') void run(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      inFlight?.abort();
    };
  }, [active, check, intervalMs]);
  return active && recovered;
}
