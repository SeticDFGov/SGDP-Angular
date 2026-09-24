import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PaginaPePdtics,
  PeAndamentoPdtic,
  PeComentario,
  PeComentarioForm,
  PeFormatoPlanilha,
  PeNaoSeAplicaForm,
  PePdtic,
  PePdticNovoForm,
  PePdticsConsulta,
  PeSistemaIaPgia,
  PeTemasDoPdtic
} from '../../../api/planejamento/interface';

/**
 * PDTIC de cada órgão (api/planejamento/pdtic): o PDTIC atual, a abertura, a
 * situação dos passos, o "não se aplica", os temas das ações, os sistemas de IA
 * do PGIA, os comentários e as planilhas consolidadas. Os registros de cada
 * seção vão pelo `PeRegistrosService` (dono `pdtic`).
 *
 * Quem pode: o papel de órgão lê o PDTIC do próprio órgão (a equipe edita); os
 * papéis globais e o admin do SGDP leem o de qualquer órgão (e só eles listam os
 * PDTICs e baixam o consolidado). O 403 tira a pessoa do módulo (interceptor): as
 * telas só chamam o que o papel dela pode.
 */
@Injectable({ providedIn: 'root' })
export class PePdticService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento`;

  /** O PDTIC atual do órgão (sem `orgaoId`, o do próprio órgão de quem chama), ou null (204: ainda não foi aberto). */
  atual(orgaoId?: number | null): Observable<PePdtic | null> {
    const params = orgaoId ? new HttpParams().set('orgaoId', orgaoId) : undefined;
    return this.http.get<PePdtic | null>(`${this.apiUrl}/pdtic/atual`, { params }).pipe(map(p => p ?? null));
  }

  /** Abre o PDTIC do órgão (versão 1.0, em elaboração). 409 se já há um atual. */
  abrir(orgaoId: number | null = null): Observable<PePdtic> {
    const corpo: PePdticNovoForm = { OrgaoId: orgaoId };
    return this.http.post<PePdtic>(`${this.apiUrl}/pdtic`, corpo);
  }

  obter(id: number): Observable<PePdtic> {
    return this.http.get<PePdtic>(`${this.apiUrl}/pdtic/${id}`);
  }

  /** Os PDTICs atuais de todos os órgãos (papéis globais e admin do SGDP). */
  listar(consulta: PePdticsConsulta): Observable<PaginaPePdtics> {
    let params = new HttpParams().set('Page', consulta.Page).set('PageSize', consulta.PageSize);
    if (consulta.Situacao) params = params.set('Situacao', consulta.Situacao);
    const filtro = consulta.Filtro?.trim();
    if (filtro) params = params.set('Filtro', filtro);
    return this.http.get<PaginaPePdtics>(`${this.apiUrl}/pdtic`, { params });
  }

  /** Situação de cada passo, os avisos do guia e o próximo passo recomendado. */
  situacao(id: number): Observable<PeAndamentoPdtic> {
    return this.http.get<PeAndamentoPdtic>(`${this.apiUrl}/pdtic/${id}/situacao`);
  }

  /** Marca "não se aplica" (só passo opcional no nível do órgão que aceita; travado nunca: 409). */
  marcarNaoSeAplica(id: number, passoId: number, justificativa: string): Observable<unknown> {
    const corpo: PeNaoSeAplicaForm = { Justificativa: justificativa };
    return this.http.put(`${this.apiUrl}/pdtic/${id}/passos/${passoId}/nao-se-aplica`, corpo);
  }

  desfazerNaoSeAplica(id: number, passoId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/pdtic/${id}/passos/${passoId}/nao-se-aplica`);
  }

  /** As ações de cada tema do decreto (V, VI e IX) e a justificativa de quem ficou sem ação. */
  temas(id: number): Observable<PeTemasDoPdtic> {
    return this.http.get<PeTemasDoPdtic>(`${this.apiUrl}/pdtic/${id}/temas`);
  }

  /** O inventário de sistemas de IA do órgão no PGIA (só leitura). */
  sistemasIaPgia(id: number): Observable<PeSistemaIaPgia[]> {
    return this.http.get<PeSistemaIaPgia[]>(`${this.apiUrl}/pdtic/${id}/ia/pgia`);
  }

  /** Comentários de um passo (os de primeiro nível, cada um com as respostas). */
  comentarios(id: number, passoId: number): Observable<PeComentario[]> {
    const params = new HttpParams().set('passoId', passoId);
    return this.http.get<PeComentario[]>(`${this.apiUrl}/pdtic/${id}/comentarios`, { params });
  }

  comentar(id: number, form: PeComentarioForm): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/pdtic/${id}/comentarios`, form);
  }

  resolverComentario(comentarioId: number): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/comentarios/${comentarioId}/resolver`, {});
  }

  /** Uma seção com os registros de todos os PDTICs atuais (papéis globais e admin do SGDP). */
  consolidado(secaoChave: string, formato: PeFormatoPlanilha): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/consolidado/${encodeURIComponent(secaoChave)}`, {
      params: new HttpParams().set('formato', formato),
      responseType: 'blob',
      observe: 'response'
    });
  }

  /** Todas as seções num XLSX (uma aba por seção e a aba Leia-me). */
  consolidadoCompleto(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/consolidado`, {
      params: new HttpParams().set('formato', 'xlsx'),
      responseType: 'blob',
      observe: 'response'
    });
  }
}
