import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../../auth/services/auth';
import { NotificationService } from '../services/notification.service';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const notificacoes = inject(NotificationService);

  let modifiedReq = req;

  if (isPlatformBrowser(platformId)) {
    const token = authService.getToken();

    if (token) {
      modifiedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isPlatformBrowser(platformId)) {
        switch (error.status) {
          case 401:
            if (req.url.includes('/refresh')) {
              authService.logout();
              router.navigate(['/auth']);
              return throwError(() => error);
            }

            const refreshToken = authService.getRefreshToken();
            if (refreshToken) {
              return authService.refreshToken().pipe(
                switchMap(() => {
                  const newToken = authService.getToken();
                  const retryReq = req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${newToken}`
                    }
                  });
                  return next(retryReq);
                }),
                catchError(refreshError => {
                  authService.logout();
                  router.navigate(['/auth']);
                  return throwError(() => refreshError);
                })
              );
            }

            authService.logout();
            router.navigate(['/auth']);
            break;

          case 403:
            // Proibido: a API recusou pelo módulo ou pelo papel (isolamento entre
            // módulos). Volta para a tela inicial explicando o porquê.
            notificacoes.warning('Você não tem acesso a esta área. Se precisar dela, peça acesso pelo card do módulo na tela inicial.');
            router.navigate(['/inicio']);
            break;

          case 404:
            // Não encontrado
            break;

          case 500:
            // Erro interno do servidor
            break;

          case 0:
            // Erro de rede/CORS
            break;

          default:
            // Outros erros
        }
      }

      // Propagar erro para o componente tratar se necessário
      return throwError(() => error);
    })
  );
};
