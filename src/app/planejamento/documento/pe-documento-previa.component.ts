import {
  AfterViewChecked, Component, DestroyRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, PLATFORM_ID,
  SimpleChanges, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import {
  PeAndamentoPdtic, PeCiclo, PeDocBloco, PeDocCapitulo, PeDocMarcador, PeDocVersao, PeDocumento, PePdtic, PeTipoDocumento
} from '../../../api/planejamento/interface';
import { semCarregamento } from '../../core/carregamento/sem-carregamento';
import { NotificationService } from '../../core/services/notification.service';
import { PeDocumentoService } from '../services/pe-documento.service';
import { mensagemErroDownload, salvarResposta } from '../shared/pe-download';
import {
  AlvoDocumento, ItemPaginaDoc, PaginaDoc, PassoLinkDoc, RelatorioDoc, capituloEscondivel, capitulosDoSumario, chaveDoAlvo,
  classeSituacaoVersao, marcadoresDoTipo, marcadoresPadraoDo, montarPaginas, nomeArquivoVersao, rotuloSituacaoVersao, textoCapituloVazio,
  tituloComNumero, versoesEmOrdem
} from '../shared/pe-documento-rotulos';
import { mensagemErroPe } from '../shared/pe-erros';
import { citacaoTravado } from '../shared/pe-modelo-rotulos';
import { passoTemFluxos } from '../shared/pe-pdtic-rotulos';
import { quandoEQuem, textoVigencia } from '../shared/pe-referenciais-rotulos';
import { tamanhoLegivel, textoData } from '../shared/registros/pe-valores';
import { PeImagensService } from '../shared/texto-rico/pe-imagens.service';
import { idDaImagem } from '../shared/texto-rico/pe-texto-rico-doc';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { PassoNumeradoPe } from '../trilha/pe-trilhas';
import { PeDocBlocoComponent } from './pe-doc-bloco.component';

/** Título de capítulo (o próprio do órgão). */
const MAX_TITULO = 200;

/** As seções onde se editam os dados de cada bloco do acompanhamento (o link "no passo N.M"). */
const SECAO_DOS_BLOCOS: Readonly<Record<string, string>> = {
  acoes_por_situacao: 'monitoramento_acoes',
  riscos_ocorridos: 'riscos_ocorridos',
  medicoes: 'medicoes_indicadores'
};

/**
 * Prévia do documento do PDTIC (passo "Monte o documento e confira a prévia" do
 * órgão, dentro da tela do passo, carregada sob demanda): o documento resolvido
 * pelo servidor, com cara de A4 (capa com a identificação do GDF e o logotipo do
 * órgão, sumário navegável, capítulos numerados, páginas deitadas para as
 * tabelas largas) e, para quem edita (`PodeEditar`):
 *
 * - o texto de cada bloco, que abre o editor ali mesmo e se salva sozinho;
 * - renomear o capítulo e esconder o opcional ("Mostrar de novo" traz de volta);
 * - "Gerar PDF", que guarda a versão (minuta) e baixa o arquivo.
 *
 * Quem só lê (consulta do órgão, papéis globais, PDTIC fora de elaboração) vê o
 * mesmo documento, sem os controles, e baixa as versões já geradas. As tabelas,
 * listas e a matriz SWOT só se leem: o link leva ao passo onde os dados se editam.
 *
 * E7 rodada B: a mesma prévia mostra os relatórios do acompanhamento (entrada
 * `relatorio`): o RA de um ciclo, no passo que fecha o ciclo, e o RR, no passo das
 * lições aprendidas. Muda só a base da API (o alvo), os textos que explicam o
 * documento, o nome do PDF de reserva e os marcadores (os do modelo do tipo); os
 * blocos novos (ações por situação, metas por resultado, riscos que ocorreram e
 * medições) levam ao passo onde os dados se editam, já no ciclo do relatório.
 */
@Component({
  selector: 'app-pe-documento-previa',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PeDocBlocoComponent],
  templateUrl: './pe-documento-previa.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeDocumentoPreviaComponent implements OnInit, OnChanges, AfterViewChecked, OnDestroy {
  private readonly documentoService = inject(PeDocumentoService);
  private readonly imagens = inject(PeImagensService);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly router = inject(Router);
  private readonly notificacoes = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) pdtic!: PePdtic;
  /** E7 rodada B: o relatório do acompanhamento (RA de um ciclo ou RR) no lugar do documento do PDTIC. */
  @Input() relatorio: RelatorioDoc | null = null;
  /** Há texto mudado que ainda não foi salvo (a tela do passo pergunta antes de sair). */
  @Output() readonly alterado = new EventEmitter<boolean>();
  /** Um PDF foi gerado (a situação do passo pode ter mudado). */
  @Output() readonly mudou = new EventEmitter<void>();
  /**
   * Quem dá o aviso do PDF gerado (F2, C-O3): sem ele, a própria prévia. A tela do
   * passo o recebe para juntar o aviso ao "Passo N.M feito" (um aviso só).
   */
  @Input() avisarSalvo: ((texto: string) => void) | null = null;

  readonly maxTitulo = MAX_TITULO;
  /**
   * Marcadores do editor e dos avisos de dado sem valor: os do documento (a lista
   * `Marcadores` da resposta, com o passo de cada um na trilha do órgão; F2). Sem
   * ela (resposta antiga), a lista da especificação até a do servidor chegar (GET
   * modelo/documento?tipo=, que todo papel lê), pedida na primeira vez que um texto
   * abre. A do servidor tem também os campos que o administrador criou no dicionário
   * de nomes.
   */
  marcadores: readonly PeDocMarcador[] = marcadoresPadraoDo('pdtic');
  /** F2: os marcadores vieram do documento (o link "preencha no passo N.M" vale também para quem só lê). */
  marcadoresDoDocumento = false;
  private marcadoresPedidos: PeTipoDocumento | null = null;
  /** O documento que a tela mostra e grava (o mesmo objeto enquanto não muda: vai para os blocos). */
  alvo: AlvoDocumento = { tipo: 'pdtic', pdticId: 0 };

  doc: PeDocumento | null = null;
  carregando = false;
  erro: string | null = null;

  paginas: PaginaDoc[] = [];
  sumario: PeDocCapitulo[] = [];
  versoes: PeDocVersao[] = [];
  /** Resumo do documento para a caixa do alto. */
  resumo = { capitulos: 0, escondidos: 0, faltando: 0, modeloMudou: 0 };

  /** O bloco com o editor aberto (um de cada vez). */
  blocoAberto: number | null = null;
  /** Blocos com texto mudado ainda não salvo (ou salvando). */
  readonly pendentes = new Set<number>();

  renomeando: number | null = null;
  tituloEditado = '';
  erroTitulo: string | null = null;
  salvandoCapitulo: number | null = null;

  gerando = false;
  baixando: number | null = null;

  /** Logotipo do órgão (o `Logotipo` do documento: o campo de arquivo do dicionário de nomes), baixado com o token. */
  logoUrl: string | null = null;
  /** Onde se preenche cada seção, na trilha à vista (links "no passo N.M"). */
  passosPorSecao: ReadonlyMap<string, PassoLinkDoc> = new Map();

  /** O relatório de resultados passa pelo comitê antes da autoridade máxima (o nível tem o passo; no Básico, não; F2). */
  get rrVaiAoComite(): boolean {
    return this.passosPorSecao.has('aprovacao_resultados_comite');
  }
  passosPorChave: ReadonlyMap<string, PassoLinkDoc> = new Map();
  /** O passo onde o órgão adapta os fluxos (link dos blocos de fluxo, E6). */
  private passoFluxos: PassoLinkDoc | null = null;
  private passosVistos: PassoNumeradoPe[] | null = null;
  private andamentoVisto: PeAndamentoPdtic | null = null;
  /** Os links que levam ao passo já no ciclo do relatório (o mesmo objeto para o mesmo passo e ciclo). */
  private linksDoCiclo = new Map<string, PassoLinkDoc>();

  private chavePdtic = '';
  private urlBase = '';
  private focoPendente: string | null = null;
  private carga?: Subscription;
  private avisouAlterado = false;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        const passos = estado?.passos ?? [];
        const andamento = estado?.situacao?.andamento ?? null;
        if (passos === this.passosVistos && andamento === this.andamentoVisto) return;
        this.passosVistos = passos;
        this.andamentoVisto = andamento;
        this.montarLinks(passos, andamento);
      });
  }

  ngOnChanges(mudancas: SimpleChanges): void {
    if ((!mudancas['pdtic'] && !mudancas['relatorio']) || !this.pdtic) return;
    const alvo = this.alvoDaEntrada();
    // Outra situação, outro PDTIC ou outro relatório (no RA, também o ciclo fechado ou reaberto e o relatório
    // gerado ao fechar): o documento (e o PodeEditar) vem de novo
    const r = this.relatorio;
    const ciclo = r?.tipo === 'ra' ? `:${r.ciclo.Situacao}:${r.ciclo.Relatorio?.Numero ?? 0}` : '';
    const chave = `${this.pdtic.Id}:${this.pdtic.Situacao}:${this.pdtic.PodeEditar}|${chaveDoAlvo(alvo)}${ciclo}`;
    if (chave === this.chavePdtic) return;
    const outroDocumento = chaveDoAlvo(alvo) !== chaveDoAlvo(this.alvo);
    this.chavePdtic = chave;
    this.alvo = alvo;
    if (outroDocumento) {
      // Outro documento: o anterior sai da tela enquanto o novo carrega (e o editor aberto fecha)
      this.doc = null;
      this.blocoAberto = null;
      this.pendentes.clear();
      this.avisarAlterado();
      this.linksDoCiclo.clear();
      this.marcadoresDoDocumento = false;
      if (this.marcadoresPedidos !== this.tipoDoc) {
        this.marcadoresPedidos = null;
        this.marcadores = marcadoresPadraoDo(this.tipoDoc);
      }
    }
    this.carregar();
  }

  /** O alvo pelas entradas: o documento do PDTIC ou o relatório pedido. */
  private alvoDaEntrada(): AlvoDocumento {
    const r = this.relatorio;
    if (r?.tipo === 'ra') return { tipo: 'ra', pdticId: this.pdtic.Id, cicloId: r.ciclo.Id };
    if (r?.tipo === 'rr') return { tipo: 'rr', pdticId: this.pdtic.Id };
    return { tipo: 'pdtic', pdticId: this.pdtic.Id };
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const id = this.focoPendente;
    if (!document.getElementById(id)) return;
    this.focoPendente = null;
    // Depois da renderização: com as animações ligadas, o que sai da página ainda está nela neste momento (F2, B01)
    queueMicrotask(() => this.focar(id));
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  /** `depois`: roda com o documento novo aplicado (ex.: o foco num elemento que só existe nele). */
  carregar(depois?: () => void): void {
    const alvo = this.alvo;
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.urlBase = this.router.url.split('#')[0];
    this.carga = this.documentoService.documento(alvo).subscribe({
      next: doc => {
        this.carregando = false;
        this.aplicarDocumento(doc);
        this.carregarLogo();
        depois?.();
      },
      error: erro => {
        this.carregando = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, `Não foi possível carregar ${this.nomeDoc}.`);
        if (mensagem !== null) this.erro = mensagem;
      }
    });
  }

  private aplicarDocumento(doc: PeDocumento): void {
    this.doc = doc;
    this.aplicarMarcadores(doc);
    this.paginas = montarPaginas(doc.Capitulos ?? []);
    this.sumario = capitulosDoSumario(doc.Capitulos ?? []);
    this.versoes = versoesEmOrdem(doc.Versoes);
    const blocos = (doc.Capitulos ?? []).flatMap(c => c.Blocos ?? []);
    this.resumo = {
      capitulos: this.sumario.filter(c => !c.Oculto).length,
      escondidos: this.sumario.filter(c => c.Oculto).length,
      faltando: new Set(blocos.flatMap(b => b.MarcadoresSemValor ?? [])).size,
      modeloMudou: blocos.filter(b => b.ModeloMudou).length
    };
    // O editor aberto (ou o texto pendente) de um bloco que saiu do documento não vale mais
    const ids = new Set(blocos.map(b => b.Id));
    if (this.blocoAberto !== null && !ids.has(this.blocoAberto)) this.blocoAberto = null;
    for (const id of [...this.pendentes]) if (!ids.has(id)) this.pendentes.delete(id);
    this.avisarAlterado();
  }

  /**
   * F2: os marcadores que o documento traz (os do modelo do tipo, com o número do passo
   * na trilha do órgão) valem para os avisos de dado sem valor e para o editor, sem
   * pedir a lista do modelo. A lista só troca quando muda: ela vai para os blocos e
   * para o editor aberto.
   */
  private aplicarMarcadores(doc: PeDocumento): void {
    if (!doc.Marcadores?.length) {
      this.marcadoresDoDocumento = false;
      return;
    }
    const lista = marcadoresDoTipo(this.tipoDoc, doc.Marcadores);
    if (!this.marcadoresDoDocumento || JSON.stringify(lista) !== JSON.stringify(this.marcadores)) this.marcadores = lista;
    this.marcadoresDoDocumento = true;
    this.marcadoresPedidos = this.tipoDoc;
  }

  /** Links para os passos: a seção de cada passo da trilha à vista e o passo de cada capítulo. */
  private montarLinks(passos: PassoNumeradoPe[], andamento: PeAndamentoPdtic | null): void {
    const porSecao = new Map<string, PassoLinkDoc>();
    const porChave = new Map<string, PassoLinkDoc>();
    let fluxos: PassoLinkDoc | null = null;
    for (const p of passos) {
      const doOrgao = p.doOrgao;
      if (!doOrgao) continue;
      // Se o passo se edita agora: o link diz "Editar" ou "Ver" pelo passo, e não pelo documento (F1, C32 e B15)
      const editavel = andamento?.Passos?.find(s => s.Chave === doOrgao.Chave)?.PodeEditar;
      const link: PassoLinkDoc = { rota: p.rota, numero: p.numero, titulo: p.titulo, query: { passo: p.numero }, editavel };
      porChave.set(doOrgao.Chave, link);
      for (const s of doOrgao.Secoes) if (!porSecao.has(s.Chave)) porSecao.set(s.Chave, link);
      if (!fluxos && passoTemFluxos(doOrgao)) fluxos = link;
    }
    this.passosPorSecao = porSecao;
    this.passosPorChave = porChave;
    this.passoFluxos = fluxos;
    this.linksDoCiclo.clear();
  }

  /**
   * O logotipo do órgão para a capa (o `Logotipo` do documento, o caminho do
   * arquivo na API), baixado com o token. Sem ele, a capa diz onde enviar.
   */
  private carregarLogo(): void {
    const pdticId = this.pdtic.Id;
    const id = idDaImagem(this.doc?.Logotipo ?? null);
    if (!this.noNavegador || id === null) {
      this.logoUrl = null;
      return;
    }
    this.imagens.endereco(id).then(
      url => {
        if (this.pdtic.Id === pdticId) this.logoUrl = url;
      },
      () => {
        this.logoUrl = null;
      }
    );
  }

  // ── Rótulos ───────────────────────────────────────────────────────────────

  get podeEditar(): boolean {
    return !!this.doc?.PodeEditar;
  }

  get vigencia(): string {
    return textoVigencia(this.pdtic);
  }

  // ── Qual documento (E7 rodada B) ──────────────────────────────────────────

  get tipoDoc(): PeTipoDocumento {
    return this.alvo.tipo;
  }

  /** O ciclo do relatório de acompanhamento (null no PDTIC e no RR). */
  get cicloDoRelatorio(): PeCiclo | null {
    const r = this.relatorio;
    return r?.tipo === 'ra' ? r.ciclo : null;
  }

  /** "o documento do PDTIC", "o relatório de acompanhamento do ciclo 2027 · 1º trimestre", "o relatório de resultados". */
  get nomeDoc(): string {
    const ciclo = this.cicloDoRelatorio;
    if (ciclo) return ciclo.Tipo === 'avaliacao' ? `o relatório de acompanhamento de "${ciclo.Rotulo}"` : `o relatório de acompanhamento do ciclo ${ciclo.Rotulo}`;
    return this.tipoDoc === 'rr' ? 'o relatório de resultados do PDTIC' : 'o documento do PDTIC';
  }

  /** O título da caixa do alto ("Prévia do documento", "Prévia do relatório de acompanhamento"). */
  get tituloPrevia(): string {
    switch (this.tipoDoc) {
      case 'ra': return 'Prévia do relatório de acompanhamento (RA)';
      case 'rr': return 'Prévia do relatório de resultados (RR)';
      default: return 'Prévia do documento';
    }
  }

  /** O nome curto do documento na capa e no rodapé das páginas ("PDTIC · SES", "RA · SES"). */
  get siglaDoc(): string {
    switch (this.tipoDoc) {
      case 'ra': return 'RA';
      case 'rr': return 'RR';
      default: return 'PDTIC';
    }
  }

  /** O RA de um ciclo de monitoramento: os capítulos da avaliação ficam em branco. */
  get raDeMonitoramento(): boolean {
    return this.cicloDoRelatorio?.Tipo === 'monitoramento';
  }

  /** O período do ciclo do RA ("01/01/2027 a 31/03/2027"). */
  get periodoDoCiclo(): string {
    const c = this.cicloDoRelatorio;
    if (!c?.Inicio || !c.Fim) return '';
    return `${textoData(c.Inicio)} a ${textoData(c.Fim)}`;
  }

  /**
   * A linha do ciclo na capa do RA, como no PDF (F1, B09 e C25): "Ciclo 2027 · 1º
   * trimestre (01/01/2027 a 31/03/2027)" no monitoramento; na avaliação, o nome dela
   * (sem "Ciclo"), com o período ou "desde".
   */
  get linhaCicloCapa(): string | null {
    const c = this.cicloDoRelatorio;
    if (!c) return null;
    const nome = c.Tipo === 'avaliacao' || /^ciclo\b/i.test(c.Rotulo) ? c.Rotulo : `Ciclo ${c.Rotulo}`;
    const periodo = c.Inicio && c.Fim ? `${textoData(c.Inicio)} a ${textoData(c.Fim)}` : c.Inicio ? `desde ${textoData(c.Inicio)}` : '';
    return periodo ? `${nome} (${periodo})` : nome;
  }

  /** O ano no pé da capa ("Brasília, 2026"), como no PDF. */
  readonly anoCapa = new Date().getFullYear();

  get passoNomes(): PassoLinkDoc | null {
    return this.passosPorSecao.get('nomes') ?? null;
  }

  get passoVigencia(): PassoLinkDoc | null {
    return this.passosPorSecao.get('abrangencia') ?? null;
  }

  titulo(c: PeDocCapitulo): string {
    return tituloComNumero(c);
  }

  citacao(c: PeDocCapitulo): string {
    return citacaoTravado(c.IncisoDecreto);
  }

  escondivel(c: PeDocCapitulo): boolean {
    return capituloEscondivel(c);
  }

  textoVazio(c: PeDocCapitulo): string {
    return textoCapituloVazio(c, this.tipoDoc, this.raDeMonitoramento);
  }

  rotuloVersao(v: PeDocVersao): string {
    return rotuloSituacaoVersao(v.Situacao);
  }

  classeVersao(v: PeDocVersao): string {
    return classeSituacaoVersao(v.Situacao);
  }

  quandoVersao(v: PeDocVersao): string {
    return quandoEQuem(v.GeradoEm, null);
  }

  tamanho(v: PeDocVersao): string {
    return typeof v.Tamanho === 'number' && v.Tamanho > 0 ? tamanhoLegivel(v.Tamanho) : '-';
  }

  hrefCapitulo(c: PeDocCapitulo): string {
    return `${this.urlBase}#${this.idDoTitulo(c)}`;
  }

  /** O título do capítulo na página; do escondido, o quadro com "Mostrar de novo" (F2, B01). */
  private idDoTitulo(c: PeDocCapitulo): string {
    return c.Oculto ? `pe-doc-oculto-${c.Id}` : `pe-doc-titulo-${c.Id}`;
  }

  /**
   * O passo onde se editam os dados de uma tabela, lista ou matriz (ou o passo do
   * capítulo); no bloco de fluxo, o passo onde o órgão adapta os fluxos.
   */
  passoDoBloco(item: ItemPaginaDoc): PassoLinkDoc | null {
    const b = item.bloco;
    if (!b) return null;
    if (b.Tipo === 'fluxo') return this.passoFluxos;
    let secao: string | null = null;
    if (b.Tipo === 'tabela_secao') secao = b.Tabela?.SecaoChave ?? null;
    else if (b.Tipo === 'lista_tema') secao = 'acoes';
    else if (b.Tipo === 'matriz_swot') secao = 'swot_forcas';
    else if (b.Tipo === 'metas_por_resultado') secao = this.tipoDoc === 'rr' ? 'resultados_metas' : 'resultados_intermediarios';
    else if (SECAO_DOS_BLOCOS[b.Tipo]) secao = SECAO_DOS_BLOCOS[b.Tipo];
    else return null;
    const link = (secao ? this.passosPorSecao.get(secao) : null)
      ?? (item.capitulo.PassoChave ? this.passosPorChave.get(item.capitulo.PassoChave) ?? null : null);
    return link ? this.noCicloDoRelatorio(link, secao) : null;
  }

  /**
   * No RA, o link de uma seção por ciclo do mesmo tipo do ciclo do relatório leva
   * ao passo já nesse ciclo (`?ciclo=`); o mesmo objeto para o mesmo passo e ciclo.
   */
  private noCicloDoRelatorio(link: PassoLinkDoc, secao: string | null): PassoLinkDoc {
    const ciclo = this.cicloDoRelatorio;
    if (!ciclo || !secao) return link;
    const doTipo = ciclo.Tipo === 'avaliacao'
      ? secao === 'resultados_intermediarios' || secao === 'analise_intermediaria' || secao === 'avaliacao_comite'
      : secao === 'monitoramento_acoes' || secao === 'medicoes_indicadores' || secao === 'riscos_ocorridos' || secao === 'relatorio_ciclo';
    if (!doTipo) return link;
    const chave = `${link.rota}|${ciclo.Id}`;
    let noCiclo = this.linksDoCiclo.get(chave);
    if (!noCiclo) {
      noCiclo = { ...link, query: { passo: link.numero, ciclo: ciclo.Id } };
      this.linksDoCiclo.set(chave, noCiclo);
    }
    return noCiclo;
  }

  porChave(_: number, item: { chave: string }): string {
    return item.chave;
  }

  porId(_: number, item: { Id: number }): number {
    return item.Id;
  }

  porNumero(_: number, v: PeDocVersao): number {
    return v.Numero;
  }

  // ── Blocos ────────────────────────────────────────────────────────────────

  abrirBloco(bloco: PeDocBloco): void {
    if (!this.podeEditar) return;
    this.renomeando = null;
    this.blocoAberto = bloco.Id;
    this.carregarMarcadores();
  }

  /** A lista de marcadores do servidor, uma vez por tipo de documento (sem ela, fica a da especificação). */
  private carregarMarcadores(): void {
    const tipo = this.tipoDoc;
    if (this.marcadoresPedidos === tipo) return;
    this.marcadoresPedidos = tipo;
    // Segundo plano: o editor já abre com a lista da especificação
    this.documentoService.modelo(tipo, semCarregamento()).subscribe({
      next: modelo => {
        // A lista do documento, se chegou nesse meio tempo, fica (ela tem o número do passo na trilha do órgão)
        if (modelo.Marcadores?.length && this.tipoDoc === tipo && !this.marcadoresDoDocumento) {
          this.marcadores = marcadoresDoTipo(tipo, modelo.Marcadores);
        }
      },
      error: () => {
        if (this.marcadoresPedidos === tipo) this.marcadoresPedidos = null;
      }
    });
  }

  fecharBloco(bloco: PeDocBloco): void {
    if (this.blocoAberto === bloco.Id) this.blocoAberto = null;
  }

  /** O servidor devolveu o bloco (texto salvo ou de volta ao modelo): entra no documento. */
  aoAtualizarBloco(capitulo: PeDocCapitulo, novo: PeDocBloco): void {
    const doc = this.doc;
    if (!doc) return;
    const capitulos = doc.Capitulos.map(c => c.Id !== capitulo.Id ? c : {
      ...c,
      Blocos: c.Blocos.map(b => b.Id === novo.Id ? { ...b, ...novo } : b)
    });
    this.aplicarDocumento({ ...doc, Capitulos: capitulos });
  }

  aoPendente(bloco: PeDocBloco, pendente: boolean): void {
    if (pendente) this.pendentes.add(bloco.Id);
    else this.pendentes.delete(bloco.Id);
    this.avisarAlterado();
  }

  private avisarAlterado(): void {
    const agora = this.pendentes.size > 0;
    if (agora === this.avisouAlterado) return;
    this.avisouAlterado = agora;
    this.alterado.emit(agora);
  }

  // ── Capítulos ─────────────────────────────────────────────────────────────

  renomear(c: PeDocCapitulo): void {
    if (!this.podeEditar) return;
    this.blocoAberto = null;
    this.renomeando = c.Id;
    this.tituloEditado = c.Titulo;
    this.erroTitulo = null;
    this.focoPendente = `pe-doc-renomear-${c.Id}`;
  }

  cancelarRenomear(c: PeDocCapitulo): void {
    this.renomeando = null;
    this.erroTitulo = null;
    this.focoPendente = `pe-doc-titulo-${c.Id}`;
  }

  salvarTitulo(c: PeDocCapitulo): void {
    const titulo = this.tituloEditado.trim();
    if (!titulo) {
      this.erroTitulo = 'Escreva o título do capítulo, ou use "Voltar ao título do modelo".';
      this.focoPendente = `pe-doc-renomear-${c.Id}`;
      return;
    }
    // Igual ao do modelo: volta a seguir o modelo
    this.gravarCapitulo(c, { Oculto: c.Oculto, TituloProprio: titulo === c.TituloModelo ? null : titulo }, 'Título do capítulo salvo.');
  }

  voltarTituloDoModelo(c: PeDocCapitulo): void {
    this.gravarCapitulo(c, { Oculto: c.Oculto, TituloProprio: null }, 'O capítulo voltou ao título do modelo.');
  }

  esconder(c: PeDocCapitulo): void {
    if (!this.escondivel(c)) return;
    this.gravarCapitulo(c, { Oculto: true, TituloProprio: c.TituloProprio },
      `Capítulo "${c.Titulo}" escondido: ele não sai no PDF. Para trazer de volta, use "Mostrar de novo".`);
  }

  mostrar(c: PeDocCapitulo): void {
    this.gravarCapitulo(c, { Oculto: false, TituloProprio: c.TituloProprio }, `Capítulo "${c.Titulo}" de volta ao documento.`);
  }

  private gravarCapitulo(c: PeDocCapitulo, form: { Oculto: boolean; TituloProprio: string | null }, sucesso: string): void {
    if (!this.podeEditar || this.salvandoCapitulo !== null) return;
    const mudouOculto = form.Oculto !== c.Oculto;
    // O editor aberto fecha antes (o texto dele se salva sozinho)
    this.blocoAberto = null;
    this.salvandoCapitulo = c.Id;
    this.erroTitulo = null;
    this.documentoService.salvarCapitulo(this.alvo, c.Id, form).subscribe({
      next: novo => {
        this.salvandoCapitulo = null;
        this.renomeando = null;
        // Um aviso só: o toast já é lido pelo leitor de tela (F1, B05)
        this.notificacoes.success(sucesso);
        if (mudouOculto) {
          // Esconder e mostrar mudam a numeração: o documento vem de novo, e o foco vai depois dele. Antes, o
          // título do capítulo escondido (com o mesmo id) recebia o foco e sumia na recarga (F1, B01)
          const alvoFoco = form.Oculto ? `pe-doc-mostrar-${c.Id}` : `pe-doc-titulo-${c.Id}`;
          this.carregar(() => this.focoPendente = alvoFoco);
          return;
        }
        this.substituirCapitulo(c, novo);
        this.focoPendente = `pe-doc-titulo-${c.Id}`;
      },
      error: erro => {
        this.salvandoCapitulo = null;
        const mensagem = mensagemErroPe(erro, 'Não foi possível salvar o capítulo. Tente de novo.');
        if (mensagem === null) return;
        if (this.renomeando === c.Id) {
          this.erroTitulo = mensagem;
          this.focoPendente = `pe-doc-renomear-${c.Id}`;
        } else {
          this.notificacoes.error(mensagem);
        }
      }
    });
  }

  /** O capítulo como o servidor devolveu (título); os blocos ficam os de antes se a resposta não os trouxer. */
  private substituirCapitulo(antigo: PeDocCapitulo, novo: PeDocCapitulo | null): void {
    const doc = this.doc;
    if (!doc || !novo) return;
    const capitulos = doc.Capitulos.map(c => c.Id !== antigo.Id ? c : {
      ...c,
      ...novo,
      Blocos: novo.Blocos?.length ? novo.Blocos : c.Blocos
    });
    this.aplicarDocumento({ ...doc, Capitulos: capitulos });
  }

  // ── Navegação ─────────────────────────────────────────────────────────────

  irPara(evento: Event, c: PeDocCapitulo): void {
    evento.preventDefault();
    this.focar(this.idDoTitulo(c));
  }

  irParaSumario(): void {
    this.focar('pe-doc-sumario-titulo');
  }

  irParaVersoes(): void {
    this.focar('pe-doc-versoes-titulo');
  }

  /** O primeiro capítulo com um texto que pede atenção (dado faltando ou modelo mudado). */
  irParaPrimeiro(tipo: 'faltando' | 'modelo'): void {
    const c = this.doc?.Capitulos.find(cap => (cap.Blocos ?? []).some(b =>
      tipo === 'faltando' ? (b.MarcadoresSemValor ?? []).length > 0 : b.ModeloMudou));
    if (c) this.focar(`pe-doc-titulo-${c.Id}`);
  }

  private focar(id: string): void {
    if (!this.noNavegador) return;
    const alvo = document.getElementById(id);
    if (!alvo) return;
    alvo.focus({ preventScroll: true });
    const semAnimacao = document.documentElement.classList.contains('sem-animacoes')
      || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    alvo.scrollIntoView({ block: 'start', behavior: semAnimacao ? 'auto' : 'smooth' });
  }

  // ── PDF e versões ─────────────────────────────────────────────────────────

  /** Gera o PDF (guarda a versão, minuta) e baixa o arquivo. */
  gerarPdf(): void {
    if (this.gerando || !this.podeEditar) return;
    if (this.pendentes.size > 0) {
      this.notificacoes.warning('Espere o texto terminar de salvar e gere o PDF de novo.');
      return;
    }
    this.gerando = true;
    this.documentoService.gerarPdf(this.alvo).subscribe({
      next: versao => {
        this.versoes = versoesEmOrdem([versao, ...this.versoes.filter(v => v.Numero !== versao.Numero)]);
        // Um aviso só: o toast já é lido pelo leitor de tela (F1, B05)
        const texto = `PDF gerado: versão ${versao.Numero} (${rotuloSituacaoVersao(versao.Situacao).toLowerCase()}). O download começa em seguida.`;
        if (this.avisarSalvo) this.avisarSalvo(texto);
        else this.notificacoes.success(texto);
        this.mudou.emit();
        this.baixar(versao, () => {
          this.gerando = false;
        });
      },
      error: erro => {
        this.gerando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível gerar o PDF. Tente de novo em alguns instantes.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  baixar(v: PeDocVersao, depois?: () => void): void {
    if (this.baixando !== null && !depois) return;
    this.baixando = v.Numero;
    const reserva = nomeArquivoVersao(this.doc?.OrgaoSigla ?? this.pdtic.OrgaoSigla, this.doc?.Versao ?? this.pdtic.Versao, v.Numero,
      this.tipoDoc, this.cicloDoRelatorio?.Rotulo ?? null);
    this.documentoService.baixarVersao(this.alvo, v.Numero).subscribe({
      next: resposta => {
        this.baixando = null;
        salvarResposta(resposta, reserva);
        depois?.();
      },
      error: erro => {
        this.baixando = null;
        depois?.();
        mensagemErroDownload(erro, 'Não foi possível baixar o PDF. Tente de novo.').then(mensagem => {
          if (mensagem) this.notificacoes.error(mensagem);
        });
      }
    });
  }
}
