import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';

import { getApiErrorMessage } from '../../core/api/api.helpers';
import { CredentialService } from '../../services/credential.service';
import { CredentialWriteEventsService } from '../../services/credential-write-events.service';
import { CredentialFormComponent } from './components/credential-form/credential-form.component';
import {
  createCredentialForm,
  toCredentialRequest,
} from './utils/credential-form.utils';

@Component({
  selector: 'app-credential-form-dialog',
  imports: [DialogModule, CredentialFormComponent],
  templateUrl: './credential-form-dialog.component.html',
  styleUrl: './credential-form-dialog.component.scss',
})
export class CredentialFormDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly credentialService = inject(CredentialService);
  private readonly credentialWriteEvents = inject(CredentialWriteEventsService);

  readonly open = input(false);

  readonly close = output<void>();
  readonly created = output<string>();

  readonly form = createCredentialForm(this.formBuilder);
  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly resetOnCloseEffect = effect(() => {
    if (!this.open()) {
      this.resetState();
    }
  });

  handleVisibleChange(visible: boolean): void {
    if (!visible) {
      this.handleClose();
    }
  }

  handleClose(): void {
    this.resetState();
    this.close.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set(null);
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    this.credentialService.createCredential(toCredentialRequest(this.form.getRawValue())).subscribe({
      next: (credential) => {
        this.isSubmitting.set(false);
        this.credentialWriteEvents.notifyChanged();
        this.created.emit(credential.id);
        this.handleClose();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.submitError.set(
          getApiErrorMessage(error, 'We could not save this credential right now.'),
        );
      },
    });
  }

  private resetState(): void {
    this.form.reset({
      name: '',
      type: null,
      issuingOrganization: '',
      expirationDate: '',
      renewalCycleMonths: null,
      requiredCEHours: null,
    });
    this.submitError.set(null);
    this.isSubmitting.set(false);
  }
}
