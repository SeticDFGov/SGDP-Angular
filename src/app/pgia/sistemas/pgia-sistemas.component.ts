import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaSistemaService } from '../services/pgia-sistema.service';
import { GRUPOS_QUESITOS, ROMANOS } from './quesitos';
import { CitaDecretoDirective } from '../shared/cita-decreto.directive';
import { acompanharSecao } from '../shared/secao-rota';
import { PgiaAnexoComponent } from '../shared/pgia-anexo.component';
import { Observable } from 'rxjs';
import { PgiaDocumentoService } from '../services/pgia-documento.service';
import {
  BASES_LEGAIS_LGPD,
  ESCOPOS_DADOS,
  FASES_CICLO_VIDA,
  MOTIVOS_CLASSIFICACAO,
  ORIGENS_REGISTRO,
  PgiaAia,
  PgiaAiaForm,
  CONSEQUENCIAS_CGDF,
  CONSEQUENCIAS_OUTROS,
  MATRIZ_RISCO_CGDF,
  PROBABILIDADES_CGDF,
  PROBABILIDADES_OUTROS,
  PgiaChecklist,
  PgiaDocumento,
  PgiaRiscoOutroForm,
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
  imports: [CommonModule, FormsModule, RouterModule, CitaDecretoDirective, PgiaAnexoComponent],
  templateUrl: './pgia-sistemas.component.html'
})
export class PgiaSistemasComponent implements OnInit {
  /** Formulário mostrado nesta página (vem do parâmetro `:secao` da rota). */
  secao: string = '';
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

  // Os três grupos rotulados (art. 15, 16 e 17) vivem em ./quesitos.ts,
  // compartilhado com as telas da SGDI e do CGTIC.
  grupos = GRUPOS_QUESITOS;
  /** Respostas por grupo, na mesma ordem de `grupos`. */
  respostasGrupos: { marcados: boolean[]; nenhuma: boolean }[] = this.novasRespostas();

  // ── Grupo "Outros": riscos declarados pelo órgão (matriz CGDF) ────────────
  probabilidadesOutros = PROBABILIDADES_OUTROS;
  consequenciasOutros = CONSEQUENCIAS_OUTROS;
  outrosRiscos: PgiaRiscoOutroForm[] = [];
  /** Linha cujo par probabilidade×consequência é realçado na matriz. */
  riscoDestacado: number | null = null;
  matrizAberta = false;
  /** Aberta por clique/foco: não fecha ao tirar o mouse. */
  matrizFixada = false;
  // Eixos e cores da matriz 5×5 da CGDF (só leitura, para o popover de ajuda)
  probabilidadesCgdf = PROBABILIDADES_CGDF;
  /** Consequências de cima para baixo na matriz: Catastrófica → Desprezível. */
  consequenciasMatriz = [...CONSEQUENCIAS_CGDF].reverse();
  matrizRisco = MATRIZ_RISCO_CGDF;

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
    private notificationService: NotificationService,
    private router: Router,
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

  /** Arquivo da AIA: documento do sistema aberto. */
  criarDocumentoAia = (arquivo: File): Observable<PgiaDocumento> =>
    this.documentoService.criarDocumento({
      Tipo: 'AIA',
      NomeArquivo: arquivo.name,
      SistemaIaId: this.sistemaAiaAberto?.Id ?? null
    });

  aoCriarDocumentoAia(documento: PgiaDocumento): void {
    this.aiaForm.DocumentoId = documento.Id;
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
      ProximaRevisao: '',
      DocumentoId: null as number | null
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
      ProximaRevisao: aia.ProximaRevisao ?? '',
      DocumentoId: aia.DocumentoId ?? null
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
      // Documento da AIA: o anexo sobe depois de salva, pelo DocumentoId dela.
      RipdDocumentoId: this.aiaEmEdicao?.RipdDocumentoId ?? null,
      DocumentoId: this.aiaForm.DocumentoId,
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
      && !this.errDataClassificacao && !this.errJustificativa
      && this.respostasGrupos.every((_, i) => this.grupoRespondido(i))
      && this.outrosSatisfeito
      && this.outrosRiscosValidos();
  }

  // ── Questionário: grupos, "nenhuma" e riscos declarados ──────────────────

  private novasRespostas(): { marcados: boolean[]; nenhuma: boolean }[] {
    return GRUPOS_QUESITOS.map(g => ({ marcados: g.quesitos.map(() => false), nenhuma: false }));
  }

  /** Marcar um quesito desfaz o "nenhuma" do grupo (as opções são exclusivas). */
  aoMarcarQuesito(indiceGrupo: number): void {
    const resposta = this.respostasGrupos[indiceGrupo];
    if (resposta.marcados.some(m => m)) resposta.nenhuma = false;
  }

  /** Marcar "nenhuma" limpa e desabilita os quesitos do grupo. */
  aoMarcarNenhuma(indiceGrupo: number): void {
    const resposta = this.respostasGrupos[indiceGrupo];
    if (resposta.nenhuma) resposta.marcados = resposta.marcados.map(() => false);
  }

  /** O grupo está respondido quando há quesito marcado ou o "nenhuma". */
  grupoRespondido(indiceGrupo: number): boolean {
    const resposta = this.respostasGrupos[indiceGrupo];
    return resposta.nenhuma || resposta.marcados.some(m => m);
  }

  errGrupo(indiceGrupo: number): boolean {
    return this.submetido && !this.grupoRespondido(indiceGrupo);
  }

  // ── Grupo "Outros" ────────────────────────────────────────────────────────

  private novoRiscoOutro(): PgiaRiscoOutroForm {
    return {
      DescricaoRisco: '', AcaoMitigacao: '', ResponsavelNome: '', ResponsavelEmail: '',
      Probabilidade: '', Consequencia: ''
    };
  }

  adicionarRiscoOutro(): void {
    this.outrosRiscos = [...this.outrosRiscos, this.novoRiscoOutro()];
    this.riscoDestacado = this.outrosRiscos.length - 1;
  }

  removerRiscoOutro(indice: number): void {
    this.outrosRiscos = this.outrosRiscos.filter((_, i) => i !== indice);
    this.riscoDestacado = null;
  }

  destacarRisco(indice: number): void {
    this.riscoDestacado = indice;
  }

  errRiscoDescricao(i: number): boolean { return this.submetido && !this.outrosRiscos[i].DescricaoRisco.trim(); }
  errRiscoMitigacao(i: number): boolean { return this.submetido && !this.outrosRiscos[i].AcaoMitigacao.trim(); }
  errRiscoNome(i: number): boolean { return this.submetido && !this.outrosRiscos[i].ResponsavelNome.trim(); }
  errRiscoEmail(i: number): boolean {
    if (!this.submetido) return false;
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.outrosRiscos[i].ResponsavelEmail.trim());
  }
  errRiscoProbabilidade(i: number): boolean { return this.submetido && !this.outrosRiscos[i].Probabilidade; }
  errRiscoConsequencia(i: number): boolean { return this.submetido && !this.outrosRiscos[i].Consequencia; }

  private outrosRiscosValidos(): boolean {
    return this.outrosRiscos.every((_, i) =>
      !this.errRiscoDescricao(i) && !this.errRiscoMitigacao(i) && !this.errRiscoNome(i)
      && !this.errRiscoEmail(i) && !this.errRiscoProbabilidade(i) && !this.errRiscoConsequencia(i));
  }

  /** Risco com todos os campos obrigatórios preenchidos (não depende do submit). */
  private riscoCompleto(risco: PgiaRiscoOutroForm): boolean {
    return !!risco.DescricaoRisco.trim() && !!risco.AcaoMitigacao.trim()
      && !!risco.ResponsavelNome.trim()
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(risco.ResponsavelEmail.trim())
      && !!risco.Probabilidade && !!risco.Consequencia;
  }

  /** Os três grupos responderam "Nenhuma das alternativas acima". */
  get todosNenhuma(): boolean {
    return this.respostasGrupos.every(r => r.nenhuma);
  }

  /**
   * Se nenhuma situação dos arts. 15 a 17 se aplica, o órgão precisa declarar
   * ao menos um risco próprio — senão o registro não diz nada sobre o sistema.
   */
  get outrosObrigatorio(): boolean {
    return this.todosNenhuma;
  }

  get outrosSatisfeito(): boolean {
    return !this.outrosObrigatorio || this.outrosRiscos.some(r => this.riscoCompleto(r));
  }

  get errOutros(): boolean {
    return this.submetido && !this.outrosSatisfeito;
  }

  /** Dimensão do questionário: é ela que liga e desliga o botão de salvar. */
  get questionarioPronto(): boolean {
    return this.respostasGrupos.every((_, i) => this.grupoRespondido(i)) && this.outrosSatisfeito;
  }

  /** O que ainda falta no questionário, para o hint ao lado do botão. */
  get faltaNoQuestionario(): string | null {
    if (!this.respostasGrupos.every((_, i) => this.grupoRespondido(i))) {
      return 'Responda os três grupos do questionário para salvar.';
    }
    if (!this.outrosSatisfeito) {
      return 'Como nenhuma das situações se aplica, descreva ao menos um risco no grupo Outros para salvar.';
    }
    return null;
  }

  // ── Matriz de risco da CGDF (popover de ajuda) ────────────────────────────

  abrirMatriz(): void { this.matrizAberta = true; }

  /** Só o mouse saindo fecha; clique/foco "prendem" a matriz aberta. */
  aoSairDaMatriz(): void {
    if (!this.matrizFixada) this.matrizAberta = false;
  }

  /**
   * Clique (e toque) prendem a matriz aberta; o clique seguinte fecha. Sem isso
   * o mouse abriria no hover e o clique logo em seguida fecharia — o contrário
   * do que o usuário espera.
   */
  fixarMatriz(): void {
    if (this.matrizAberta && this.matrizFixada) {
      this.matrizAberta = false;
      this.matrizFixada = false;
      return;
    }
    this.matrizAberta = true;
    this.matrizFixada = true;
  }

  @HostListener('document:keydown.escape')
  aoTeclarEscape(): void {
    this.matrizAberta = false;
    this.matrizFixada = false;
  }

  /** Cor da célula da matriz (v verde, a amarelo, l laranja, r vermelho). */
  corMatriz(codigo: string): string {
    switch (codigo) {
      case 'v': return 'bg-green-500 text-white';
      case 'a': return 'bg-yellow-300 text-gray-900';
      case 'l': return 'bg-orange-400 text-gray-900';
      default: return 'bg-red-500 text-white';
    }
  }

  /**
   * Só o quadrante 3×3 de baixo à esquerda é selecionável no grupo "Outros"
   * (probabilidade até Possível, consequência até Moderada).
   */
  celulaSelecionavel(linha: number, coluna: number): boolean {
    return coluna <= 2 && linha >= 2;
  }

  /** Célula do par escolhido no risco em edição, para o realce. */
  celulaDoRisco(linha: number, coluna: number): boolean {
    if (this.riscoDestacado === null) return false;
    const risco = this.outrosRiscos[this.riscoDestacado];
    if (!risco || !risco.Probabilidade || !risco.Consequencia) return false;
    return this.consequenciasMatriz[linha] === risco.Consequencia
      && this.probabilidadesCgdf[coluna] === risco.Probabilidade;
  }

  // ── Checklist enviado ao servidor ────────────────────────────────────────

  private montarChecklist(): PgiaChecklist {
    const incisos = (indiceGrupo: number) => this.grupos[indiceGrupo].quesitos
      .filter((_, i) => this.respostasGrupos[indiceGrupo].marcados[i])
      .map(q => q.inciso)
      .sort((a, b) => ROMANOS.indexOf(a) - ROMANOS.indexOf(b));
    return {
      Q15: incisos(0), Q16: incisos(1), Q17: incisos(2),
      Q15Nenhuma: this.respostasGrupos[0].nenhuma,
      Q16Nenhuma: this.respostasGrupos[1].nenhuma,
      Q17Nenhuma: this.respostasGrupos[2].nenhuma
    };
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
        Justificativa: this.classForm.Justificativa.trim(),
        OutrosRiscos: this.outrosRiscos.map(r => ({
          DescricaoRisco: r.DescricaoRisco.trim(),
          AcaoMitigacao: r.AcaoMitigacao.trim(),
          ResponsavelNome: r.ResponsavelNome.trim(),
          ResponsavelEmail: r.ResponsavelEmail.trim(),
          Probabilidade: r.Probabilidade,
          Consequencia: r.Consequencia
        }))
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
        this.respostasGrupos = this.novasRespostas();
        this.outrosRiscos = [];
        this.riscoDestacado = null;
        this.carregarSistemas();
        // Sem resultado no aviso: a classificação é competência da SGDI.
        this.notificationService.success('Sistema incluído no inventário. Ele já aparece na lista.');
        // Cada seção tem a sua página: depois de salvar, mostrar a lista.
        this.router.navigate(['/pgia/sistemas/lista']);
      },
      error: () => {
        this.salvando = false;
        this.notificationService.error('Não foi possível salvar o sistema no inventário.');
      }
    });
  }
}
