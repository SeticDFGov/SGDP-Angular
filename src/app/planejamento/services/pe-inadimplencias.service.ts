import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PaginaPeInadimplencias,
  PeInadimplencia,
  PeInadimplenciasConsulta,
  PeJustificativaForm,
  PeNotificacaoForm,
  PeRegistroInadimplenciaForm,
  PeSaneamentoForm
} from '../../../api/planejamento/interface';

/**
 * Notificações e inadimplências (E8; arts. 7º, § 3º, e 11 do Decreto nº
 * 48.899/2026): a notificação grava o prazo de 5 dias úteis; a justificativa
 * aceita encerra; a inadimplência se registra só depois do prazo (senão 409), com
 * o motivo e a nota de motivação; o saneamento guarda a data e tira a marca do
 * painel. Todas as ações devolvem a inadimplência como ficou; erro de validação é
 * 400 com `Campos`.
 *
 * Quem pode: a lista de todos os órgãos, os papéis globais e o admin do SGDP; as
 * do próprio órgão, também a equipe e a consulta do órgão (só leitura); registrar,
 * o administrador do módulo, a SGDI e o admin do SGDP. O 403 tira a pessoa do
 * módulo (interceptor): as telas só chamam o que o papel dela pode.
 */
@Injectable({ providedIn: 'root' })
export class PeInadimplenciasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento`;

  /** As notificações de todos os órgãos (as vigentes primeiro), paginadas. */
  listar(consulta: PeInadimplenciasConsulta): Observable<PaginaPeInadimplencias> {
    let params = new HttpParams().set('Page', consulta.Page).set('PageSize', consulta.PageSize);
    if (consulta.Situacao) params = params.set('Situacao', consulta.Situacao);
    if (consulta.OrgaoId) params = params.set('OrgaoId', consulta.OrgaoId);
    return this.http.get<PaginaPeInadimplencias>(`${this.apiUrl}/inadimplencias`, { params });
  }

  /** As notificações de um órgão (a equipe e a consulta do órgão leem as do próprio órgão). */
  doOrgao(orgaoId: number): Observable<PeInadimplencia[]> {
    return this.http.get<PeInadimplencia[] | null>(`${this.apiUrl}/orgaos/${orgaoId}/inadimplencias`).pipe(map(lista => lista ?? []));
  }

  /** Registra a notificação do órgão; o servidor conta o prazo de 5 dias úteis. */
  notificar(orgaoId: number, form: PeNotificacaoForm): Observable<PeInadimplencia> {
    return this.http.post<PeInadimplencia>(`${this.apiUrl}/orgaos/${orgaoId}/inadimplencias`, form);
  }

  /** A justificativa do órgão foi aceita: a notificação se encerra. */
  justificar(id: number, form: PeJustificativaForm): Observable<PeInadimplencia> {
    return this.http.post<PeInadimplencia>(`${this.apiUrl}/inadimplencias/${id}/justificar`, form);
  }

  /** Registra a inadimplência (só com o prazo vencido e a notificação em aberto; antes do prazo, 409). */
  registrar(id: number, form: PeRegistroInadimplenciaForm): Observable<PeInadimplencia> {
    return this.http.post<PeInadimplencia>(`${this.apiUrl}/inadimplencias/${id}/registrar`, form);
  }

  /** O órgão regularizou a comunicação: guarda a data de saneamento e tira a marca do painel. */
  sanear(id: number, form: PeSaneamentoForm): Observable<PeInadimplencia> {
    return this.http.post<PeInadimplencia>(`${this.apiUrl}/inadimplencias/${id}/sanear`, form);
  }
}
