import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import {
  PgiaAuditor,
  PgiaAuditoria,
  PgiaAuditoriaForm,
  PgiaAuditoriaParecerForm,
  PgiaAuditoriaPublicacaoForm,
  PgiaAutorizacao,
  PgiaAutorizacaoForm,
  PgiaAvaliacaoHomologacaoForm,
  PgiaCgticHistoricoResponse,
  PgiaDeliberacao,
  PgiaDeliberacaoForm,
  PgiaHomologacaoPendente,
  PgiaNorma,
  PgiaNormaForm,
  PgiaOrgao,
  PgiaOrgaoCreateForm,
  PgiaPessoaAcesso,
  PgiaPessoaPreCadastroForm,
  PgiaPessoaVinculoForm,
  PgiaPlataforma,
  PgiaPlataformaForm,
  PgiaRegistroPublicoForm,
  PgiaRelatorioAnual,
  PgiaRelatorioAnualForm
} from '../../../api/pgia/interface';

/**
 * Resumo de sistema devolvido por GET governanca/sistemas: o bastante para
 * montar seletores nas telas centrais, sem trazer o inventário inteiro.
 */
export interface PgiaSistemaResumo {
  Id: number;
  Denominacao: string;
  OrgaoSigla: string;
  ClassificacaoRiscoAtual: string | null;
  StatusCicloVida: string;
  SituacaoHomologacao: string | null;
}

/**
 * Governança central (SGDI e CGTIC).
 * As rotas de AIA ficam no PgiaSistemaService, porque penduram em /api/pgia/sistema
 * e são usadas também pela tela do órgão.
 */
@Injectable({
  providedIn: 'root'
})
export class PgiaGovernancaService {
  private apiUrl = `${SERVICE_API_URL}/api/pgia/governanca`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // ── Fila de homologação ───────────────────────────────────────────────────

  listarHomologacoes(situacao?: string): Observable<PgiaHomologacaoPendente[]> {
    const url = situacao
      ? `${this.apiUrl}/homologacoes?situacao=${encodeURIComponent(situacao)}`
      : `${this.apiUrl}/homologacoes`;
    return this.http.get<PgiaHomologacaoPendente[]>(url, { headers: this.getHeaders() });
  }

  /** Todos os sistemas visíveis às instâncias centrais, em formato resumido. */
  listarSistemasGovernanca(): Observable<PgiaSistemaResumo[]> {
    return this.http.get<PgiaSistemaResumo[]>(`${this.apiUrl}/sistemas`, { headers: this.getHeaders() });
  }

  avaliarHomologacao(sistemaId: number, form: PgiaAvaliacaoHomologacaoForm): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/sistema/${sistemaId}/avaliacao`, form, { headers: this.getHeaders() });
  }

  publicarRegistroPublico(sistemaId: number, form: PgiaRegistroPublicoForm): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/sistema/${sistemaId}/registro-publico`, form, { headers: this.getHeaders() });
  }

  // ── Deliberações do CGTIC ─────────────────────────────────────────────────

  listarDeliberacoes(): Observable<PgiaDeliberacao[]> {
    return this.http.get<PgiaDeliberacao[]>(`${this.apiUrl}/deliberacoes`, { headers: this.getHeaders() });
  }

  criarDeliberacao(form: PgiaDeliberacaoForm): Observable<PgiaDeliberacao> {
    return this.http.post<PgiaDeliberacao>(`${this.apiUrl}/deliberacao`, form, { headers: this.getHeaders() });
  }

  /** Histórico de decisões do comitê: casos, deliberações e contagens. */
  getCgticHistorico(): Observable<PgiaCgticHistoricoResponse> {
    return this.http.get<PgiaCgticHistoricoResponse>(`${this.apiUrl}/cgtic/historico`,
      { headers: this.getHeaders() });
  }

  /** PDF do histórico. O download é disparado no componente, em handler de clique. */
  baixarCgticHistoricoPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/cgtic/historico/pdf`,
      { headers: this.getHeaders(), responseType: 'blob' });
  }

  // ── Cadastro de órgão pela SGDI ───────────────────────────────────────────

  /** Cria o órgão já vinculando a unidade do SGDP, quando informada. */
  criarOrgao(form: PgiaOrgaoCreateForm): Observable<PgiaOrgao> {
    return this.http.post<PgiaOrgao>(`${this.apiUrl}/orgao`, form, { headers: this.getHeaders() });
  }

  // ── Pessoas e acessos (a SGDI define papel PGIA e órgão) ──────────────────

  /** Busca por nome ou e-mail; ambos os filtros são opcionais. */
  listarPessoas(filtro: string | null, orgaoId: number | null): Observable<PgiaPessoaAcesso[]> {
    let params = new HttpParams();
    if (filtro && filtro.trim()) params = params.set('filtro', filtro.trim());
    if (orgaoId) params = params.set('orgaoId', String(orgaoId));
    return this.http.get<PgiaPessoaAcesso[]>(`${this.apiUrl}/pessoas`,
      { headers: this.getHeaders(), params });
  }

  /**
   * Pré-cadastra a pessoa por e-mail, antes do primeiro login. Se o e-mail já
   * existir, o backend aplica papel e órgão no cadastro existente.
   */
  preCadastrarPessoa(form: PgiaPessoaPreCadastroForm): Observable<PgiaPessoaAcesso> {
    return this.http.post<PgiaPessoaAcesso>(`${this.apiUrl}/pessoa`, form, { headers: this.getHeaders() });
  }

  /** Define papel PGIA e unidade da pessoa; `null` limpa o campo. */
  definirVinculoPessoa(userId: string, form: PgiaPessoaVinculoForm): Observable<PgiaPessoaAcesso> {
    return this.http.put<PgiaPessoaAcesso>(`${this.apiUrl}/pessoa/${userId}/vinculo`, form,
      { headers: this.getHeaders() });
  }

  // ── Plataformas públicas de IA generativa ─────────────────────────────────

  listarPlataformas(): Observable<PgiaPlataforma[]> {
    return this.http.get<PgiaPlataforma[]>(`${this.apiUrl}/plataformas`, { headers: this.getHeaders() });
  }

  criarPlataforma(form: PgiaPlataformaForm): Observable<PgiaPlataforma> {
    return this.http.post<PgiaPlataforma>(`${this.apiUrl}/plataforma`, form, { headers: this.getHeaders() });
  }

  atualizarPlataforma(id: number, form: PgiaPlataformaForm): Observable<PgiaPlataforma> {
    return this.http.put<PgiaPlataforma>(`${this.apiUrl}/plataforma/${id}`, form, { headers: this.getHeaders() });
  }

  // ── Normas complementares ─────────────────────────────────────────────────

  listarNormas(): Observable<PgiaNorma[]> {
    return this.http.get<PgiaNorma[]>(`${this.apiUrl}/normas`, { headers: this.getHeaders() });
  }

  criarNorma(form: PgiaNormaForm): Observable<PgiaNorma> {
    return this.http.post<PgiaNorma>(`${this.apiUrl}/norma`, form, { headers: this.getHeaders() });
  }

  atualizarNorma(id: number, form: PgiaNormaForm): Observable<PgiaNorma> {
    return this.http.put<PgiaNorma>(`${this.apiUrl}/norma/${id}`, form, { headers: this.getHeaders() });
  }

  // ── Autorizações excepcionais ─────────────────────────────────────────────

  listarAutorizacoes(): Observable<PgiaAutorizacao[]> {
    return this.http.get<PgiaAutorizacao[]>(`${this.apiUrl}/autorizacoes`, { headers: this.getHeaders() });
  }

  criarAutorizacao(form: PgiaAutorizacaoForm): Observable<PgiaAutorizacao> {
    return this.http.post<PgiaAutorizacao>(`${this.apiUrl}/autorizacao`, form, { headers: this.getHeaders() });
  }

  atualizarAutorizacao(id: number, form: PgiaAutorizacaoForm): Observable<PgiaAutorizacao> {
    return this.http.put<PgiaAutorizacao>(`${this.apiUrl}/autorizacao/${id}`, form, { headers: this.getHeaders() });
  }

  // ── Relatório Anual de Governança de IA (art. 33) ─────────────────────────

  listarRelatoriosAnuais(): Observable<PgiaRelatorioAnual[]> {
    return this.http.get<PgiaRelatorioAnual[]>(`${this.apiUrl}/relatorio-anual`, { headers: this.getHeaders() });
  }

  criarRelatorioAnual(form: PgiaRelatorioAnualForm): Observable<PgiaRelatorioAnual> {
    return this.http.post<PgiaRelatorioAnual>(`${this.apiUrl}/relatorio-anual`, form, { headers: this.getHeaders() });
  }

  atualizarRelatorioAnual(id: number, form: PgiaRelatorioAnualForm): Observable<PgiaRelatorioAnual> {
    return this.http.put<PgiaRelatorioAnual>(`${this.apiUrl}/relatorio-anual/${id}`, form, { headers: this.getHeaders() });
  }

  // ── Auditorias técnicas (arts. 12, I, 25, § 2º e 34) ──────────────────────

  listarAuditorias(): Observable<PgiaAuditoria[]> {
    return this.http.get<PgiaAuditoria[]>(`${this.apiUrl}/auditorias`, { headers: this.getHeaders() });
  }

  /** Auditorias designadas ao usuário logado (área da entidade auditora). */
  listarMinhasAuditorias(): Observable<PgiaAuditoria[]> {
    return this.http.get<PgiaAuditoria[]>(`${this.apiUrl}/auditorias/minhas`, { headers: this.getHeaders() });
  }

  listarAuditoriasDoSistema(sistemaId: number): Observable<PgiaAuditoria[]> {
    return this.http.get<PgiaAuditoria[]>(`${this.apiUrl}/auditorias/sistema/${sistemaId}`, { headers: this.getHeaders() });
  }

  criarAuditoria(form: PgiaAuditoriaForm): Observable<PgiaAuditoria> {
    return this.http.post<PgiaAuditoria>(`${this.apiUrl}/auditorias`, form, { headers: this.getHeaders() });
  }

  atualizarAuditoria(id: number, form: PgiaAuditoriaForm): Observable<PgiaAuditoria> {
    return this.http.put<PgiaAuditoria>(`${this.apiUrl}/auditorias/${id}`, form, { headers: this.getHeaders() });
  }

  entregarParecer(id: number, form: PgiaAuditoriaParecerForm): Observable<PgiaAuditoria> {
    return this.http.put<PgiaAuditoria>(`${this.apiUrl}/auditorias/${id}/parecer`, form, { headers: this.getHeaders() });
  }

  publicarAuditoria(id: number, form: PgiaAuditoriaPublicacaoForm): Observable<PgiaAuditoria> {
    return this.http.put<PgiaAuditoria>(`${this.apiUrl}/auditorias/${id}/publicacao`, form, { headers: this.getHeaders() });
  }

  listarAuditores(): Observable<PgiaAuditor[]> {
    return this.http.get<PgiaAuditor[]>(`${this.apiUrl}/auditores`, { headers: this.getHeaders() });
  }
}
