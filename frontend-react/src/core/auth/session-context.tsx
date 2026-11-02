import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { UserResponse } from '../../lib/dto/auth';
import type { AuthOutcome, SessionGuard, SessionNotice, SessionStatus, SessionStore } from './session-store';
import type { AuthLoginRequest, AuthRegisterRequest } from '../../lib/dto/auth';

/** What components may see. Deliberately has no token. */
export interface SessionValue {
  status: SessionStatus;
  user: UserResponse | null;
  notice: SessionNotice;
  persistenceFailed: boolean;
  login: (credentials: AuthLoginRequest) => Promise<AuthOutcome>;
  register: (request: AuthRegisterRequest) => Promise<AuthOutcome>;
  logout: () => void;
  cancelPendingAuth: () => void;
  retry: () => Promise<void>;
  updateUser: (user: UserResponse) => void;
  captureSession: () => SessionGuard;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ store, children }: { store: SessionStore; children: ReactNode }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  // Register the transport adapter first, then start the bootstrap, in the same effect. Cleanup unregisters;
  // a StrictMode re-run re-registers and joins the already running bootstrap (one /auth/me request).
  useEffect(() => {
    const detach = store.attach();
    void store.start();
    return detach;
  }, [store]);

  // Actions are stable per store so effects that depend on them do not re-run on every state change.
  const actions = useMemo(() => ({
    login: (credentials: AuthLoginRequest) => store.login(credentials),
    register: (request: AuthRegisterRequest) => store.register(request),
    logout: () => store.logout(),
    cancelPendingAuth: () => store.cancelPendingAuth(),
    retry: () => store.retry(),
    updateUser: (user: UserResponse) => store.updateUser(user),
    captureSession: () => store.captureSession(),
  }), [store]);

  const value = useMemo<SessionValue>(() => ({
    status: snapshot.status,
    user: snapshot.user,
    notice: snapshot.notice,
    persistenceFailed: snapshot.persistenceFailed,
    ...actions,
  }), [snapshot, actions]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider.');
  return value;
}
