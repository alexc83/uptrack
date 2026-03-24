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
  readonly submitError = input<string | null>(null);
  readonly credentialOptions = input<CeRecordCredentialOption[]>([]);
  readonly showCredentialField = input(false);

  readonly submitted = output<void>();
  readonly cancelled = output<void>();

  getFieldError(fieldName: keyof CeRecordFormGroup['controls']): string | null {
    return getCeRecordFieldError(this.form(), fieldName);
  }
}
