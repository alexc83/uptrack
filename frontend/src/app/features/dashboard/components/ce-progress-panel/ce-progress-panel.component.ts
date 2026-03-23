import { Component, input, output } from '@angular/core';
import { CardModule } from 'primeng/card';

import { CeProgressRowView } from '../../models/dashboard.models';

@Component({
  selector: 'app-ce-progress-panel',
  imports: [CardModule],
  templateUrl: './ce-progress-panel.component.html',
  styleUrl: './ce-progress-panel.component.scss',
})
export class CeProgressPanelComponent {
  readonly rows = input.required<CeProgressRowView[]>();
  readonly overflowCount = input(0);
  readonly rowSelected = output<string>();
  readonly overflowSelected = output<void>();
}
