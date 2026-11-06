import { Button, TextInput } from 'flowbite-react';
import type { ReactNode, Ref } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { FormField } from '../../shared/ui/form-field';

/** Merges the RHF ref with an optional extra ref (used for the dialog's initial focus). */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}

export function AuthTextField({ label, type = 'text', autoComplete, registration, error, pending, extraRef, inputMode }: {
  label: string;
  type?: 'text' | 'email' | 'password';
  autoComplete: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  pending: boolean;
  extraRef?: Ref<HTMLInputElement>;
  inputMode?: 'email';
}) {
  const { ref, ...rest } = registration;
  return (
    <FormField label={label} error={error?.message}>
      {(attributes) => (
        <TextInput {...attributes} {...rest} ref={mergeRefs(ref, extraRef)} type={type} autoComplete={autoComplete} inputMode={inputMode} readOnly={pending} spellCheck={false} autoCapitalize="none" />
      )}
    </FormField>
  );
}

/** `retry` relabels the button after a connection failure; it still only submits when the user presses it. */
export function AuthSubmit({ pending, children, pendingLabel, retry = false }: { pending: boolean; children: ReactNode; pendingLabel: string; retry?: boolean }) {
  return <Button type="submit" color="blue" className="min-h-11 w-full" disabled={pending} aria-busy={pending}>{pending ? pendingLabel : retry ? 'Try again' : children}</Button>;
}
