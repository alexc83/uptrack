import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import {
  CredentialDetail,
  CredentialRequest,
  CredentialType,
} from '../../../models/credential.models';

export interface CredentialFormValue {
  name: string;
  type: CredentialType | null;
  issuingOrganization: string;
  expirationDate: string;
  renewalCycleMonths: number | null;
  requiredCEHours: number | null;
}

export type CredentialFormGroup = FormGroup<{
  name: FormControl<string>;
  type: FormControl<CredentialType | null>;
  issuingOrganization: FormControl<string>;
  expirationDate: FormControl<string>;
  renewalCycleMonths: FormControl<number | null>;
  requiredCEHours: FormControl<number | null>;
}>;

export interface CredentialTypeOption {
  value: CredentialType;
  label: string;
}

export const CREDENTIAL_TYPE_OPTIONS: CredentialTypeOption[] = [
  { value: 'LICENSE', label: 'License' },
  { value: 'CERTIFICATION', label: 'Certification' },
];

export function createCredentialForm(
  formBuilder: FormBuilder,
  initialValue?: Partial<CredentialFormValue>,
): CredentialFormGroup {
  return formBuilder.group({
    name: formBuilder.nonNullable.control(initialValue?.name ?? '', [Validators.required]),
    type: formBuilder.control<CredentialType | null>(initialValue?.type ?? null, [Validators.required]),
    issuingOrganization: formBuilder.nonNullable.control(initialValue?.issuingOrganization ?? '', [
      Validators.required,
    ]),
    expirationDate: formBuilder.nonNullable.control(initialValue?.expirationDate ?? '', [
      Validators.required,
    ]),
    renewalCycleMonths: formBuilder.control<number | null>(
      initialValue?.renewalCycleMonths ?? null,
      [Validators.required, Validators.min(1)],
    ),
    requiredCEHours: formBuilder.control<number | null>(
      initialValue?.requiredCEHours ?? null,
      [Validators.required, Validators.min(0)],
    ),
  });
}

export function buildCredentialFormValue(credential: CredentialDetail): CredentialFormValue {
  return {
    name: credential.name,
    type: credential.type,
    issuingOrganization: credential.issuingOrganization,
    expirationDate: credential.expirationDate,
    renewalCycleMonths: credential.renewalCycleMonths,
    requiredCEHours: credential.requiredCEHours,
  };
}

export function toCredentialRequest(value: CredentialFormValue): CredentialRequest {
  return {
    name: value.name.trim(),
    type: value.type!,
    issuingOrganization: value.issuingOrganization.trim(),
    expirationDate: value.expirationDate,
    renewalCycleMonths: value.renewalCycleMonths!,
    requiredCEHours: value.requiredCEHours!,
  };
}

export function getCredentialFieldError(
  form: CredentialFormGroup,
  fieldName: keyof CredentialFormGroup['controls'],
): string | null {
  const control = form.controls[fieldName];
  if (!control.errors || (!control.dirty && !control.touched)) {
    return null;
  }

  if (control.errors['required']) {
    return 'This field is required.';
  }

  if (control.errors['min']) {
    return fieldName === 'renewalCycleMonths'
      ? 'Renewal cycle must be at least 1 month.'
      : 'Value cannot be negative.';
  }

  return 'This field is invalid.';
}
