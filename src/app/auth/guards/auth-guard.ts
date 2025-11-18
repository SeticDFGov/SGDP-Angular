import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { inject } from '@angular/core';
import { map, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticate()) {
    router.navigate(['/auth']);
    return of(false);
  }

  return authService.isHaveUnidade().pipe(
    map(temUnidade => {
      if (temUnidade) {
        return true;
      } else {
        router.navigate(['/auth/selecionar-unidade']);
        return false;
      }
    })
  );
};
