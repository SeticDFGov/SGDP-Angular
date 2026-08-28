import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaGovernancaService, PgiaSistemaResumo } from '../services/pgia-governanca.service';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaSistemaService } from '../services/pgia-sistema.service';
import { PgiaOperacaoService } from '../services/pgia-operacao.service';
import { PgiaAbasComponent } from '../shared/pgia-abas.component';
import { PgiaChecklistAbertoComponent } from '../shared/pgia-checklist-aberto.component';
import {
  AUTORIZADA_POR,
  HIPOTESES_INCIDENTE,
  PgiaAia,
  PgiaAuditor,
  PgiaAuditoria,
  PgiaAuditoriaForm,
  PgiaRelatorioAnual,
  PgiaRelatorioAnualForm,
  PgiaRelatorioSemestral,
  STATUS_RELATORIO_SEMESTRAL,
  TIPOS_AUDITORIA,
  PgiaIncidente,
  PgiaIncidenteApuracaoForm,
  PgiaNaoConformidade,
  PgiaNaoConformidadeUpdateForm,
  SITUACOES_NAO_CONFORMIDADE,
  STATUS_APURACAO,
  PgiaAutorizacao,
  PgiaAutorizacaoForm,
  PgiaDeliberacao,
  PgiaHomologacaoPendente,
  PgiaNorma,
  PgiaNormaForm,
  PgiaOrgao,
  PgiaPlataforma,
  PgiaPlataformaForm,
  PgiaSistema,
  STATUS_HOMOLOGACAO_PLATAFORMA,
  TIPOS_AUTORIZACAO,
  TIPOS_NORMA
} from '../../../api/pgia/interface';

@Component({
  selector: 'app-pgia-sgdi',
  standalone: true,
  imports: [CommonModule, FormsModule, PgiaAbasComponent, PgiaChecklistAbertoComponent],
  templateUrl: './pgia-sgdi.component.html'
})
export class PgiaSgdiComponent implements OnInit {
  user: UserProfile | null = null;
  loading = true;

  // Usabilidade por papel; a autorização real é do backend.
  temAcesso = false;

  // Listas de domínio
  statusPlataforma = STATUS_HOMOLOGACAO_PLATAFORMA;
  tiposNorma = TIPOS_NORMA;
  tiposAutorizacao = TIPOS_AUTORIZACAO;
  autorizadaPor = AUTORIZADA_POR;
  /** O backend só aceita estes dois emissores de norma complementar. */
  emissoresNorma = ['SGDI', 'CGTIC'];

  // ── 1. Fila de homologação ────────────────────────────────────────────────
  filaSgdi: PgiaHomologacaoPendente[] = [];
  filaCgtic: PgiaHomologacaoPendente[] = [];
  private carregandoFilaSgdi = false;
  private carregandoFilaCgtic = false;
  expandido: number | null = null;
  parecerAtual = '';
  parecerSubmetido = false;
  avaliando = false;

  // ── 2. Plataformas ────────────────────────────────────────────────────────
  plataformas: PgiaPlataforma[] = [];
  plataformaForm = this.novaPlataformaForm();
  plataformaEmEdicao: PgiaPlataforma | null = null;
  plataformaSubmetida = false;
  salvandoPlataforma = false;

  // ── 3 e 4. Registro Público e publicação da AIA ───────────────────────────
  orgaos: PgiaOrgao[] = [];
  orgaoSelecionadoId: number | null = null;
  sistemasDoOrgao: PgiaSistema[] = [];
  sistemaSelecionadoId: number | null = null;
  carregandoSistemas = false;
  registroPublicado = false;
  registroData = '';
  publicandoRegistro = false;

  aias: PgiaAia[] = [];
  carregandoAias = false;
  publicacao: Record<number, { PublicadaPortal: boolean; DataPublicacaoPortal: string; UrlPublicacao: string }> = {};
  publicandoAia = false;
  deliberacoes: PgiaDeliberacao[] = [];
  deliberacaoEscolhida: Record<number, number | null> = {};
  vinculandoDeliberacao = false;

  // ── Apuração de incidente ─────────────────────────────────────────────────
  statusApuracao = STATUS_APURACAO;
  incidentes: PgiaIncidente[] = [];
  incidenteSelecionadoId: number | null = null;
  apuracaoForm = this.novaApuracao();
  apuracaoSubmetida = false;
  salvandoApuracao = false;

  // ── Relatórios semestrais dos órgãos ──────────────────────────────────────
  statusRelatorio = STATUS_RELATORIO_SEMESTRAL;
  orgaoRelatoriosId: number | null = null;
  relatoriosSemestrais: PgiaRelatorioSemestral[] = [];
  carregandoRelatorios = false;
  situacaoEmEdicao: PgiaRelatorioSemestral | null = null;
  situacaoForm = this.novaSituacaoForm();
  salvandoSituacao = false;

  // ── Relatório Anual de Governança de IA ───────────────────────────────────
  relatoriosAnuais: PgiaRelatorioAnual[] = [];
  anualForm = this.novoAnualForm();
  anualEmEdicao: PgiaRelatorioAnual | null = null;
  anualSubmetido = false;
  salvandoAnual = false;

  // ── Auditorias técnicas ───────────────────────────────────────────────────
  tiposAuditoria = TIPOS_AUDITORIA;
  /** Todos os sistemas visíveis à SGDI, para o select da auditoria. */
  todosSistemas: PgiaSistemaResumo[] = [];
  auditorias: PgiaAuditoria[] = [];
  auditores: PgiaAuditor[] = [];
  auditoriaForm = this.novaAuditoriaForm();
  auditoriaSubmetida = false;
  salvandoAuditoria = false;
  publicacaoAuditoria: Record<number, { PublicadoPortal: boolean; DataPublicacao: string; Url: string }> = {};
  publicandoAuditoriaId: number | null = null;

  // ── Não conformidades da supervisão ───────────────────────────────────────
  situacoesNaoConformidade = SITUACOES_NAO_CONFORMIDADE;
  naoConformidades: PgiaNaoConformidade[] = [];
  ncForm = this.novaNcForm();
  ncSubmetida = false;
  salvandoNc = false;
  ncEmEdicao: PgiaNaoConformidade | null = null;
  ncEdicao = this.novaEdicaoNc();
  salvandoEdicaoNc = false;

  // ── 5. Normas ─────────────────────────────────────────────────────────────
  normas: PgiaNorma[] = [];
  normaForm = this.novaNormaForm();
  normaEmEdicao: PgiaNorma | null = null;
  normaSubmetida = false;
  salvandoNorma = false;

  // ── 6. Autorizações ───────────────────────────────────────────────────────
  autorizacoes: PgiaAutorizacao[] = [];
  autorizacaoForm = this.novaAutorizacaoForm();
  autorizacaoEmEdicao: PgiaAutorizacao | null = null;
  autorizacaoSubmetida = false;
  salvandoAutorizacao = false;

  constructor(
    private authService: AuthService,
    private governancaService: PgiaGovernancaService,
    private orgaoService: PgiaOrgaoService,
    private sistemaService: PgiaSistemaService,
    private operacaoService: PgiaOperacaoService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.user = user;
      const papel = user?.PapelPgia ?? null;
      const isAdmin = user?.Perfil === Perfis.Admin;
      this.temAcesso = isAdmin || papel === PapeisPgia.Sgdi;
      this.loading = false;
      if (this.temAcesso) {
        this.carregarTudo();
      }
    });
  }

  private carregarTudo(): void {
    this.carregarFilas();
    this.carregarPlataformas();
    this.carregarNormas();
    this.carregarAutorizacoes();
    this.carregarIncidentes();
    this.carregarNaoConformidades();
    this.carregarRelatoriosAnuais();
    this.carregarAuditorias();
    this.governancaService.listarSistemasGovernanca().subscribe({
      next: (lista) => this.todosSistemas = lista,
      error: () => this.notificationService.error('Não foi possível carregar a lista de sistemas.')
    });
    this.governancaService.listarAuditores().subscribe({
      next: (lista) => this.auditores = lista,
      error: () => this.notificationService.error('Não foi possível carregar os usuários das entidades auditoras.')
    });
    this.carregarDeliberacoes();
    this.orgaoService.listarOrgaos().subscribe({
      next: (lista) => this.orgaos = lista.filter(o => o.Ativo),
      error: () => this.notificationService.error('Não foi possível carregar a lista de órgãos.')
    });
  }

  // ── 1. Fila de homologação ────────────────────────────────────────────────

  /** Verdadeiro enquanto qualquer uma das duas filas ainda está sendo buscada. */
  get carregandoFilas(): boolean {
    return this.carregandoFilaSgdi || this.carregandoFilaCgtic;
  }

  carregarFilas(): void {
    this.carregandoFilaSgdi = true;
    this.carregandoFilaCgtic = true;
    this.governancaService.listarHomologacoes('Aguardando avaliação da SGDI').subscribe({
      next: (lista) => { this.filaSgdi = lista; this.carregandoFilaSgdi = false; },
      error: () => {
        this.carregandoFilaSgdi = false;
        this.notificationService.error('Não foi possível carregar a fila de homologação da SGDI.');
      }
    });
    this.governancaService.listarHomologacoes('Aguardando deliberação do CGTIC').subscribe({
      next: (lista) => { this.filaCgtic = lista; this.carregandoFilaCgtic = false; },
      error: () => {
        this.carregandoFilaCgtic = false;
        this.notificationService.error('Não foi possível carregar a fila delegada ao CGTIC.');
      }
    });
  }

  alternarDetalhe(item: PgiaHomologacaoPendente): void {
    if (this.expandido === item.Sistema.Id) {
      this.expandido = null;
      return;
    }
    this.expandido = item.Sistema.Id;
    this.parecerAtual = '';
    this.parecerSubmetido = false;
  }

  get errParecer(): boolean {
    return this.parecerSubmetido && !this.parecerAtual.trim();
  }

  avaliar(item: PgiaHomologacaoPendente, aprovado: boolean): void {
    this.parecerSubmetido = true;
    if (!this.parecerAtual.trim()) {
      this.notificationService.warning('Escreva o parecer antes de aprovar ou vetar. O campo está destacado em vermelho.');
      return;
    }
    this.avaliando = true;
    this.governancaService.avaliarHomologacao(item.Sistema.Id, {
      Aprovado: aprovado,
      Parecer: this.parecerAtual.trim()
    }).subscribe({
      next: () => {
        this.avaliando = false;
        this.expandido = null;
        this.parecerAtual = '';
        this.parecerSubmetido = false;
        this.notificationService.success(aprovado
          ? `Sistema ${item.Sistema.Denominacao} aprovado. O órgão já vê o parecer no inventário.`
          : `Sistema ${item.Sistema.Denominacao} vetado. O órgão já vê o parecer no inventário.`);
        this.carregarFilas();
      },
      error: () => {
        this.avaliando = false;
        this.notificationService.error('Não foi possível registrar a avaliação.');
      }
    });
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

  // ── 2. Plataformas ────────────────────────────────────────────────────────

  private novaPlataformaForm() {
    return {
      Nome: '',
      Fornecedor: '',
      StatusHomologacao: 'Em avaliação' as string,
      AptaDadosPessoaisSigilosos: false,
      AtoHomologacao: '',
      PublicadaRelacaoEm: '',
      DiretrizesUso: ''
    };
  }

  carregarPlataformas(): void {
    this.governancaService.listarPlataformas().subscribe({
      next: (lista) => this.plataformas = lista,
      error: () => this.notificationService.error('Não foi possível carregar as plataformas.')
    });
  }

  editarPlataforma(p: PgiaPlataforma): void {
    this.plataformaEmEdicao = p;
    this.plataformaSubmetida = false;
    this.plataformaForm = {
      Nome: p.Nome,
      Fornecedor: p.Fornecedor ?? '',
      StatusHomologacao: p.StatusHomologacao,
      AptaDadosPessoaisSigilosos: p.AptaDadosPessoaisSigilosos,
      AtoHomologacao: p.AtoHomologacao ?? '',
      PublicadaRelacaoEm: p.PublicadaRelacaoEm ?? '',
      DiretrizesUso: p.DiretrizesUso ?? ''
    };
  }

  cancelarEdicaoPlataforma(): void {
    this.plataformaEmEdicao = null;
    this.plataformaSubmetida = false;
    this.plataformaForm = this.novaPlataformaForm();
  }

  get errPlataformaNome(): boolean {
    return this.plataformaSubmetida && !this.plataformaForm.Nome.trim();
  }

  salvarPlataforma(): void {
    this.plataformaSubmetida = true;
    if (!this.plataformaForm.Nome.trim()) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const payload: PgiaPlataformaForm = {
      Nome: this.plataformaForm.Nome.trim(),
      Fornecedor: this.plataformaForm.Fornecedor.trim() || null,
      // Endereço e data do ato não estão neste formulário; preserva o que já existe.
      Url: this.plataformaEmEdicao?.Url ?? null,
      StatusHomologacao: this.plataformaForm.StatusHomologacao,
      AptaDadosPessoaisSigilosos: this.plataformaForm.AptaDadosPessoaisSigilosos,
      AtoHomologacao: this.plataformaForm.AtoHomologacao.trim() || null,
      DataAto: this.plataformaEmEdicao?.DataAto ?? null,
      PublicadaRelacaoEm: this.plataformaForm.PublicadaRelacaoEm || null,
      DiretrizesUso: this.plataformaForm.DiretrizesUso.trim() || null
    };
    this.salvandoPlataforma = true;
    const chamada = this.plataformaEmEdicao
      ? this.governancaService.atualizarPlataforma(this.plataformaEmEdicao.Id, payload)
      : this.governancaService.criarPlataforma(payload);
    chamada.subscribe({
      next: () => {
        this.salvandoPlataforma = false;
        this.notificationService.success('Plataforma registrada. A relação pública será atualizada com este item.');
        this.cancelarEdicaoPlataforma();
        this.carregarPlataformas();
      },
      error: () => {
        this.salvandoPlataforma = false;
        this.notificationService.error('Não foi possível salvar a plataforma.');
      }
    });
  }

  badgePlataforma(status: string): string {
    switch (status) {
      case 'Homologada': return 'bg-green-100 text-green-800';
      case 'Homologada apta a dados pessoais e sigilosos': return 'bg-green-100 text-green-800';
      case 'Não homologada': return 'bg-red-100 text-red-800';
      case 'Homologação revogada': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800'; // Em avaliação
    }
  }

  // ── 3 e 4. Seleção de sistema, Registro Público e AIA ─────────────────────

  aoTrocarOrgao(): void {
    this.sistemasDoOrgao = [];
    this.sistemaSelecionadoId = null;
    this.aias = [];
    this.registroPublicado = false;
    this.registroData = '';
    if (!this.orgaoSelecionadoId) return;
    this.carregandoSistemas = true;
    this.sistemaService.listarSistemas(this.orgaoSelecionadoId, 1, 200).subscribe({
      next: (pagina) => { this.sistemasDoOrgao = pagina.Items ?? []; this.carregandoSistemas = false; },
      error: () => {
        this.carregandoSistemas = false;
        this.notificationService.error('Não foi possível carregar os sistemas do órgão.');
      }
    });
  }

  get sistemaSelecionado(): PgiaSistema | null {
    return this.sistemasDoOrgao.find(s => s.Id === Number(this.sistemaSelecionadoId)) ?? null;
  }

  aoTrocarSistema(): void {
    const s = this.sistemaSelecionado;
    this.registroPublicado = s?.PublicadoRegistroPublico ?? false;
    this.registroData = s?.DataPublicacaoRegistro ?? '';
    this.carregarAias();
  }

  /**
   * Recarrega só as avaliações de impacto do sistema em tela.
   * Não mexe em registroPublicado/registroData: o que o usuário digitou no card
   * do Registro Público e ainda não salvou tem de sobreviver.
   */
  private carregarAias(): void {
    this.aias = [];
    this.publicacao = {};
    this.deliberacaoEscolhida = {};
    const s = this.sistemaSelecionado;
    if (!s) return;
    this.carregandoAias = true;
    this.sistemaService.listarAias(s.Id).subscribe({
      next: (lista) => {
        this.aias = lista;
        lista.forEach(a => {
          this.publicacao[a.Id] = {
            PublicadaPortal: a.PublicadaPortal,
            DataPublicacaoPortal: a.DataPublicacaoPortal ?? '',
            UrlPublicacao: a.UrlPublicacao ?? ''
          };
          this.deliberacaoEscolhida[a.Id] = a.DeliberacaoCgticId;
        });
        this.carregandoAias = false;
      },
      error: () => {
        this.carregandoAias = false;
        this.notificationService.error('Não foi possível carregar as avaliações de impacto do sistema.');
      }
    });
  }

  /**
   * URL do resultado da AIA mais recente já publicada, quando houver.
   * A lista vem em ordem decrescente: a primeira publicada é a mais nova.
   */
  get urlAiaPublicada(): string | null {
    return this.aias.find(a => a.PublicadaPortal && a.UrlPublicacao)?.UrlPublicacao ?? null;
  }

  publicarRegistro(): void {
    const s = this.sistemaSelecionado;
    if (!s) {
      this.notificationService.warning('Escolha o órgão e o sistema antes de publicar.');
      return;
    }
    this.publicandoRegistro = true;
    this.governancaService.publicarRegistroPublico(s.Id, {
      Publicado: this.registroPublicado,
      DataPublicacao: this.registroData || null
    }).subscribe({
      next: () => {
        this.publicandoRegistro = false;
        this.notificationService.success('Publicação registrada no Registro Público.');
        const orgaoId = this.orgaoSelecionadoId;
        const sistemaId = s.Id;
        if (orgaoId) {
          this.sistemaService.listarSistemas(orgaoId, 1, 200).subscribe({
            next: (pagina) => {
              this.sistemasDoOrgao = pagina.Items ?? [];
              this.sistemaSelecionadoId = sistemaId;
            }
          });
        }
      },
      error: () => {
        this.publicandoRegistro = false;
        this.notificationService.error('Não foi possível registrar a publicação.');
      }
    });
  }

  carregarDeliberacoes(): void {
    this.governancaService.listarDeliberacoes().subscribe({
      next: (lista) => this.deliberacoes = lista,
      error: () => this.notificationService.error('Não foi possível carregar as deliberações do CGTIC.')
    });
  }

  /** Deliberações sem objeto específico ou já ligadas ao sistema em tela. */
  get deliberacoesDoSistema(): PgiaDeliberacao[] {
    const id = this.sistemaSelecionado?.Id ?? null;
    return this.deliberacoes.filter(d => d.SistemaIaId === null || d.SistemaIaId === id);
  }

  publicarAia(aia: PgiaAia): void {
    const dados = this.publicacao[aia.Id];
    if (!dados) return;
    this.publicandoAia = true;
    this.sistemaService.publicarAia(aia.Id, {
      PublicadaPortal: dados.PublicadaPortal,
      DataPublicacaoPortal: dados.DataPublicacaoPortal || null,
      UrlPublicacao: dados.UrlPublicacao.trim() || null
    }).subscribe({
      next: () => {
        this.publicandoAia = false;
        this.notificationService.success('Publicação da avaliação de impacto registrada.');
        this.carregarAias();
      },
      error: () => {
        this.publicandoAia = false;
        this.notificationService.error('Não foi possível registrar a publicação da avaliação de impacto.');
      }
    });
  }

  vincularDeliberacao(aia: PgiaAia): void {
    const escolhida = this.deliberacaoEscolhida[aia.Id];
    if (!escolhida) {
      this.notificationService.warning('Escolha a deliberação do CGTIC antes de vincular.');
      return;
    }
    this.vinculandoDeliberacao = true;
    this.sistemaService.vincularDeliberacaoAia(aia.Id, Number(escolhida)).subscribe({
      next: () => {
        this.vinculandoDeliberacao = false;
        this.notificationService.success('Deliberação do CGTIC vinculada à avaliação de impacto.');
        this.carregarAias();
      },
      error: () => {
        this.vinculandoDeliberacao = false;
        this.notificationService.error('Não foi possível vincular a deliberação.');
      }
    });
  }

  // ── Apuração de incidente ─────────────────────────────────────────────────

  private novaApuracao() {
    return {
      StatusApuracao: 'Recebida' as string,
      RecomendacoesSgdi: '',
      PropostaCgtic: false as boolean,
      EncaminhadoOrgaoCompetenteEm: '',
      SistemaSuspenso: false as boolean,
      DataSuspensao: ''
    };
  }

  carregarIncidentes(): void {
    this.operacaoService.listarIncidentesComunicados().subscribe({
      next: (lista) => this.incidentes = lista,
      error: () => this.notificationService.error('Não foi possível carregar os incidentes comunicados.')
    });
  }

  /** Rótulo do select, no formato do mock: INC-{ano}-{Id} · {sigla} · {resumo}. */
  rotuloIncidente(i: PgiaIncidente): string {
    const ano = (i.DataComunicacaoSgdi ?? i.CriadoEm ?? '').substring(0, 4);
    const hipotese = HIPOTESES_INCIDENTE.find(h => h.valor === i.Hipotese);
    // O rótulo do domínio vem como "IV · Vazamento ..."; aqui o resumo fica
    // "vazamento ... (tipo IV)", como no mock.
    const resumo = hipotese
      ? hipotese.rotulo.split(' · ')[1].toLowerCase() + ' (tipo ' + hipotese.valor + ')'
      : 'sem tipo informado';
    return `INC-${ano}-${i.Id} · ${i.OrgaoSigla} · ${resumo}`;
  }

  get incidenteSelecionado(): PgiaIncidente | null {
    return this.incidentes.find(i => i.Id === Number(this.incidenteSelecionadoId)) ?? null;
  }

  aoTrocarIncidente(): void {
    const i = this.incidenteSelecionado;
    this.apuracaoSubmetida = false;
    if (!i) {
      this.apuracaoForm = this.novaApuracao();
      return;
    }
    this.apuracaoForm = {
      StatusApuracao: i.StatusApuracao,
      RecomendacoesSgdi: i.RecomendacoesSgdi ?? '',
      PropostaCgtic: i.PropostaCgtic ?? false,
      EncaminhadoOrgaoCompetenteEm: i.EncaminhadoOrgaoCompetenteEm ?? '',
      SistemaSuspenso: i.SistemaSuspenso,
      DataSuspensao: i.DataSuspensao ?? ''
    };
  }

  get errDataSuspensao(): boolean {
    return this.apuracaoSubmetida && this.apuracaoForm.SistemaSuspenso && !this.apuracaoForm.DataSuspensao;
  }

  registrarApuracao(): void {
    const i = this.incidenteSelecionado;
    if (!i) {
      this.notificationService.warning('Escolha o incidente em análise antes de registrar a apuração.');
      return;
    }
    this.apuracaoSubmetida = true;
    if (this.errDataSuspensao) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const payload: PgiaIncidenteApuracaoForm = {
      StatusApuracao: this.apuracaoForm.StatusApuracao,
      RecomendacoesSgdi: this.apuracaoForm.RecomendacoesSgdi.trim() || null,
      PropostaCgtic: this.apuracaoForm.PropostaCgtic,
      EncaminhadoOrgaoCompetenteEm: this.apuracaoForm.EncaminhadoOrgaoCompetenteEm || null,
      SistemaSuspenso: this.apuracaoForm.SistemaSuspenso,
      DataSuspensao: this.apuracaoForm.SistemaSuspenso ? (this.apuracaoForm.DataSuspensao || null) : null
    };
    this.salvandoApuracao = true;
    const idSelecionado = i.Id;
    this.operacaoService.registrarApuracao(idSelecionado, payload).subscribe({
      next: () => {
        this.salvandoApuracao = false;
        this.apuracaoSubmetida = false;
        this.operacaoService.listarIncidentesComunicados().subscribe({
          next: (lista) => {
            this.incidentes = lista;
            this.incidenteSelecionadoId = idSelecionado;
            this.aoTrocarIncidente();
          }
        });
        this.notificationService.success('Apuração registrada. O órgão comunicante será notificado.');
      },
      error: () => {
        this.salvandoApuracao = false;
        this.notificationService.error('Não foi possível registrar a apuração.');
      }
    });
  }

  // ── Relatórios semestrais dos órgãos ──────────────────────────────────────

  private novaSituacaoForm() {
    return { Status: 'Pendente' as string, RegistradoPainelEm: '', ComunicadoControleInternoEm: '' };
  }

  aoTrocarOrgaoRelatorios(): void {
    this.relatoriosSemestrais = [];
    this.situacaoEmEdicao = null;
    if (!this.orgaoRelatoriosId) return;
    this.carregandoRelatorios = true;
    this.operacaoService.listarRelatoriosSemestrais(Number(this.orgaoRelatoriosId)).subscribe({
      next: (lista) => { this.relatoriosSemestrais = lista; this.carregandoRelatorios = false; },
      error: () => {
        this.carregandoRelatorios = false;
        this.notificationService.error('Não foi possível carregar os relatórios semestrais do órgão.');
      }
    });
  }

  badgeRelatorio(status: string): string {
    switch (status) {
      case 'Enviado no prazo': return 'bg-green-100 text-green-800';
      case 'Enviado em atraso': return 'bg-amber-100 text-amber-800';
      case 'Inadimplente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700'; // Pendente
    }
  }

  editarSituacaoRelatorio(r: PgiaRelatorioSemestral): void {
    if (this.situacaoEmEdicao?.Id === r.Id) {
      this.situacaoEmEdicao = null;
      return;
    }
    this.situacaoEmEdicao = r;
    this.situacaoForm = {
      Status: r.Status,
      RegistradoPainelEm: r.RegistradoPainelEm ?? '',
      ComunicadoControleInternoEm: r.ComunicadoControleInternoEm ?? ''
    };
  }

  salvarSituacaoRelatorio(): void {
    if (!this.situacaoEmEdicao) return;
    this.salvandoSituacao = true;
    this.operacaoService.atualizarSituacaoRelatorio(this.situacaoEmEdicao.Id, {
      Status: this.situacaoForm.Status,
      RegistradoPainelEm: this.situacaoForm.RegistradoPainelEm || null,
      ComunicadoControleInternoEm: this.situacaoForm.ComunicadoControleInternoEm || null
    }).subscribe({
      next: () => {
        this.salvandoSituacao = false;
        this.situacaoEmEdicao = null;
        this.aoTrocarOrgaoRelatorios();
        this.notificationService.success('Situação do relatório atualizada.');
      },
      error: () => {
        this.salvandoSituacao = false;
        this.notificationService.error('Não foi possível atualizar a situação do relatório.');
      }
    });
  }

  // ── Relatório Anual de Governança de IA (art. 33) ─────────────────────────

  private novoAnualForm() {
    return {
      Ano: new Date().getFullYear(),
      DataPublicacao: '',
      UrlPublicacao: '',
      ApreciadoCgticEm: '',
      Recomendacoes: '',
      AgendaInovacao: ''
    };
  }

  carregarRelatoriosAnuais(): void {
    this.governancaService.listarRelatoriosAnuais().subscribe({
      next: (lista) => this.relatoriosAnuais = lista,
      error: () => this.notificationService.error('Não foi possível carregar os relatórios anuais.')
    });
  }

  get errAnualAno(): boolean { return this.anualSubmetido && !this.anualForm.Ano; }

  editarAnual(r: PgiaRelatorioAnual): void {
    this.anualEmEdicao = r;
    this.anualSubmetido = false;
    this.anualForm = {
      Ano: r.Ano,
      DataPublicacao: r.DataPublicacao ?? '',
      UrlPublicacao: r.UrlPublicacao ?? '',
      ApreciadoCgticEm: r.ApreciadoCgticEm ?? '',
      Recomendacoes: r.Recomendacoes ?? '',
      AgendaInovacao: r.AgendaInovacao ?? ''
    };
  }

  cancelarEdicaoAnual(): void {
    this.anualEmEdicao = null;
    this.anualSubmetido = false;
    this.anualForm = this.novoAnualForm();
  }

  salvarAnual(): void {
    this.anualSubmetido = true;
    if (this.errAnualAno) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const payload: PgiaRelatorioAnualForm = {
      Ano: Number(this.anualForm.Ano),
      DataPublicacao: this.anualForm.DataPublicacao || null,
      UrlPublicacao: this.anualForm.UrlPublicacao.trim() || null,
      // Arquivo do relatório entra como anexo em fase futura.
      DocumentoId: this.anualEmEdicao?.DocumentoId ?? null,
      ApreciadoCgticEm: this.anualForm.ApreciadoCgticEm || null,
      Recomendacoes: this.anualForm.Recomendacoes.trim() || null,
      AgendaInovacao: this.anualForm.AgendaInovacao.trim() || null
    };
    this.salvandoAnual = true;
    const chamada = this.anualEmEdicao
      ? this.governancaService.atualizarRelatorioAnual(this.anualEmEdicao.Id, payload)
      : this.governancaService.criarRelatorioAnual(payload);
    chamada.subscribe({
      next: () => {
        this.salvandoAnual = false;
        this.notificationService.success(this.anualEmEdicao
          ? 'Relatório anual atualizado.'
          : 'Relatório anual registrado. Ele já aparece na lista.');
        this.cancelarEdicaoAnual();
        this.carregarRelatoriosAnuais();
      },
      error: () => {
        this.salvandoAnual = false;
        this.notificationService.error('Não foi possível salvar o relatório anual.');
      }
    });
  }

  // ── Auditorias técnicas ───────────────────────────────────────────────────

  private novaAuditoriaForm() {
    return {
      SistemaIaId: null as number | null,
      Tipo: 'Periódica' as string,
      EntidadeAuditora: '',
      AuditorUserId: '' as string,
      ExternaFornecedor: true,
      ApoioFapdf: null as boolean | null,
      DataInicio: ''
    };
  }

  carregarAuditorias(): void {
    this.governancaService.listarAuditorias().subscribe({
      next: (lista) => {
        this.auditorias = lista;
        this.publicacaoAuditoria = {};
        lista.forEach(a => {
          this.publicacaoAuditoria[a.Id] = {
            PublicadoPortal: a.PublicadoPortal,
            DataPublicacao: a.DataPublicacao ?? '',
            Url: a.Url ?? ''
          };
        });
      },
      error: () => this.notificationService.error('Não foi possível carregar as auditorias técnicas.')
    });
  }

  get errAuditoriaSistema(): boolean { return this.auditoriaSubmetida && !this.auditoriaForm.SistemaIaId; }
  get errAuditoriaEntidade(): boolean { return this.auditoriaSubmetida && !this.auditoriaForm.EntidadeAuditora.trim(); }
  get errAuditoriaInicio(): boolean { return this.auditoriaSubmetida && !this.auditoriaForm.DataInicio; }

  criarAuditoria(): void {
    this.auditoriaSubmetida = true;
    if (this.errAuditoriaSistema || this.errAuditoriaEntidade || this.errAuditoriaInicio) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const payload: PgiaAuditoriaForm = {
      SistemaIaId: Number(this.auditoriaForm.SistemaIaId),
      Tipo: this.auditoriaForm.Tipo,
      EntidadeAuditora: this.auditoriaForm.EntidadeAuditora.trim(),
      AuditorUserId: this.auditoriaForm.AuditorUserId || null,
      ExternaFornecedor: this.auditoriaForm.ExternaFornecedor,
      ApoioFapdf: this.auditoriaForm.ApoioFapdf,
      DataInicio: this.auditoriaForm.DataInicio
    };
    this.salvandoAuditoria = true;
    this.governancaService.criarAuditoria(payload).subscribe({
      next: () => {
        this.salvandoAuditoria = false;
        this.auditoriaForm = this.novaAuditoriaForm();
        this.auditoriaSubmetida = false;
        this.carregarAuditorias();
        this.notificationService.success('Auditoria designada. A entidade auditora já vê o caso na área dela.');
      },
      error: () => {
        this.salvandoAuditoria = false;
        this.notificationService.error('Não foi possível designar a auditoria.');
      }
    });
  }

  publicarAuditoria(a: PgiaAuditoria): void {
    const dados = this.publicacaoAuditoria[a.Id];
    if (!dados) return;
    this.publicandoAuditoriaId = a.Id;
    this.governancaService.publicarAuditoria(a.Id, {
      PublicadoPortal: dados.PublicadoPortal,
      DataPublicacao: dados.DataPublicacao || null,
      Url: dados.Url.trim() || null
    }).subscribe({
      next: () => {
        this.publicandoAuditoriaId = null;
        this.carregarAuditorias();
        this.notificationService.success('Publicação do resultado registrada.');
      },
      error: () => {
        this.publicandoAuditoriaId = null;
        this.notificationService.error('Não foi possível registrar a publicação do resultado.');
      }
    });
  }

  // ── Não conformidades da supervisão ───────────────────────────────────────

  private novaNcForm() {
    return { OrgaoId: null as number | null, Descricao: '' };
  }

  private novaEdicaoNc() {
    return { Descricao: '', Situacao: 'Registrada' as string, ReportadaSgdiEm: '', ComunicadaControleInternoEm: '' };
  }

  carregarNaoConformidades(): void {
    this.operacaoService.listarTodasNaoConformidades().subscribe({
      next: (lista) => this.naoConformidades = lista,
      error: () => this.notificationService.error('Não foi possível carregar as não conformidades.')
    });
  }

  badgeNaoConformidade(situacao: string): string {
    switch (situacao) {
      case 'Sanada': return 'bg-green-100 text-green-800';
      case 'Em tratamento': return 'bg-indigo-100 text-indigo-800';
      case 'Reportada à SGDI': return 'bg-blue-100 text-blue-800';
      case 'Comunicada ao controle interno': return 'bg-purple-100 text-purple-800';
      default: return 'bg-amber-100 text-amber-800'; // Registrada
    }
  }

  get errNcOrgao(): boolean { return this.ncSubmetida && !this.ncForm.OrgaoId; }
  get errNcDescricao(): boolean { return this.ncSubmetida && !this.ncForm.Descricao.trim(); }

  registrarNaoConformidade(): void {
    this.ncSubmetida = true;
    if (this.errNcOrgao || this.errNcDescricao) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    this.salvandoNc = true;
    this.operacaoService.criarNaoConformidade({
      OrgaoId: Number(this.ncForm.OrgaoId),
      Descricao: this.ncForm.Descricao.trim(),
      // Quem registra por esta tela é a SGDI; o backend grava a origem.
      Origem: 'Supervisão da SGDI',
      ReportadaSgdiEm: null
    }).subscribe({
      next: () => {
        this.salvandoNc = false;
        this.ncForm = this.novaNcForm();
        this.ncSubmetida = false;
        this.carregarNaoConformidades();
        this.notificationService.success('Não conformidade registrada. O órgão já a vê na área dele.');
      },
      error: () => {
        this.salvandoNc = false;
        this.notificationService.error('Não foi possível registrar a não conformidade.');
      }
    });
  }

  editarNaoConformidade(nc: PgiaNaoConformidade): void {
    if (this.ncEmEdicao?.Id === nc.Id) {
      this.ncEmEdicao = null;
      return;
    }
    this.ncEmEdicao = nc;
    this.ncEdicao = {
      Descricao: nc.Descricao,
      Situacao: nc.Situacao,
      ReportadaSgdiEm: nc.ReportadaSgdiEm ?? '',
      ComunicadaControleInternoEm: nc.ComunicadaControleInternoEm ?? ''
    };
  }

  salvarEdicaoNaoConformidade(): void {
    if (!this.ncEmEdicao) return;
    const payload: PgiaNaoConformidadeUpdateForm = {
      Descricao: this.ncEdicao.Descricao.trim(),
      Situacao: this.ncEdicao.Situacao,
      ReportadaSgdiEm: this.ncEdicao.ReportadaSgdiEm || null,
      ComunicadaControleInternoEm: this.ncEdicao.ComunicadaControleInternoEm || null
    };
    this.salvandoEdicaoNc = true;
    this.operacaoService.atualizarNaoConformidade(this.ncEmEdicao.Id, payload).subscribe({
      next: () => {
        this.salvandoEdicaoNc = false;
        this.ncEmEdicao = null;
        this.carregarNaoConformidades();
        this.notificationService.success('Não conformidade atualizada.');
      },
      error: () => {
        this.salvandoEdicaoNc = false;
        this.notificationService.error('Não foi possível atualizar a não conformidade.');
      }
    });
  }

  // ── 5. Normas complementares ──────────────────────────────────────────────

  private novaNormaForm() {
    return {
      Tipo: 'Instrução normativa da SGDI' as string,
      Numero: '',
      Ementa: '',
      Emissor: 'SGDI',
      DataPublicacao: '',
      Url: '',
      Vigente: true,
      AprovadaCgticEm: ''
    };
  }

  carregarNormas(): void {
    this.governancaService.listarNormas().subscribe({
      next: (lista) => this.normas = lista,
      error: () => this.notificationService.error('Não foi possível carregar as normas complementares.')
    });
  }

  editarNorma(n: PgiaNorma): void {
    this.normaEmEdicao = n;
    this.normaSubmetida = false;
    this.normaForm = {
      Tipo: n.Tipo,
      Numero: n.Numero ?? '',
      Ementa: n.Ementa,
      Emissor: n.Emissor,
      DataPublicacao: n.DataPublicacao ?? '',
      Url: n.Url ?? '',
      Vigente: n.Vigente,
      AprovadaCgticEm: n.AprovadaCgticEm ?? ''
    };
  }

  cancelarEdicaoNorma(): void {
    this.normaEmEdicao = null;
    this.normaSubmetida = false;
    this.normaForm = this.novaNormaForm();
  }

  get errNormaEmenta(): boolean { return this.normaSubmetida && !this.normaForm.Ementa.trim(); }
  get errNormaEmissor(): boolean { return this.normaSubmetida && !this.normaForm.Emissor.trim(); }
  get errNormaData(): boolean { return this.normaSubmetida && !this.normaForm.DataPublicacao; }

  salvarNorma(): void {
    this.normaSubmetida = true;
    if (this.errNormaEmenta || this.errNormaEmissor || this.errNormaData) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const payload: PgiaNormaForm = {
      Tipo: this.normaForm.Tipo,
      Numero: this.normaForm.Numero.trim() || null,
      Ementa: this.normaForm.Ementa.trim(),
      Emissor: this.normaForm.Emissor.trim(),
      DataPublicacao: this.normaForm.DataPublicacao,
      Url: this.normaForm.Url.trim() || null,
      Vigente: this.normaForm.Vigente,
      AprovadaCgticEm: this.normaForm.AprovadaCgticEm || null
    };
    this.salvandoNorma = true;
    const chamada = this.normaEmEdicao
      ? this.governancaService.atualizarNorma(this.normaEmEdicao.Id, payload)
      : this.governancaService.criarNorma(payload);
    chamada.subscribe({
      next: () => {
        this.salvandoNorma = false;
        this.notificationService.success('Norma complementar registrada. Ela já aparece na lista.');
        this.cancelarEdicaoNorma();
        this.carregarNormas();
      },
      error: () => {
        this.salvandoNorma = false;
        this.notificationService.error('Não foi possível salvar a norma complementar.');
      }
    });
  }

  // ── 6. Autorizações excepcionais ──────────────────────────────────────────

  private novaAutorizacaoForm() {
    return {
      Tipo: 'Uso de plataforma pública com dados não públicos' as string,
      OrgaoId: null as number | null,
      PlataformaId: null as number | null,
      Justificativa: '',
      AutorizadaPor: 'SGDI' as string,
      DeliberacaoCgticId: null as number | null,
      DataAutorizacao: '',
      VigenciaFim: ''
    };
  }

  carregarAutorizacoes(): void {
    this.governancaService.listarAutorizacoes().subscribe({
      next: (lista) => this.autorizacoes = lista,
      error: () => this.notificationService.error('Não foi possível carregar as autorizações excepcionais.')
    });
  }

  editarAutorizacao(a: PgiaAutorizacao): void {
    this.autorizacaoEmEdicao = a;
    this.autorizacaoSubmetida = false;
    this.autorizacaoForm = {
      Tipo: a.Tipo,
      OrgaoId: a.OrgaoId,
      PlataformaId: a.PlataformaId,
      Justificativa: a.Justificativa,
      AutorizadaPor: a.AutorizadaPor,
      DeliberacaoCgticId: a.DeliberacaoCgticId,
      DataAutorizacao: a.DataAutorizacao ?? '',
      VigenciaFim: a.VigenciaFim ?? ''
    };
  }

  cancelarEdicaoAutorizacao(): void {
    this.autorizacaoEmEdicao = null;
    this.autorizacaoSubmetida = false;
    this.autorizacaoForm = this.novaAutorizacaoForm();
  }

  get errAutorizacaoOrgao(): boolean { return this.autorizacaoSubmetida && !this.autorizacaoForm.OrgaoId; }
  get errAutorizacaoJustificativa(): boolean { return this.autorizacaoSubmetida && !this.autorizacaoForm.Justificativa.trim(); }
  get errAutorizacaoData(): boolean { return this.autorizacaoSubmetida && !this.autorizacaoForm.DataAutorizacao; }

  /** Treinar com dados do GDF depende de deliberação do CGTIC (art. 21). */
  get exigeDeliberacao(): boolean {
    return this.autorizacaoForm.Tipo === 'Uso de dados do GDF para treinamento pelo fornecedor';
  }
  get errAutorizacaoDeliberacao(): boolean {
    return this.autorizacaoSubmetida && this.exigeDeliberacao && !this.autorizacaoForm.DeliberacaoCgticId;
  }

  salvarAutorizacao(): void {
    this.autorizacaoSubmetida = true;
    if (this.errAutorizacaoOrgao || this.errAutorizacaoJustificativa
      || this.errAutorizacaoData || this.errAutorizacaoDeliberacao) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const payload: PgiaAutorizacaoForm = {
      Tipo: this.autorizacaoForm.Tipo,
      OrgaoId: Number(this.autorizacaoForm.OrgaoId),
      PlataformaId: this.autorizacaoForm.PlataformaId ? Number(this.autorizacaoForm.PlataformaId) : null,
      Justificativa: this.autorizacaoForm.Justificativa.trim(),
      // Anexo da avaliação de riscos entra em fase futura.
      AvaliacaoRiscosDocId: this.autorizacaoEmEdicao?.AvaliacaoRiscosDocId ?? null,
      AutorizadaPor: this.autorizacaoForm.AutorizadaPor,
      DeliberacaoCgticId: this.autorizacaoForm.DeliberacaoCgticId ? Number(this.autorizacaoForm.DeliberacaoCgticId) : null,
      DataAutorizacao: this.autorizacaoForm.DataAutorizacao,
      VigenciaFim: this.autorizacaoForm.VigenciaFim || null
    };
    this.salvandoAutorizacao = true;
    const chamada = this.autorizacaoEmEdicao
      ? this.governancaService.atualizarAutorizacao(this.autorizacaoEmEdicao.Id, payload)
      : this.governancaService.criarAutorizacao(payload);
    chamada.subscribe({
      next: () => {
        this.salvandoAutorizacao = false;
        this.notificationService.success('Autorização registrada. Ela já aparece na lista.');
        this.cancelarEdicaoAutorizacao();
        this.carregarAutorizacoes();
      },
      error: () => {
        this.salvandoAutorizacao = false;
        this.notificationService.error('Não foi possível salvar a autorização.');
      }
    });
  }
}
