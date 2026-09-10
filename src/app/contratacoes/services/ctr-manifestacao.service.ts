import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import {
  CtrDespachoParams,
  CtrManifestacao,
  CtrManifestacaoForm,
  CtrPagedResponse
} from '../../../api/contratacoes/interface';

/**
 * Manifestações da SGDI ao TCDF (`api/contratacoes/manifestacao`).
 *
 * Criar é do processo (`POST processo/{id}/manifestacao`, no CtrProcessoService):
 * ofício novo do TCDF = manifestação nova. Aqui ficam a lista geral, a leitura,
 * a edição da mesma manifestação e o despacho em PDF.
 */
@Injectable({
  providedIn: 'root'
})
export class CtrManifestacaoService {
  private apiUrl = `${SERVICE_API_URL}/api/contratacoes/manifestacao`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  listar(opcoes: {
    Page?: number; PageSize?: number; Estagio?: string | null; Filtro?: string | null;
  } = {}): Observable<CtrPagedResponse<CtrManifestacao>> {
    let params = new HttpParams();
    if (opcoes.Page) params = params.set('Page', String(opcoes.Page));
    if (opcoes.PageSize) params = params.set('PageSize', String(opcoes.PageSize));
    if (opcoes.Estagio) params = params.set('Estagio', opcoes.Estagio);
    if (opcoes.Filtro) params = params.set('Filtro', opcoes.Filtro);
    return this.http.get<CtrPagedResponse<CtrManifestacao>>(this.apiUrl,
      { headers: this.getHeaders(), params });
  }

  getManifestacao(id: number): Observable<CtrManifestacao> {
    return this.http.get<CtrManifestacao>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  /** A evolução do desfecho de risco é atualização da mesma manifestação. */
  atualizar(id: number, form: CtrManifestacaoForm): Observable<CtrManifestacao> {
    return this.http.put<CtrManifestacao>(`${this.apiUrl}/${id}`, form, { headers: this.getHeaders() });
  }

  /**
   * Despacho preenchido em PDF. Local, nome e cargo são do fecho do documento e
   * não persistem na tabela. Download disparado no componente, em handler de clique.
   */
  baixarDespachoPdf(id: number, dados: CtrDespachoParams): Observable<Blob> {
    const params = new HttpParams()
      .set('local', dados.Local)
      .set('nome', dados.Nome)
      .set('cargo', dados.Cargo);
    return this.http.get(`${this.apiUrl}/${id}/despacho/pdf`,
      { headers: this.getHeaders(), params, responseType: 'blob' });
  }
}
