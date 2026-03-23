import { Component, input } from '@angular/core';
import { CardModule } from 'primeng/card';

import { DashboardStatCardView } from '../../models/dashboard.models';

@Component({
  selector: 'app-stats-cards',
  imports: [CardModule],
  templateUrl: './stats-cards.component.html',
  styleUrl: './stats-cards.component.scss',
})
export class StatsCardsComponent {
  readonly cards = input.required<DashboardStatCardView[]>();
}
