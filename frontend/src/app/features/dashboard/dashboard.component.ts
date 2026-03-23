import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `<h2>Main</h2>`,
  styles: [`
    h2 {
      padding: 2rem;
      color: var(--text-color);
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }
  `],
})
export class DashboardComponent {}
