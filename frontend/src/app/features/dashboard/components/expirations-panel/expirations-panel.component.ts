import { Component, input } from '@angular/core';
import { CardModule } from 'primeng/card';

import { UpcomingExpirationRowView } from '../../models/dashboard.models';

@Component({
  selector: 'app-expirations-panel',
  imports: [CardModule],
  templateUrl: './expirations-panel.component.html',
  styleUrl: './expirations-panel.component.scss',
})
export class ExpirationsPanelComponent {
  readonly rows = input.required<UpcomingExpirationRowView[]>();
  readonly overflowCount = input(0);
}
