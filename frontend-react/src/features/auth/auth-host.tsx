import { Button } from 'flowbite-react';
import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthDialog, type AuthMode } from './auth-dialog';

const parseMode = (value: string | null): AuthMode | null => (value === 'login' || value === 'register' ? value : null);

/**
 * Temporary host for the auth dialog on `/` until M07 replaces the foundation view with the landing page.
 * The dialog is controlled by the optional `auth` and `returnTo` query parameters.
 */
export function AuthHost() {
  const [params, setParams] = useSearchParams();
  const loginTrigger = useRef<HTMLButtonElement>(null);
  const mode = parseMode(params.get('auth'));

  const update = (change: (next: URLSearchParams) => void) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    change(next);
    return next;
  }, { replace: true });

  return (
    <>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button ref={loginTrigger} color="blue" className="min-h-11" onClick={() => update((next) => next.set('auth', 'login'))}>Log in</Button>
        <Button color="alternative" className="min-h-11" onClick={() => update((next) => next.set('auth', 'register'))}>Sign up</Button>
      </div>
      <AuthDialog
        mode={mode}
        returnTo={params.get('returnTo')}
        onClose={() => update((next) => next.delete('auth'))}
        onModeChange={(nextMode) => update((next) => next.set('auth', nextMode))}
        returnFocusRef={loginTrigger}
      />
    </>
  );
}
