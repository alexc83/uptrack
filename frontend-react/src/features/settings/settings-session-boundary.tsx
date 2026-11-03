import { useState, type ReactNode } from 'react';
import { useSession } from '../../core/auth/session-context';

/** Remount the settings view on every session replacement, even same-account login. */
export function SettingsSessionBoundary({ children }: { children: ReactNode }) {
  const { status, captureSession } = useSession();
  const [scope, setScope] = useState(() => ({ guard: captureSession(), generation: 0 }));

  if (status !== 'authenticated') return null;
  if (!scope.guard.isCurrent()) {
    setScope({ guard: captureSession(), generation: scope.generation + 1 });
    return null;
  }

  return <SettingsSession key={scope.generation}>{children}</SettingsSession>;
}

function SettingsSession({ children }: { children: ReactNode }) {
  return children;
}
