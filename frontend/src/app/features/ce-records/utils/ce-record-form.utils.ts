import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { CeRecordDetail, CeRecordRequest } from '../../../models/ce-record.models';

export interface CeRecordFormValue {
  credentialId: string;
  title: string;
  provider: string;
  hours: number | null;
  dateCompleted: string;
  certificateUrl: string;
  certificatePublicId: string;
  certificateResourceType: string;
  certificateOriginalFilename: string;
}

export type CeRecordFormGroup = FormGroup<{
  credentialId: FormControl<string>;
  title: FormControl<string>;
  provider: FormControl<string>;
  hours: FormControl<number | null>;
  dateCompleted: FormControl<string>;
  certificateUrl: FormControl<string>;
  certificatePublicId: FormControl<string>;
  certificateResourceType: FormControl<string>;
  certificateOriginalFilename: FormControl<string>;
}>;

export function createCeRecordForm(
  formBuilder: FormBuilder,
  initialValue?: Partial<CeRecordFormValue>,
): CeRecordFormGroup {
  return formBuilder.group({
    credentialId: formBuilder.nonNullable.control(initialValue?.credentialId ?? '', [
      Validators.required,
    ]),
    title: formBuilder.nonNullable.control(initialValue?.title ?? '', [Validators.required]),
    provider: formBuilder.nonNullable.control(initialValue?.provider ?? '', [Validators.required]),
    hours: formBuilder.control<number | null>(initialValue?.hours ?? null, [
      Validators.required,
      Validators.min(0.000001),
    ]),
    dateCompleted: formBuilder.nonNullable.control(initialValue?.dateCompleted ?? '', [
      Validators.required,
    ]),
    certificateUrl: formBuilder.nonNullable.control(initialValue?.certificateUrl ?? ''),
    certificatePublicId: formBuilder.nonNullable.control(initialValue?.certificatePublicId ?? ''),
    certificateResourceType: formBuilder.nonNullable.control(initialValue?.certificateResourceType ?? ''),
    certificateOriginalFilename: formBuilder.nonNullable.control(
      initialValue?.certificateOriginalFilename ?? '',
    ),
  });
}

export function buildCeRecordFormValue(
  record: CeRecordDetail,
  credentialId: string,
): CeRecordFormValue {
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
  };
}

export function toCeRecordRequest(value: CeRecordFormValue): CeRecordRequest {
  return {
    title: value.title.trim(),
    provider: value.provider.trim(),
    hours: value.hours!,
    dateCompleted: value.dateCompleted,
    credentialId: value.credentialId,
    certificateUrl: value.certificateUrl.trim() || null,
    certificatePublicId: value.certificatePublicId.trim() || null,
    certificateResourceType: value.certificateResourceType.trim() || null,
    certificateOriginalFilename: value.certificateOriginalFilename.trim() || null,
  };
}

export function getCeRecordFieldError(
  form: CeRecordFormGroup,
  fieldName: keyof CeRecordFormGroup['controls'],
): string | null {
  const control = form.controls[fieldName];
  if (!control.errors || (!control.dirty && !control.touched)) {
    return null;
  }

  if (control.errors['required']) {
    return 'This field is required.';
  }

  if (control.errors['min']) {
    return 'Hours must be greater than 0.';
  }

  return 'This field is invalid.';
}
