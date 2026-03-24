import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';

import { CredentialDetail } from '../../../models/credential.models';
import { CeRecord } from '../../../models/ce-record.models';
import { getApiErrorMessage } from '../../../core/api/api.helpers';
import { CredentialService } from '../../../services/credential.service';
import { CredentialDetailDrawerComponent } from '../credential-detail-drawer/credential-detail-drawer.component';
import { buildCredentialDetailDrawerView } from '../utils/drawer.mappers';

export interface CredentialDetailSelectionEvent {
  credential: CredentialDetail;
  record: CeRecord;
}

@Component({
  selector: 'app-credential-detail-drawer-container',
  imports: [ButtonModule, CredentialDetailDrawerComponent],
  templateUrl: './credential-detail-drawer-container.component.html',
  styleUrl: './credential-detail-drawer-container.component.scss',
})
export class CredentialDetailDrawerContainerComponent {
  private readonly credentialService = inject(CredentialService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly now = new Date();

  private requestSequence = 0;

  readonly credentialId = input.required<string>();

  readonly close = output<void>();
  readonly ceRecordSelected = output<CredentialDetailSelectionEvent>();

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly credential = signal<CredentialDetail | null>(null);

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

  private loadCredential(credentialId: string): void {
    const requestId = ++this.requestSequence;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.credential.set(null);

    this.credentialService
      .getCredentialById(credentialId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (credential) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.credential.set(credential);
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
}
