import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

import { CeRecordFormGroup, getCeRecordFieldError } from '../../utils/ce-record-form.utils';

export interface CeRecordCredentialOption {
  credentialId: string;
  credentialName: string;
  credentialOrganization: string;
}

@Component({
  selector: 'app-ce-record-form',
  imports: [ReactiveFormsModule, ButtonModule],
  templateUrl: './ce-record-form.component.html',
  styleUrl: './ce-record-form.component.scss',
})
export class CeRecordFormComponent {
  readonly form = input.required<CeRecordFormGroup>();
  readonly submitLabel = input.required<string>();
  readonly cancelLabel = input('Cancel');
  readonly isSubmitting = input(false);
  readonly isUploading = input(false);
  readonly uploadError = input<string | null>(null);
  readonly uploadStatus = input<string | null>(null);
  readonly uploadedFileName = input<string | null>(null);
  readonly existingCertificateUrl = input<string | null>(null);
  readonly submitError = input<string | null>(null);
  readonly credentialOptions = input<CeRecordCredentialOption[]>([]);
  readonly showCredentialField = input(false);
  readonly uploadInputId = input('ce-certificate-upload');

  readonly submitted = output<void>();
  readonly cancelled = output<void>();
  readonly fileSelected = output<Event>();
  readonly certificateRemoved = output<void>();

  getFieldError(fieldName: keyof CeRecordFormGroup['controls']): string | null {
    return getCeRecordFieldError(this.form(), fieldName);
  }
}
