import {
  AfterViewChecked, Component, DestroyRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, PLATFORM_ID,
  SimpleChanges, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { PeDocBloco, PeDocCapitulo, PeDocMarcador, PeDocVersao, PeDocumento, PePdtic } from '../../../api/planejamento/interface';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { NotificationService } from '../../core/services/notification.service';
import { PeDocumentoService } from '../services/pe-documento.service';
import { mensagemErroDownload, salvarResposta } from '../shared/pe-download';
import {
  ItemPaginaDoc, MARCADORES_PADRAO, PaginaDoc, PassoLinkDoc, capituloEscondivel, capitulosDoSumario,
  classeSituacaoVersao, montarPaginas, nomeArquivoVersao, rotuloSituacaoVersao, textoCapituloVazio, tituloComNumero,
  versoesEmOrdem
} from '../shared/pe-documento-rotulos';
import { mensagemErroPe } from '../shared/pe-erros';
import { citacaoTravado } from '../shared/pe-modelo-rotulos';
import { passoTemFluxos } from '../shared/pe-pdtic-rotulos';
import { quandoEQuem, textoVigencia } from '../shared/pe-referenciais-rotulos';
import { tamanhoLegivel } from '../shared/registros/pe-valores';
import { PeImagensService } from '../shared/texto-rico/pe-imagens.service';
import { idDaImagem } from '../shared/texto-rico/pe-texto-rico-doc';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { PassoNumeradoPe } from '../trilha/pe-trilhas';
import { PeDocBlocoComponent } from './pe-doc-bloco.component';

/** Título de capítulo (o próprio do órgão). */
const MAX_TITULO = 200;

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
 */
@Component({
  selector: 'app-pe-documento-previa',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PeDocBlocoComponent],
  templateUrl: './pe-documento-previa.component.html'
})
export class PeDocumentoPreviaComponent implements OnInit, OnChanges, AfterViewChecked, OnDestroy {
  private readonly documentoService = inject(PeDocumentoService);
  private readonly imagens = inject(PeImagensService);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly router = inject(Router);
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) pdtic!: PePdtic;
  /** Há texto mudado que ainda não foi salvo (a tela do passo pergunta antes de sair). */
  @Output() readonly alterado = new EventEmitter<boolean>();
  /** Um PDF foi gerado (a situação do passo pode ter mudado). */
  @Output() readonly mudou = new EventEmitter<void>();

  readonly maxTitulo = MAX_TITULO;
  /**
   * Marcadores do editor: a lista da especificação até a do servidor chegar (GET
   * modelo/documento, que todo papel lê), pedida na primeira vez que um texto abre.
   * A do servidor tem também os campos que o administrador criou no dicionário de nomes.
   */
  marcadores: readonly PeDocMarcador[] = MARCADORES_PADRAO;
  private marcadoresPedidos = false;

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
  private passosPorChave = new Map<string, PassoLinkDoc>();
  /** O passo onde o órgão adapta os fluxos (link dos blocos de fluxo, E6). */
  private passoFluxos: PassoLinkDoc | null = null;
  private passosVistos: PassoNumeradoPe[] | null = null;

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
        if (passos === this.passosVistos) return;
        this.passosVistos = passos;
        this.montarLinks(passos);
      });
  }

  ngOnChanges(mudancas: SimpleChanges): void {
    if (!mudancas['pdtic'] || !this.pdtic) return;
    // Outra situação ou outro PDTIC: o documento (e o PodeEditar) vem de novo
    const chave = `${this.pdtic.Id}:${this.pdtic.Situacao}:${this.pdtic.PodeEditar}`;
    if (chave === this.chavePdtic) return;
    this.chavePdtic = chave;
    this.carregar();
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const id = this.focoPendente;
    if (!document.getElementById(id)) return;
    this.focoPendente = null;
    this.focar(id);
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  carregar(): void {
    const id = this.pdtic.Id;
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.urlBase = this.router.url.split('#')[0];
    this.carga = this.documentoService.documento(id).subscribe({
      next: doc => {
        this.carregando = false;
        this.aplicarDocumento(doc);
        this.carregarLogo();
      },
      error: erro => {
        this.carregando = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar o documento do PDTIC.');
        if (mensagem !== null) this.erro = mensagem;
      }
    });
  }

  private aplicarDocumento(doc: PeDocumento): void {
    this.doc = doc;
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

  /** Links para os passos: a seção de cada passo da trilha à vista e o passo de cada capítulo. */
  private montarLinks(passos: PassoNumeradoPe[]): void {
    const porSecao = new Map<string, PassoLinkDoc>();
    const porChave = new Map<string, PassoLinkDoc>();
    let fluxos: PassoLinkDoc | null = null;
    for (const p of passos) {
      const doOrgao = p.doOrgao;
      if (!doOrgao) continue;
      const link: PassoLinkDoc = { rota: p.rota, numero: p.numero, titulo: p.titulo };
      porChave.set(doOrgao.Chave, link);
      for (const s of doOrgao.Secoes) if (!porSecao.has(s.Chave)) porSecao.set(s.Chave, link);
      if (!fluxos && passoTemFluxos(doOrgao)) fluxos = link;
    }
    this.passosPorSecao = porSecao;
    this.passosPorChave = porChave;
    this.passoFluxos = fluxos;
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
    return textoCapituloVazio(c);
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
    return `${this.urlBase}#pe-doc-titulo-${c.Id}`;
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
    else return null;
    return (secao ? this.passosPorSecao.get(secao) : null)
      ?? (item.capitulo.PassoChave ? this.passosPorChave.get(item.capitulo.PassoChave) ?? null : null);
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

  /** A lista de marcadores do servidor, uma vez (sem ela, fica a da especificação). */
  private carregarMarcadores(): void {
    if (this.marcadoresPedidos) return;
    this.marcadoresPedidos = true;
    this.documentoService.modelo('pdtic').subscribe({
      next: modelo => {
        if (modelo.Marcadores?.length) this.marcadores = modelo.Marcadores;
      },
      error: () => {
        this.marcadoresPedidos = false;
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
    this.documentoService.salvarCapitulo(this.pdtic.Id, c.Id, form).subscribe({
      next: novo => {
        this.salvandoCapitulo = null;
        this.renomeando = null;
        this.notificacoes.success(sucesso);
        this.acessibilidade.anunciar(sucesso);
        if (mudouOculto) {
          // Esconder e mostrar mudam a numeração: o documento vem de novo
          this.focoPendente = form.Oculto ? `pe-doc-mostrar-${c.Id}` : `pe-doc-titulo-${c.Id}`;
          this.carregar();
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
    this.focar(`pe-doc-titulo-${c.Id}`);
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
    this.documentoService.gerarPdf(this.pdtic.Id).subscribe({
      next: versao => {
        this.versoes = versoesEmOrdem([versao, ...this.versoes.filter(v => v.Numero !== versao.Numero)]);
        const texto = `PDF gerado: versão ${versao.Numero} (${rotuloSituacaoVersao(versao.Situacao).toLowerCase()}). O download começa em seguida.`;
        this.notificacoes.success(texto);
        this.acessibilidade.anunciar(texto);
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
    const reserva = nomeArquivoVersao(this.doc?.OrgaoSigla ?? this.pdtic.OrgaoSigla, this.doc?.Versao ?? this.pdtic.Versao, v.Numero);
    this.documentoService.baixarVersao(this.pdtic.Id, v.Numero).subscribe({
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
