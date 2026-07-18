import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleType } from '../models/auth.model';

/**
 * Used on the empty child path ('') so landing on '/' sends each role to
 * their actual home screen: Admin -> Dashboard, Gate Staff -> Scanner
 * (their only real day-to-day screen now that Scanner is off Admin's nav).
 */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const role = auth.currentUser()?.role;
  if (role === RoleType.ADMIN) {
    router.navigate(['/dashboard']);
  } else {
    router.navigate(['/scanner']);
  }
  return false;
};
