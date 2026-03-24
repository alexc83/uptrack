import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';

import { getApiErrorMessage } from '../../core/api/api.helpers';
import { AuthStore } from '../../core/auth/auth.store';
import { Credential } from '../../models/credential.models';
import { CredentialService } from '../../services/credential.service';
import { CredentialWriteEventsService } from '../../services/credential-write-events.service';
import {
  CeRecordDetailDrawerContainerComponent,
  CeRecordSelectionContext,
} from '../drawers/ce-record-detail-drawer-container/ce-record-detail-drawer-container.component';
import { DrawerShellComponent } from '../drawers/drawer-shell/drawer-shell.component';
import { CeRecordFormDialogComponent } from './ce-record-form-dialog.component';
import { CeRecordCredentialOption } from './components/ce-record-form/ce-record-form.component';
import {
  buildCeRecordListItemViews,
  CeRecordListItemView,
} from './utils/ce-record-view.mappers';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-ce-records',
  imports: [
    ButtonModule,
    DrawerShellComponent,
    CeRecordDetailDrawerContainerComponent,
    CeRecordFormDialogComponent,
  ],
  templateUrl: './ce-records.component.html',
  styleUrl: './ce-records.component.scss',
})
export class CeRecordsComponent {
  private readonly authStore = inject(AuthStore);
  private readonly credentialService = inject(CredentialService);
  private readonly credentialWriteEvents = inject(CredentialWriteEventsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  private requestSequence = 0;
  private readonly searchChanges = new Subject<string>();

  private readonly currentUserId = computed(() => this.authStore.currentUser()?.id ?? null);

  readonly allRecords = signal<CeRecordListItemView[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedRecordId = signal<string | null>(null);
  readonly selectedRecordContext = signal<CeRecordSelectionContext | null>(null);
  readonly credentialOptions = signal<CeRecordCredentialOption[]>([]);
  readonly addDialogOpen = signal(false);

  // Filters
  readonly rawSearch = signal('');
  readonly search = signal('');
  readonly credentialFilter = signal('');
  readonly certificateFilter = signal<'all' | 'on-file' | 'missing'>('all');

  // Pagination
  readonly currentPage = signal(0);

  readonly filteredRecords = computed(() => {
    const search = this.search().toLowerCase();
    const credentialId = this.credentialFilter();
    const certFilter = this.certificateFilter();

    return this.allRecords().filter((record) => {
      if (search && !record.title.toLowerCase().includes(search) && !record.provider.toLowerCase().includes(search)) {
        return false;
      }
      if (credentialId && record.credentialId !== credentialId) {
        return false;
      }
      if (certFilter === 'on-file' && !record.hasCertificate) {
        return false;
      }
      if (certFilter === 'missing' && record.hasCertificate) {
        return false;
      }
      return true;
    });
  });

  readonly totalPages = computed(() => Math.ceil(this.filteredRecords().length / PAGE_SIZE));

  readonly pagedRecords = computed(() => {
    const page = this.currentPage();
    return this.filteredRecords().slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  });

  readonly summaryTotalHours = computed(() => {
    const total = this.allRecords().reduce((sum, r) => sum + r.hours, 0);
    return Number.isInteger(total) ? `${total}` : total.toFixed(1);
  });

  readonly summaryMissingCerts = computed(
    () => this.allRecords().filter((r) => !r.hasCertificate).length,
  );

  readonly hasActiveFilters = computed(
    () => !!this.search() || !!this.credentialFilter() || this.certificateFilter() !== 'all',
  );

  readonly hasRecords = computed(() => this.allRecords().length > 0);
  readonly hasFilteredRecords = computed(() => this.filteredRecords().length > 0);
  readonly isDrawerOpen = computed(() => this.selectedRecordId() !== null);

  readonly showingLabel = computed(() => {
    const total = this.filteredRecords().length;
    const page = this.currentPage();
    const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
    const to = Math.min((page + 1) * PAGE_SIZE, total);
    return `Showing ${from}–${to} of ${total} record${total === 1 ? '' : 's'}`;
  });

  readonly loadCeRecordsEffect = effect(() => {
    const userId = this.currentUserId();
    this.credentialWriteEvents.revision();

    if (!userId) {
      this.allRecords.set([]);
      this.errorMessage.set(null);
      this.isLoading.set(false);
      return;
    }

    this.loadRecords(userId);
  });

  constructor() {
    this.searchChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.search.set(value);
        this.currentPage.set(0);
      });
  }

  updateSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.rawSearch.set(value);
    this.searchChanges.next(value);
  }

  setCredentialFilterFromEvent(event: Event): void {
    this.setCredentialFilter((event.target as HTMLSelectElement).value);
  }

  setCredentialFilter(value: string): void {
    this.credentialFilter.set(value);
    this.currentPage.set(0);
  }

  setCertificateFilter(value: 'all' | 'on-file' | 'missing'): void {
    this.certificateFilter.set(value);
    this.currentPage.set(0);
  }

  clearFilters(): void {
    this.rawSearch.set('');
    this.search.set('');
    this.credentialFilter.set('');
    this.certificateFilter.set('all');
    this.currentPage.set(0);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update((p) => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update((p) => p + 1);
    }
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }

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

  handleRecordDeleted(): void {
    this.closeDrawer();
  }

  openAddDialog(): void {
    if (this.credentialOptions().length === 0) {
      return;
    }
    this.addDialogOpen.set(true);
  }

  closeAddDialog(): void {
    this.addDialogOpen.set(false);
  }

  handleRecordSaved(): void {
    this.addDialogOpen.set(false);
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

          this.credentialOptions.set(
            credentials.map((credential) => ({
              credentialId: credential.id,
              credentialName: credential.name,
              credentialOrganization: credential.issuingOrganization,
            })),
          );
          this.allRecords.set(buildCeRecordListItemViews(flattenCeRecords(credentials)));
          this.currentPage.set(0);
          this.isLoading.set(false);
        },
        error: (error) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.allRecords.set([]);
          this.credentialOptions.set([]);
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
