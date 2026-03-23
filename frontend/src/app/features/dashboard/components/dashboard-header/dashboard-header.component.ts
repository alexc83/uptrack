import { Component, input } from '@angular/core';

import { DashboardHeaderView } from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard-header',
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
})
export class DashboardHeaderComponent {
  readonly header = input.required<DashboardHeaderView>();
}
