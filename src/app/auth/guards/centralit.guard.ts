import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth';

export const centralitGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isCentralIT().pipe(
    map(isCentralIT => {
      if (!isCentralIT) {
        router.navigate(['/']);
        return false;
      }
      return true;
    })
  );
};
