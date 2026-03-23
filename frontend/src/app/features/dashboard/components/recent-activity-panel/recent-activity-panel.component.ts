import { Component, input } from '@angular/core';
import { CardModule } from 'primeng/card';

import { RecentActivityRowView } from '../../models/dashboard.models';

@Component({
  selector: 'app-recent-activity-panel',
  imports: [CardModule],
  templateUrl: './recent-activity-panel.component.html',
  styleUrl: './recent-activity-panel.component.scss',
})
export class RecentActivityPanelComponent {
  readonly rows = input.required<RecentActivityRowView[]>();
}
