import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';

import { getApiErrorMessage } from '../../core/api/api.helpers';
import { AuthStore } from '../../core/auth/auth.store';
import { Credential } from '../../models/credential.models';
import { CredentialService } from '../../services/credential.service';
import {
  CeRecordDetailDrawerContainerComponent,
  CeRecordSelectionContext,
} from '../drawers/ce-record-detail-drawer-container/ce-record-detail-drawer-container.component';
import { DrawerShellComponent } from '../drawers/drawer-shell/drawer-shell.component';
import {
  buildCeRecordListItemViews,
  CeRecordListItemView,
} from './utils/ce-record-view.mappers';

@Component({
  selector: 'app-ce-records',
  imports: [ButtonModule, DrawerShellComponent, CeRecordDetailDrawerContainerComponent],
  templateUrl: './ce-records.component.html',
  styleUrl: './ce-records.component.scss',
})
export class CeRecordsComponent {
  private readonly authStore = inject(AuthStore);
  private readonly credentialService = inject(CredentialService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  private requestSequence = 0;

  private readonly currentUserId = computed(() => this.authStore.currentUser()?.id ?? null);

  readonly records = signal<CeRecordListItemView[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedRecordId = signal<string | null>(null);
  readonly selectedRecordContext = signal<CeRecordSelectionContext | null>(null);

  readonly hasRecords = computed(() => this.records().length > 0);
  readonly isDrawerOpen = computed(() => this.selectedRecordId() !== null);
  readonly resultSummary = computed(() => {
    const count = this.records().length;
    return `${count} record${count === 1 ? '' : 's'}`;
  });

  readonly loadCeRecordsEffect = effect(() => {
    const userId = this.currentUserId();

    if (!userId) {
      this.records.set([]);
      this.errorMessage.set(null);
      this.isLoading.set(false);
      return;
    }

    this.loadRecords(userId);
  });

  openRecordDetail(record: CeRecordListItemView): void {
    this.selectedRecordId.set(record.id);
    this.selectedRecordContext.set({
      credentialId: record.credentialId,
      credentialName: record.credentialName,
      credentialOrganization: record.credentialOrganization,
    });
  }

  closeDrawer(): void {
    this.selectedRecordId.set(null);
    this.selectedRecordContext.set(null);
  }

  openCredentialDetail(credentialId: string): void {
    this.closeDrawer();
    void this.router.navigate(['/credentials'], {
      queryParams: { credentialId },
    });
  }

  retryLoad(): void {
    const userId = this.currentUserId();

    if (!userId) {
      return;
    }

    this.loadRecords(userId);
  }

  private loadRecords(userId: string): void {
    const requestId = ++this.requestSequence;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.credentialService
      .getCredentials({ userId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (credentials) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.records.set(buildCeRecordListItemViews(flattenCeRecords(credentials)));
          this.isLoading.set(false);
        },
        error: (error) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.records.set([]);
          this.errorMessage.set(
            getApiErrorMessage(error, 'We could not load CE records right now.'),
          );
          this.isLoading.set(false);
        },
      });
  }
}

function flattenCeRecords(credentials: Credential[]) {
  return credentials.flatMap((credential) =>
    (credential.ceRecords ?? []).map((record) => ({
      ...record,
      credentialId: credential.id,
      credentialName: credential.name,
      credentialOrganization: credential.issuingOrganization,
    })),
  );
}
