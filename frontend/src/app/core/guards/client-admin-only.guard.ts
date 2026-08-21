import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleType } from '../models/auth.model';

/** Billing belongs to a tenant and is only available to its Client Admin. */
export const clientAdminOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  if (auth.hasRole(RoleType.CLIENT_ADMIN)) return true;
  router.navigate(['/']);
  return false;
};
