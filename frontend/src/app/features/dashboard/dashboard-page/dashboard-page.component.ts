import { Component, computed, signal } from '@angular/core';

import {
  MOCK_CE_RECORDS,
  MOCK_CREDENTIALS,
  MOCK_DASHBOARD,
  MOCK_USER,
  getMockCredentialById,
  getMockCeRecordsForCredential,
} from '../../../../lib/mock-data';
import { CeRecord } from '../../../models/ce-record.model';
import { Credential } from '../../../models/credential.model';
import { CeProgressPanelComponent } from '../components/ce-progress-panel/ce-progress-panel.component';
import { DashboardHeaderComponent } from '../components/dashboard-header/dashboard-header.component';
import { ExpirationsPanelComponent } from '../components/expirations-panel/expirations-panel.component';
import { RecentActivityPanelComponent } from '../components/recent-activity-panel/recent-activity-panel.component';
import { StatsCardsComponent } from '../components/stats-cards/stats-cards.component';
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
  private readonly now = new Date();
  private readonly credentials = MOCK_CREDENTIALS;
  private readonly ceRecords = MOCK_CE_RECORDS;
  private readonly dashboard = MOCK_DASHBOARD;

  readonly view = buildDashboardPageView({
    user: MOCK_USER,
    dashboard: this.dashboard,
    credentials: this.credentials,
    ceRecords: this.ceRecords,
    now: this.now,
    credentialById: getMockCredentialById,
  });

  readonly drawerType = signal<DrawerType | null>(null);
  readonly credentialListMode = signal<CredentialListMode>('expiring');
  readonly selectedCredentialId = signal<string | null>(null);
  readonly selectedCeRecordId = signal<string | null>(null);

  readonly isDrawerOpen = computed(() => this.drawerType() !== null);

  readonly selectedCredential = computed<Credential | undefined>(() => {
    const credentialId = this.selectedCredentialId();
    return credentialId ? this.credentials.find((credential) => credential.id === credentialId) : undefined;
  });

  readonly selectedCeRecord = computed<CeRecord | undefined>(() => {
    const recordId = this.selectedCeRecordId();
    return recordId ? this.ceRecords.find((record) => record.id === recordId) : undefined;
  });

  readonly selectedCredentialDrawer = computed(() => {
    const credential = this.selectedCredential();

    if (!credential) {
      return undefined;
    }

    return buildCredentialDetailDrawerView({
      credential,
      ceRecords: getMockCeRecordsForCredential(credential.id),
      now: this.now,
    });
  });

  readonly selectedCeRecordDrawer = computed(() => {
    const record = this.selectedCeRecord();

    if (!record) {
      return undefined;
    }

    const credential = getMockCredentialById(record.credentialId);
    return credential ? buildCeRecordDetailDrawerView({ record, credential }) : undefined;
  });

  readonly credentialListDrawer = computed(() =>
    buildCredentialListDrawerView({
      mode: this.credentialListMode(),
      credentials:
        this.credentialListMode() === 'expiring'
          ? this.dashboard.expirationBuckets.within90Days
          : this.dashboard.credentialsNeedingCE,
      now: this.now,
    }),
  );

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
}
