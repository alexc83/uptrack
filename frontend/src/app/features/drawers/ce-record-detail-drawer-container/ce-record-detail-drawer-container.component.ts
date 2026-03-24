import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';

import { getApiErrorMessage } from '../../../core/api/api.helpers';
import { CeRecordDetail } from '../../../models/ce-record.models';
import { CeRecordService } from '../../../services/ce-record.service';
import { CeRecordDetailDrawerComponent } from '../ce-record-detail-drawer/ce-record-detail-drawer.component';
import { buildCeRecordDetailDrawerView } from '../utils/drawer.mappers';

export interface CeRecordSelectionContext {
  credentialId: string;
  credentialName: string;
  credentialOrganization: string;
}

@Component({
  selector: 'app-ce-record-detail-drawer-container',
  imports: [ButtonModule, CeRecordDetailDrawerComponent],
  templateUrl: './ce-record-detail-drawer-container.component.html',
  styleUrl: './ce-record-detail-drawer-container.component.scss',
})
export class CeRecordDetailDrawerContainerComponent {
  private readonly ceRecordService = inject(CeRecordService);
  private readonly destroyRef = inject(DestroyRef);

  private requestSequence = 0;

  readonly recordId = input.required<string>();
  readonly context = input.required<CeRecordSelectionContext>();

  readonly close = output<void>();
  readonly credentialSelected = output<string>();

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly record = signal<CeRecordDetail | null>(null);

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
    this.loadRecord(recordId);
  });

  retryLoad(): void {
    this.loadRecord(this.recordId());
  }

  private loadRecord(recordId: string): void {
    const requestId = ++this.requestSequence;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.record.set(null);

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
