import { Label } from 'flowbite-react';
import { useId, type ReactNode } from 'react';

interface ControlAttributes { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }
export function FormField({ id, label, hint, error, children }: { id?: string; label: string; hint?: string; error?: string; children: (attributes: ControlAttributes) => ReactNode }) {
  const generated = useId();
  const controlId = id ?? generated;
  const descriptions = [hint && `${controlId}-hint`, error && `${controlId}-error`].filter(Boolean).join(' ') || undefined;
  return <div className="flex flex-col gap-2"><Label htmlFor={controlId}>{label}</Label>{children({ id: controlId, 'aria-describedby': descriptions, 'aria-invalid': error ? true : undefined })}{hint && <p id={`${controlId}-hint`} className="text-sm text-ut-muted">{hint}</p>}{error && <p id={`${controlId}-error`} role="alert" className="text-sm text-[var(--ut-status-expired-text)]">{error}</p>}</div>;
}
