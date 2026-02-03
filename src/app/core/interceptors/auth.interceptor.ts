import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../auth/services/auth';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

/**
 * HTTP Interceptor para:
 * 1. Adicionar token JWT automaticamente em todas requisições
 * 2. Tratar erros globalmente (401, 403, 500, etc)
 * 3. Redirecionar para login em caso de não autorização
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Clonar requisição para adicionar headers (se necessário)
  let modifiedReq = req;

  // Adicionar token JWT apenas no browser (não no SSR)
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

  // Processar requisição e tratar erros
  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Apenas processar erros no browser
      if (isPlatformBrowser(platformId)) {
        switch (error.status) {
          case 401:
            // Não autorizado - token inválido ou expirado
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
