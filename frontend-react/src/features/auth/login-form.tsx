import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, type Ref } from 'react';
import { useForm } from 'react-hook-form';
import { AuthSubmit, AuthTextField } from './auth-form-parts';
import { loginSchema, type LoginInput, type LoginValues } from './auth-schemas';

export function LoginForm({ pending, onSubmit, onEdit, firstFieldRef, retry = false }: { retry?: boolean; pending: boolean; onSubmit: (values: LoginValues) => void | Promise<void>; onEdit: () => void; firstFieldRef: Ref<HTMLInputElement> }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<LoginInput, unknown, LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  useEffect(() => {
    const subscription = watch(() => onEdit());
    return () => subscription.unsubscribe();
  }, [watch, onEdit]);
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={(event) => { void handleSubmit(onSubmit)(event); }} aria-label="Log in">
      <AuthTextField label="Email" type="email" inputMode="email" autoComplete="email" registration={register('email')} error={errors.email} pending={pending} extraRef={firstFieldRef} />
      <AuthTextField label="Password" type="password" autoComplete="current-password" registration={register('password')} error={errors.password} pending={pending} />
      <AuthSubmit retry={retry} pending={pending} pendingLabel="Logging in…">Log in</AuthSubmit>
    </form>
  );
}
