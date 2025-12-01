import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./features/calendar/calendar.component').then(
        (m) => m.CalendarComponent
      ),
  },
  {
    path: 'templates',
    loadComponent: () =>
      import('./features/templates/templates.component').then(
        (m) => m.TemplatesComponent
      ),
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./features/analytics/analytics.component').then(
        (m) => m.AnalyticsComponent
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent
      ),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
