import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';

import { AuthStore } from '../../../core/auth/auth.store';
import { Dashboard } from '../../../models/dashboard.model';
import { CeProgressPanelComponent } from '../components/ce-progress-panel/ce-progress-panel.component';
import { DashboardHeaderComponent } from '../components/dashboard-header/dashboard-header.component';
import { ExpirationsPanelComponent } from '../components/expirations-panel/expirations-panel.component';
import { RecentActivityPanelComponent } from '../components/recent-activity-panel/recent-activity-panel.component';
import { StatsCardsComponent } from '../components/stats-cards/stats-cards.component';
import { DashboardService } from '../../../services/dashboard.service';
import { buildDashboardPageView } from '../utils/dashboard.mappers';
import { CeRecordDetailDrawerComponent } from '../../drawers/ce-record-detail-drawer/ce-record-detail-drawer.component';
import {
  CredentialDetailDrawerContainerComponent,
  CredentialDetailSelectionEvent,
} from '../../drawers/credential-detail-drawer-container/credential-detail-drawer-container.component';
import { CredentialListDrawerComponent } from '../../drawers/credential-list-drawer/credential-list-drawer.component';
import { DrawerShellComponent } from '../../drawers/drawer-shell/drawer-shell.component';
import { CredentialListMode, DrawerType } from '../../drawers/models/drawer.models';
import {
  buildCeRecordDetailDrawerView,
  buildCredentialListDrawerView,
} from '../../drawers/utils/drawer.mappers';

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
    CeRecordDetailDrawerComponent,
    CredentialListDrawerComponent,
    ButtonModule,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  private readonly authStore = inject(AuthStore);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly now = new Date();
  private readonly currentUserId = computed(() => this.authStore.currentUser()?.id ?? null);
  readonly selectedCeRecordDrawer = signal<ReturnType<typeof buildCeRecordDetailDrawerView> | null>(null);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly drawerType = signal<DrawerType | null>(null);
  readonly credentialListMode = signal<CredentialListMode>('expiring');
  readonly selectedCredentialId = signal<string | null>(null);

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

    if (!userId) {
      this.dashboard.set(this.buildEmptyDashboard());
      this.errorMessage.set(null);
      this.isLoading.set(false);
      return;
    }

    this.loadDashboardData();
  });

  openCredentialDetail(credentialId: string): void {
    this.selectedCredentialId.set(credentialId);
    this.selectedCeRecordDrawer.set(null);
    this.drawerType.set('credential-detail');
  }

  openCeRecordDetail(selection: CredentialDetailSelectionEvent): void {
    this.selectedCeRecordDrawer.set(
      buildCeRecordDetailDrawerView({
        record: selection.record,
        credential: selection.credential,
      }),
    );
    this.drawerType.set('ce-record-detail');
  }

  openCredentialList(mode: CredentialListMode): void {
    this.credentialListMode.set(mode);
    this.selectedCredentialId.set(null);
    this.selectedCeRecordDrawer.set(null);
    this.drawerType.set('credential-list');
  }

  closeDrawer(): void {
    this.drawerType.set(null);
    this.selectedCredentialId.set(null);
    this.selectedCeRecordDrawer.set(null);
  }

  retryLoad(): void {
    if (!this.currentUserId()) {
      return;
    }

    this.loadDashboardData();
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
