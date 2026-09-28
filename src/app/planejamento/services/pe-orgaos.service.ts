import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PeAjusteOrgao,
  PeDetalheForm,
  PeOrgaoNivel,
  PeOrgaoNivelForm,
  PeOrgaoNivelHistorico,
  PeTrilhaOrgao
} from '../../../api/planejamento/interface';

/**
 * Nível de maturidade e ajustes de cada órgão (api/planejamento/orgaos). A lista
 * serve aos papéis globais (administrador do módulo, SGDI e CGTIC) e ao admin do
 * SGDP; trocar o nível e os ajustes, só ao administrador do módulo e ao admin do
 * SGDP. O 403 tira a pessoa do módulo (interceptor): chame só depois do `meu-papel`.
 */
@Injectable({ providedIn: 'root' })
export class PeOrgaosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento/orgaos`;

  /** Órgãos com sigla, nome e nível; filtro por parte do nome ou da sigla. */
  listar(filtro?: string | null): Observable<PeOrgaoNivel[]> {
    const texto = filtro?.trim();
    const params = texto ? new HttpParams().set('Filtro', texto) : undefined;
    return this.http.get<PeOrgaoNivel[]>(this.apiUrl, { params });
  }

  /** Troca o nível (justificativa obrigatória) e devolve o órgão atualizado. */
  definirNivel(orgaoId: number, form: PeOrgaoNivelForm): Observable<PeOrgaoNivel> {
    return this.http.put<PeOrgaoNivel>(`${this.apiUrl}/${orgaoId}/nivel`, form);
  }

  historicoNivel(orgaoId: number): Observable<PeOrgaoNivelHistorico[]> {
    return this.http.get<PeOrgaoNivelHistorico[]>(`${this.apiUrl}/${orgaoId}/nivel/historico`);
  }

  ajustes(orgaoId: number): Observable<PeAjusteOrgao[]> {
    return this.http.get<PeAjusteOrgao[]>(`${this.apiUrl}/${orgaoId}/ajustes`);
  }

  /** A lista inteira; item com `Situacao` nula remove o ajuste. */
  salvarAjustes(orgaoId: number, ajustes: PeAjusteOrgao[]): Observable<PeAjusteOrgao[]> {
    return this.http.put<PeAjusteOrgao[]>(`${this.apiUrl}/${orgaoId}/ajustes`, ajustes);
  }

  /**
   * F3 (modo livre): a forma de um passo para o órgão, uma das `OpcoesDetalhe` do
   * passo; `nivelId` nulo volta à forma padrão. Devolve o passo a passo do órgão. A
   * equipe do PDTIC do próprio órgão, o administrador do módulo e o admin do SGDP; no
   * modo definido, 409 (1146).
   */
  definirDetalhe(orgaoId: number, passoId: number, nivelId: number | null): Observable<PeTrilhaOrgao> {
    const corpo: PeDetalheForm = { NivelId: nivelId };
    return this.http.put<PeTrilhaOrgao>(`${this.apiUrl}/${orgaoId}/passos/${passoId}/detalhe`, corpo);
  }
}
