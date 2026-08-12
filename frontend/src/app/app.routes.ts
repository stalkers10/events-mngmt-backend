import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminOnlyGuard } from './core/guards/admin-only.guard';
import { superAdminOnlyGuard } from './core/guards/super-admin-only.guard';
import { homeRedirectGuard } from './core/guards/home-redirect.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'verify-otp',
    loadComponent: () =>
      import('./features/auth/verify-otp.component').then((m) => m.VerifyOtpComponent),
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      // ---- Super Admin-only screens ----
      {
        path: 'clients',
        canActivate: [superAdminOnlyGuard],
        loadComponent: () =>
          import('./features/clients/clients.component').then((m) => m.ClientsComponent),
      },

      // ---- Admin-only screens ----
      {
        path: 'dashboard',
        canActivate: [adminOnlyGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'venues',
        canActivate: [adminOnlyGuard],
        loadComponent: () =>
          import('./features/venues/venues.component').then((m) => m.VenuesComponent),
      },
      {
        path: 'events/:eventId/seating-map',
        canActivate: [adminOnlyGuard],
        loadComponent: () =>
          import('./features/seating-map/seating-map.component').then((m) => m.SeatingMapComponent),
      },
      {
        path: 'tickets/:ticketId',
        canActivate: [adminOnlyGuard],
        loadComponent: () =>
          import('./features/seating-map/ticket-preview.component').then((m) => m.TicketPreviewComponent),
      },
      {
        path: 'events/create',
        canActivate: [adminOnlyGuard],
        loadComponent: () =>
          import('./features/events/create/create-event.component').then((m) => m.CreateEventComponent),
      },
      {
        path: 'events',
        canActivate: [adminOnlyGuard],
        loadComponent: () =>
          import('./features/events/events.component').then((m) => m.EventsComponent),
      },
      {
        path: 'gate-staff',
        canActivate: [adminOnlyGuard],
        loadComponent: () =>
          import('./features/gate-staff/gate-staff.component').then((m) => m.GateStaffComponent),
      },

      // ---- Shared between Admin and Gate Staff ----
      {
        path: 'guest-list',
        loadComponent: () =>
          import('./features/guest-list/guest-list.component').then(
            (m) => m.GuestListComponent
          ),
      },
      {
        path: 'scanner',
        loadComponent: () =>
          import('./features/scanner/scanner.component').then((m) => m.ScannerComponent),
      },

      {
        path: '',
        pathMatch: 'full',
        canActivate: [homeRedirectGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
