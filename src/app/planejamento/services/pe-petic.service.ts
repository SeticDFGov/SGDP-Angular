import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SERVICE_API_URL } from '../../../api/consts';
import { semCarregamento } from '../../core/carregamento/sem-carregamento';
import {
  PaginaPeDeliberacoes,
  PeDecisaoForm,
  PeDeliberacao,
  PeDeliberacoesConsulta,
  PePetic,
  PePeticForm,
  PePeticNovoForm
} from '../../../api/planejamento/interface';

/**
 * PETIC-DF (api/planejamento/petic): as versões, o rascunho e o envio ao CGTIC.
 * Ler serve a qualquer papel do módulo; criar, editar, enviar e apagar o
 * rascunho, só ao administrador do módulo e ao admin do SGDP. Os registros de
 * cada seção de uma versão vão pelo `PeRegistrosService` (dono `petic`).
 */
@Injectable({ providedIn: 'root' })
export class PePeticService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento/petic`;

  /**
   * Todas as versões, da mais nova para a mais antiga. `contexto`: a situação da
   * trilha consulta em segundo plano (sem o indicador de carregamento).
   */
  listar(contexto?: HttpContext): Observable<PePetic[]> {
    return this.http.get<PePetic[]>(this.apiUrl, { context: contexto });
  }

  /** A versão aprovada que vale hoje, ou null (204: ainda não há vigente). */
  vigente(): Observable<PePetic | null> {
    return this.http.get<PePetic | null>(`${this.apiUrl}/vigente`).pipe(map(v => v ?? null));
  }

  /** Rascunho novo, copiando a vigente (registros e códigos) ou vazio. 409 se já há rascunho ou versão com o CGTIC. */
  criar(form: PePeticNovoForm): Observable<PePetic> {
    return this.http.post<PePetic>(this.apiUrl, form);
  }

  /** Título e vigência (só do rascunho). */
  atualizar(id: number, form: PePeticForm): Observable<PePetic> {
    return this.http.put<PePetic>(`${this.apiUrl}/${id}`, form);
  }

  /** Envia o rascunho ao CGTIC: cria a deliberação e a versão passa a `em_deliberacao`. */
  enviar(id: number): Observable<PePetic> {
    return this.http.post<PePetic>(`${this.apiUrl}/${id}/enviar`, {});
  }

  /** Só o rascunho que nunca foi enviado. */
  apagar(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}

/**
 * Deliberações do CGTIC (api/planejamento/deliberacoes): a fila da Secretaria do
 * comitê e a visão dos papéis globais. Decidir é da Secretaria do CGTIC e do
 * admin do SGDP. Papel de órgão recebe 403: as telas só chamam para os papéis globais.
 */
@Injectable({ providedIn: 'root' })
export class PeDeliberacoesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento/deliberacoes`;

  /** Aguardando primeiro (a mais antiga antes), depois as decididas (a mais nova antes). */
  listar(consulta: PeDeliberacoesConsulta, contexto?: HttpContext): Observable<PaginaPeDeliberacoes> {
    let params = new HttpParams().set('Page', consulta.Page).set('PageSize', consulta.PageSize);
    if (consulta.Situacao) params = params.set('Situacao', consulta.Situacao);
    if (consulta.ObjetoTipo) params = params.set('ObjetoTipo', consulta.ObjetoTipo);
    return this.http.get<PaginaPeDeliberacoes>(this.apiUrl, { params, context: contexto });
  }

  /** Quantas esperam a decisão do comitê (contador da trilha, em segundo plano: sem o indicador de carregamento). */
  contarAguardando(): Observable<number> {
    return this.listar({ Situacao: 'aguardando', Page: 1, PageSize: 1 }, semCarregamento())
      .pipe(map(p => p.TotalItems ?? p.Items.length));
  }

  /** Registra a decisão. Já decidida: 409. */
  decidir(id: number, form: PeDecisaoForm): Observable<PeDeliberacao | null> {
    return this.http.post<PeDeliberacao | null>(`${this.apiUrl}/${id}/decidir`, form);
  }
}
