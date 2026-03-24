import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';

import { AuthStore } from '../../../core/auth/auth.store';
import { Dashboard } from '../../../models/dashboard.model';
import { Credential } from '../../../models/credential.models';
import { CeProgressPanelComponent } from '../components/ce-progress-panel/ce-progress-panel.component';
import { DashboardHeaderComponent } from '../components/dashboard-header/dashboard-header.component';
import { ExpirationsPanelComponent } from '../components/expirations-panel/expirations-panel.component';
import { RecentActivityPanelComponent } from '../components/recent-activity-panel/recent-activity-panel.component';
import { StatsCardsComponent } from '../components/stats-cards/stats-cards.component';
import { DashboardService } from '../../../services/dashboard.service';
import { CredentialService } from '../../../services/credential.service';
import { CredentialWriteEventsService } from '../../../services/credential-write-events.service';
import { buildDashboardPageView } from '../utils/dashboard.mappers';
import {
  CeRecordDetailDrawerContainerComponent,
  CeRecordSelectionContext,
} from '../../drawers/ce-record-detail-drawer-container/ce-record-detail-drawer-container.component';
import {
  CredentialDetailDrawerContainerComponent,
  CredentialDetailSelectionEvent,
} from '../../drawers/credential-detail-drawer-container/credential-detail-drawer-container.component';
import { CredentialListDrawerComponent } from '../../drawers/credential-list-drawer/credential-list-drawer.component';
import { DrawerShellComponent } from '../../drawers/drawer-shell/drawer-shell.component';
import { CredentialListMode, DrawerType } from '../../drawers/models/drawer.models';
import { buildCredentialListDrawerView } from '../../drawers/utils/drawer.mappers';
import { CeRecordFormDialogComponent } from '../../ce-records/ce-record-form-dialog.component';
import { CeRecordCredentialOption } from '../../ce-records/components/ce-record-form/ce-record-form.component';
import { CredentialFormDialogComponent } from '../../credentials/credential-form-dialog.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    DashboardHeaderComponent,
    StatsCardsComponent,
    ExpirationsPanelComponent,
    CeProgressPanelComponent,
    RecentActivityPanelComponent,
    DrawerShellComponent,
    CredentialDetailDrawerContainerComponent,
    CeRecordDetailDrawerContainerComponent,
    CredentialListDrawerComponent,
    CredentialFormDialogComponent,
    CeRecordFormDialogComponent,
    ButtonModule,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  private readonly authStore = inject(AuthStore);
  private readonly dashboardService = inject(DashboardService);
  private readonly credentialService = inject(CredentialService);
  private readonly credentialWriteEvents = inject(CredentialWriteEventsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly now = new Date();
  private readonly currentUserId = computed(() => this.authStore.currentUser()?.id ?? null);
  readonly selectedCeRecordId = signal<string | null>(null);
  readonly selectedCeRecordContext = signal<CeRecordSelectionContext | null>(null);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly drawerType = signal<DrawerType | null>(null);
  readonly credentialListMode = signal<CredentialListMode>('expiring');
  readonly selectedCredentialId = signal<string | null>(null);
  readonly addCredentialOpen = signal(false);
  readonly addCeRecordOpen = signal(false);
  readonly credentialOptions = signal<CeRecordCredentialOption[]>([]);

  readonly view = computed(() =>
    buildDashboardPageView({
      user:
        this.authStore.currentUser() ?? {
          id: '',
          name: 'UpTrack User',
          email: '',
          createdAt: '',
        },
      dashboard: this.dashboard(),
      now: this.now,
    }),
  );

  readonly hasCredentials = computed(() => this.dashboard().stats.totalCredentials > 0);

  readonly isDrawerOpen = computed(() => this.drawerType() !== null);

  readonly credentialListDrawer = computed(() => {
    const dashboard = this.dashboard();

    return buildCredentialListDrawerView({
      mode: this.credentialListMode(),
      credentials:
        this.credentialListMode() === 'expiring'
          ? dashboard.upcomingExpirations
          : dashboard.ceAttention,
      now: this.now,
    });
  });

  readonly loadDashboardEffect = effect(() => {
    const userId = this.currentUserId();
    this.credentialWriteEvents.revision();

    if (!userId) {
      this.dashboard.set(this.buildEmptyDashboard());
      this.credentialOptions.set([]);
      this.errorMessage.set(null);
      this.isLoading.set(false);
      return;
    }

    this.loadDashboardData();
    this.loadCredentialOptions(userId);
  });

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

  openCredentialList(mode: CredentialListMode): void {
    this.credentialListMode.set(mode);
    this.selectedCredentialId.set(null);
    this.selectedCeRecordId.set(null);
    this.selectedCeRecordContext.set(null);
    this.drawerType.set('credential-list');
  }

  closeDrawer(): void {
    this.drawerType.set(null);
    this.selectedCredentialId.set(null);
    this.selectedCeRecordId.set(null);
    this.selectedCeRecordContext.set(null);
  }

  retryLoad(): void {
    if (!this.currentUserId()) {
      return;
    }

    this.loadDashboardData();
  }

  openAddCredential(): void {
    this.addCredentialOpen.set(true);
  }

  openAddCeRecord(): void {
    if (this.credentialOptions().length === 0) {
      return;
    }

    this.addCeRecordOpen.set(true);
  }

  closeAddCredential(): void {
    this.addCredentialOpen.set(false);
  }

  closeAddCeRecord(): void {
    this.addCeRecordOpen.set(false);
  }

  handleCeRecordSaved(): void {
    this.addCeRecordOpen.set(false);
  }

  handleCredentialDeleted(): void {
    this.closeDrawer();
  }

  handleCeRecordDeleted(credentialId: string): void {
    this.openCredentialDetail(credentialId);
  }

  private readonly dashboard = signal<Dashboard>(this.buildEmptyDashboard());

  private loadDashboardData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.dashboardService
      .getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dashboard: Dashboard) => {
          this.dashboard.set(dashboard);
          this.isLoading.set(false);
        },
        error: () => {
          this.dashboard.set(this.buildEmptyDashboard());
          this.errorMessage.set('We could not load the dashboard right now. Please try again.');
          this.isLoading.set(false);
        },
      });
  }

  private loadCredentialOptions(userId: string): void {
    this.credentialService
      .getCredentials({ userId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (credentials: Credential[]) => {
          this.credentialOptions.set(
            credentials.map((credential) => ({
              credentialId: credential.id,
              credentialName: credential.name,
              credentialOrganization: credential.issuingOrganization,
            })),
          );
        },
        error: () => {
          this.credentialOptions.set([]);
        },
      });
  }

  private buildEmptyDashboard(): Dashboard {
    return {
      stats: {
        totalCredentials: 0,
        activeCount: 0,
        expiringSoonCount: 0,
        expiredCount: 0,
        needsCEAttentionCount: 0,
      },
      upcomingExpirations: [],
      ceAttention: [],
      recentActivity: [],
    };
  }
}
