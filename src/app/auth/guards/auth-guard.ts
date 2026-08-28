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

      return authService.getUser().pipe(
        map(user => {
          const perfil = user?.Perfil ?? null;
          // Only redirect if we're not already on the target route.
          // A área /pgia é permitida a qualquer perfil (o pgiaGuard cuida do papel).
          if (perfil === 'centralit' && state.url !== '/centralit' && !state.url.startsWith('/pgia')) {
            router.navigate(['/centralit']);
            return false;
          }
          if (perfil === 'parceiro' && state.url !== '/parceiro' && !state.url.startsWith('/pgia')) {
            router.navigate(['/parceiro']);
            return false;
          }
          // Perfil 'basico' (com ou sem papel PGIA) fica confinado à área /pgia,
          // no mesmo padrão de centralit/parceiro. Sem papel, o pgiaGuard o leva
          // ao registro de uso de IA (art. 13) — dever de todo agente público.
          if (perfil === 'basico' && !state.url.startsWith('/pgia')) {
            router.navigate(['/pgia']);
            return false;
          }
          return true;
        })
      );
    })
  );
};
