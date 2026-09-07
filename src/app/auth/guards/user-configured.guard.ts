import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map } from 'rxjs/operators';

export const userConfiguredGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getUser().pipe(
    map(user => {
      // Usuário configurado: tem unidade. Perfil 'basico' com unidade não fica
      // mais preso no pending-approval: entra confinado a /pgia para cumprir o
      // art. 13 (registrar uso de IA) — decisão registrada no CLAUDE.md.
      const isConfigured = !!user?.Unidade;

      if (!isConfigured) {
        router.navigate(['/pending-approval']);
        return false;
      }
      return true;
    })
  );
};
