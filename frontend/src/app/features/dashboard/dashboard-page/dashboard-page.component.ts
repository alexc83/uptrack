import { Component } from '@angular/core';

import {
  MOCK_CE_RECORDS,
  MOCK_CREDENTIALS,
  MOCK_DASHBOARD,
  MOCK_USER,
  getMockCredentialById,
} from '../../../../lib/mock-data';
import { CeProgressPanelComponent } from '../components/ce-progress-panel/ce-progress-panel.component';
import { DashboardHeaderComponent } from '../components/dashboard-header/dashboard-header.component';
import { ExpirationsPanelComponent } from '../components/expirations-panel/expirations-panel.component';
import { RecentActivityPanelComponent } from '../components/recent-activity-panel/recent-activity-panel.component';
import { StatsCardsComponent } from '../components/stats-cards/stats-cards.component';
import { buildDashboardPageView } from '../utils/dashboard.mappers';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    DashboardHeaderComponent,
    StatsCardsComponent,
    ExpirationsPanelComponent,
    CeProgressPanelComponent,
    RecentActivityPanelComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  readonly view = buildDashboardPageView({
    user: MOCK_USER,
    dashboard: MOCK_DASHBOARD,
    credentials: MOCK_CREDENTIALS,
    ceRecords: MOCK_CE_RECORDS,
    now: new Date(),
    credentialById: getMockCredentialById,
  });
}
