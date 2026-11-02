import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, type Ref } from 'react';
import { useForm } from 'react-hook-form';
import { AuthSubmit, AuthTextField } from './auth-form-parts';
import { registerSchema, type RegisterInput, type RegisterValues } from './auth-schemas';

export function RegisterForm({ pending, onSubmit, onEdit, firstFieldRef }: { pending: boolean; onSubmit: (values: RegisterValues) => void | Promise<void>; onEdit: () => void; firstFieldRef: Ref<HTMLInputElement> }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterInput, unknown, RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  useEffect(() => {
    const subscription = watch(() => onEdit());
    return () => subscription.unsubscribe();
  }, [watch, onEdit]);
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={(event) => { void handleSubmit(onSubmit)(event); }} aria-label="Sign up">
      <AuthTextField label="Name" autoComplete="name" registration={register('name')} error={errors.name} pending={pending} extraRef={firstFieldRef} />
      <AuthTextField label="Email" type="email" inputMode="email" autoComplete="email" registration={register('email')} error={errors.email} pending={pending} />
      <AuthTextField label="Password" type="password" autoComplete="new-password" registration={register('password')} error={errors.password} pending={pending} />
      <AuthSubmit pending={pending} pendingLabel="Creating account…">Sign up</AuthSubmit>
    </form>
  );
}
