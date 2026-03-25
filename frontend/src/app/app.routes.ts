import { Routes } from '@angular/router';

import { authChildGuard, authGuard, landingRedirectGuard } from './core/auth/auth.guard';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    canActivate: [landingRedirectGuard],
    loadComponent: () =>
      import('./features/landing-page/landing-page.component').then((m) => m.LandingPageComponent),
  },
  { path: 'app', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'app/dashboard', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'app/credentials', redirectTo: 'credentials', pathMatch: 'full' },
  { path: 'app/ce-records', redirectTo: 'ce-records', pathMatch: 'full' },
  {
    path: 'credentials/:credentialId/ce-report',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/ce-report/ce-report-page.component').then((m) => m.CeReportPageComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
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
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings-page.component').then(
            (m) => m.SettingsPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
