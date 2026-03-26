import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../../auth/services/auth';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

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
              console.error('Refresh token inválido. Redirecionando para login...');
              authService.logout();
              router.navigate(['/auth']);
              return throwError(() => error);
            }

            const refreshToken = authService.getRefreshToken();
            if (refreshToken) {
              console.log('Token expirado. Tentando renovar...');
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
                  console.error('Falha ao renovar token. Redirecionando para login...');
                  authService.logout();
                  router.navigate(['/auth']);
                  return throwError(() => refreshError);
                })
              );
            }

            console.error('Não autorizado. Redirecionando para login...');
            authService.logout();
            router.navigate(['/auth']);
            break;

          case 403:
            // Proibido - usuário não tem permissão
            console.error('Acesso negado. Você não tem permissão para acessar este recurso.');
            router.navigate(['/']);
            break;

          case 404:
            // Não encontrado
            console.error('Recurso não encontrado:', error.url);
            break;

          case 500:
            // Erro interno do servidor
            console.error('Erro interno do servidor:', error.message);
            break;

          case 0:
            // Erro de rede/CORS
            console.error('Erro de conexão. Verifique sua internet ou se o backend está rodando.');
            break;

          default:
            // Outros erros
            console.error('Erro HTTP:', error.status, error.message);
        }
      }

      // Propagar erro para o componente tratar se necessário
      return throwError(() => error);
    })
  );
};
