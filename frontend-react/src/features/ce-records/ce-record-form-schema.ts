import { z } from 'zod';
import type { CERecordRequest, CERecordResponse } from '../../lib/dto/ce-records';

const required = 'This field is required.';
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Mirrors the backend CERecordRequestDto contract: title/provider NotBlank + max 180,
 * hours DecimalMin(0, exclusive), dateCompleted NotNull, certificate metadata size-capped.
 */
export const ceRecordSchema = z.object({
  credentialId: z.string().min(1, required),
  title: z.string().trim().min(1, required).max(180, 'Use 180 characters or fewer.'),
  provider: z.string().trim().min(1, required).max(180, 'Use 180 characters or fewer.'),
  hours: z.number({ error: 'Enter CE hours.' }).gt(0, 'Hours must be greater than 0.'),
  dateCompleted: z.string().min(1, required).refine(validDate, 'Enter a valid completion date.'),
  certificateUrl: z.string().trim().max(500, 'Use 500 characters or fewer.'),
  certificatePublicId: z.string().trim().max(255, 'Use 255 characters or fewer.'),
  certificateResourceType: z.string().trim().max(40, 'Use 40 characters or fewer.'),
  certificateOriginalFilename: z.string().trim().max(255, 'Use 255 characters or fewer.'),
  // Phase 1 (#24): registry asset UUID from the upload response; legacy fields are kept for compatibility.
  certificateAssetId: z.string().trim().max(64, 'Use 64 characters or fewer.'),
});
export type CERecordFormValues = z.infer<typeof ceRecordSchema>;

export const emptyCERecordFormValues = (credentialId = ''): CERecordFormValues => ({
  credentialId,
  title: '',
  provider: '',
  hours: Number.NaN,
  dateCompleted: '',
  certificateUrl: '',
  certificatePublicId: '',
  certificateResourceType: '',
  certificateOriginalFilename: '',
  certificateAssetId: '',
});

/** Angular parity: ce-record-form.utils.ts toCeRecordRequest — trimmed text, empty certificate fields become null. */
export function toCERecordRequest(values: CERecordFormValues): CERecordRequest {
  const blankToNull = (value: string) => { const trimmed = value.trim(); return trimmed ? trimmed : null; };
  return {
    title: values.title.trim(),
    provider: values.provider.trim(),
    hours: values.hours,
    dateCompleted: values.dateCompleted,
    credentialId: values.credentialId,
    certificateUrl: blankToNull(values.certificateUrl),
    certificatePublicId: blankToNull(values.certificatePublicId),
    certificateResourceType: blankToNull(values.certificateResourceType),
    certificateOriginalFilename: blankToNull(values.certificateOriginalFilename),
    certificateAssetId: blankToNull(values.certificateAssetId),
  };
}

export function ceRecordFormValues(record: Omit<CERecordResponse, 'id'>, credentialId: string): CERecordFormValues {
  return {
    credentialId,
    title: record.title,
    provider: record.provider,
    hours: record.hours,
    dateCompleted: record.dateCompleted,
    certificateUrl: record.certificateUrl ?? '',
    certificatePublicId: record.certificatePublicId ?? '',
    certificateResourceType: record.certificateResourceType ?? '',
    certificateOriginalFilename: record.certificateOriginalFilename ?? '',
    certificateAssetId: record.certificateAssetId ?? '',
  };
}
