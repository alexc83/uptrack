import { FormBuilder } from '@angular/forms';

import {
  buildCredentialFormValue,
  createCredentialForm,
  getCredentialFieldError,
  toCredentialRequest,
} from './credential-form.utils';

describe('credential form utils', () => {
  const formBuilder = new FormBuilder();

  it('creates a blank invalid form by default', () => {
    const form = createCredentialForm(formBuilder);

    expect(form.invalid).toBe(true);
    expect(form.controls.name.value).toBe('');
    expect(form.controls.type.value).toBeNull();
    expect(form.controls.renewalCycleMonths.value).toBeNull();
    expect(form.controls.requiredCEHours.value).toBeNull();
  });

  it('maps credential detail into form values', () => {
    expect(
      buildCredentialFormValue({
        id: 'cred-1',
        name: 'RN License',
        type: 'LICENSE',
        issuingOrganization: 'Texas Board of Nursing',
        expirationDate: '2027-03-23',
        renewalCycleMonths: 24,
        requiredCEHours: 20,
        status: 'ACTIVE',
        ceHoursEarned: 10,
        ceProgress: 0.5,
        ceRecords: [],
      }),
    ).toEqual({
      name: 'RN License',
      type: 'LICENSE',
      issuingOrganization: 'Texas Board of Nursing',
      expirationDate: '2027-03-23',
      renewalCycleMonths: 24,
      requiredCEHours: 20,
    });
  });

  it('serializes trimmed request payloads without userId', () => {
    expect(
      toCredentialRequest({
        name: ' RN License ',
        type: 'LICENSE',
        issuingOrganization: ' Texas Board of Nursing ',
        expirationDate: '2027-03-23',
        renewalCycleMonths: 24,
        requiredCEHours: 20,
      }),
    ).toEqual({
      name: 'RN License',
      type: 'LICENSE',
      issuingOrganization: 'Texas Board of Nursing',
      expirationDate: '2027-03-23',
      renewalCycleMonths: 24,
      requiredCEHours: 20,
    });
  });

  it('returns user-friendly validation messages', () => {
    const form = createCredentialForm(formBuilder);
    form.controls.renewalCycleMonths.setValue(0);
    form.controls.renewalCycleMonths.markAsTouched();
    form.controls.requiredCEHours.setValue(-1);
    form.controls.requiredCEHours.markAsTouched();

    expect(getCredentialFieldError(form, 'renewalCycleMonths')).toBe(
      'Renewal cycle must be at least 1 month.',
    );
    expect(getCredentialFieldError(form, 'requiredCEHours')).toBe('Value cannot be negative.');
  });
});
