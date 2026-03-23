import { Component } from '@angular/core';

import { DashboardPageComponent } from './dashboard-page/dashboard-page.component';

@Component({
  selector: 'app-dashboard',
  imports: [DashboardPageComponent],
  template: `<app-dashboard-page />`,
})
export class DashboardComponent {}
