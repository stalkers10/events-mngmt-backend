import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleType } from '../models/auth.model';

/**
 * Restricts a route to Super Admin only.
 */
export const superAdminOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.hasRole(RoleType.SUPER_ADMIN)) {
    return true;
  }

  // If not super admin but authenticated, redirect to default authenticated route
  router.navigate(['/']);
  return false;
};
