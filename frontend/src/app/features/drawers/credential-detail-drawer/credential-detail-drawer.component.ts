import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { CredentialDetailDrawerView } from '../models/drawer.models';

@Component({
  selector: 'app-credential-detail-drawer',
  imports: [ButtonModule],
  templateUrl: './credential-detail-drawer.component.html',
  styleUrl: './credential-detail-drawer.component.scss',
})
export class CredentialDetailDrawerComponent {
  readonly view = input.required<CredentialDetailDrawerView>();

  readonly close = output<void>();
  readonly ceRecordSelected = output<string>();
}
