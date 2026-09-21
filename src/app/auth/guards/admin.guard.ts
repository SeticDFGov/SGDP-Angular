import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth';
import { NotificationService } from '../../core/services/notification.service';
import { Modulos, mensagemSemAcesso, moduloPorId } from '../../core/modulos/modulos';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificacoes = inject(NotificationService);

  // Revalida o perfil direto no backend (não confia no cache do localStorage):
  // acesso à área admin não pode depender de um Perfil desatualizado.
  return authService.refreshUser().pipe(
    map(user => {
      if (!user || user.Perfil !== 'admin') {
        notificacoes.warning(mensagemSemAcesso(moduloPorId(Modulos.Administracao)));
        return router.parseUrl('/inicio');
      }
      return true;
    })
  );
};
