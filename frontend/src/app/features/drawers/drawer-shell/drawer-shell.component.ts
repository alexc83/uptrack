import { Component, input, output } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'app-drawer-shell',
  imports: [DrawerModule],
  templateUrl: './drawer-shell.component.html',
  styleUrl: './drawer-shell.component.scss',
})
export class DrawerShellComponent {
  readonly open = input(false);
  readonly close = output<void>();
}
