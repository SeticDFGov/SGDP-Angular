import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import {
  PgiaAgenteInfoForm,
  PgiaDesignacao,
  PgiaDesignacaoForm,
  PgiaMeuOrgao,
  PgiaOrgao,
  PgiaOrgaoDadosForm,
  PgiaPessoa,
  PgiaPrazo,
  PgiaResponsavelIaForm
} from '../../../api/pgia/interface';

@Injectable({
  providedIn: 'root'
})
export class PgiaOrgaoService {
  private apiUrl = `${SERVICE_API_URL}/api/pgia/orgao`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  /** `contexto`: a situação da trilha consulta em segundo plano (sem o indicador de carregamento). */
  getMeuOrgao(contexto?: HttpContext): Observable<PgiaMeuOrgao> {
    return this.http.get<PgiaMeuOrgao>(`${this.apiUrl}/meu-orgao`, { headers: this.getHeaders(), context: contexto });
  }

  listarOrgaos(): Observable<PgiaOrgao[]> {
    return this.http.get<PgiaOrgao[]>(`${this.apiUrl}/orgaos`, { headers: this.getHeaders() });
  }

  atualizarDados(orgaoId: number, dados: PgiaOrgaoDadosForm): Observable<PgiaOrgao> {
    return this.http.put<PgiaOrgao>(`${this.apiUrl}/${orgaoId}/dados`, dados, { headers: this.getHeaders() });
  }

  listarPessoas(orgaoId: number): Observable<PgiaPessoa[]> {
    return this.http.get<PgiaPessoa[]>(`${this.apiUrl}/${orgaoId}/pessoas`, { headers: this.getHeaders() });
  }

  salvarAgenteInfo(orgaoId: number, userId: string, info: PgiaAgenteInfoForm): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${orgaoId}/pessoas/${userId}/info`, info, { headers: this.getHeaders() });
  }

  listarResponsaveisIa(orgaoId: number): Observable<PgiaDesignacao[]> {
    return this.http.get<PgiaDesignacao[]>(`${this.apiUrl}/${orgaoId}/responsavel-ia`, { headers: this.getHeaders() });
  }

  designarResponsavelIa(orgaoId: number, form: PgiaResponsavelIaForm): Observable<PgiaDesignacao> {
    return this.http.post<PgiaDesignacao>(`${this.apiUrl}/${orgaoId}/responsavel-ia`, form, { headers: this.getHeaders() });
  }

  listarEncarregadosDados(orgaoId: number): Observable<PgiaDesignacao[]> {
    return this.http.get<PgiaDesignacao[]>(`${this.apiUrl}/${orgaoId}/encarregado-dados`, { headers: this.getHeaders() });
  }

  designarEncarregadoDados(orgaoId: number, form: PgiaDesignacaoForm): Observable<PgiaDesignacao> {
    return this.http.post<PgiaDesignacao>(`${this.apiUrl}/${orgaoId}/encarregado-dados`, form, { headers: this.getHeaders() });
  }

  listarPrazos(orgaoId: number, contexto?: HttpContext): Observable<PgiaPrazo[]> {
    return this.http.get<PgiaPrazo[]>(`${this.apiUrl}/${orgaoId}/prazos`, { headers: this.getHeaders(), context: contexto });
  }

  listarPrazosCentrais(contexto?: HttpContext): Observable<PgiaPrazo[]> {
    return this.http.get<PgiaPrazo[]>(`${this.apiUrl}/prazos/centrais`, { headers: this.getHeaders(), context: contexto });
  }

  marcarCumprimento(prazoId: number, cumpridoEm: string | null): Observable<PgiaPrazo> {
    return this.http.put<PgiaPrazo>(`${this.apiUrl}/prazos/${prazoId}/cumprimento`,
      { CumpridoEm: cumpridoEm }, { headers: this.getHeaders() });
  }
}
