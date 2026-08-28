import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../../auth/services/auth';

/**
 * Área /pgia: entra quem tem papel PGIA (Users.PapelPgia) ou é admin do SGDP.
 * Exceção do art. 13 (registro de uso e aviso de incidente): abertas a qualquer
 * autenticado — o backend restringe pelo órgão resolvido (PodeRegistrarUso).
 * A autorização real é do backend; aqui é só usabilidade.
 */
export const pgiaGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Formulários do art. 13: dever de todo agente, com ou sem papel PGIA
  if (state.url.startsWith('/pgia/uso') || state.url.startsWith('/pgia/incidentes')) {
    return true; // o authGuard da rota-mãe já garantiu a autenticação
  }

  return authService.canAccessPgia().pipe(
    map(canAccess => {
      if (!canAccess) {
        router.navigate(['/']);
        return false;
      }
      return true;
    })
  );
};
