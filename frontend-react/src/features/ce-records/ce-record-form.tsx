import { safeHttpUrl } from '../../lib/safe-url';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FileInput, Select, TextInput } from 'flowbite-react';
import { useForm } from 'react-hook-form';
import type { ChangeEvent, RefObject } from 'react';
import type { CERecordRequest } from '../../lib/dto/ce-records';
import { FormField } from '../../shared/ui/form-field';
import { ceRecordSchema, emptyCERecordFormValues, toCERecordRequest, type CERecordFormValues } from './ce-record-form-schema';
import { CERTIFICATE_ACCEPT, CERTIFICATE_HELP, type CERecordCredentialOption } from './ce-record-view';
import { useCertificateUpload } from './use-certificate-upload';
import { useRegisterWorkGuard } from '../../core/work-guard/work-guard-context';

interface CERecordFormProps {
  initialValue?: CERecordFormValues;
  credentialOptions?: CERecordCredentialOption[];
  showCredentialField?: boolean;
  editing?: boolean;
  pending: boolean;
  error?: string;
  onSubmit: (request: CERecordRequest) => Promise<void>;
  onCancel: () => void;
  firstFieldRef?: RefObject<HTMLInputElement | null>;
}

export function CERecordForm({ initialValue, credentialOptions = [], showCredentialField = false, editing = false, pending, error, onSubmit, onCancel, firstFieldRef }: CERecordFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting, isDirty } } = useForm<CERecordFormValues>({
    resolver: zodResolver(ceRecordSchema),
    mode: 'onTouched',
    defaultValues: initialValue ?? emptyCERecordFormValues(),
  });
  const upload = useCertificateUpload();
  const saving = pending || isSubmitting;
  useRegisterWorkGuard({
    id: 'ce-record-form',
    description: editing ? 'Edit CE record form' : 'Add CE record form',
    isDirty: () => isDirty,
    isBusy: () => saving,
  });
  const certificateUrl = watch('certificateUrl');
  const certificateAssetId = watch('certificateAssetId');
  const titleRegistration = register('title');
  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const response = await upload.upload(file);
    if (!response) return;
    // Phase 3 (#23) Strategy A gate: when the backend suppresses the URL (flag on, authenticated
    // asset) it is null and viewing goes through the delivery endpoint; when present (flag off)
    // the Phase 2 anchor viewing applies unchanged.
    setValue('certificateUrl', response.url ?? '', { shouldDirty: true });
    setValue('certificatePublicId', response.publicId, { shouldDirty: true });
    setValue('certificateResourceType', response.resourceType, { shouldDirty: true });
    setValue('certificateOriginalFilename', response.originalFilename ?? '', { shouldDirty: true });
    setValue('certificateAssetId', response.assetId, { shouldDirty: true });
  }
  function handleCertificateRemoved() {
    setValue('certificateUrl', '', { shouldDirty: true });
    setValue('certificatePublicId', '', { shouldDirty: true });
    setValue('certificateResourceType', '', { shouldDirty: true });
    setValue('certificateOriginalFilename', '', { shouldDirty: true });
    setValue('certificateAssetId', '', { shouldDirty: true });
    upload.removePending();
  }
  return <form noValidate aria-label={editing ? 'Edit CE record' : 'Add CE record'} className="space-y-5" onSubmit={event => { void handleSubmit(values => onSubmit(toCERecordRequest(values)))(event); }}>
    <fieldset disabled={saving} className="grid min-w-0 grid-cols-2 gap-4 [@media(width<=640px)]:grid-cols-1">
      {showCredentialField && <div className="col-span-full"><FormField label="Credential" error={errors.credentialId?.message}>{attributes => <Select {...attributes} {...register('credentialId')}><option value="">Select a credential</option>{credentialOptions.map(option => <option key={option.credentialId} value={option.credentialId}>{option.credentialName} · {option.credentialOrganization}</option>)}</Select>}</FormField></div>}
      <div className="col-span-full"><FormField label="Title" error={errors.title?.message}>{attributes => <TextInput {...attributes} {...titleRegistration} ref={node => { void titleRegistration.ref(node); if (firstFieldRef) firstFieldRef.current = node; }} placeholder="Trauma Update" />}</FormField></div>
      <div className="col-span-full"><FormField label="Provider" error={errors.provider?.message}>{attributes => <TextInput {...attributes} {...register('provider')} placeholder="AACN" />}</FormField></div>
      <FormField label="Hours" error={errors.hours?.message}>{attributes => <TextInput {...attributes} {...register('hours', { valueAsNumber: true })} type="number" min="0.1" step="0.1" placeholder="4.5" />}</FormField>
      <FormField label="Date completed" error={errors.dateCompleted?.message}>{attributes => <TextInput {...attributes} {...register('dateCompleted')} type="date" />}</FormField>
      <div className="col-span-full">
        <FormField label="Certificate" hint={CERTIFICATE_HELP}>{attributes => <FileInput {...attributes} accept={CERTIFICATE_ACCEPT} disabled={upload.pending || saving} onChange={event => { void handleFileSelected(event); }} />}</FormField>
        <div className="mt-2 space-y-2">
          {upload.uploadedFileName && certificateAssetId ? <div className="rounded-lg bg-[var(--ut-status-active-bg)] p-3 text-sm text-[var(--ut-status-active-text)]"><strong>Uploaded:</strong> {upload.uploadedFileName} <Button size="xs" color="alternative" type="button" onClick={handleCertificateRemoved}>Remove certificate</Button></div>
            : certificateAssetId ? <div className="rounded-lg bg-ut-hover p-3 text-sm"><strong>Certificate attached.</strong> <span className="text-ut-muted">View it from the record details.</span> <Button size="xs" color="alternative" type="button" onClick={handleCertificateRemoved}>Remove certificate</Button></div>
            : certificateUrl ? <div className="rounded-lg bg-ut-hover p-3 text-sm"><strong>Certificate attached.</strong> {safeHttpUrl(certificateUrl) ? <a className="underline" href={safeHttpUrl(certificateUrl) ?? undefined} target="_blank" rel="noreferrer">Open current file</a> : <span className="text-ut-muted">(link unavailable)</span>} <Button size="xs" color="alternative" type="button" onClick={handleCertificateRemoved}>Remove certificate</Button></div>
            : <p className="text-sm text-ut-muted">No certificate uploaded yet.</p>}
          {upload.status && <p role="status" className="text-sm text-ut-muted">{upload.status}</p>}
          {upload.error && <p role="alert" className="rounded-lg bg-[var(--ut-status-expired-bg)] p-3 text-sm text-[var(--ut-status-expired-text)]">{upload.error}</p>}
        </div>
      </div>
    </fieldset>
    {error && <p role="alert" className="rounded-lg bg-[var(--ut-status-expired-bg)] p-3 text-[var(--ut-status-expired-text)]">{error}</p>}
    <div className="flex flex-wrap justify-end gap-3">
      <Button color="alternative" type="button" disabled={saving} onClick={onCancel}>{editing ? 'Cancel Edit' : 'Cancel'}</Button>
      <Button type="submit" color="blue" disabled={saving || upload.pending}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Save CE Record'}</Button>
    </div>
  </form>;
}
