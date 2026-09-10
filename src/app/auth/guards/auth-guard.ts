import { CanActivateFn, Router } from '@angular/router';
import { AuthService, PapeisContratacoes } from '../services/auth';
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
        router.navigate(['/pending-approval']);
        return of(false);
      }

      return authService.getUser().pipe(
        map(user => {
          const perfil = user?.Perfil ?? null;
          // Perfil 'basico' fica confinado à área /pgia — mas só quando o órgão
          // dele tem acesso ao módulo (AcessoPgia, role "pgia" do Keycloak no
          // grupo). Sem isso, forçar /pgia criaria um laço com o pgiaGuard
          // (que rejeita e manda a /pending-approval); esse usuário segue livre
          // para /pending-approval, mas não para o resto do sistema.
          // Exceção (módulo Análises de Contratações): o confinamento admite
          // também /analises para quem tem PapelContratacoes — os analistas da
          // SGDI são 'basico' e precisam da área do módulo, com ou sem AcessoPgia.
          const temAcessoContratacoes = state.url.startsWith('/analises')
            && user?.PapelContratacoes === PapeisContratacoes.Analise;
          const confinadoAoPgia = perfil === 'basico' && !!user?.AcessoPgia;
          if (confinadoAoPgia && !state.url.startsWith('/pgia') && !temAcessoContratacoes) {
            router.navigate(['/pgia']);
            return false;
          }
          if (perfil === 'basico' && !user?.AcessoPgia && !temAcessoContratacoes
            && !state.url.startsWith('/pgia') && state.url !== '/pending-approval') {
            router.navigate(['/pending-approval']);
            return false;
          }
          return true;
        })
      );
    })
  );
};
