import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import {
  PgiaCapacitacao,
  PgiaCapacitacaoForm,
  PgiaContrato,
  PgiaContratoForm,
  PgiaIncidente,
  PgiaIndicador,
  PgiaIndicadorForm,
  PgiaLegado,
  PgiaLegadoForm,
  PgiaRelatorioEnvioForm,
  PgiaRelatorioSemestral,
  PgiaRelatorioSituacaoForm,
  PgiaSolicitacaoOrgao,
  PgiaIncidenteApuracaoForm,
  PgiaIncidenteAvisoForm,
  PgiaIncidenteComunicarForm,
  PgiaIncidenteCreateForm,
  PgiaNaoConformidade,
  PgiaNaoConformidadeForm,
  PgiaNaoConformidadeUpdateForm,
  PgiaPagedResponse,
  PgiaRegistroUso,
  PgiaRegistroUsoForm,
  PgiaUsoFontes
} from '../../../api/pgia/interface';

/**
 * Operação contínua: incidentes, não conformidades, capacitação e registro de uso.
 */
@Injectable({
  providedIn: 'root'
})
export class PgiaOperacaoService {
  private apiUrl = `${SERVICE_API_URL}/api/pgia`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // ── Incidentes ────────────────────────────────────────────────────────────

  /** Aviso do agente ao Responsável de IA (art. 13, II): ainda não é comunicação à SGDI. */
  avisarIncidente(form: PgiaIncidenteAvisoForm): Observable<PgiaIncidente> {
    return this.http.post<PgiaIncidente>(`${this.apiUrl}/incidente/aviso`, form, { headers: this.getHeaders() });
  }

  criarIncidente(form: PgiaIncidenteCreateForm): Observable<PgiaIncidente> {
    return this.http.post<PgiaIncidente>(`${this.apiUrl}/incidente`, form, { headers: this.getHeaders() });
  }

  comunicarIncidente(id: number, form: PgiaIncidenteComunicarForm): Observable<PgiaIncidente> {
    return this.http.put<PgiaIncidente>(`${this.apiUrl}/incidente/${id}/comunicar`, form, { headers: this.getHeaders() });
  }

  atualizarMedidas(id: number, medidasAdotadas: string | null): Observable<PgiaIncidente> {
    return this.http.put<PgiaIncidente>(`${this.apiUrl}/incidente/${id}/medidas`,
      { MedidasAdotadas: medidasAdotadas }, { headers: this.getHeaders() });
  }

  registrarApuracao(id: number, form: PgiaIncidenteApuracaoForm): Observable<PgiaIncidente> {
    return this.http.put<PgiaIncidente>(`${this.apiUrl}/incidente/${id}/apuracao`, form, { headers: this.getHeaders() });
  }

  listarIncidentesDoOrgao(orgaoId: number): Observable<PgiaIncidente[]> {
    return this.http.get<PgiaIncidente[]>(`${this.apiUrl}/incidente/orgao/${orgaoId}`, { headers: this.getHeaders() });
  }

  listarIncidentesComunicados(status?: string): Observable<PgiaIncidente[]> {
    const url = status
      ? `${this.apiUrl}/incidente/comunicados?status=${encodeURIComponent(status)}`
      : `${this.apiUrl}/incidente/comunicados`;
    return this.http.get<PgiaIncidente[]>(url, { headers: this.getHeaders() });
  }

  // ── Não conformidades ─────────────────────────────────────────────────────

  criarNaoConformidade(form: PgiaNaoConformidadeForm): Observable<PgiaNaoConformidade> {
    return this.http.post<PgiaNaoConformidade>(`${this.apiUrl}/conformidade/nao-conformidade`, form,
      { headers: this.getHeaders() });
  }

  atualizarNaoConformidade(id: number, form: PgiaNaoConformidadeUpdateForm): Observable<PgiaNaoConformidade> {
    return this.http.put<PgiaNaoConformidade>(`${this.apiUrl}/conformidade/nao-conformidade/${id}`, form,
      { headers: this.getHeaders() });
  }

  listarNaoConformidadesDoOrgao(orgaoId: number): Observable<PgiaNaoConformidade[]> {
    return this.http.get<PgiaNaoConformidade[]>(`${this.apiUrl}/conformidade/nao-conformidade/orgao/${orgaoId}`,
      { headers: this.getHeaders() });
  }

  listarTodasNaoConformidades(): Observable<PgiaNaoConformidade[]> {
    return this.http.get<PgiaNaoConformidade[]>(`${this.apiUrl}/conformidade/nao-conformidade/todas`,
      { headers: this.getHeaders() });
  }

  // ── Capacitação ───────────────────────────────────────────────────────────

  criarCapacitacao(orgaoId: number, form: PgiaCapacitacaoForm): Observable<PgiaCapacitacao> {
    return this.http.post<PgiaCapacitacao>(`${this.apiUrl}/conformidade/orgao/${orgaoId}/capacitacao`, form,
      { headers: this.getHeaders() });
  }

  atualizarCapacitacao(id: number, form: PgiaCapacitacaoForm): Observable<PgiaCapacitacao> {
    return this.http.put<PgiaCapacitacao>(`${this.apiUrl}/conformidade/capacitacao/${id}`, form,
      { headers: this.getHeaders() });
  }

  listarCapacitacoes(orgaoId: number): Observable<PgiaCapacitacao[]> {
    return this.http.get<PgiaCapacitacao[]>(`${this.apiUrl}/conformidade/orgao/${orgaoId}/capacitacoes`,
      { headers: this.getHeaders() });
  }

  // ── Registro de uso ───────────────────────────────────────────────────────

  /**
   * Sistemas do órgão e plataformas homologadas para os selects do registro de uso
   * e do aviso de problema. Aberto a qualquer autenticado (art. 13); sem órgão
   * resolvido devolve OrgaoId nulo e listas vazias.
   */
  listarFontesUso(): Observable<PgiaUsoFontes> {
    return this.http.get<PgiaUsoFontes>(`${this.apiUrl}/conformidade/uso/fontes`, { headers: this.getHeaders() });
  }

  registrarUso(form: PgiaRegistroUsoForm): Observable<PgiaRegistroUso> {
    return this.http.post<PgiaRegistroUso>(`${this.apiUrl}/conformidade/uso`, form, { headers: this.getHeaders() });
  }

  listarMeusUsos(page: number = 1, pageSize: number = 20): Observable<PgiaPagedResponse<PgiaRegistroUso>> {
    return this.http.get<PgiaPagedResponse<PgiaRegistroUso>>(
      `${this.apiUrl}/conformidade/uso/meus?Page=${page}&PageSize=${pageSize}`, { headers: this.getHeaders() });
  }

  listarUsosDoOrgao(orgaoId: number, page: number = 1, pageSize: number = 20): Observable<PgiaPagedResponse<PgiaRegistroUso>> {
    return this.http.get<PgiaPagedResponse<PgiaRegistroUso>>(
      `${this.apiUrl}/conformidade/uso/orgao/${orgaoId}?Page=${page}&PageSize=${pageSize}`,
      { headers: this.getHeaders() });
  }

  // ── Contratos de IA ───────────────────────────────────────────────────────

  criarContrato(orgaoId: number, form: PgiaContratoForm): Observable<PgiaContrato> {
    return this.http.post<PgiaContrato>(`${this.apiUrl}/conformidade/orgao/${orgaoId}/contrato`, form,
      { headers: this.getHeaders() });
  }

  atualizarContrato(id: number, form: PgiaContratoForm): Observable<PgiaContrato> {
    return this.http.put<PgiaContrato>(`${this.apiUrl}/conformidade/contrato/${id}`, form, { headers: this.getHeaders() });
  }

  listarContratos(orgaoId: number): Observable<PgiaContrato[]> {
    return this.http.get<PgiaContrato[]>(`${this.apiUrl}/conformidade/contrato/orgao/${orgaoId}`,
      { headers: this.getHeaders() });
  }

  // ── Instrumentos anteriores ao decreto (art. 37) ──────────────────────────

  criarLegado(orgaoId: number, form: PgiaLegadoForm): Observable<PgiaLegado> {
    return this.http.post<PgiaLegado>(`${this.apiUrl}/conformidade/orgao/${orgaoId}/legado`, form,
      { headers: this.getHeaders() });
  }

  atualizarLegado(id: number, form: PgiaLegadoForm): Observable<PgiaLegado> {
    return this.http.put<PgiaLegado>(`${this.apiUrl}/conformidade/legado/${id}`, form, { headers: this.getHeaders() });
  }

  listarLegados(orgaoId: number): Observable<PgiaLegado[]> {
    return this.http.get<PgiaLegado[]>(`${this.apiUrl}/conformidade/legado/orgao/${orgaoId}`, { headers: this.getHeaders() });
  }

  // ── Indicadores de desempenho ─────────────────────────────────────────────

  listarIndicadores(sistemaId: number): Observable<PgiaIndicador[]> {
    return this.http.get<PgiaIndicador[]>(`${this.apiUrl}/conformidade/sistema/${sistemaId}/indicadores`,
      { headers: this.getHeaders() });
  }

  criarIndicador(sistemaId: number, form: PgiaIndicadorForm): Observable<PgiaIndicador> {
    return this.http.post<PgiaIndicador>(`${this.apiUrl}/conformidade/sistema/${sistemaId}/indicadores`, form,
      { headers: this.getHeaders() });
  }

  atualizarIndicador(id: number, form: PgiaIndicadorForm): Observable<PgiaIndicador> {
    return this.http.put<PgiaIndicador>(`${this.apiUrl}/conformidade/indicador/${id}`, form, { headers: this.getHeaders() });
  }

  // ── Relatório semestral ───────────────────────────────────────────────────

  gerarRelatorioSemestral(orgaoId: number, ano: number, semestre: number): Observable<PgiaRelatorioSemestral> {
    return this.http.post<PgiaRelatorioSemestral>(`${this.apiUrl}/conformidade/orgao/${orgaoId}/relatorio-semestral`,
      { Ano: ano, Semestre: semestre }, { headers: this.getHeaders() });
  }

  /** Lista sem o conteúdo agregado; use getRelatorioSemestral para o detalhe. */
  listarRelatoriosSemestrais(orgaoId: number): Observable<PgiaRelatorioSemestral[]> {
    return this.http.get<PgiaRelatorioSemestral[]>(`${this.apiUrl}/conformidade/relatorio-semestral/orgao/${orgaoId}`,
      { headers: this.getHeaders() });
  }

  getRelatorioSemestral(id: number): Observable<PgiaRelatorioSemestral> {
    return this.http.get<PgiaRelatorioSemestral>(`${this.apiUrl}/conformidade/relatorio-semestral/${id}`,
      { headers: this.getHeaders() });
  }

  enviarRelatorioSemestral(id: number, form: PgiaRelatorioEnvioForm): Observable<PgiaRelatorioSemestral> {
    return this.http.put<PgiaRelatorioSemestral>(`${this.apiUrl}/conformidade/relatorio-semestral/${id}/envio`, form,
      { headers: this.getHeaders() });
  }

  atualizarSituacaoRelatorio(id: number, form: PgiaRelatorioSituacaoForm): Observable<PgiaRelatorioSemestral> {
    return this.http.put<PgiaRelatorioSemestral>(`${this.apiUrl}/conformidade/relatorio-semestral/${id}/situacao`, form,
      { headers: this.getHeaders() });
  }

  /** PDF do relatório semestral. O download é disparado no componente, em handler de clique. */
  baixarRelatorioSemestralPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/conformidade/relatorio-semestral/${id}/pdf`,
      { headers: this.getHeaders(), responseType: 'blob' });
  }

  // ── Solicitações do cidadão (arts. 11, IV e 23) ───────────────────────────

  listarSolicitacoes(orgaoId: number): Observable<PgiaSolicitacaoOrgao[]> {
    return this.http.get<PgiaSolicitacaoOrgao[]>(`${this.apiUrl}/conformidade/solicitacoes/orgao/${orgaoId}`,
      { headers: this.getHeaders() });
  }

  responderSolicitacao(id: number, resposta: string): Observable<PgiaSolicitacaoOrgao> {
    return this.http.put<PgiaSolicitacaoOrgao>(`${this.apiUrl}/conformidade/solicitacao/${id}/resposta`,
      { Resposta: resposta }, { headers: this.getHeaders() });
  }

  encaminharSolicitacaoDpo(id: number): Observable<PgiaSolicitacaoOrgao> {
    return this.http.put<PgiaSolicitacaoOrgao>(`${this.apiUrl}/conformidade/solicitacao/${id}/encaminhar-dpo`, {},
      { headers: this.getHeaders() });
  }

  marcarSolicitacaoEmAnalise(id: number): Observable<PgiaSolicitacaoOrgao> {
    return this.http.put<PgiaSolicitacaoOrgao>(`${this.apiUrl}/conformidade/solicitacao/${id}/em-analise`, {},
      { headers: this.getHeaders() });
  }
}
