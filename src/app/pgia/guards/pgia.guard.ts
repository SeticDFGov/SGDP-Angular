import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService, PapeisContratacoes } from '../../auth/services/auth';

/**
 * Área /pgia: entra quem tem acesso ao módulo (AcessoPgia — role "pgia" do
 * Keycloak, atribuída ao grupo/órgão) ou é admin do SGDP. O órgão sem a role
 * fica de fora inclusive do art. 13 (registro de uso e aviso de incidente):
 * o acesso ao módulo é por órgão cadastrado no PGIA, não por perfil individual.
 * A autorização real é do backend; aqui é só usabilidade.
 */
export const pgiaGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getUser().pipe(
    map(user => {
      const canAccess = !!user?.AcessoPgia || user?.Perfil === 'admin';
      if (!canAccess) {
        // Quem tem o papel de Análises de Contratações e nenhum acesso ao PGIA
        // pertence ao outro módulo: o desvio o leva para lá em vez do
        // pending-approval — é o que faz o login dele aterrissar em /analises.
        if (user?.PapelContratacoes === PapeisContratacoes.Analise) {
          router.navigate(['/analises']);
          return false;
        }
        // 'basico' é confinado a /pgia pelo authGuard — mandá-lo a '/' criaria um
        // laço de redirecionamentos. Sem a role pgia (órgão não habilitado no
        // PGIA), o destino é o mesmo do usuário ainda não configurado.
        router.navigate([user?.Perfil === 'basico' ? '/pending-approval' : '/']);
        return false;
      }
      return true;
    })
  );
};
