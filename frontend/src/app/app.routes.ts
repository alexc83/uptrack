import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'credentials',
        loadComponent: () =>
          import('./features/credentials/credentials.component').then(
            (m) => m.CredentialsComponent,
          ),
      },
      {
        path: 'ce-records',
        loadComponent: () =>
          import('./features/ce-records/ce-records.component').then(
            (m) => m.CeRecordsComponent,
          ),
      },
    ],
  },
];
