import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map } from 'rxjs/operators';

export const userConfiguredGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getUser().pipe(
    map(user => {
      // Usuário configurado: tem unidade e (perfil válido OU papel PGIA).
      // Um Responsável de IA cujo único vínculo é o PGIA não fica preso no pending-approval.
      const hasUnidade = !!user?.Unidade;
      const hasPerfil = !!user?.Perfil && user.Perfil !== 'basico';
      const hasPapelPgia = !!user?.PapelPgia;
      const isConfigured = hasUnidade && (hasPerfil || hasPapelPgia);

      if (!isConfigured) {
        router.navigate(['/pending-approval']);
        return false;
      }
      return true;
    })
  );
};
