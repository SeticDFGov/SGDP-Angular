import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { inject } from '@angular/core';

/**
 * Só exige sessão válida. O que o usuário enxerga depois do login não depende
 * mais do perfil nem da unidade: a tela inicial mostra os módulos (a
 * Administração só para administradores) e cada módulo tem o seu guard
 * (`moduloGuard`), espelhando a política do backend. Quem entra sem acesso a
 * módulo algum vê os cards desativados e pode pedir acesso por eles.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticate()) {
    return router.parseUrl('/auth');
  }
  return true;
};
