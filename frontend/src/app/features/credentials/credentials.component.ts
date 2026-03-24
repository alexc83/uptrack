import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { getApiErrorMessage } from '../../core/api/api.helpers';
import { AuthStore } from '../../core/auth/auth.store';
import { CredentialStatus, CredentialType } from '../../models/credential.models';
import { CredentialService } from '../../services/credential.service';
import {
  CeRecordDetailDrawerContainerComponent,
  CeRecordSelectionContext,
} from '../drawers/ce-record-detail-drawer-container/ce-record-detail-drawer-container.component';
import {
  CredentialDetailDrawerContainerComponent,
  CredentialDetailSelectionEvent,
} from '../drawers/credential-detail-drawer-container/credential-detail-drawer-container.component';
import { DrawerShellComponent } from '../drawers/drawer-shell/drawer-shell.component';
import {
  buildCredentialListCardViews,
  CredentialListCardView,
} from './utils/credential-view.mappers';

@Component({
  selector: 'app-credentials',
  imports: [
    ButtonModule,
    DrawerShellComponent,
    CredentialDetailDrawerContainerComponent,
    CeRecordDetailDrawerContainerComponent,
  ],
  templateUrl: './credentials.component.html',
  styleUrl: './credentials.component.scss',
})
export class CredentialsComponent {
  private readonly authStore = inject(AuthStore);
  private readonly credentialService = inject(CredentialService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly now = new Date();
  private readonly searchChanges = new Subject<string>();

  private requestSequence = 0;

  private readonly currentUserId = computed(() => this.authStore.currentUser()?.id ?? null);
  readonly selectedCeRecordId = signal<string | null>(null);
  readonly selectedCeRecordContext = signal<CeRecordSelectionContext | null>(null);

  readonly credentials = signal<CredentialListCardView[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly rawSearch = signal('');
  readonly search = signal('');
  readonly statusFilter = signal<CredentialStatus | ''>('');
  readonly typeFilter = signal<CredentialType | ''>('');
  readonly selectedCredentialId = signal<string | null>(null);
  readonly drawerType = signal<'credential-detail' | 'ce-record-detail' | null>(null);

  readonly hasCredentials = computed(() => this.credentials().length > 0);
  readonly isDrawerOpen = computed(() => this.drawerType() !== null);
  readonly hasActiveFilters = computed(
    () => !!this.search() || !!this.statusFilter() || !!this.typeFilter(),
  );
  readonly resultSummary = computed(() => {
    const count = this.credentials().length;
    return `${count} credential${count === 1 ? '' : 's'}`;
  });
  readonly emptyTitle = computed(() =>
    this.hasActiveFilters() ? 'No credentials match these filters' : 'No credentials yet',
  );
  readonly emptyMessage = computed(() =>
    this.hasActiveFilters()
      ? 'Try adjusting your search, status, or type filters to widen the results.'
      : 'Your live credential list will appear here once credentials are available for this account.',
  );

  readonly loadCredentialsEffect = effect(() => {
    const userId = this.currentUserId();
    const status = this.statusFilter();
    const type = this.typeFilter();
    const search = this.search();

    if (!userId) {
      this.credentials.set([]);
      this.errorMessage.set(null);
      this.isLoading.set(false);
      return;
    }

    this.loadCredentials(userId, status || undefined, type || undefined, search || undefined);
  });

  constructor() {
    this.searchChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.search.set(value.trim()));

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const credentialId = params.get('credentialId');

        if (!credentialId || this.selectedCredentialId() === credentialId) {
          return;
        }

        this.openCredentialDetail(credentialId);
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { credentialId: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
  }

  updateSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.rawSearch.set(value);
    this.searchChanges.next(value);
  }

  updateStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as CredentialStatus | '');
  }

  updateType(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value as CredentialType | '');
  }

  clearFilters(): void {
    this.rawSearch.set('');
    this.search.set('');
    this.statusFilter.set('');
    this.typeFilter.set('');
  }

  openCredentialDetail(credentialId: string): void {
    this.selectedCredentialId.set(credentialId);
    this.selectedCeRecordId.set(null);
    this.selectedCeRecordContext.set(null);
    this.drawerType.set('credential-detail');
  }

  openCeRecordDetail(selection: CredentialDetailSelectionEvent): void {
    this.selectedCeRecordId.set(selection.record.id);
    this.selectedCeRecordContext.set({
      credentialId: selection.credential.id,
      credentialName: selection.credential.name,
      credentialOrganization: selection.credential.issuingOrganization,
    });
    this.drawerType.set('ce-record-detail');
  }

  closeDrawer(): void {
    this.drawerType.set(null);
    this.selectedCredentialId.set(null);
    this.selectedCeRecordId.set(null);
    this.selectedCeRecordContext.set(null);
  }

  retryLoad(): void {
    const userId = this.currentUserId();

    if (!userId) {
      return;
    }

    this.loadCredentials(
      userId,
      this.statusFilter() || undefined,
      this.typeFilter() || undefined,
      this.search() || undefined,
    );
  }

  private loadCredentials(
    userId: string,
    status?: CredentialStatus,
    type?: CredentialType,
    search?: string,
  ): void {
    const requestId = ++this.requestSequence;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.credentialService
      .getCredentials({
        userId,
        status,
        type,
        search,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (credentials) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.credentials.set(buildCredentialListCardViews(credentials, this.now));
          this.isLoading.set(false);
        },
        error: (error) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.credentials.set([]);
          this.errorMessage.set(
            getApiErrorMessage(error, 'We could not load credentials right now.'),
          );
          this.isLoading.set(false);
        },
      });
  }
}
