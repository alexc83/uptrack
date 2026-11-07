import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Select, TextInput } from 'flowbite-react';
import { useForm } from 'react-hook-form';
import type { RefObject } from 'react';
import type { CredentialRequest } from '../../lib/dto/credentials';
import { FormField } from '../../shared/ui/form-field';
import { credentialSchema } from './credential-form-schema';
import { useRegisterWorkGuard } from '../../core/work-guard/work-guard-context';

export function CredentialForm({ initialValue, pending, error, onSubmit, onCancel, editing = false, firstFieldRef }: {
  initialValue?: CredentialRequest; pending: boolean; error?: string;
  onSubmit: (request: CredentialRequest) => Promise<void>; onCancel: () => void; editing?: boolean;
  firstFieldRef?: RefObject<HTMLInputElement | null>;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<CredentialRequest>({
    resolver: zodResolver(credentialSchema), mode: 'onTouched',
    defaultValues: initialValue ?? { name: '', issuingOrganization: '', expirationDate: '' },
  });
  const saving = pending || isSubmitting;
  useRegisterWorkGuard({
    id: 'credential-form',
    description: editing ? 'Edit credential form' : 'Add credential form',
    isDirty: () => isDirty,
    isBusy: () => saving,
  });
  const nameRegistration = register('name');
  return <form noValidate aria-label={editing ? 'Edit credential' : 'Add credential'} className="space-y-5" onSubmit={event => { void handleSubmit(onSubmit)(event); }}>
    <fieldset disabled={saving} className="grid min-w-0 grid-cols-2 gap-4 [@media(width<=640px)]:grid-cols-1">
      <div className="col-span-full"><FormField label="Credential name" error={errors.name?.message}>{attributes => <TextInput {...attributes} {...nameRegistration} ref={node => { void nameRegistration.ref(node); if (firstFieldRef) firstFieldRef.current = node; }} placeholder="RN License - Texas" />}</FormField></div>
      <FormField label="Type" error={errors.type?.message}>{attributes => <Select {...attributes} {...register('type')} defaultValue={initialValue?.type ?? ''}><option value="">Select type</option><option value="LICENSE">License</option><option value="CERTIFICATION">Certification</option></Select>}</FormField>
      <FormField label="Expiration date" error={errors.expirationDate?.message}>{attributes => <TextInput {...attributes} {...register('expirationDate')} type="date" />}</FormField>
      <div className="col-span-full"><FormField label="Issuing organization" error={errors.issuingOrganization?.message}>{attributes => <TextInput {...attributes} {...register('issuingOrganization')} placeholder="Texas Board of Nursing" />}</FormField></div>
      <FormField label="Renewal cycle (months)" error={errors.renewalCycleMonths?.message}>{attributes => <TextInput {...attributes} {...register('renewalCycleMonths', { valueAsNumber: true })} type="number" min="1" step="1" placeholder="24" />}</FormField>
      <FormField label="Required CE hours" error={errors.requiredCEHours?.message}>{attributes => <TextInput {...attributes} {...register('requiredCEHours', { valueAsNumber: true })} type="number" min="0" max="999.99" step="0.5" placeholder="20" />}</FormField>
    </fieldset>
    {error && <p role="alert" className="rounded-lg bg-[var(--ut-status-expired-bg)] p-3 text-[var(--ut-status-expired-text)]">{error}</p>}
    <div className="flex flex-wrap justify-end gap-3">
      <Button color="alternative" type="button" disabled={saving} onClick={onCancel}>{editing ? 'Cancel Edit' : 'Cancel'}</Button>
      <Button type="submit" color="blue" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Save Credential'}</Button>
    </div>
  </form>;
}
