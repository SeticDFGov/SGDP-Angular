import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';

/**
 * Porta de entrada da área /pgia: manda cada usuário para a primeira tela do
 * papel dele (o mesmo primeiro item do menu lateral), em vez de abrir sempre a
 * tela do órgão. Devolve sempre um UrlTree — nada é renderizado nesta rota.
 *
 * Não substitui o `pgiaGuard` nem os guards de autenticação: eles continuam
 * decidindo quem entra na área; aqui só se escolhe o destino.
 */
export const pgiaRaizGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getUser().pipe(
    map((user): UrlTree => {
      const papel = user?.PapelPgia ?? null;

      // Admin do SGDP tem acesso total: entra pelos dados do órgão, como antes.
      if (user?.Perfil === Perfis.Admin) {
        return router.parseUrl('/pgia/orgao/dados');
      }
      // O papel de órgão não edita os dados (quem preenche é a SGDI): a
      // primeira tela dele é a lista de pessoas.
      if (papel === PapeisPgia.Orgao) {
        return router.parseUrl('/pgia/orgao/pessoas');
      }
      if (papel === PapeisPgia.Sgdi) return router.parseUrl('/pgia/sgdi');
      if (papel === PapeisPgia.Cgtic) return router.parseUrl('/pgia/cgtic');
      if (papel === PapeisPgia.Auditoria) return router.parseUrl('/pgia/auditoria');

      // Sem papel no PGIA: registro de uso de IA (art. 13), dever de todo agente.
      return router.parseUrl('/pgia/uso');
    })
  );
};
