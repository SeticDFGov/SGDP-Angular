import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PeArvorePetic,
  PeConformidade,
  PeConformidadeConsulta,
  PeFormatoPlanilha,
  PePainel,
  PePainelConsulta,
  PeResumoOrgao
} from '../../../api/planejamento/interface';

/** Caminhos da API que a página do órgão aceita baixar (o token vai junto: nada fora da API do módulo). */
const PREFIXO_DOWNLOAD = 'api/planejamento/';

/**
 * O caminho de um documento do resumo do órgão (`Url`), relativo à API, ou null
 * quando não é um caminho da API do módulo. O interceptor põe o token em toda
 * requisição, então endereço de fora (outro domínio) nunca é pedido.
 */
export function caminhoDeDownload(url: string | null | undefined): string | null {
  const texto = (url ?? '').trim().replace(/^\/+/, '');
  if (!texto || /^[a-z][a-z0-9+.-]*:/i.test(texto) || texto.includes('..') || texto.includes('\\')) return null;
  return texto.startsWith(PREFIXO_DOWNLOAD) ? texto : null;
}

/**
 * Painéis da Governança Estratégica (E8): o painel com os números de todos os
 * órgãos, a conformidade (e a planilha dela), a árvore do PETIC-DF e o resumo de
 * um órgão (a página do órgão).
 *
 * Quem pode: painel, conformidade e árvore, só os papéis globais (administrador do
 * módulo, SGDI e CGTIC) e o admin do SGDP; o resumo, esses e a equipe e a
 * consulta do órgão, só do próprio órgão. O 403 tira a pessoa do módulo
 * (interceptor): as telas só chamam o que o papel dela pode.
 */
@Injectable({ providedIn: 'root' })
export class PePaineisService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento`;

  /** As contagens do painel, com o filtro por nível e por situação. */
  painel(consulta: PePainelConsulta): Observable<PePainel> {
    let params = new HttpParams();
    if (consulta.NivelId) params = params.set('NivelId', consulta.NivelId);
    if (consulta.Situacao) params = params.set('Situacao', consulta.Situacao);
    return this.http.get<PePainel>(`${this.apiUrl}/painel`, { params });
  }

  /** A conformidade de cada órgão (os filtros vazios ficam de fora). */
  conformidade(consulta: PeConformidadeConsulta = {}): Observable<PeConformidade> {
    let params = new HttpParams();
    if (consulta.Grupo) params = params.set('Grupo', consulta.Grupo);
    if (consulta.NivelId) params = params.set('NivelId', consulta.NivelId);
    const filtro = consulta.Filtro?.trim();
    if (filtro) params = params.set('Filtro', filtro);
    return this.http.get<PeConformidade>(`${this.apiUrl}/conformidade`, { params });
  }

  /** A planilha da conformidade: uma linha por órgão e uma coluna por item ("Sim", "Não" ou "Não se aplica"). */
  planilhaConformidade(formato: PeFormatoPlanilha, consulta: PeConformidadeConsulta = {}): Observable<HttpResponse<Blob>> {
    // Os filtros aplicados na tela (grupo, nível e busca) valem também na planilha (F2)
    let params = new HttpParams().set('formato', formato);
    if (consulta.Grupo) params = params.set('Grupo', consulta.Grupo);
    if (consulta.NivelId) params = params.set('NivelId', consulta.NivelId);
    const filtro = consulta.Filtro?.trim();
    if (filtro) params = params.set('Filtro', filtro);
    return this.http.get(`${this.apiUrl}/conformidade/planilha`, {
      params,
      responseType: 'blob',
      observe: 'response'
    });
  }

  /** Os objetivos do PETIC-DF vigente, com as necessidades e as metas dos órgãos ligadas a cada um. */
  arvore(orgaoId: number | null = null): Observable<PeArvorePetic> {
    const params = orgaoId ? new HttpParams().set('orgaoId', orgaoId) : undefined;
    return this.http.get<PeArvorePetic>(`${this.apiUrl}/petic/arvore`, { params });
  }

  /** Tudo do órgão num lugar só. */
  resumoOrgao(orgaoId: number): Observable<PeResumoOrgao> {
    return this.http.get<PeResumoOrgao>(`${this.apiUrl}/orgaos/${orgaoId}/resumo`);
  }

  /**
   * Um documento do resumo (o PDF do PDTIC, um RA ou o RR), pelo `Url` que o
   * servidor mandou, com a resposta inteira (o nome sai do `Content-Disposition`).
   * Caminho que não é da API do módulo não sai daqui.
   */
  baixarDocumento(url: string | null | undefined): Observable<HttpResponse<Blob>> {
    const caminho = caminhoDeDownload(url);
    if (!caminho) return throwError(() => ({ status: 0, error: null }));
    return this.http.get(`${SERVICE_API_URL}/${caminho}`, { responseType: 'blob', observe: 'response' });
  }
}
