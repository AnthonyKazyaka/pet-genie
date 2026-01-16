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
    path: 'today',
    loadComponent: () =>
      import('./features/today/today.component').then(
        (m) => m.TodayComponent
      ),
  },
  {
    path: 'visit/:id',
    loadComponent: () =>
      import('./features/today/visit-detail.component').then(
        (m) => m.VisitDetailComponent
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
    path: 'export',
    loadComponent: () =>
      import('./features/export/export.component').then(
        (m) => m.ExportComponent
      ),
  },
  {
    path: 'clients',
    loadComponent: () =>
      import('./features/clients/clients.component').then(
        (m) => m.ClientsComponent
      ),
  },
  {
    path: 'clients/:id',
    loadComponent: () =>
      import('./features/clients/client-detail.component').then(
        (m) => m.ClientDetailComponent
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
