import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth';
import { NotificationService } from '../../core/services/notification.service';
import { ModuloId, mensagemSemAcesso, moduloPorId, temModulo } from '../../core/modulos/modulos';

/**
 * Entrada de um módulo: só passa quem tem o módulo no `Modulos` do /me. Revalida
 * no backend a cada entrada (acesso concedido ou retirado vale na hora, sem novo
 * login); se a consulta falhar, usa o perfil guardado. Quem não tem acesso volta
 * para a tela inicial com o aviso para pedir acesso pelo card do módulo.
 *
 * É usabilidade: a API recusa do mesmo jeito (política "modulo:*" em cada controller).
 */
export function moduloGuard(modulo: ModuloId): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const notificacoes = inject(NotificationService);

    return authService.refreshUser().pipe(
      switchMap(user => user ? of(user) : authService.getUser()),
      map(user => {
        if (!user) return router.parseUrl('/auth');
        if (temModulo(user, modulo)) return true;

        notificacoes.warning(mensagemSemAcesso(moduloPorId(modulo)));
        return router.parseUrl('/inicio');
      })
    );
  };
}
