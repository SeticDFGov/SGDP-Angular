import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService, PapeisContratacoes, Perfis } from '../../auth/services/auth';

/**
 * Área /analises: entra quem tem o papel do módulo (Users.PapelContratacoes)
 * ou é admin do SGDP. A conferência aqui é de usabilidade — a autorização real
 * é do backend (CtrPermissionService).
 *
 * Quem não entra volta para a área dele: o perfil 'basico' é confinado a /pgia
 * pelo authGuard, então mandá-lo a '/' criaria um laço de redirecionamentos.
 * Os demais vão a '/demandas' — '/' não casa rota nenhuma dentro do MainLayout
 * (daria NG04002 e tela em branco); '/demandas' é o destino real do login.
 */
export const contratacoesGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getUser().pipe(
    map(user => {
      const podeEntrar = user?.PapelContratacoes === PapeisContratacoes.Analise
        || user?.Perfil === Perfis.Admin;
      if (!podeEntrar) {
        router.navigate([user?.Perfil === Perfis.Basico ? '/pgia' : '/demandas']);
        return false;
      }
      return true;
    })
  );
};
