import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { StateBlock } from '../../shared/ui/state-block';
import { useSession } from './session-context';
import { buildAuthRedirect, DEFAULT_AUTHENTICATED_PATH } from './return-to';
import type { ReactNode } from 'react';

function SessionPending() {
  return <main className="mx-auto max-w-3xl p-6" aria-label="Checking your session"><StateBlock kind="loading" message="Checking your session…" /></main>;
}

function SessionUnavailable() {
  const { retry, logout } = useSession();
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <StateBlock kind="error" title="We couldn't verify your session" message="The server could not be reached or did not answer. Your sign-in is kept; try again, or sign out." action={{ label: 'Try again', onClick: () => void retry() }} />
      <button type="button" className="min-h-11 rounded-lg px-3 text-ut-primary underline" onClick={logout}>Sign out</button>
    </main>
  );
}

/** Layout route: renders children only for an authenticated session. Never mounts protected content while pending. */
export function RequireAuth() {
  const { status, notice } = useSession();
  const location = useLocation();
  if (status === 'initializing') return <SessionPending />;
  if (status === 'unavailable') return <SessionUnavailable />;
  // An explicit sign-out always lands on plain `/` (parity); any other guest state keeps the deep link.
  if (status === 'unauthenticated') return <Navigate replace to={notice === 'signed-out' ? '/' : buildAuthRedirect(location)} />;
  return <Outlet />;
}

/** Guest-only wrapper for `/`: authenticated users are sent to the dashboard (Angular landing redirect parity). */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === 'initializing') return <SessionPending />;
  if (status === 'unavailable') return <SessionUnavailable />;
  if (status === 'authenticated') return <Navigate replace to={DEFAULT_AUTHENTICATED_PATH} />;
  return children;
}
