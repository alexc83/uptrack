import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../core/auth/session-context';
import { resolveReturnTo } from '../../core/auth/return-to';
import { AppModal } from '../../shared/ui/app-modal';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';
import type { LoginValues, RegisterValues } from './auth-schemas';
import type { AuthOutcome } from '../../core/auth/session-store';

export type AuthMode = 'login' | 'register';

interface AuthDialogProps {
  mode: AuthMode | null;
  returnTo: string | null;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export function AuthDialog({ mode, returnTo, onClose, onModeChange, returnFocusRef }: AuthDialogProps) {
  const { login, register, cancelPendingAuth, notice } = useSession();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const open = mode !== null;

  // A closed or switched dialog abandons its request so a late response can never sign the user in unseen.
  useEffect(() => {
    setServerError(null);
    setPending(false);
    return () => cancelPendingAuth();
  }, [mode, cancelPendingAuth]);

  const clearError = useCallback(() => setServerError(null), []);

  async function finish(request: Promise<AuthOutcome>) {
    setPending(true);
    setServerError(null);
    const outcome = await request;
    if (outcome.ok) {
      navigate(resolveReturnTo(returnTo), { replace: true });
      return;
    }
    if (outcome.superseded) return;
    setPending(false);
    setServerError(outcome.message);
  }

  const submitLogin = (values: LoginValues) => finish(login(values));
  const submitRegister = (values: RegisterValues) => finish(register(values));
  const description = notice === 'expired' && mode === 'login' ? 'Your session expired. Please log in again.' : undefined;

  return (
    <AppModal
      open={open}
      onClose={() => { cancelPendingAuth(); onClose(); }}
      title={mode === 'register' ? 'Sign up' : 'Log in'}
      description={description}
      error={serverError ?? undefined}
      initialFocusRef={firstField}
      returnFocusRef={returnFocusRef}
    >
      {mode === 'login' && <LoginForm key="login" pending={pending} onSubmit={submitLogin} onEdit={clearError} firstFieldRef={firstField} />}
      {mode === 'register' && <RegisterForm key="register" pending={pending} onSubmit={submitRegister} onEdit={clearError} firstFieldRef={firstField} />}
      <p className="mt-4 text-sm text-ut-muted">
        {mode === 'register' ? 'Already have an account? ' : 'New to UpTrack? '}
        <button type="button" className="min-h-11 rounded px-1 text-ut-primary underline" onClick={() => onModeChange(mode === 'register' ? 'login' : 'register')}>
          {mode === 'register' ? 'Log in' : 'Sign up'}
        </button>
      </p>
    </AppModal>
  );
}
