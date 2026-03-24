import { FormBuilder } from '@angular/forms';

import {
  buildCeRecordFormValue,
  createCeRecordForm,
  getCeRecordFieldError,
  toCeRecordRequest,
} from './ce-record-form.utils';

describe('ce record form utils', () => {
  const formBuilder = new FormBuilder();

  it('creates a blank invalid CE form by default', () => {
    const form = createCeRecordForm(formBuilder);

    expect(form.invalid).toBe(true);
    expect(form.controls.credentialId.value).toBe('');
    expect(form.controls.title.value).toBe('');
    expect(form.controls.provider.value).toBe('');
    expect(form.controls.hours.value).toBeNull();
    expect(form.controls.dateCompleted.value).toBe('');
  });

  it('maps CE detail into form values', () => {
    expect(
      buildCeRecordFormValue({
        id: 'ce-1',
        title: 'Trauma Update',
        provider: 'AACN',
        hours: 4.5,
        dateCompleted: '2026-03-01',
        certificateUrl: 'https://example.com/cert.pdf',
        certificatePublicId: 'uptrack/users/user-1/certificates/trauma-update',
        certificateResourceType: 'raw',
        certificateOriginalFilename: 'trauma-update.pdf',
      }, 'cred-1'),
    ).toEqual({
      credentialId: 'cred-1',
      title: 'Trauma Update',
      provider: 'AACN',
      hours: 4.5,
      dateCompleted: '2026-03-01',
      certificateUrl: 'https://example.com/cert.pdf',
      certificatePublicId: 'uptrack/users/user-1/certificates/trauma-update',
      certificateResourceType: 'raw',
      certificateOriginalFilename: 'trauma-update.pdf',
    });
  });

  it('serializes a CE request without userId', () => {
    expect(
      toCeRecordRequest({
        credentialId: 'cred-1',
        title: ' Trauma Update ',
        provider: ' AACN ',
        hours: 4.5,
        dateCompleted: '2026-03-01',
        certificateUrl: '',
        certificatePublicId: '',
        certificateResourceType: '',
        certificateOriginalFilename: '',
      }),
    ).toEqual({
      title: 'Trauma Update',
      provider: 'AACN',
      hours: 4.5,
      dateCompleted: '2026-03-01',
      credentialId: 'cred-1',
      certificateUrl: null,
      certificatePublicId: null,
      certificateResourceType: null,
      certificateOriginalFilename: null,
    });
  });

  it('returns user-friendly validation messages', () => {
    const form = createCeRecordForm(formBuilder);
    form.controls.hours.setValue(0);
    form.controls.hours.markAsTouched();

    expect(getCeRecordFieldError(form, 'hours')).toBe('Hours must be greater than 0.');
  });

  it('requires a credential selection when no parent credential is preselected', () => {
    const form = createCeRecordForm(formBuilder);
    form.controls.credentialId.markAsTouched();

    expect(getCeRecordFieldError(form, 'credentialId')).toBe('This field is required.');
  });
});
