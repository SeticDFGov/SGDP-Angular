import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import {
  CtrCheckpointForm,
  CtrManifestacao,
  CtrManifestacaoForm,
  CtrPagedResponse,
  CtrPainel,
  CtrProcesso,
  CtrProcessoFiltro,
  CtrProcessoForm
} from '../../../api/contratacoes/interface';

/**
 * Processos de análise de contratações (`api/contratacoes/processo`) e o painel
 * agregado da área. Padrão do `EtapaService`: header Authorization montado do
 * `AuthService.getToken()` e métodos devolvendo Observable.
 */
@Injectable({
  providedIn: 'root'
})
export class CtrProcessoService {
  private apiUrl = `${SERVICE_API_URL}/api/contratacoes`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  /** Só os filtros preenchidos entram na query (o backend saneia o resto). */
  private montarParams(filtro: CtrProcessoFiltro): HttpParams {
    let params = new HttpParams();
    const acrescentar = (chave: string, valor: unknown) => {
      if (valor === null || valor === undefined || valor === '') return;
      params = params.set(chave, String(valor));
    };
    acrescentar('Page', filtro.Page);
    acrescentar('PageSize', filtro.PageSize);
    acrescentar('Filtro', filtro.Filtro);
    acrescentar('Categoria', filtro.Categoria);
    acrescentar('Situacao', filtro.Situacao);
    acrescentar('Sigla', filtro.Sigla);
    acrescentar('Restituidos', filtro.Restituidos);
    acrescentar('De', filtro.De);
    acrescentar('Ate', filtro.Ate);
    acrescentar('Fase', filtro.Fase);
    acrescentar('EtapaPlanejamento', filtro.EtapaPlanejamento);
    acrescentar('Criticidade', filtro.Criticidade);
    acrescentar('Origem', filtro.Origem);
    acrescentar('EsclarecimentoPendente', filtro.EsclarecimentoPendente);
    // Classificação de riscos: valor fora do domínio devolve lista vazia.
    acrescentar('RiscoClassificado', filtro.RiscoClassificado);
    acrescentar('NivelRiscoDeclarado', filtro.NivelRiscoDeclarado);
    acrescentar('OrderBy', filtro.OrderBy);
    return params;
  }

  listar(filtro: CtrProcessoFiltro = {}): Observable<CtrPagedResponse<CtrProcesso>> {
    return this.http.get<CtrPagedResponse<CtrProcesso>>(`${this.apiUrl}/processo`, {
      headers: this.getHeaders(),
      params: this.montarParams(filtro)
    });
  }

  /** Siglas já usadas nos processos ativos — alimenta o autocompletar. */
  listarSiglas(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/processo/siglas`, { headers: this.getHeaders() });
  }

  /**
   * CSV da listagem filtrada (UTF-8 com BOM, `;`), sem paginação. O download é
   * disparado no componente, em handler de clique.
   */
  exportarCsv(filtro: CtrProcessoFiltro = {}): Observable<Blob> {
    const { Page, PageSize, ...semPaginacao } = filtro;
    return this.http.get(`${this.apiUrl}/processo/exportar`, {
      headers: this.getHeaders(),
      params: this.montarParams(semPaginacao),
      responseType: 'blob'
    });
  }

  getProcesso(id: number): Observable<CtrProcesso> {
    return this.http.get<CtrProcesso>(`${this.apiUrl}/processo/${id}`, { headers: this.getHeaders() });
  }

  criar(form: CtrProcessoForm): Observable<CtrProcesso> {
    return this.http.post<CtrProcesso>(`${this.apiUrl}/processo`, form, { headers: this.getHeaders() });
  }

  atualizar(id: number, form: CtrProcessoForm): Observable<CtrProcesso> {
    return this.http.put<CtrProcesso>(`${this.apiUrl}/processo/${id}`, form, { headers: this.getHeaders() });
  }

  /** Exclusão lógica: some das listas, a linha continua auditável. */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/processo/${id}`, { headers: this.getHeaders() });
  }

  /** Registro rápido de chegada/retorno numa etapa (ou limpeza da data). */
  registrarCheckpoint(id: number, form: CtrCheckpointForm): Observable<CtrProcesso> {
    return this.http.put<CtrProcesso>(`${this.apiUrl}/processo/${id}/checkpoint`, form,
      { headers: this.getHeaders() });
  }

  /** Manifestações ao TCDF do processo, mais recente primeiro. */
  listarManifestacoes(id: number): Observable<CtrManifestacao[]> {
    return this.http.get<CtrManifestacao[]>(`${this.apiUrl}/processo/${id}/manifestacoes`,
      { headers: this.getHeaders() });
  }

  criarManifestacao(id: number, form: CtrManifestacaoForm): Observable<CtrManifestacao> {
    return this.http.post<CtrManifestacao>(`${this.apiUrl}/processo/${id}/manifestacao`, form,
      { headers: this.getHeaders() });
  }

  // ── Painel ────────────────────────────────────────────────────────────────

  getPainel(diasSemMovimento: number = 15): Observable<CtrPainel> {
    return this.http.get<CtrPainel>(`${this.apiUrl}/painel`, {
      headers: this.getHeaders(),
      params: new HttpParams().set('diasSemMovimento', String(diasSemMovimento))
    });
  }
}
