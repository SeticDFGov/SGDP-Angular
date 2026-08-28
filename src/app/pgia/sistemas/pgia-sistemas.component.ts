import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaSistemaService } from '../services/pgia-sistema.service';
import { PgiaAbasComponent } from '../shared/pgia-abas.component';
import { QUESITOS, ROMANOS } from './quesitos';
import {
  BASES_LEGAIS_LGPD,
  ESCOPOS_DADOS,
  FASES_CICLO_VIDA,
  MOTIVOS_CLASSIFICACAO,
  ORIGENS_REGISTRO,
  PgiaAia,
  PgiaAiaForm,
  PgiaChecklist,
  PgiaDesignacao,
  PgiaOrgao,
  PgiaSistema,
  PgiaSistemaCreateForm,
  STATUS_AIA,
  TECNOLOGIAS,
  TIPOS_SISTEMA
} from '../../../api/pgia/interface';

@Component({
  selector: 'app-pgia-sistemas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PgiaAbasComponent],
  templateUrl: './pgia-sistemas.component.html'
})
export class PgiaSistemasComponent implements OnInit {
  @ViewChild('cardLista') cardLista?: ElementRef<HTMLElement>;

  user: UserProfile | null = null;
  loading = true;

  // Usabilidade por papel (a autorização real é do backend):
  // inventário e classificação: pgia_orgao e admin; sgdi/cgtic apenas consultam.
  podeEditar = false;
  isAuditoria = false;
  modoConsulta = false;

  orgao: PgiaOrgao | null = null;
  // O inventário fica assinado pelo Responsável de IA vigente (art. 10);
  // sem designação vigente não há quem assine o registro.
  responsavelVigente: PgiaDesignacao | null = null;

  sistemas: PgiaSistema[] = [];
  paginaAtual = 1;
  totalPaginas = 1;
  totalItens = 0;
  carregandoMais = false;

  // Listas de domínio
  tipos = TIPOS_SISTEMA;
  fases = FASES_CICLO_VIDA;
  escopos = ESCOPOS_DADOS;
  basesLegais = BASES_LEGAIS_LGPD;

  // O valor gravado é o do domínio; o rótulo traz exemplos para quem não é da área.
  private static readonly EXEMPLOS_TECNOLOGIA: Record<string, string> = {
    'IA generativa':
      'IA generativa — ex.: ChatGPT, Claude, Gemini, ferramentas que criam textos e imagens',
    'IA preditiva ou aprendizado de máquina':
      'IA preditiva ou aprendizado de máquina — ex.: previsão de demanda, escore de risco, detecção de fraude',
    'Visão computacional':
      'Visão computacional — ex.: leitura de placas, reconhecimento de imagens de câmeras',
    'Processamento de linguagem natural':
      'Processamento de linguagem natural — ex.: análise e classificação de textos e documentos',
    'Biometria':
      'Biometria — ex.: reconhecimento facial ou por digital',
    'Outra':
      'Outra — tecnologia que não se encaixa nas anteriores'
  };

  tecnologias = TECNOLOGIAS.map(v => ({
    valor: v,
    rotulo: PgiaSistemasComponent.EXEMPLOS_TECNOLOGIA[v] ?? v
  }));

  // O mock exibe o rótulo com a referência ao artigo; o valor gravado é o da lista de domínio.
  origens = ORIGENS_REGISTRO.map(v => ({
    valor: v,
    rotulo: v === 'Instrumento vigente em revisão' ? 'Instrumento vigente em revisão (art. 37)' : v
  }));
  motivos = MOTIVOS_CLASSIFICACAO.map(v => ({
    valor: v,
    rotulo: v === 'Revisão de instrumento vigente' ? 'Revisão de instrumento vigente (art. 37)' : v
  }));

  // Ordem embaralhada e mapeamento artigo/inciso vivem em ./quesitos.ts,
  // compartilhado com as telas da SGDI e do CGTIC (que reagrupam por artigo).
  quesitos = QUESITOS;
  marcados: boolean[] = this.quesitos.map(() => false);

  form = this.novoForm();
  classForm = this.novaClassificacao();
  submetido = false;
  salvando = false;

  // ── AIA por sistema (Alto Risco) ──────────────────────────────────────────
  statusAia = STATUS_AIA;
  sistemaAiaAberto: PgiaSistema | null = null;
  aias: PgiaAia[] = [];
  carregandoAias = false;
  aiaForm = this.novaAia();
  aiaEmEdicao: PgiaAia | null = null;
  aiaSubmetido = false;
  salvandoAia = false;

  constructor(
    private authService: AuthService,
    private pgiaOrgaoService: PgiaOrgaoService,
    private pgiaSistemaService: PgiaSistemaService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.user = user;
      const papel = user?.PapelPgia ?? null;
      const isAdmin = user?.Perfil === Perfis.Admin;
      this.isAuditoria = papel === PapeisPgia.Auditoria && !isAdmin;
      this.podeEditar = isAdmin || papel === PapeisPgia.Orgao;
      this.modoConsulta = !this.podeEditar;
      if (this.isAuditoria) {
        // A área da auditoria externa chega na fase de auditorias técnicas;
        // evitar os GETs que o backend nega para este papel.
        this.loading = false;
      } else {
        this.carregar();
      }
    });
  }

  private novoForm() {
    return {
      Denominacao: '',
      Finalidade: '',
      OrigemRegistro: 'Nova iniciativa' as string,
      OrigemRegistroDescricao: '',
      TipoSistema: 'Desenvolvido internamente' as string,
      Tecnologia: 'IA preditiva ou aprendizado de máquina' as string,
      StatusCicloVida: 'Concepção' as string,
      DataImplantacao: '',
      EscopoDados: 'Somente dados públicos' as string,
      AfetaCidadao: false,
      NaturezaDecisoes: '',
      EfeitosCidadao: '',
      BaseLegalLgpd: 'Execução de políticas públicas' as string,
      CategoriasDadosPessoais: '',
      FinalidadeTratamentoDados: '',
      MedidasSeguranca: '',
      InteroperavelPadroesSgdi: true,
      JustificativaNaoRedundancia: '',
      DataAnaliseSgtic: '',
      ParecerSgtic: '',
      SupervisaoHumanaDescricao: '',
      AvisoInteracaoIa: null as boolean | null,
      IdentificadorAutenticidade: null as boolean | null,
      ProcessoSei: '',
      ComunicadoSgdiEm: ''
    };
  }

  private novaClassificacao() {
    return { Motivo: 'Classificação inicial' as string, DataClassificacao: '', Justificativa: '' };
  }

  private novaAia() {
    return {
      Status: 'Em elaboração' as string,
      DataInicio: '',
      DataConclusao: '',
      ImpactosDireitosFundamentais: '',
      MedidasPreventivas: '',
      MedidasMitigadoras: '',
      MedidasReversao: '',
      PreviaLicitacao: null as boolean | null,
      ConjuntaRipd: false,
      ProximaRevisao: ''
    };
  }

  carregar(): void {
    this.loading = true;
    this.pgiaOrgaoService.getMeuOrgao().subscribe({
      next: (meu) => {
        this.orgao = meu.Orgao;
        this.responsavelVigente = meu.ResponsavelIaVigente;
        if (meu.Orgao) {
          this.carregarSistemas();
        }
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Não foi possível carregar os dados do órgão.');
        this.loading = false;
      }
    });
  }

  /** Carrega a página 1 e substitui a lista. */
  carregarSistemas(): void {
    if (!this.orgao) return;
    this.pgiaSistemaService.listarSistemas(this.orgao.Id, 1).subscribe({
      next: (pagina) => {
        this.sistemas = pagina.Items ?? [];
        this.paginaAtual = pagina.CurrentPage ?? 1;
        this.totalPaginas = pagina.TotalPages ?? 1;
        this.totalItens = pagina.TotalItems ?? this.sistemas.length;
      },
      error: () => this.notificationService.error('Não foi possível carregar os sistemas do inventário.')
    });
  }

  get temMaisPaginas(): boolean {
    return this.paginaAtual < this.totalPaginas;
  }

  /** Busca a próxima página e anexa os itens à lista já exibida. */
  carregarMais(): void {
    if (!this.orgao || !this.temMaisPaginas || this.carregandoMais) return;
    this.carregandoMais = true;
    this.pgiaSistemaService.listarSistemas(this.orgao.Id, this.paginaAtual + 1).subscribe({
      next: (pagina) => {
        this.sistemas = this.sistemas.concat(pagina.Items ?? []);
        this.paginaAtual = pagina.CurrentPage ?? this.paginaAtual + 1;
        this.totalPaginas = pagina.TotalPages ?? this.totalPaginas;
        this.totalItens = pagina.TotalItems ?? this.totalItens;
        this.carregandoMais = false;
      },
      error: () => {
        this.carregandoMais = false;
        this.notificationService.error('Não foi possível carregar os sistemas do inventário.');
      }
    });
  }

  // ── Condicionais do formulário ────────────────────────────────────────────

  get mostraImplantacao(): boolean {
    return this.form.StatusCicloVida === 'Implantado (em uso)' || this.form.StatusCicloVida === 'Monitoramento';
  }

  get mostraLgpd(): boolean {
    return this.form.EscopoDados === 'Dados pessoais' || this.form.EscopoDados === 'Dados pessoais sensíveis';
  }

  get mostraCidadao(): boolean {
    return this.form.AfetaCidadao === true;
  }

  get mostraNaoRedundancia(): boolean {
    return this.form.TipoSistema === 'Contratado';
  }

  get mostraOrigemDescricao(): boolean {
    return this.form.OrigemRegistro === 'Outros';
  }

  /** Só cadastra quem edita e tem Responsável de IA vigente para assinar o registro (art. 10). */
  get podeCadastrar(): boolean {
    return this.podeEditar && !!this.responsavelVigente;
  }

  // A classificação é competência da SGDI: a tela do órgão não antecipa resultado
  // nem consequência durante o preenchimento. O badge só aparece na lista, já
  // com o resultado devolvido pelo servidor.
  badgeClasse(risco: string | null): string {
    switch (risco) {
      case 'Risco Excessivo': return 'bg-red-100 text-red-800';
      case 'Alto Risco': return 'bg-orange-100 text-orange-800';
      case 'Risco Moderado': return 'bg-yellow-100 text-yellow-800';
      case 'Baixo Risco': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  badgeHomologacao(situacao: string | null): string {
    switch (situacao) {
      case 'Aguardando avaliação da SGDI': return 'bg-blue-100 text-blue-800';
      case 'Aguardando deliberação do CGTIC': return 'bg-indigo-100 text-indigo-800';
      case 'Aprovado': return 'bg-green-100 text-green-800';
      case 'Vetado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  // ── AIA: só faz sentido para sistema de Alto Risco ────────────────────────

  temAia(s: PgiaSistema): boolean {
    return s.ClassificacaoRiscoAtual === 'Alto Risco';
  }

  alternarAia(s: PgiaSistema): void {
    if (this.sistemaAiaAberto?.Id === s.Id) {
      this.fecharAia();
      return;
    }
    this.sistemaAiaAberto = s;
    this.aias = [];
    this.aiaEmEdicao = null;
    this.aiaForm = this.novaAia();
    this.aiaSubmetido = false;
    this.carregandoAias = true;
    this.pgiaSistemaService.listarAias(s.Id).subscribe({
      next: (lista) => { this.aias = lista; this.carregandoAias = false; },
      error: () => {
        this.carregandoAias = false;
        this.notificationService.error('Não foi possível carregar as avaliações de impacto deste sistema.');
      }
    });
  }

  fecharAia(): void {
    this.sistemaAiaAberto = null;
    this.aias = [];
    this.aiaEmEdicao = null;
    this.aiaSubmetido = false;
    this.aiaForm = this.novaAia();
  }

  editarAia(aia: PgiaAia): void {
    this.aiaEmEdicao = aia;
    this.aiaSubmetido = false;
    this.aiaForm = {
      Status: aia.Status,
      DataInicio: aia.DataInicio ?? '',
      DataConclusao: aia.DataConclusao ?? '',
      ImpactosDireitosFundamentais: aia.ImpactosDireitosFundamentais ?? '',
      MedidasPreventivas: aia.MedidasPreventivas ?? '',
      MedidasMitigadoras: aia.MedidasMitigadoras ?? '',
      MedidasReversao: aia.MedidasReversao ?? '',
      PreviaLicitacao: aia.PreviaLicitacao,
      ConjuntaRipd: aia.ConjuntaRipd,
      ProximaRevisao: aia.ProximaRevisao ?? ''
    };
  }

  novaAvaliacao(): void {
    this.aiaEmEdicao = null;
    this.aiaSubmetido = false;
    this.aiaForm = this.novaAia();
  }

  get errAiaInicio(): boolean { return this.aiaSubmetido && !this.aiaForm.DataInicio; }
  get errAiaImpactos(): boolean { return this.aiaSubmetido && !this.aiaForm.ImpactosDireitosFundamentais.trim(); }
  get errAiaPreventivas(): boolean { return this.aiaSubmetido && !this.aiaForm.MedidasPreventivas.trim(); }
  get errAiaMitigadoras(): boolean { return this.aiaSubmetido && !this.aiaForm.MedidasMitigadoras.trim(); }
  get errAiaReversao(): boolean { return this.aiaSubmetido && !this.aiaForm.MedidasReversao.trim(); }
  // Ao concluir, o backend exige data de conclusão e data da próxima revisão.
  get errAiaConclusao(): boolean {
    return this.aiaSubmetido && this.aiaForm.Status === 'Concluída' && !this.aiaForm.DataConclusao;
  }
  get errAiaProximaRevisao(): boolean {
    return this.aiaSubmetido && this.aiaForm.Status === 'Concluída' && !this.aiaForm.ProximaRevisao;
  }

  salvarAia(): void {
    if (!this.sistemaAiaAberto) return;
    this.aiaSubmetido = true;
    if (this.errAiaInicio || this.errAiaImpactos || this.errAiaPreventivas
      || this.errAiaMitigadoras || this.errAiaReversao || this.errAiaConclusao || this.errAiaProximaRevisao) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const payload: PgiaAiaForm = {
      Status: this.aiaForm.Status,
      DataInicio: this.aiaForm.DataInicio,
      DataConclusao: this.aiaForm.DataConclusao || null,
      ImpactosDireitosFundamentais: this.aiaForm.ImpactosDireitosFundamentais.trim(),
      MedidasPreventivas: this.aiaForm.MedidasPreventivas.trim(),
      MedidasMitigadoras: this.aiaForm.MedidasMitigadoras.trim(),
      MedidasReversao: this.aiaForm.MedidasReversao.trim(),
      PreviaLicitacao: this.aiaForm.PreviaLicitacao,
      ConjuntaRipd: this.aiaForm.ConjuntaRipd,
      // Anexos entram em fase futura: o backend aceita nulo.
      RipdDocumentoId: this.aiaEmEdicao?.RipdDocumentoId ?? null,
      DocumentoId: this.aiaEmEdicao?.DocumentoId ?? null,
      ProximaRevisao: this.aiaForm.ProximaRevisao || null
    };
    this.salvandoAia = true;
    const sistemaId = this.sistemaAiaAberto.Id;
    const chamada = this.aiaEmEdicao
      ? this.pgiaSistemaService.atualizarAia(this.aiaEmEdicao.Id, payload)
      : this.pgiaSistemaService.criarAia(sistemaId, payload);
    chamada.subscribe({
      next: () => {
        this.salvandoAia = false;
        this.notificationService.success(this.aiaEmEdicao
          ? 'Avaliação de impacto atualizada.'
          : 'Avaliação de impacto registrada. A SGDI publica o resultado no Portal da Transparência.');
        this.aiaEmEdicao = null;
        this.aiaSubmetido = false;
        this.aiaForm = this.novaAia();
        this.pgiaSistemaService.listarAias(sistemaId).subscribe({ next: (lista) => this.aias = lista });
      },
      error: () => {
        this.salvandoAia = false;
        this.notificationService.error('Não foi possível salvar a avaliação de impacto.');
      }
    });
  }

  // ── Validação (mesmo padrão da tela do órgão) ─────────────────────────────

  get errDenominacao(): boolean { return this.submetido && !this.form.Denominacao.trim(); }
  get errFinalidade(): boolean { return this.submetido && !this.form.Finalidade.trim(); }
  get errOrigemDescricao(): boolean { return this.submetido && this.mostraOrigemDescricao && !this.form.OrigemRegistroDescricao.trim(); }
  get errDataImplantacao(): boolean { return this.submetido && this.mostraImplantacao && !this.form.DataImplantacao; }
  get errNaturezaDecisoes(): boolean { return this.submetido && this.mostraCidadao && !this.form.NaturezaDecisoes.trim(); }
  get errEfeitosCidadao(): boolean { return this.submetido && this.mostraCidadao && !this.form.EfeitosCidadao.trim(); }
  get errCategorias(): boolean { return this.submetido && this.mostraLgpd && !this.form.CategoriasDadosPessoais.trim(); }
  get errFinalidadeTratamento(): boolean { return this.submetido && this.mostraLgpd && !this.form.FinalidadeTratamentoDados.trim(); }
  get errMedidas(): boolean { return this.submetido && this.mostraLgpd && !this.form.MedidasSeguranca.trim(); }
  get errNaoRedundancia(): boolean { return this.submetido && this.mostraNaoRedundancia && !this.form.JustificativaNaoRedundancia.trim(); }
  get errSupervisao(): boolean { return this.submetido && !this.form.SupervisaoHumanaDescricao.trim(); }
  get errAvisoIa(): boolean { return this.submetido && this.form.AvisoInteracaoIa === null; }
  get errDataClassificacao(): boolean { return this.submetido && !this.classForm.DataClassificacao; }
  get errJustificativa(): boolean { return this.submetido && !this.classForm.Justificativa.trim(); }

  private formValido(): boolean {
    return !this.errDenominacao && !this.errFinalidade && !this.errOrigemDescricao && !this.errDataImplantacao
      && !this.errNaturezaDecisoes && !this.errEfeitosCidadao
      && !this.errCategorias && !this.errFinalidadeTratamento && !this.errMedidas
      && !this.errNaoRedundancia && !this.errSupervisao && !this.errAvisoIa
      && !this.errDataClassificacao && !this.errJustificativa;
  }

  // ── Checklist: incisos marcados, por artigo, em ordem de inciso ───────────

  private montarChecklist(): PgiaChecklist {
    const incisos = (artigo: 15 | 16 | 17) => this.quesitos
      .filter((q, i) => this.marcados[i] && q.artigo === artigo)
      .map(q => q.inciso)
      .sort((a, b) => ROMANOS.indexOf(a) - ROMANOS.indexOf(b));
    return { Q15: incisos(15), Q16: incisos(16), Q17: incisos(17) };
  }

  private textoOuNulo(valor: string): string | null {
    const v = valor.trim();
    return v ? v : null;
  }

  private montarPayload(): PgiaSistemaCreateForm {
    return {
      Denominacao: this.form.Denominacao.trim(),
      Finalidade: this.form.Finalidade.trim(),
      OrigemRegistro: this.form.OrigemRegistro,
      OrigemRegistroDescricao: this.mostraOrigemDescricao ? this.textoOuNulo(this.form.OrigemRegistroDescricao) : null,
      TipoSistema: this.form.TipoSistema,
      Tecnologia: this.form.Tecnologia,
      StatusCicloVida: this.form.StatusCicloVida,
      DataImplantacao: this.mostraImplantacao ? (this.form.DataImplantacao || null) : null,
      EscopoDados: this.form.EscopoDados,
      AfetaCidadao: this.form.AfetaCidadao,
      NaturezaDecisoes: this.mostraCidadao ? this.textoOuNulo(this.form.NaturezaDecisoes) : null,
      EfeitosCidadao: this.mostraCidadao ? this.textoOuNulo(this.form.EfeitosCidadao) : null,
      BaseLegalLgpd: this.mostraLgpd ? this.form.BaseLegalLgpd : null,
      CategoriasDadosPessoais: this.mostraLgpd ? this.textoOuNulo(this.form.CategoriasDadosPessoais) : null,
      FinalidadeTratamentoDados: this.mostraLgpd ? this.textoOuNulo(this.form.FinalidadeTratamentoDados) : null,
      MedidasSeguranca: this.mostraLgpd ? this.textoOuNulo(this.form.MedidasSeguranca) : null,
      InteroperavelPadroesSgdi: this.form.InteroperavelPadroesSgdi,
      JustificativaNaoRedundancia: this.mostraNaoRedundancia ? this.textoOuNulo(this.form.JustificativaNaoRedundancia) : null,
      DataAnaliseSgtic: this.form.DataAnaliseSgtic || null,
      ParecerSgtic: this.textoOuNulo(this.form.ParecerSgtic),
      SupervisaoHumanaDescricao: this.textoOuNulo(this.form.SupervisaoHumanaDescricao),
      AvisoInteracaoIa: this.form.AvisoInteracaoIa,
      IdentificadorAutenticidade: this.form.IdentificadorAutenticidade,
      ProcessoSei: this.textoOuNulo(this.form.ProcessoSei),
      ComunicadoSgdiEm: this.form.ComunicadoSgdiEm || null,
      Classificacao: {
        Checklist: this.montarChecklist(),
        Motivo: this.classForm.Motivo,
        DataClassificacao: this.classForm.DataClassificacao,
        Justificativa: this.classForm.Justificativa.trim()
      }
    };
  }

  salvarSistema(): void {
    if (!this.orgao) return;
    this.submetido = true;
    if (!this.formValido()) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    this.salvando = true;
    this.pgiaSistemaService.criarSistema(this.orgao.Id, this.montarPayload()).subscribe({
      next: () => {
        this.salvando = false;
        this.submetido = false;
        this.form = this.novoForm();
        this.classForm = this.novaClassificacao();
        this.marcados = this.quesitos.map(() => false);
        this.carregarSistemas();
        // Sem resultado no aviso: a classificação é competência da SGDI.
        this.notificationService.success('Sistema incluído no inventário. Ele já aparece na lista acima.');
        // Handler de clique: só roda no browser.
        this.cardLista?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
      },
      error: () => {
        this.salvando = false;
        this.notificationService.error('Não foi possível salvar o sistema no inventário.');
      }
    });
  }
}
