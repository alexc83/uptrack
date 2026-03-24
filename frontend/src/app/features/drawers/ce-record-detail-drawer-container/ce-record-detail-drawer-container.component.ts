import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { getApiErrorMessage } from '../../../core/api/api.helpers';
import { CeRecordDetail } from '../../../models/ce-record.models';
import { CredentialWriteEventsService } from '../../../services/credential-write-events.service';
import { CeRecordService } from '../../../services/ce-record.service';
import { CeRecordFormDialogComponent } from '../../ce-records/ce-record-form-dialog.component';
import { CeRecordDetailDrawerComponent } from '../ce-record-detail-drawer/ce-record-detail-drawer.component';
import { DrawerActionId } from '../models/drawer.models';
import { buildCeRecordDetailDrawerView } from '../utils/drawer.mappers';

export interface CeRecordSelectionContext {
  credentialId: string;
  credentialName: string;
  credentialOrganization: string;
}

@Component({
  selector: 'app-ce-record-detail-drawer-container',
  imports: [ButtonModule, DialogModule, CeRecordDetailDrawerComponent, CeRecordFormDialogComponent],
  templateUrl: './ce-record-detail-drawer-container.component.html',
  styleUrl: './ce-record-detail-drawer-container.component.scss',
})
export class CeRecordDetailDrawerContainerComponent {
  private readonly ceRecordService = inject(CeRecordService);
  private readonly credentialWriteEvents = inject(CredentialWriteEventsService);
  private readonly destroyRef = inject(DestroyRef);

  private requestSequence = 0;

  readonly recordId = input.required<string>();
  readonly context = input.required<CeRecordSelectionContext>();

  readonly close = output<void>();
  readonly credentialSelected = output<string>();
  readonly deleted = output<string>();

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly record = signal<CeRecordDetail | null>(null);
  readonly isEditing = signal(false);
  readonly deleteConfirmOpen = signal(false);
  readonly isDeleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly view = computed(() => {
    const record = this.record();
    const context = this.context();

    if (!record) {
      return null;
    }

    return buildCeRecordDetailDrawerView({
      record: {
        ...record,
        credentialId: context.credentialId,
      },
      credential: {
        id: context.credentialId,
        name: context.credentialName,
        issuingOrganization: context.credentialOrganization,
      },
    });
  });

  readonly loadRecordEffect = effect(() => {
    const recordId = this.recordId();
    this.context();
    this.credentialWriteEvents.revision();
    this.loadRecord(recordId);
  });

  retryLoad(): void {
    this.loadRecord(this.recordId());
  }

  handleActionSelected(actionId: DrawerActionId): void {
    if (actionId === 'edit-ce-record') {
      this.isEditing.set(true);
      return;
    }

    if (actionId === 'delete-ce-record') {
      this.deleteError.set(null);
      this.deleteConfirmOpen.set(true);
    }
  }

  closeEdit(): void {
    this.isEditing.set(false);
  }

  handleEditSaved(): void {
    this.isEditing.set(false);
  }

  closeDeleteDialog(): void {
    if (this.isDeleting()) {
      return;
    }

    this.deleteConfirmOpen.set(false);
    this.deleteError.set(null);
  }

  confirmDelete(): void {
    const recordId = this.recordId();
    const credentialId = this.context().credentialId;

    this.isDeleting.set(true);
    this.deleteError.set(null);

    this.ceRecordService
      .deleteCeRecord(recordId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.deleteConfirmOpen.set(false);
          this.credentialWriteEvents.notifyChanged();
          this.deleted.emit(credentialId);
        },
        error: (error) => {
          this.isDeleting.set(false);
          this.deleteError.set(
            getApiErrorMessage(error, 'We could not delete this CE record right now.'),
          );
        },
      });
  }

  private loadRecord(recordId: string): void {
    const requestId = ++this.requestSequence;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.record.set(null);
    this.isEditing.set(false);
    this.deleteConfirmOpen.set(false);
    this.deleteError.set(null);

    this.ceRecordService
      .getCeRecordById(recordId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.record.set(record);
          this.isLoading.set(false);
        },
        error: (error) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.errorMessage.set(
            getApiErrorMessage(error, 'We could not load this CE record right now.'),
          );
          this.isLoading.set(false);
        },
      });
  }
}
