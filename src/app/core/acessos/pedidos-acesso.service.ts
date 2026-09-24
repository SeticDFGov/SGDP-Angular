import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  MeuPedidoAcesso,
  PaginaPedidosAcesso,
  PedidoAcesso,
  PedidosAcessoConsulta
} from '../../../api/acessos/interface';

/**
 * Pedidos de acesso aos módulos (api/pedidos-acesso). Qualquer pessoa logada pede
 * e acompanha os próprios pedidos, mesmo sem módulo algum; a Administração decide
 * todos, a SGDI decide os do PGIA e o administrador da Governança Estratégica, os
 * do módulo dele. O token vai pelo interceptor.
 */
@Injectable({ providedIn: 'root' })
export class PedidosAcessoService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = `${SERVICE_API_URL}/api/pedidos-acesso`;

  /**
   * Pedidos esperando a decisão de quem está logado: o contador da aba da
   * Administração e dos cards da tela inicial. `null` enquanto não foi consultado.
   */
  readonly pendentes = signal<number | null>(null);

  pedir(modulo: string, justificativa: string | null): Observable<MeuPedidoAcesso> {
    return this.http.post<MeuPedidoAcesso>(this.apiUrl, { Modulo: modulo, Justificativa: justificativa });
  }

  meus(): Observable<MeuPedidoAcesso[]> {
    return this.http.get<MeuPedidoAcesso[]>(`${this.apiUrl}/meus`);
  }

  listar(consulta: PedidosAcessoConsulta): Observable<PaginaPedidosAcesso> {
    let params = new HttpParams()
      .set('Page', consulta.Page)
      .set('PageSize', consulta.PageSize);
    if (consulta.Situacao) params = params.set('Situacao', consulta.Situacao);
    if (consulta.Modulo) params = params.set('Modulo', consulta.Modulo);
    if (consulta.Filtro?.trim()) params = params.set('Filtro', consulta.Filtro.trim());

    return this.http.get<PaginaPedidosAcesso>(this.apiUrl, { params });
  }

  /** Quantos pedidos esperam a decisão de quem está logado (zero para quem não decide). */
  contarPendentes(modulo?: string): Observable<{ Total: number }> {
    const params = modulo ? new HttpParams().set('modulo', modulo) : undefined;
    return this.http.get<{ Total: number }>(`${this.apiUrl}/pendentes`, { params });
  }

  /** Recarrega o contador geral. Falha deixa o valor anterior (é só um aviso). */
  atualizarPendentes(): void {
    // No SSR não há sessão: o contador só existe no navegador
    if (!isPlatformBrowser(this.platformId)) return;
    this.contarPendentes().subscribe({
      next: resposta => this.pendentes.set(resposta.Total),
      error: () => { }
    });
  }

  /**
   * Libera o módulo na hora. No PGIA, `papelPgia` nulo = agente público. Na
   * Governança Estratégica o papel é obrigatório (`papelPlanejamento`); ele só vai
   * no corpo quando informado, e os pedidos dos outros módulos seguem iguais.
   */
  aprovar(id: number, papelPgia: string | null = null, papelPlanejamento: string | null = null): Observable<PedidoAcesso> {
    const corpo: { PapelPgia: string | null; PapelPlanejamento?: string } = { PapelPgia: papelPgia };
    if (papelPlanejamento) corpo.PapelPlanejamento = papelPlanejamento;
    return this.http.post<PedidoAcesso>(`${this.apiUrl}/${id}/aprovar`, corpo);
  }

  recusar(id: number, motivo: string): Observable<PedidoAcesso> {
    return this.http.post<PedidoAcesso>(`${this.apiUrl}/${id}/recusar`, { Motivo: motivo });
  }
}
