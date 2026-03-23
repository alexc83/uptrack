import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { CredentialListDrawerView } from '../models/drawer.models';

@Component({
  selector: 'app-credential-list-drawer',
  imports: [ButtonModule],
  templateUrl: './credential-list-drawer.component.html',
  styleUrl: './credential-list-drawer.component.scss',
})
export class CredentialListDrawerComponent {
  readonly view = input.required<CredentialListDrawerView>();

  readonly close = output<void>();
  readonly credentialSelected = output<string>();
}
