import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import {
  PgiaAia,
  PgiaAiaForm,
  PgiaAiaPublicacaoForm,
  PgiaClassificacao,
  PgiaClassificacaoForm,
  PgiaPagedResponse,
  PgiaSistema,
  PgiaSistemaBaseForm,
  PgiaSistemaCreateForm
} from '../../../api/pgia/interface';

/**
 * Metadados de documento vinculado a um sistema. O arquivo binário sobe depois,
 * pelo `PgiaDocumentoService` (POST documento/{id}/arquivo).
 */
export interface PgiaDocumentoForm {
  Tipo: string;
  ProcessoSei: string | null;
  NomeArquivo: string | null;
}

export interface PgiaDocumento extends PgiaDocumentoForm {
  Id: number;
}

@Injectable({
  providedIn: 'root'
})
export class PgiaSistemaService {
  private apiUrl = `${SERVICE_API_URL}/api/pgia/sistema`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  listarSistemas(orgaoId: number, page: number = 1, pageSize: number = 50): Observable<PgiaPagedResponse<PgiaSistema>> {
    return this.http.get<PgiaPagedResponse<PgiaSistema>>(
      `${this.apiUrl}/orgao/${orgaoId}?Page=${page}&PageSize=${pageSize}`,
      { headers: this.getHeaders() });
  }

  getSistema(id: number): Observable<PgiaSistema> {
    return this.http.get<PgiaSistema>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  criarSistema(orgaoId: number, form: PgiaSistemaCreateForm): Observable<PgiaSistema> {
    return this.http.post<PgiaSistema>(`${this.apiUrl}/orgao/${orgaoId}`, form, { headers: this.getHeaders() });
  }

  atualizarSistema(id: number, form: PgiaSistemaBaseForm): Observable<PgiaSistema> {
    return this.http.put<PgiaSistema>(`${this.apiUrl}/${id}`, form, { headers: this.getHeaders() });
  }

  reclassificar(id: number, form: PgiaClassificacaoForm): Observable<PgiaClassificacao> {
    return this.http.post<PgiaClassificacao>(`${this.apiUrl}/${id}/classificacao`, form, { headers: this.getHeaders() });
  }

  listarClassificacoes(id: number): Observable<PgiaClassificacao[]> {
    return this.http.get<PgiaClassificacao[]>(`${this.apiUrl}/${id}/classificacoes`, { headers: this.getHeaders() });
  }

  /** Cria os metadados de um documento do sistema e devolve o Id gerado. */
  criarDocumento(sistemaId: number, form: PgiaDocumentoForm): Observable<PgiaDocumento> {
    return this.http.post<PgiaDocumento>(`${this.apiUrl}/${sistemaId}/documentos`, form, { headers: this.getHeaders() });
  }

  // ── AIA (Avaliação de Impacto Algorítmico) ────────────────────────────────
  // Ficam aqui, e não no PgiaGovernancaService, porque penduram em /api/pgia/sistema
  // e são usadas pelas telas do órgão e da SGDI.

  listarAias(sistemaId: number): Observable<PgiaAia[]> {
    return this.http.get<PgiaAia[]>(`${this.apiUrl}/${sistemaId}/aia`, { headers: this.getHeaders() });
  }

  criarAia(sistemaId: number, form: PgiaAiaForm): Observable<PgiaAia> {
    return this.http.post<PgiaAia>(`${this.apiUrl}/${sistemaId}/aia`, form, { headers: this.getHeaders() });
  }

  atualizarAia(aiaId: number, form: PgiaAiaForm): Observable<PgiaAia> {
    return this.http.put<PgiaAia>(`${this.apiUrl}/aia/${aiaId}`, form, { headers: this.getHeaders() });
  }

  publicarAia(aiaId: number, form: PgiaAiaPublicacaoForm): Observable<PgiaAia> {
    return this.http.put<PgiaAia>(`${this.apiUrl}/aia/${aiaId}/publicacao`, form, { headers: this.getHeaders() });
  }

  vincularDeliberacaoAia(aiaId: number, deliberacaoId: number): Observable<PgiaAia> {
    return this.http.put<PgiaAia>(`${this.apiUrl}/aia/${aiaId}/deliberacao/${deliberacaoId}`, {}, { headers: this.getHeaders() });
  }
}
