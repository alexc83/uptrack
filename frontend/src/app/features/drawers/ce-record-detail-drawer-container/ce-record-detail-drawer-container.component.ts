import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { getApiErrorMessage } from '../../../core/api/api.helpers';
import { CeRecordDetail } from '../../../models/ce-record.models';
import { CredentialWriteEventsService } from '../../../services/credential-write-events.service';
import { CeRecordService } from '../../../services/ce-record.service';
import { UploadService } from '../../../services/upload.service';
import { CeRecordFormComponent } from '../../ce-records/components/ce-record-form/ce-record-form.component';
import {
  buildCeRecordFormValue,
  createCeRecordForm,
  toCeRecordRequest,
} from '../../ce-records/utils/ce-record-form.utils';
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
  imports: [ButtonModule, DialogModule, CeRecordDetailDrawerComponent, CeRecordFormComponent],
  templateUrl: './ce-record-detail-drawer-container.component.html',
  styleUrl: './ce-record-detail-drawer-container.component.scss',
})
export class CeRecordDetailDrawerContainerComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly ceRecordService = inject(CeRecordService);
  private readonly credentialWriteEvents = inject(CredentialWriteEventsService);
  private readonly uploadService = inject(UploadService);
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
  readonly isSaving = signal(false);
  readonly mutationError = signal<string | null>(null);
  readonly isUploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly uploadStatus = signal<string | null>(null);
  readonly uploadedFileName = signal<string | null>(null);
  readonly isRemovingCertificate = signal(false);
  readonly deleteConfirmOpen = signal(false);
  readonly isDeleting = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly form = createCeRecordForm(this.formBuilder);

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
      this.enterEditMode();
      return;
    }

    if (actionId === 'delete-ce-record') {
      this.deleteError.set(null);
      this.deleteConfirmOpen.set(true);
    }
  }

  removeCertificate(): void {
    const record = this.record();
    if (!record || !record.certificateUrl || this.isRemovingCertificate()) {
      return;
    }

    this.isRemovingCertificate.set(true);
    this.errorMessage.set(null);

    this.ceRecordService
      .updateCeRecord(record.id, {
        title: record.title,
        provider: record.provider,
        hours: record.hours,
        dateCompleted: record.dateCompleted,
        credentialId: this.context().credentialId,
        certificateUrl: null,
        certificatePublicId: null,
        certificateResourceType: null,
        certificateOriginalFilename: null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedRecord) => {
          this.record.set(updatedRecord);
          this.isRemovingCertificate.set(false);
          this.credentialWriteEvents.notifyChanged();
        },
        error: (error) => {
          this.isRemovingCertificate.set(false);
          this.errorMessage.set(
            getApiErrorMessage(error, 'We could not remove this certificate right now.'),
          );
        },
      });
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.mutationError.set(null);
    this.resetUploadState();
    const record = this.record();
    if (record) {
      this.form.reset(buildCeRecordFormValue(record, this.context().credentialId));
    }
  }

  handleFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    if (!file) {
      return;
    }

    const filename = file.name.toLowerCase();
    const isSupported =
      file.type === 'application/pdf' ||
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      file.type === 'image/webp' ||
      file.type === 'image/gif' ||
      /\.(pdf|jpe?g|png|webp|gif)$/.test(filename);

    if (!isSupported) {
      this.uploadError.set('Unsupported file type. Please choose a PDF or common image file.');
      this.uploadStatus.set(null);
      this.uploadedFileName.set(null);
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set(null);
    this.uploadStatus.set(`Uploading ${file.name}...`);

    this.uploadService
      .uploadCertificate(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.form.controls.certificateUrl.setValue(response.url);
          this.form.controls.certificatePublicId.setValue(response.publicId);
          this.form.controls.certificateResourceType.setValue(response.resourceType);
          this.form.controls.certificateOriginalFilename.setValue(response.originalFilename);
          this.isUploading.set(false);
          this.uploadStatus.set('Certificate uploaded successfully.');
          this.uploadedFileName.set(response.originalFilename);
        },
        error: (error) => {
          this.isUploading.set(false);
          this.uploadStatus.set(null);
          this.uploadedFileName.set(null);
          this.uploadError.set(
            getApiErrorMessage(error, 'We could not upload that certificate right now.'),
          );
        },
      });
  }

  handleCertificateRemoved(): void {
    this.form.controls.certificateUrl.setValue('');
    this.form.controls.certificatePublicId.setValue('');
    this.form.controls.certificateResourceType.setValue('');
    this.form.controls.certificateOriginalFilename.setValue('');
    this.uploadError.set(null);
    this.uploadedFileName.set(null);
    this.uploadStatus.set('Certificate removed.');
  }

  submitEdit(): void {
    const record = this.record();
    if (!record) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mutationError.set(null);
      return;
    }

    this.isSaving.set(true);
    this.mutationError.set(null);

    this.ceRecordService
      .updateCeRecord(record.id, toCeRecordRequest(this.form.getRawValue()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedRecord) => {
          this.record.set(updatedRecord);
          this.isSaving.set(false);
          this.isEditing.set(false);
          this.resetUploadState();
          this.credentialWriteEvents.notifyChanged();
        },
        error: (error) => {
          this.isSaving.set(false);
          this.mutationError.set(
            getApiErrorMessage(error, 'We could not update this CE record right now.'),
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

  private enterEditMode(): void {
    const record = this.record();
    if (!record) {
      return;
    }

    this.form.reset(buildCeRecordFormValue(record, this.context().credentialId));
    this.mutationError.set(null);
    this.resetUploadState();
    this.isEditing.set(true);
  }

  private loadRecord(recordId: string): void {
    const requestId = ++this.requestSequence;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.record.set(null);
    this.isEditing.set(false);
    this.mutationError.set(null);
    this.resetUploadState();
    this.isRemovingCertificate.set(false);
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
          this.form.reset(buildCeRecordFormValue(record, this.context().credentialId));
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

  private resetUploadState(): void {
    this.isUploading.set(false);
    this.uploadError.set(null);
    this.uploadStatus.set(null);
    this.uploadedFileName.set(null);
  }
}
