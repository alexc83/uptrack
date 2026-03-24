import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { CeRecordDetailDrawerView, DrawerActionId } from '../models/drawer.models';

@Component({
  selector: 'app-ce-record-detail-drawer',
  imports: [ButtonModule],
  templateUrl: './ce-record-detail-drawer.component.html',
  styleUrl: './ce-record-detail-drawer.component.scss',
})
export class CeRecordDetailDrawerComponent {
  readonly view = input.required<CeRecordDetailDrawerView>();
  readonly isRemovingCertificate = input(false);

  readonly close = output<void>();
  readonly credentialSelected = output<string>();
  readonly actionSelected = output<DrawerActionId>();
  readonly certificateRemoveSelected = output<void>();
}
