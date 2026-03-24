import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { DashboardHeaderView } from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard-header',
  imports: [ButtonModule],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
})
export class DashboardHeaderComponent {
  readonly header = input.required<DashboardHeaderView>();
  readonly addCredentialRequested = output<void>();
}
