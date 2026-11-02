import { useState, type ReactNode } from 'react';
import { useSession } from '../../core/auth/session-context';

/** Remount local forms/selections on every session replacement, even same-account login. */
export function CredentialSessionBoundary({ children }: { children: ReactNode }) {
  const { status, captureSession } = useSession();
  const [scope, setScope] = useState(() => ({ guard: captureSession(), generation: 0 }));
  if (status !== 'authenticated') return null;
  if (!scope.guard.isCurrent()) {
    setScope({ guard: captureSession(), generation: scope.generation + 1 });
    return null;
  }
  return <CredentialSession key={scope.generation}>{children}</CredentialSession>;
}

function CredentialSession({ children }: { children: ReactNode }) { return children; }
