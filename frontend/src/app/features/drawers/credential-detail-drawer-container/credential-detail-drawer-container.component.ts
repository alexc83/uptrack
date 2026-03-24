import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { CredentialDetail } from '../../../models/credential.models';
import { CeRecord } from '../../../models/ce-record.models';
import { getApiErrorMessage } from '../../../core/api/api.helpers';
import { CredentialService } from '../../../services/credential.service';
import { CredentialWriteEventsService } from '../../../services/credential-write-events.service';
import { CeRecordFormDialogComponent } from '../../ce-records/ce-record-form-dialog.component';
import { CredentialFormComponent } from '../../credentials/components/credential-form/credential-form.component';
import {
  buildCredentialFormValue,
  createCredentialForm,
  toCredentialRequest,
} from '../../credentials/utils/credential-form.utils';
import { CredentialDetailDrawerComponent } from '../credential-detail-drawer/credential-detail-drawer.component';
import { DrawerActionId } from '../models/drawer.models';
import { buildCredentialDetailDrawerView } from '../utils/drawer.mappers';

export interface CredentialDetailSelectionEvent {
  credential: CredentialDetail;
  record: CeRecord;
}

@Component({
  selector: 'app-credential-detail-drawer-container',
  imports: [
    ButtonModule,
    DialogModule,
    CredentialDetailDrawerComponent,
    CredentialFormComponent,
    CeRecordFormDialogComponent,
  ],
  templateUrl: './credential-detail-drawer-container.component.html',
  styleUrl: './credential-detail-drawer-container.component.scss',
})
export class CredentialDetailDrawerContainerComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly credentialService = inject(CredentialService);
  private readonly credentialWriteEvents = inject(CredentialWriteEventsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly now = new Date();

  private requestSequence = 0;

  readonly credentialId = input.required<string>();
  readonly reportReturnTo = input('/credentials');

  readonly close = output<void>();
  readonly ceRecordSelected = output<CredentialDetailSelectionEvent>();
  readonly deleted = output<string>();

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly credential = signal<CredentialDetail | null>(null);
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly mutationError = signal<string | null>(null);
  readonly deleteConfirmOpen = signal(false);
  readonly isDeleting = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly addCeRecordOpen = signal(false);
  readonly form = createCredentialForm(this.formBuilder);

  readonly view = computed(() => {
    const credential = this.credential();

    if (!credential) {
      return null;
    }

    return buildCredentialDetailDrawerView({
      credential,
      ceRecords: credential.ceRecords.map((record) => ({ ...record, credentialId: credential.id })),
      now: this.now,
    });
  });

  readonly loadCredentialEffect = effect(() => {
    const credentialId = this.credentialId();
    this.credentialWriteEvents.revision();
    this.loadCredential(credentialId);
  });

  retryLoad(): void {
    this.loadCredential(this.credentialId());
  }

  handleCeRecordSelected(recordId: string): void {
    const credential = this.credential();
    const record = credential?.ceRecords.find((item) => item.id === recordId);

    if (!credential || !record) {
      return;
    }

    this.ceRecordSelected.emit({
      credential,
      record: {
        ...record,
        credentialId: credential.id,
      },
    });
  }

  handleActionSelected(actionId: DrawerActionId): void {
    if (actionId === 'add-ce-record') {
      this.addCeRecordOpen.set(true);
      return;
    }

    if (actionId === 'edit-credential') {
      this.enterEditMode();
      return;
    }

    if (actionId === 'delete-credential') {
      this.deleteError.set(null);
      this.deleteConfirmOpen.set(true);
      return;
    }

    if (actionId === 'open-ce-report') {
      void this.router.navigate(['/credentials', this.credentialId(), 'ce-report'], {
        queryParams: {
          returnTo: this.reportReturnTo(),
        },
      });
    }
  }

  closeAddCeRecord(): void {
    this.addCeRecordOpen.set(false);
  }

  handleCeRecordSaved(): void {
    this.addCeRecordOpen.set(false);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.mutationError.set(null);
    const credential = this.credential();
    if (credential) {
      this.form.reset(buildCredentialFormValue(credential));
    }
  }

  submitEdit(): void {
    const credential = this.credential();
    if (!credential) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mutationError.set(null);
      return;
    }

    this.isSaving.set(true);
    this.mutationError.set(null);

    this.credentialService
      .updateCredential(credential.id, toCredentialRequest(this.form.getRawValue()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedCredential) => {
          this.credential.set(updatedCredential);
          this.isSaving.set(false);
          this.isEditing.set(false);
          this.credentialWriteEvents.notifyChanged();
        },
        error: (error) => {
          this.isSaving.set(false);
          this.mutationError.set(
            getApiErrorMessage(error, 'We could not update this credential right now.'),
          );
        },
      });
  }

  closeDeleteDialog(): void {
    if (this.isDeleting()) {
      return;
    }

    this.deleteConfirmOpen.set(false);
    this.deleteError.set(null);
  }

  confirmDelete(): void {
    const credential = this.credential();
    if (!credential) {
      return;
    }

    this.isDeleting.set(true);
    this.deleteError.set(null);

    this.credentialService
      .deleteCredential(credential.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.deleteConfirmOpen.set(false);
          this.credentialWriteEvents.notifyChanged();
          this.deleted.emit(credential.id);
        },
        error: (error) => {
          this.isDeleting.set(false);
          this.deleteError.set(
            getApiErrorMessage(error, 'We could not delete this credential right now.'),
          );
        },
      });
  }

  private loadCredential(credentialId: string): void {
    const requestId = ++this.requestSequence;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.credential.set(null);
    this.isEditing.set(false);
    this.mutationError.set(null);
    this.deleteConfirmOpen.set(false);
    this.deleteError.set(null);

    this.credentialService
      .getCredentialById(credentialId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (credential) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.credential.set(credential);
          this.form.reset(buildCredentialFormValue(credential));
          this.isLoading.set(false);
        },
        error: (error) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.errorMessage.set(
            getApiErrorMessage(error, 'We could not load this credential right now.'),
          );
          this.isLoading.set(false);
        },
      });
  }

  private enterEditMode(): void {
    const credential = this.credential();
    if (!credential) {
      return;
    }

    this.form.reset(buildCredentialFormValue(credential));
    this.mutationError.set(null);
    this.isEditing.set(true);
  }
}
