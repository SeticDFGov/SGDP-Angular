import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map } from 'rxjs/operators';

export const userConfiguredGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isUserFullyConfigured().pipe(
    map(isConfigured => {
      if (!isConfigured) {
        router.navigate(['/pending-approval']);
        return false;
      }
      return true;
    })
  );
};
