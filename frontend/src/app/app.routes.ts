import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing-page/landing-page.component').then((m) => m.LandingPageComponent),
  },
  { path: 'dashboard', redirectTo: 'app/dashboard', pathMatch: 'full' },
  { path: 'credentials', redirectTo: 'app/credentials', pathMatch: 'full' },
  { path: 'ce-records', redirectTo: 'app/ce-records', pathMatch: 'full' },
  {
    path: 'app',
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
  { path: '**', redirectTo: '' },
];
