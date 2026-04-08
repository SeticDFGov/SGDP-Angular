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
            // Proibido - usuário não tem permissão
            router.navigate(['/']);
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
