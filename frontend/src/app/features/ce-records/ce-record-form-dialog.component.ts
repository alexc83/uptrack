import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';

import { getApiErrorMessage } from '../../core/api/api.helpers';
import { CeRecordDetail } from '../../models/ce-record.models';
import { CredentialWriteEventsService } from '../../services/credential-write-events.service';
import { CeRecordService } from '../../services/ce-record.service';
import { UploadService } from '../../services/upload.service';
import { CeRecordSelectionContext } from '../drawers/ce-record-detail-drawer-container/ce-record-detail-drawer-container.component';
import {
  CeRecordCredentialOption,
  CeRecordFormComponent,
} from './components/ce-record-form/ce-record-form.component';
import {
  buildCeRecordFormValue,
  createCeRecordForm,
  toCeRecordRequest,
} from './utils/ce-record-form.utils';

type CeRecordFormMode = 'create' | 'edit';

@Component({
  selector: 'app-ce-record-form-dialog',
  imports: [DialogModule, CeRecordFormComponent],
  templateUrl: './ce-record-form-dialog.component.html',
  styleUrl: './ce-record-form-dialog.component.scss',
})
export class CeRecordFormDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly ceRecordService = inject(CeRecordService);
  private readonly credentialWriteEvents = inject(CredentialWriteEventsService);
  private readonly uploadService = inject(UploadService);

  readonly open = input(false);
  readonly mode = input<CeRecordFormMode>('create');
  readonly context = input<CeRecordSelectionContext | null>(null);
  readonly credentialOptions = input<CeRecordCredentialOption[]>([]);
  readonly record = input<CeRecordDetail | null>(null);

  readonly close = output<void>();
  readonly saved = output<void>();

  readonly form = createCeRecordForm(this.formBuilder);
  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly isUploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly uploadStatus = signal<string | null>(null);
  readonly uploadedFileName = signal<string | null>(null);

  readonly syncFormEffect = effect(() => {
    if (!this.open()) {
      this.resetState();
      return;
    }

    const mode = this.mode();
    const record = this.record();
    const context = this.context();

    if (mode === 'edit' && record) {
      this.form.reset(buildCeRecordFormValue(record, context?.credentialId ?? ''));
      this.submitError.set(null);
      this.uploadError.set(null);
      this.uploadStatus.set(null);
      this.uploadedFileName.set(null);
      return;
    }

    this.form.reset({
      credentialId: context?.credentialId ?? '',
      title: '',
      provider: '',
      hours: null,
      dateCompleted: '',
      certificateUrl: '',
      certificatePublicId: '',
      certificateResourceType: '',
      certificateOriginalFilename: '',
    });
    this.submitError.set(null);
    this.uploadError.set(null);
    this.uploadStatus.set(null);
    this.uploadedFileName.set(null);
  });

  readonly title = () => (this.mode() === 'edit' ? 'Edit CE record' : 'Add CE record');
  readonly submitLabel = () => (this.mode() === 'edit' ? 'Save Changes' : 'Save CE Record');
  readonly description = () =>
    this.mode() === 'edit'
      ? 'Update CE details without losing the credential context underneath.'
      : this.context()
        ? `Add a CE completion that counts toward ${this.context()!.credentialName}.`
        : 'Add a CE completion and link it to the credential it should count toward.';
  readonly shouldSelectCredential = () => this.mode() === 'create' && !this.context();
  readonly selectedCredentialSummary = () => {
    const context = this.context();
    if (context) {
      return `${context.credentialName} · ${context.credentialOrganization}`;
    }

    const selectedCredentialId = this.form.controls.credentialId.value;
    const selectedOption = this.credentialOptions().find(
      (option) => option.credentialId === selectedCredentialId,
    );

    if (!selectedOption) {
      return 'Choose the credential this CE record should count toward.';
    }

    return `${selectedOption.credentialName} · ${selectedOption.credentialOrganization}`;
  };

  handleVisibleChange(visible: boolean): void {
    if (!visible) {
      this.handleClose();
    }
  }

  handleClose(): void {
    this.resetState();
    this.close.emit();
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

    this.uploadService.uploadCertificate(file).subscribe({
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
        this.uploadedFileName.set(null);
        this.uploadStatus.set(null);
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set(null);
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const request = toCeRecordRequest(this.form.getRawValue());
    const submission =
      this.mode() === 'edit' && this.record()
        ? this.ceRecordService.updateCeRecord(this.record()!.id, request)
        : this.ceRecordService.createCeRecord(request.credentialId, {
            title: request.title,
            provider: request.provider,
            hours: request.hours,
            dateCompleted: request.dateCompleted,
            certificateUrl: request.certificateUrl,
            certificatePublicId: request.certificatePublicId,
            certificateResourceType: request.certificateResourceType,
            certificateOriginalFilename: request.certificateOriginalFilename,
          });

    submission.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.credentialWriteEvents.notifyChanged();
        this.saved.emit();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.submitError.set(
          getApiErrorMessage(error, 'We could not save this CE record right now.'),
        );
      },
    });
  }

  private resetState(): void {
    this.isSubmitting.set(false);
    this.submitError.set(null);
    this.isUploading.set(false);
    this.uploadError.set(null);
    this.uploadStatus.set(null);
    this.uploadedFileName.set(null);
  }
}
