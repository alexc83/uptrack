import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthStore } from '../../../core/auth/auth.store';
import { Dashboard } from '../../../models/dashboard.model';
import { CeRecord } from '../../../models/ce-record.model';
import { Credential } from '../../../models/credential.model';
import { CeProgressPanelComponent } from '../components/ce-progress-panel/ce-progress-panel.component';
import { DashboardHeaderComponent } from '../components/dashboard-header/dashboard-header.component';
import { ExpirationsPanelComponent } from '../components/expirations-panel/expirations-panel.component';
import { RecentActivityPanelComponent } from '../components/recent-activity-panel/recent-activity-panel.component';
import { StatsCardsComponent } from '../components/stats-cards/stats-cards.component';
import { DashboardService } from '../../../services/dashboard.service';
import { buildDashboardPageView } from '../utils/dashboard.mappers';
import { CeRecordDetailDrawerComponent } from '../../drawers/ce-record-detail-drawer/ce-record-detail-drawer.component';
import { CredentialDetailDrawerComponent } from '../../drawers/credential-detail-drawer/credential-detail-drawer.component';
import { CredentialListDrawerComponent } from '../../drawers/credential-list-drawer/credential-list-drawer.component';
import { DrawerShellComponent } from '../../drawers/drawer-shell/drawer-shell.component';
import { CredentialListMode, DrawerType } from '../../drawers/models/drawer.models';
import {
  buildCeRecordDetailDrawerView,
  buildCredentialDetailDrawerView,
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
    CredentialDetailDrawerComponent,
    CeRecordDetailDrawerComponent,
    CredentialListDrawerComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  private readonly authStore = inject(AuthStore);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly now = new Date();

  private readonly credentials = signal<Credential[]>([]);
  private readonly ceRecords = signal<CeRecord[]>([]);
  private readonly currentUserId = computed(() => this.authStore.currentUser()?.id ?? null);

  readonly isLoading = signal(true);
  readonly drawerType = signal<DrawerType | null>(null);
  readonly credentialListMode = signal<CredentialListMode>('expiring');
  readonly selectedCredentialId = signal<string | null>(null);
  readonly selectedCeRecordId = signal<string | null>(null);

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
      credentials: this.credentials(),
      ceRecords: this.ceRecords(),
      now: this.now,
      credentialById: (id) => this.credentials().find((credential) => credential.id === id),
    }),
  );

  readonly isDrawerOpen = computed(() => this.drawerType() !== null);

  readonly selectedCredential = computed<Credential | undefined>(() => {
    const credentialId = this.selectedCredentialId();
    return credentialId
      ? this.credentials().find((credential) => credential.id === credentialId)
      : undefined;
  });

  readonly selectedCeRecord = computed<CeRecord | undefined>(() => {
    const recordId = this.selectedCeRecordId();
    return recordId ? this.ceRecords().find((record) => record.id === recordId) : undefined;
  });

  readonly selectedCredentialDrawer = computed(() => {
    const credential = this.selectedCredential();

    if (!credential) {
      return undefined;
    }

    return buildCredentialDetailDrawerView({
      credential,
      ceRecords: this.ceRecords().filter((record) => record.credentialId === credential.id),
      now: this.now,
    });
  });

  readonly selectedCeRecordDrawer = computed(() => {
    const record = this.selectedCeRecord();

    if (!record) {
      return undefined;
    }

    const credential = this.credentials().find((item) => item.id === record.credentialId);
    return credential ? buildCeRecordDetailDrawerView({ record, credential }) : undefined;
  });

  readonly credentialListDrawer = computed(() => {
    const dashboard = this.dashboard();

    return buildCredentialListDrawerView({
      mode: this.credentialListMode(),
      credentials:
        this.credentialListMode() === 'expiring'
          ? dashboard.expirationBuckets.within90Days
          : dashboard.credentialsNeedingCE,
      now: this.now,
    });
  });

  readonly loadDashboardEffect = effect(() => {
    const userId = this.currentUserId();

    if (!userId) {
      this.credentials.set([]);
      this.ceRecords.set([]);
      this.dashboard.set(this.buildEmptyDashboard());
      this.isLoading.set(false);
      return;
    }

    this.loadDashboardData();
  });

  openCredentialDetail(credentialId: string): void {
    this.selectedCredentialId.set(credentialId);
    this.selectedCeRecordId.set(null);
    this.drawerType.set('credential-detail');
  }

  openCeRecordDetail(recordId: string): void {
    this.selectedCeRecordId.set(recordId);
    this.drawerType.set('ce-record-detail');
  }

  openCredentialList(mode: CredentialListMode): void {
    this.credentialListMode.set(mode);
    this.selectedCredentialId.set(null);
    this.selectedCeRecordId.set(null);
    this.drawerType.set('credential-list');
  }

  closeDrawer(): void {
    this.drawerType.set(null);
  }

  private readonly dashboard = signal<Dashboard>(this.buildEmptyDashboard());

  private loadDashboardData(): void {
    this.isLoading.set(true);

    this.dashboardService
      .getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ dashboard, credentials, ceRecords }) => {
          this.dashboard.set(dashboard);
          this.credentials.set(credentials);
          this.ceRecords.set(ceRecords);
          this.isLoading.set(false);
        },
        error: () => {
          this.dashboard.set(this.buildEmptyDashboard());
          this.credentials.set([]);
          this.ceRecords.set([]);
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
      expirationBuckets: {
        within30Days: [],
        within60Days: [],
        within90Days: [],
      },
      credentialsNeedingCE: [],
      recentCredentials: [],
    };
  }
}
