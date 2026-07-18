import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleType } from '../models/auth.model';

/**
 * Restricts a route to Admin only. Gate Staff hitting an admin route
 * (e.g. by typing the URL directly) gets redirected to their scanner
 * home rather than left on a blank/broken page.
 *
 * NOTE: this is a UX convenience only. The real enforcement happens on
 * the backend (requireRole middleware) — this guard must never be
 * treated as the security boundary.
 */
export const adminOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.hasRole(RoleType.ADMIN)) {
    return true;
  }

  router.navigate(['/scanner']);
  return false;
};
