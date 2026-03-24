import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { inject } from '@angular/core';
import { map, of, switchMap } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticate()) {
    router.navigate(['/auth']);
    return of(false);
  }

  return authService.isHaveUnidade().pipe(
    switchMap(temUnidade => {
      if (!temUnidade) {
        router.navigate(['/auth/selecionar-unidade']);
        return of(false);
      }

      return authService.getPerfil().pipe(
        map(perfil => {
          // Only redirect if we're not already on the target route
          if (perfil === 'centralit' && state.url !== '/centralit') {
            router.navigate(['/centralit']);
            return false;
          }
          if (perfil === 'parceiro' && state.url !== '/parceiro') {
            router.navigate(['/parceiro']);
            return false;
          }
          return true;
        })
      );
    })
  );
};
