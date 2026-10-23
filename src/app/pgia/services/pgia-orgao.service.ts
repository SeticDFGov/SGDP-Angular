import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import {
  PgiaAgenteInfoForm,
  PgiaDesignacao,
  PgiaDesignacaoAtualizarForm,
  PgiaDesignacaoForm,
  PgiaMeuOrgao,
  PgiaOrgao,
  PgiaOrgaoDadosForm,
  PgiaPessoa,
  PgiaPrazo,
  PgiaResponsavelIaAtualizarForm,
  PgiaResponsavelIaForm,
  PgiaTipoDesignacao
} from '../../../api/pgia/interface';

/** Trecho da rota de cada designação em api/pgia/orgao/{orgaoId}/... */
const ROTA_DESIGNACAO: Readonly<Record<PgiaTipoDesignacao, string>> = {
  responsavel_ia: 'responsavel-ia',
  encarregado_dados: 'encarregado-dados',
  curador_dados: 'curador-dados'
};

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

  listarCuradoresDados(orgaoId: number): Observable<PgiaDesignacao[]> {
    return this.listarDesignacoes(orgaoId, 'curador_dados');
  }

  designarCuradorDados(orgaoId: number, form: PgiaDesignacaoForm): Observable<PgiaDesignacao> {
    return this.designar(orgaoId, 'curador_dados', form);
  }

  /** Histórico (vigentes e encerradas) de qualquer das três designações. */
  listarDesignacoes(orgaoId: number, tipo: PgiaTipoDesignacao): Observable<PgiaDesignacao[]> {
    return this.http.get<PgiaDesignacao[]>(`${this.apiUrl}/${orgaoId}/${ROTA_DESIGNACAO[tipo]}`, { headers: this.getHeaders() });
  }

  /** Designa (ou troca) o titular ou o suplente; a vigente da mesma posição vai para o histórico. */
  designar(orgaoId: number, tipo: PgiaTipoDesignacao,
           form: PgiaDesignacaoForm | PgiaResponsavelIaForm): Observable<PgiaDesignacao> {
    return this.http.post<PgiaDesignacao>(`${this.apiUrl}/${orgaoId}/${ROTA_DESIGNACAO[tipo]}`, form, { headers: this.getHeaders() });
  }

  /**
   * Completa o ato de uma designação importada da planilha da SGDI (tira a marca
   * `AtoPendente`) ou corrige o ato de qualquer designação do órgão.
   */
  atualizarAto(orgaoId: number, tipo: PgiaTipoDesignacao, designacaoId: number,
               form: PgiaDesignacaoAtualizarForm | PgiaResponsavelIaAtualizarForm): Observable<PgiaDesignacao> {
    return this.http.put<PgiaDesignacao>(`${this.apiUrl}/${orgaoId}/${ROTA_DESIGNACAO[tipo]}/${designacaoId}`, form,
      { headers: this.getHeaders() });
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
