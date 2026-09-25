import { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CarregamentoService } from '../carregamento/carregamento.service';
import { SEM_CARREGAMENTO } from '../carregamento/sem-carregamento';

/**
 * Conta as requisições em andamento para o indicador de carregamento (a barra do
 * topo e o botão clicado ocupado). Vem antes do `authInterceptor`: a renovação do
 * token no 401 e a nova tentativa contam como a mesma espera. As marcadas com
 * `SEM_CARREGAMENTO` (segundo plano, com sinal próprio) passam direto, e no
 * servidor (SSR) nada é contado.
 */
export const carregamentoInterceptor: HttpInterceptorFn = (req, next) => {
  const carregamento = inject(CarregamentoService);
  if (!carregamento.noNavegador || req.context.get(SEM_CARREGAMENTO)) return next(req);

  return new Observable<HttpEvent<unknown>>(assinante => {
    const atividade = carregamento.iniciar();
    // O que a tela fizer com a resposta (outra requisição, a navegação depois de
    // salvar) continua a espera do mesmo clique
    const assinatura = next(req).subscribe({
      next: evento => carregamento.durante(atividade, () => assinante.next(evento)),
      error: erro => carregamento.durante(atividade, () => assinante.error(erro)),
      complete: () => carregamento.durante(atividade, () => assinante.complete())
    });
    // Terminou, falhou ou foi cancelada (a tela saiu, veio outra busca)
    return () => {
      assinatura.unsubscribe();
      carregamento.terminar(atividade);
    };
  });
};
