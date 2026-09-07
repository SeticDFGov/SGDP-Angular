import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Revalida o perfil direto no backend (não confia no cache do localStorage):
  // acesso à área admin não pode depender de um Perfil desatualizado.
  return authService.refreshUser().pipe(
    map(user => {
      if (!user || user.Perfil !== 'admin') {
        router.navigate(['/']);
        return false;
      }
      return true;
    })
  );
};
