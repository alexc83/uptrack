import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

import {
  CREDENTIAL_TYPE_OPTIONS,
  CredentialFormGroup,
  getCredentialFieldError,
} from '../../utils/credential-form.utils';

@Component({
  selector: 'app-credential-form',
  imports: [ReactiveFormsModule, ButtonModule],
  templateUrl: './credential-form.component.html',
  styleUrl: './credential-form.component.scss',
})
export class CredentialFormComponent {
  readonly form = input.required<CredentialFormGroup>();
  readonly submitLabel = input.required<string>();
  readonly cancelLabel = input('Cancel');
  readonly isSubmitting = input(false);
  readonly submitError = input<string | null>(null);

  readonly submitted = output<void>();
  readonly cancelled = output<void>();

  readonly typeOptions = CREDENTIAL_TYPE_OPTIONS;

  getFieldError(fieldName: keyof CredentialFormGroup['controls']): string | null {
    return getCredentialFieldError(this.form(), fieldName);
  }
}
