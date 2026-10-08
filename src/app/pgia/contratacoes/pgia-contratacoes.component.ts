import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaSistemaService } from '../services/pgia-sistema.service';
import { PgiaGovernancaService } from '../services/pgia-governanca.service';
import { PgiaOperacaoService } from '../services/pgia-operacao.service';
import { CitaDecretoDirective } from '../shared/cita-decreto.directive';
import { acompanharSecao } from '../shared/secao-rota';
import { PgiaAnexoComponent } from '../shared/pgia-anexo.component';
import { Observable } from 'rxjs';
import { PgiaDocumentoService } from '../services/pgia-documento.service';
import { mensagemDoErro } from '../shared/mensagem-erro';

/** Mensagens do servidor para as regras do art. 37 que a tela confere antes de enviar. */
const MSG_ADITIVO =
  'Instrumento revisado que envolve IA exige informar o termo aditivo com a cláusula de vedação de treinamento (arts. 21 e 37).';
const MSG_DATA_ADITIVO = 'Informe a data do termo aditivo (arts. 21 e 37).';
import {
  PgiaDocumento,
  ENVOLVE_IA,
  PgiaAutorizacao,
  PgiaContrato,
  PgiaContratoForm,
  PgiaLegado,
  PgiaLegadoForm,
  PgiaOrgao,
  PgiaSistema,
  STATUS_CONTRATO,
  TIPOS_INSTRUMENTO_LEGADO
} from '../../../api/pgia/interface';

@Component({
  selector: 'app-pgia-contratacoes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaDecretoDirective, PgiaAnexoComponent],
  templateUrl: './pgia-contratacoes.component.html'
})
export class PgiaContratacoesComponent implements OnInit {
  /** Formulário mostrado nesta página (vem do parâmetro `:secao` da rota). */
  secao: string = '';
  user: UserProfile | null = null;
  loading = true;

  podeEditar = false;
  isAuditoria = false;
  modoConsulta = false;

  orgao: PgiaOrgao | null = null;
  sistemas: PgiaSistema[] = [];

  statusContrato = STATUS_CONTRATO;
  readonly msgAditivo = MSG_ADITIVO;
  readonly msgDataAditivo = MSG_DATA_ADITIVO;
  tiposInstrumento = TIPOS_INSTRUMENTO_LEGADO;
  envolveIa = ENVOLVE_IA;

  // ── Contratos ─────────────────────────────────────────────────────────────
  contratos: PgiaContrato[] = [];
  /** Todas as autorizações de treinamento que a lista central devolveu. */
  private todasAutorizacoesTreinamento: PgiaAutorizacao[] = [];
  /** Opções do select: as que amparam o contrato, mais a já vinculada (se não amparar mais). */
  autorizacoesTreinamento: PgiaAutorizacao[] = [];
  contratoForm = this.novoContrato();
  contratoEmEdicao: PgiaContrato | null = null;
  contratoSubmetido = false;
  salvandoContrato = false;

  // ── Instrumentos anteriores ao decreto ────────────────────────────────────
  legados: PgiaLegado[] = [];
  legadoForm = this.novoLegado();
  legadoEmEdicao: PgiaLegado | null = null;
  legadoSubmetido = false;
  salvandoLegado = false;

  /** Documento da comprovação do instrumento legado. */
  comprovacaoDocId: number | null = null;

  /**
   * O anexo da comprovação cria o documento na hora. Vai com SistemaIaId
   * quando o instrumento já está vinculado a um sistema (o backend herda o
   * órgão dele); senão, com o OrgaoId.
   */
  criarDocumentoComprovacao = (arquivo: File): Observable<PgiaDocumento> => {
    const sistemaId = this.legadoForm.SistemaIaId ? Number(this.legadoForm.SistemaIaId) : null;
    return this.documentoService.criarDocumento({
      Tipo: 'Comprovação de triagem',
      NomeArquivo: arquivo.name,
      ProcessoSei: this.legadoForm.ProcessoSei.trim() || null,
      SistemaIaId: sistemaId,
      OrgaoId: sistemaId ? null : (this.orgao?.Id ?? null)
    });
  };

  aoCriarDocumentoComprovacao(documento: PgiaDocumento): void {
    this.comprovacaoDocId = documento.Id;
  }

  constructor(
    private authService: AuthService,
    private orgaoService: PgiaOrgaoService,
    private sistemaService: PgiaSistemaService,
    private governancaService: PgiaGovernancaService,
    private operacaoService: PgiaOperacaoService,
    private notificationService: NotificationService,
    private documentoService: PgiaDocumentoService
  ) {
    // A seção vem do parâmetro da rota; o componente é reaproveitado na troca.
    acompanharSecao(secao => this.secao = secao);
  }

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.user = user;
      const papel = user?.PapelPgia ?? null;
      const isAdmin = user?.Perfil === Perfis.Admin;
      this.isAuditoria = papel === PapeisPgia.Auditoria && !isAdmin;
      this.podeEditar = isAdmin || papel === PapeisPgia.Orgao;
      this.modoConsulta = !this.podeEditar;
      if (this.isAuditoria) {
        this.loading = false;
      } else {
        this.carregar();
      }
    });
  }

  private novoContrato() {
    return {
      SistemaIaId: null as number | null,
      NumeroContrato: '',
      ProcessoSei: '',
      Objeto: '',
      FornecedorNome: '',
      Status: 'Vigente' as string,
      PrevistoPdtic: null as boolean | null,
      HomologacaoSgdiDocId: null as number | null,
      ClausulaVedacaoTreinamento: true,
      AutorizacaoTreinamentoId: null as number | null,
      ReqExplicabilidade: false,
      ReqAuditabilidade: false,
      ReqPortabilidade: false,
      ReqSemAprisionamento: false,
      ReqAcessibilidade: false,
      ClausulaAuditoriaIndependente: null as boolean | null,
      SlaDesempenho: null as number | null,
      SlaAcuracia: null as number | null,
      SlaEquidade: null as number | null,
      SlaDisponibilidade: null as number | null,
      SlaPenalidades: '',
      ConformeGuiaContratacoes: null as boolean | null
    };
  }

  private novoLegado() {
    return {
      TipoInstrumento: 'Contrato' as string,
      Descricao: '',
      Numero: '',
      EnvolveIa: 'Incerto' as string,
      DataTriagem: '',
      Revisado: false,
      DataRevisao: '',
      AditivoClausulaTreinamento: null as boolean | null,
      DataAditivo: '',
      ProcessoSei: '',
      SistemaIaId: null as number | null
    };
  }

  carregar(): void {
    this.loading = true;
    this.orgaoService.getMeuOrgao().subscribe({
      next: (meu) => {
        this.orgao = meu.Orgao;
        if (meu.Orgao) {
          this.sistemaService.listarSistemas(meu.Orgao.Id, 1, 200).subscribe({
            next: (pagina) => this.sistemas = pagina.Items ?? [],
            error: (erro) => this.notificationService.error(
              mensagemDoErro(erro, 'Não foi possível carregar os sistemas do órgão.'))
          });
          this.carregarContratos();
          this.carregarLegados();
        }
        this.loading = false;
        this.montarOpcoesAutorizacao();
      },
      error: (erro) => {
        this.notificationService.error(mensagemDoErro(erro, 'Não foi possível carregar os dados do órgão.'));
        this.loading = false;
      }
    });

    this.governancaService.listarAutorizacoes().subscribe({
      next: (lista) => {
        this.todasAutorizacoesTreinamento = lista.filter(
          a => a.Tipo === 'Uso de dados do GDF para treinamento pelo fornecedor');
        this.montarOpcoesAutorizacao();
      },
      // Papéis de órgão podem não enxergar a lista central: não vale um erro na tela.
      error: () => {
        this.todasAutorizacoesTreinamento = [];
        this.montarOpcoesAutorizacao();
      }
    });
  }

  carregarContratos(): void {
    if (!this.orgao) return;
    this.operacaoService.listarContratos(this.orgao.Id).subscribe({
      next: (lista) => this.contratos = lista,
      error: (erro) => this.notificationService.error(mensagemDoErro(erro, 'Não foi possível carregar os contratos de IA.'))
    });
  }

  carregarLegados(): void {
    if (!this.orgao) return;
    this.operacaoService.listarLegados(this.orgao.Id).subscribe({
      next: (lista) => this.legados = lista,
      error: (erro) => this.notificationService.error(
        mensagemDoErro(erro, 'Não foi possível carregar os instrumentos anteriores ao decreto.'))
    });
  }

  // ── Condicionais pela classificação do sistema vinculado ──────────────────

  get sistemaDoContrato(): PgiaSistema | null {
    return this.sistemas.find(s => s.Id === Number(this.contratoForm.SistemaIaId)) ?? null;
  }

  /**
   * Sem sistema vinculado não há classificação: ao desvincular na edição, o
   * fallback do contrato salvo é descartado e as condicionais somem.
   * O fallback só vale enquanto o select apontar para o mesmo sistema do contrato.
   */
  get classificacaoContrato(): string | null {
    const escolhido = this.contratoForm.SistemaIaId ? Number(this.contratoForm.SistemaIaId) : null;
    if (!escolhido) return null;
    if (this.sistemaDoContrato) return this.sistemaDoContrato.ClassificacaoRiscoAtual;
    return this.contratoEmEdicao?.SistemaIaId === escolhido
      ? (this.contratoEmEdicao?.SistemaClassificacao ?? null)
      : null;
  }

  /** Art. 25, I, a e II, a: PDTIC é exigido em Alto e Moderado Risco. */
  get exigePdtic(): boolean {
    const c = this.classificacaoContrato;
    return c === 'Alto Risco' || c === 'Risco Moderado';
  }

  /** Art. 25, § 2º: auditoria independente, SLAs e penalidades no Alto Risco. */
  get exigeAltoRisco(): boolean {
    return this.classificacaoContrato === 'Alto Risco';
  }

  /** Art. 25, II, b e c: o Risco Moderado depende da homologação técnica da SGDI. */
  get exigeHomologacao(): boolean {
    return this.classificacaoContrato === 'Risco Moderado';
  }

  get exigeAutorizacaoTreinamento(): boolean {
    return !this.contratoForm.ClausulaVedacaoTreinamento;
  }

  // ── Autorização excepcional de treinamento (art. 21) ──────────────────────

  /**
   * A mesma regra do servidor: a autorização só ampara o contrato se for do
   * mesmo órgão, estiver ativa e dentro da vigência. Devolve o motivo, ou nulo.
   */
  problemaDaAutorizacao(a: PgiaAutorizacao): string | null {
    if (this.orgao && a.OrgaoId !== this.orgao.Id)
      return 'A autorização de treinamento é de outro órgão e não ampara este contrato (art. 21).';
    if (!a.Ativo) return 'A autorização de treinamento vinculada está revogada (art. 21).';
    if (a.VigenciaFim && a.VigenciaFim.slice(0, 10) < this.hoje())
      return 'A autorização de treinamento vinculada está com a vigência vencida (art. 21).';
    return null;
  }

  /** Hoje, no fuso do navegador, como data pura (aaaa-mm-dd). */
  private hoje(): string {
    const d = new Date();
    const dois = (n: number) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + dois(d.getMonth() + 1) + '-' + dois(d.getDate());
  }

  /**
   * Recalcula as opções do select (campo, não getter: um array novo a cada
   * verificação de mudanças quebraria o ngFor). A autorização já vinculada
   * que deixou de amparar o contrato continua na lista, para a tela explicar.
   */
  private montarOpcoesAutorizacao(): void {
    const vinculada = this.contratoForm.AutorizacaoTreinamentoId;
    this.autorizacoesTreinamento = this.todasAutorizacoesTreinamento.filter(
      a => !this.problemaDaAutorizacao(a) || a.Id === vinculada);
  }

  /** Motivo pelo qual a autorização escolhida não ampara o contrato (nulo se ampara). */
  get errAutorizacaoInvalida(): string | null {
    if (!this.exigeAutorizacaoTreinamento || !this.contratoForm.AutorizacaoTreinamentoId) return null;
    const escolhida = this.todasAutorizacoesTreinamento.find(
      a => a.Id === Number(this.contratoForm.AutorizacaoTreinamentoId));
    return escolhida ? this.problemaDaAutorizacao(escolhida) : null;
  }

  // ── Validação do contrato ─────────────────────────────────────────────────

  get errNumero(): boolean { return this.contratoSubmetido && !this.contratoForm.NumeroContrato.trim(); }
  get errSei(): boolean { return this.contratoSubmetido && !this.contratoForm.ProcessoSei.trim(); }
  get errObjeto(): boolean { return this.contratoSubmetido && !this.contratoForm.Objeto.trim(); }
  get errFornecedor(): boolean { return this.contratoSubmetido && !this.contratoForm.FornecedorNome.trim(); }
  get errPdtic(): boolean { return this.contratoSubmetido && this.exigePdtic && this.contratoForm.PrevistoPdtic === null; }
  get errAutorizacao(): boolean {
    return this.contratoSubmetido && this.exigeAutorizacaoTreinamento && !this.contratoForm.AutorizacaoTreinamentoId;
  }
  get errAuditoriaIndependente(): boolean {
    return this.contratoSubmetido && this.exigeAltoRisco && this.contratoForm.ClausulaAuditoriaIndependente === null;
  }
  get errSlaDesempenho(): boolean { return this.contratoSubmetido && this.exigeAltoRisco && this.contratoForm.SlaDesempenho === null; }
  get errSlaAcuracia(): boolean { return this.contratoSubmetido && this.exigeAltoRisco && this.contratoForm.SlaAcuracia === null; }
  get errSlaEquidade(): boolean { return this.contratoSubmetido && this.exigeAltoRisco && this.contratoForm.SlaEquidade === null; }
  get errSlaDisponibilidade(): boolean { return this.contratoSubmetido && this.exigeAltoRisco && this.contratoForm.SlaDisponibilidade === null; }
  get errSlaPenalidades(): boolean { return this.contratoSubmetido && this.exigeAltoRisco && !this.contratoForm.SlaPenalidades.trim(); }
  get errHomologacao(): boolean {
    return this.contratoSubmetido && this.exigeHomologacao && !this.contratoForm.HomologacaoSgdiDocId;
  }

  private contratoValido(): boolean {
    return !this.errNumero && !this.errSei && !this.errObjeto && !this.errFornecedor
      && !this.errPdtic && !this.errAutorizacao && !this.errAuditoriaIndependente
      && !this.errSlaDesempenho && !this.errSlaAcuracia && !this.errSlaEquidade
      && !this.errSlaDisponibilidade && !this.errSlaPenalidades && !this.errHomologacao
      && !this.errAutorizacaoInvalida;
  }

  // ── Homologação técnica da SGDI (metadados do documento) ─────────────────

  homologacaoSei = '';
  homologacaoNome = '';
  registrandoHomologacao = false;
  /** Tentou registrar sem a identificação do documento (o servidor exige o nome). */
  homologacaoSemNome = false;

  registrarHomologacao(): void {
    const sistemaId = this.contratoForm.SistemaIaId ? Number(this.contratoForm.SistemaIaId) : null;
    if (!sistemaId) {
      this.notificationService.warning('Vincule o sistema antes de registrar a homologação técnica.');
      return;
    }
    // O servidor exige o nome do documento; o processo SEI é opcional
    this.homologacaoSemNome = !this.homologacaoNome.trim();
    if (this.homologacaoSemNome) {
      this.notificationService.warning('Informe a identificação do documento da homologação.');
      return;
    }
    this.registrandoHomologacao = true;
    this.sistemaService.criarDocumento(sistemaId, {
      Tipo: 'Outro',
      ProcessoSei: this.homologacaoSei.trim() || null,
      NomeArquivo: this.homologacaoNome.trim() || null
    }).subscribe({
      next: (doc) => {
        this.registrandoHomologacao = false;
        this.contratoForm.HomologacaoSgdiDocId = doc.Id;
        this.homologacaoSei = '';
        this.homologacaoNome = '';
        this.notificationService.success('Homologação registrada. Agora anexe o arquivo e salve o contrato.');
      },
      error: (erro) => {
        this.registrandoHomologacao = false;
        this.notificationService.error(mensagemDoErro(erro, 'Não foi possível registrar a homologação técnica.'));
      }
    });
  }

  limparHomologacao(): void {
    this.contratoForm.HomologacaoSgdiDocId = null;
  }

  editarContrato(c: PgiaContrato): void {
    this.contratoEmEdicao = c;
    this.contratoSubmetido = false;
    this.contratoForm = {
      SistemaIaId: c.SistemaIaId,
      NumeroContrato: c.NumeroContrato,
      ProcessoSei: c.ProcessoSei,
      Objeto: c.Objeto,
      FornecedorNome: c.FornecedorNome,
      Status: c.Status,
      PrevistoPdtic: c.PrevistoPdtic,
      HomologacaoSgdiDocId: c.HomologacaoSgdiDocId,
      ClausulaVedacaoTreinamento: c.ClausulaVedacaoTreinamento,
      AutorizacaoTreinamentoId: c.AutorizacaoTreinamentoId,
      ReqExplicabilidade: c.ReqExplicabilidade,
      ReqAuditabilidade: c.ReqAuditabilidade,
      ReqPortabilidade: c.ReqPortabilidade,
      ReqSemAprisionamento: c.ReqSemAprisionamento,
      ReqAcessibilidade: c.ReqAcessibilidade,
      ClausulaAuditoriaIndependente: c.ClausulaAuditoriaIndependente,
      SlaDesempenho: c.SlaDesempenho,
      SlaAcuracia: c.SlaAcuracia,
      SlaEquidade: c.SlaEquidade,
      SlaDisponibilidade: c.SlaDisponibilidade,
      SlaPenalidades: c.SlaPenalidades ?? '',
      ConformeGuiaContratacoes: c.ConformeGuiaContratacoes
    };
    this.homologacaoSemNome = false;
    this.montarOpcoesAutorizacao();
  }

  cancelarEdicaoContrato(): void {
    this.contratoEmEdicao = null;
    this.contratoSubmetido = false;
    this.contratoForm = this.novoContrato();
    this.homologacaoSei = '';
    this.homologacaoNome = '';
    this.homologacaoSemNome = false;
    this.montarOpcoesAutorizacao();
  }

  salvarContrato(): void {
    if (!this.orgao) return;
    this.contratoSubmetido = true;
    if (!this.contratoValido()) {
      this.notificationService.warning(this.errAutorizacaoInvalida
        ?? 'Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const payload: PgiaContratoForm = {
      SistemaIaId: this.contratoForm.SistemaIaId ? Number(this.contratoForm.SistemaIaId) : null,
      NumeroContrato: this.contratoForm.NumeroContrato.trim(),
      ProcessoSei: this.contratoForm.ProcessoSei.trim(),
      Objeto: this.contratoForm.Objeto.trim(),
      FornecedorNome: this.contratoForm.FornecedorNome.trim(),
      Status: this.contratoForm.Status,
      PrevistoPdtic: this.exigePdtic ? this.contratoForm.PrevistoPdtic : null,
      HomologacaoSgdiDocId: this.exigeHomologacao ? this.contratoForm.HomologacaoSgdiDocId : null,
      ClausulaVedacaoTreinamento: this.contratoForm.ClausulaVedacaoTreinamento,
      AutorizacaoTreinamentoId: this.exigeAutorizacaoTreinamento && this.contratoForm.AutorizacaoTreinamentoId
        ? Number(this.contratoForm.AutorizacaoTreinamentoId) : null,
      ReqExplicabilidade: this.contratoForm.ReqExplicabilidade,
      ReqAuditabilidade: this.contratoForm.ReqAuditabilidade,
      ReqPortabilidade: this.contratoForm.ReqPortabilidade,
      ReqSemAprisionamento: this.contratoForm.ReqSemAprisionamento,
      ReqAcessibilidade: this.contratoForm.ReqAcessibilidade,
      ClausulaAuditoriaIndependente: this.exigeAltoRisco ? this.contratoForm.ClausulaAuditoriaIndependente : null,
      SlaDesempenho: this.exigeAltoRisco ? this.contratoForm.SlaDesempenho : null,
      SlaAcuracia: this.exigeAltoRisco ? this.contratoForm.SlaAcuracia : null,
      SlaEquidade: this.exigeAltoRisco ? this.contratoForm.SlaEquidade : null,
      SlaDisponibilidade: this.exigeAltoRisco ? this.contratoForm.SlaDisponibilidade : null,
      SlaPenalidades: this.exigeAltoRisco ? (this.contratoForm.SlaPenalidades.trim() || null) : null,
      ConformeGuiaContratacoes: this.contratoForm.ConformeGuiaContratacoes
    };
    this.salvandoContrato = true;
    const chamada = this.contratoEmEdicao
      ? this.operacaoService.atualizarContrato(this.contratoEmEdicao.Id, payload)
      : this.operacaoService.criarContrato(this.orgao.Id, payload);
    chamada.subscribe({
      next: () => {
        this.salvandoContrato = false;
        this.notificationService.success(this.contratoEmEdicao
          ? 'Contrato atualizado.'
          : 'Contrato registrado. Ele já aparece na lista.');
        this.cancelarEdicaoContrato();
        this.carregarContratos();
      },
      error: (erro) => {
        this.salvandoContrato = false;
        this.notificationService.error(mensagemDoErro(erro, 'Não foi possível salvar o contrato.'));
      }
    });
  }

  badgeStatusContrato(status: string): string {
    switch (status) {
      case 'Vigente': return 'bg-green-100 text-green-800';
      case 'Suspenso': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-700'; // Encerrado
    }
  }

  badgeClasse(risco: string | null): string {
    switch (risco) {
      case 'Risco Excessivo': return 'bg-red-100 text-red-800';
      case 'Alto Risco': return 'bg-orange-100 text-orange-800';
      case 'Risco Moderado': return 'bg-yellow-100 text-yellow-800';
      case 'Baixo Risco': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  // ── Triagem dos instrumentos anteriores ao decreto ────────────────────────

  /** Incerto conta como sim até a confirmação do fornecedor (art. 37). */
  get legadoEnvolveIa(): boolean {
    return this.legadoForm.EnvolveIa !== 'Não';
  }

  get errLegadoDescricao(): boolean { return this.legadoSubmetido && !this.legadoForm.Descricao.trim(); }

  /** Art. 37: revisado e envolvendo IA, precisa dizer se recebeu o aditivo do art. 21. */
  get errLegadoAditivo(): boolean {
    return this.legadoSubmetido && this.legadoForm.Revisado && this.legadoEnvolveIa
      && this.legadoForm.AditivoClausulaTreinamento === null;
  }

  /** Com o aditivo, a data dele é obrigatória. */
  get errLegadoDataAditivo(): boolean {
    return this.legadoSubmetido && this.legadoEnvolveIa
      && this.legadoForm.AditivoClausulaTreinamento === true && !this.legadoForm.DataAditivo;
  }

  pendente(l: PgiaLegado): boolean {
    return l.EnvolveIa !== 'Não' && !l.Revisado;
  }

  editarLegado(l: PgiaLegado): void {
    this.legadoEmEdicao = l;
    this.legadoSubmetido = false;
    this.comprovacaoDocId = l.ComprovacaoDocId ?? null;
    this.legadoForm = {
      TipoInstrumento: l.TipoInstrumento,
      Descricao: l.Descricao,
      Numero: l.Numero ?? '',
      EnvolveIa: l.EnvolveIa,
      DataTriagem: l.DataTriagem ?? '',
      Revisado: l.Revisado,
      DataRevisao: l.DataRevisao ?? '',
      AditivoClausulaTreinamento: l.AditivoClausulaTreinamento,
      DataAditivo: l.DataAditivo ?? '',
      ProcessoSei: l.ProcessoSei ?? '',
      SistemaIaId: l.SistemaIaId
    };
  }

  cancelarEdicaoLegado(): void {
    this.legadoEmEdicao = null;
    this.comprovacaoDocId = null;
    this.legadoSubmetido = false;
    this.legadoForm = this.novoLegado();
  }

  salvarLegado(): void {
    if (!this.orgao) return;
    this.legadoSubmetido = true;
    if (this.errLegadoDescricao || this.errLegadoAditivo || this.errLegadoDataAditivo) {
      this.notificationService.warning(this.errLegadoDescricao
        ? 'Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.'
        : (this.errLegadoAditivo ? MSG_ADITIVO : MSG_DATA_ADITIVO));
      return;
    }
    const payload: PgiaLegadoForm = {
      TipoInstrumento: this.legadoForm.TipoInstrumento,
      Descricao: this.legadoForm.Descricao.trim(),
      Numero: this.legadoForm.Numero.trim() || null,
      EnvolveIa: this.legadoForm.EnvolveIa,
      DataTriagem: this.legadoForm.DataTriagem || null,
      Revisado: this.legadoForm.Revisado,
      DataRevisao: this.legadoForm.DataRevisao || null,
      AditivoClausulaTreinamento: this.legadoEnvolveIa ? this.legadoForm.AditivoClausulaTreinamento : null,
      DataAditivo: this.legadoEnvolveIa ? (this.legadoForm.DataAditivo || null) : null,
      ProcessoSei: this.legadoForm.ProcessoSei.trim() || null,
      ComprovacaoDocId: this.comprovacaoDocId,
      SistemaIaId: this.legadoForm.SistemaIaId ? Number(this.legadoForm.SistemaIaId) : null
    };
    this.salvandoLegado = true;
    const chamada = this.legadoEmEdicao
      ? this.operacaoService.atualizarLegado(this.legadoEmEdicao.Id, payload)
      : this.operacaoService.criarLegado(this.orgao.Id, payload);
    chamada.subscribe({
      next: () => {
        this.salvandoLegado = false;
        this.notificationService.success(this.legadoEmEdicao
          ? 'Instrumento atualizado.'
          : 'Instrumento registrado na triagem. Ele já aparece na lista.');
        this.cancelarEdicaoLegado();
        this.carregarLegados();
      },
      error: (erro) => {
        this.salvandoLegado = false;
        this.notificationService.error(mensagemDoErro(erro, 'Não foi possível salvar o instrumento.'));
      }
    });
  }
}
