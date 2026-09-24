import { AfterViewChecked, Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  PeDocConfigBloco, PeDocMarcador, PeDocModelo, PeDocModeloBloco, PeDocModeloCapitulo, PeDocTextoRico, PeModelo,
  PeTipoBlocoDoc
} from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import {
  MARCADORES_PADRAO, NomesDoDocumento, TIPOS_BLOCO_DOC, blocosEmOrdem, capitulosDoModelo, chaveNovaDeCapitulo,
  explicacaoTipoBloco, numerosDoModelo, resumoBlocoModelo, rotuloTipoBloco, textoFiltroTabela, textoMarcador
} from '../shared/pe-documento-rotulos';
import { mensagemErroPe } from '../shared/pe-erros';
import { modeloOrdenado } from '../shared/pe-modelo-arvore';
import { citacaoTravado } from '../shared/pe-modelo-rotulos';
import { PeEditorTextoRicoComponent } from '../shared/texto-rico/pe-editor-texto-rico.component';
import { PeTextoRicoLeituraDirective } from '../shared/texto-rico/pe-texto-rico-leitura.directive';
import { docParaEnvio, docVazio, normalizarDocumento } from '../shared/texto-rico/pe-texto-rico-doc';
import { PeDocumentoService } from '../services/pe-documento.service';
import { PeFluxosService } from '../services/pe-fluxos.service';
import { PeModeloService } from '../services/pe-modelo.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

/** Tamanhos que a tela aceita (o servidor confere de novo). */
const MAX_TITULO = 200;
const MAX_FLUXO = 60;

/** A seção "virtual" do inventário de IA do PGIA (o servidor monta a tabela com as colunas abaixo). */
const SECAO_PGIA = 'pgia_sistemas';
const COLUNAS_PGIA: OpcaoSimples[] = [
  { valor: 'nome', rotulo: 'Sistema' },
  { valor: 'finalidade', rotulo: 'Finalidade' },
  { valor: 'classificacao', rotulo: 'Classificação de risco' },
  { valor: 'base', rotulo: 'Base legal da classificação' },
  { valor: 'situacao', rotulo: 'Situação' }
];

/** Um capítulo na árvore da esquerda, com os subcapítulos. */
interface RamoCapitulo {
  capitulo: PeDocModeloCapitulo;
  filhos: PeDocModeloCapitulo[];
}

interface OpcaoSimples {
  valor: string;
  rotulo: string;
}

interface GrupoOpcoes {
  rotulo: string;
  opcoes: OpcaoSimples[];
}

/** Uma seção do PDTIC para a tabela, com os campos (as colunas que dá para escolher). */
interface SecaoParaTabela {
  chave: string;
  titulo: string;
  foraDoDocumento: boolean;
  campos: OpcaoSimples[];
}

interface GrupoSecoes {
  rotulo: string;
  secoes: SecaoParaTabela[];
}

/** O capítulo na janela de edição (novo ou existente). */
interface EdicaoCapitulo {
  novo: boolean;
  id: number | null;
  paiId: number | null;
  titulo: string;
  numerado: boolean;
  obrigatorio: boolean;
  passoChave: string;
  travado: boolean;
  inciso: string | null;
}

/** O bloco em edição (novo ou existente), com o retrato do que abriu para saber se mudou. */
interface EdicaoBloco {
  novo: boolean;
  id: number | null;
  capituloId: number;
  tipo: PeTipoBlocoDoc;
  /** O texto que o editor recebe ao abrir (não muda enquanto se escreve). */
  texto: PeDocTextoRico | null;
  rascunho: PeDocTextoRico | null;
  secao: string;
  todasColunas: boolean;
  colunas: string[];
  tema: string;
  fluxo: string;
  paginaDeitada: boolean;
  /** A configuração como veio: as chaves que a tela não conhece voltam como estavam. */
  original: PeDocConfigBloco;
  retrato: string;
}

/**
 * Modelo do documento do PDTIC (passo 1.4 do administrador do módulo; só ele e o
 * admin do SGDP): a árvore dos capítulos (subcapítulos embaixo do capítulo) à
 * esquerda e, à direita, o capítulo escolhido com os blocos dele.
 *
 * - Capítulo: título, com número ou sem, obrigatório ou opcional (o órgão só
 *   esconde o opcional) e o passo que o alimenta (desligado para o órgão, o
 *   capítulo some do documento dele); subir, descer, incluir subcapítulo e
 *   apagar (só o que o administrador criou). Os nove conteúdos mínimos (art. 12,
 *   § 2º) ficam travados: não se apagam nem ficam opcionais, com a dica do inciso.
 * - Blocos: texto padrão no mesmo editor do órgão, com a lista de marcadores para
 *   inserir; tabela de uma seção (com as colunas), lista das ações de um tema,
 *   matriz SWOT, fluxo e quebra de página; "página deitada" em qualquer bloco.
 *
 * Toda mudança vale na hora para os órgãos (o texto que o órgão não editou
 * acompanha o modelo; o editado ganha o aviso "o modelo mudou") e fica no
 * histórico do modelo. O capítulo à vista fica no endereço (`?capitulo=`).
 */
@Component({
  selector: 'app-pe-modelo-documento',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective, DialogoDirective, PeEditorTextoRicoComponent,
    PeTextoRicoLeituraDirective
  ],
  templateUrl: './pe-modelo-documento.component.html'
})
export class PeModeloDocumentoComponent implements OnInit, AfterViewChecked {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly documentoService = inject(PeDocumentoService);
  private readonly modeloService = inject(PeModeloService);
  private readonly fluxosService = inject(PeFluxosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly maxTitulo = MAX_TITULO;
  readonly maxFluxo = MAX_FLUXO;
  readonly tiposBloco = TIPOS_BLOCO_DOC;
  readonly exemploMarcador = textoMarcador('orgao.nome');

  pode: boolean | null = null;
  erroPapel = false;
  private iniciado = false;

  modelo: PeDocModelo | null = null;
  carregando = false;
  erroCarga: string | null = null;
  /** O modelo da trilha (seções, campos, temas e passos) não veio: os blocos de dados ficam sem as listas. */
  semModeloDaTrilha = false;

  arvore: RamoCapitulo[] = [];
  numeros = new Map<number, string>();
  marcadores: readonly PeDocMarcador[] = MARCADORES_PADRAO;
  marcadoresDoServidor = false;
  gruposSecoes: GrupoSecoes[] = [];
  gruposPassos: GrupoOpcoes[] = [];
  temas: OpcaoSimples[] = [];
  /** Os fluxos-modelo (E6), para o bloco de fluxo; vazio se não vieram (aí a chave se escreve). */
  fluxos: OpcaoSimples[] = [];
  private secoes = new Map<string, SecaoParaTabela>();
  private titulosPassos = new Map<string, string>();
  private readonly nomes: NomesDoDocumento = {
    secao: chave => this.secoes.get(chave)?.titulo ?? null,
    campo: (secao, chave) => this.secoes.get(secao)?.campos.find(c => c.valor === chave)?.rotulo ?? null,
    tema: valor => this.temas.find(t => t.valor === valor)?.rotulo ?? null,
    fluxo: chave => this.fluxos.find(f => f.valor === chave)?.rotulo ?? null
  };

  selecionadoId: number | null = null;

  edicaoCapitulo: EdicaoCapitulo | null = null;
  errosCapitulo: string[] = [];
  salvandoCapitulo = false;

  edicaoBloco: EdicaoBloco | null = null;
  errosBloco: string[] = [];
  salvandoBloco = false;
  tipoNovo: PeTipoBlocoDoc = 'texto';

  movendo = false;
  apagando = false;
  private focoPendente: string | null = null;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.pode = this.estadoService.podeConfigurar;
        this.erroPapel = estado.consultaPapel === 'erro';
        if (this.pode && !this.iniciado) {
          this.iniciado = true;
          this.carregar();
        }
      });
    this.rota.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = Number(params.get('capitulo'));
        if (Number.isInteger(id) && id > 0 && id !== this.selecionadoId) {
          this.selecionadoId = id;
          this.garantirSelecao();
        }
      });
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  tentarDeNovo(): void {
    this.estadoService.iniciar();
  }

  /** Guarda de rota: capítulo ou bloco com mudança não salva. */
  podeSair(): boolean {
    if (!this.temMudanca()) return true;
    return confirm('Há mudanças no modelo do documento que ainda não foram salvas. Sair assim mesmo? Elas vão se perder.');
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  carregar(depois?: () => void): void {
    this.carregando = true;
    this.erroCarga = null;
    forkJoin({
      documento: this.documentoService.modelo('pdtic'),
      trilha: this.modeloService.modelo().pipe(catchError(() => of(null))),
      fluxos: this.fluxosService.modelos().pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ documento, trilha, fluxos }) => {
        this.carregando = false;
        this.semModeloDaTrilha = !trilha;
        if (trilha) this.lerModeloDaTrilha(modeloOrdenado(trilha));
        this.fluxos = (fluxos ?? []).map(f => ({ valor: f.Chave, rotulo: f.FiguraGuia ? `${f.FiguraGuia} · ${f.Nome}` : f.Nome }));
        this.aplicarModelo(documento);
        depois?.();
      },
      error: erro => {
        this.carregando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar o modelo do documento.');
        if (mensagem !== null) this.erroCarga = mensagem;
      }
    });
  }

  private aplicarModelo(modelo: PeDocModelo): void {
    this.modelo = modelo;
    const capitulos = modelo.Capitulos ?? [];
    this.arvore = capitulosDoModelo(capitulos, null).map(c => ({ capitulo: c, filhos: capitulosDoModelo(capitulos, c.Id) }));
    this.numeros = numerosDoModelo(capitulos);
    this.marcadoresDoServidor = !!modelo.Marcadores?.length;
    this.marcadores = this.marcadoresDoServidor ? modelo.Marcadores : MARCADORES_PADRAO;
    this.garantirSelecao();
  }

  /** Seções e campos (para as tabelas), temas das ações e passos (para o capítulo), do modelo da trilha. */
  private lerModeloDaTrilha(trilha: PeModelo): void {
    const secoes = new Map<string, SecaoParaTabela>();
    const gruposSecoes: GrupoSecoes[] = [];
    const gruposPassos: GrupoOpcoes[] = [];
    const titulosPassos = new Map<string, string>();
    let temas: OpcaoSimples[] = [];
    for (const etapa of trilha.Etapas) {
      const passos: OpcaoSimples[] = [];
      for (const passo of etapa.Passos) {
        if (passo.Excluido) continue;
        passos.push({ valor: passo.Chave, rotulo: passo.Titulo });
        titulosPassos.set(passo.Chave, passo.Titulo);
        const doPasso: SecaoParaTabela[] = [];
        for (const s of passo.Secoes) {
          if (s.Excluido) continue;
          const secao: SecaoParaTabela = {
            chave: s.Chave,
            titulo: s.Titulo,
            foraDoDocumento: !s.NoDocumento,
            campos: s.Campos.filter(c => !c.Excluido).map(c => ({ valor: c.Chave, rotulo: c.Rotulo }))
          };
          secoes.set(s.Chave, secao);
          doPasso.push(secao);
          if (s.Chave === 'acoes') {
            const tema = s.Campos.find(c => c.Chave === 'tema' && !c.Excluido);
            temas = (tema?.Opcoes ?? []).filter(o => o.Ativa).map(o => ({ valor: o.Valor, rotulo: o.Rotulo }));
          }
        }
        if (doPasso.length) gruposSecoes.push({ rotulo: passo.Titulo, secoes: doPasso });
      }
      if (passos.length) gruposPassos.push({ rotulo: etapa.Titulo, opcoes: passos });
    }
    // O inventário de IA do PGIA do órgão (seção "virtual", só leitura, sem passo próprio)
    const pgia: SecaoParaTabela = {
      chave: SECAO_PGIA,
      titulo: 'Sistemas de IA do inventário do PGIA',
      foraDoDocumento: false,
      campos: COLUNAS_PGIA
    };
    secoes.set(pgia.chave, pgia);
    gruposSecoes.push({ rotulo: 'Outras fontes', secoes: [pgia] });
    this.secoes = secoes;
    this.gruposSecoes = gruposSecoes;
    this.gruposPassos = gruposPassos;
    this.titulosPassos = titulosPassos;
    this.temas = temas;
  }

  /** O capítulo à vista existe; sem ele (ou sem escolha), o primeiro. */
  private garantirSelecao(): void {
    const capitulos = this.modelo?.Capitulos ?? [];
    if (!capitulos.length) {
      this.selecionadoId = null;
      return;
    }
    if (!capitulos.some(c => c.Id === this.selecionadoId)) this.selecionadoId = this.arvore[0]?.capitulo.Id ?? capitulos[0].Id;
  }

  // ── Leitura ───────────────────────────────────────────────────────────────

  get selecionado(): PeDocModeloCapitulo | null {
    return this.modelo?.Capitulos.find(c => c.Id === this.selecionadoId) ?? null;
  }

  /** O capítulo de cima do selecionado (no subcapítulo). */
  get paiDoSelecionado(): PeDocModeloCapitulo | null {
    const pai = this.selecionado?.PaiId;
    return pai ? this.modelo?.Capitulos.find(c => c.Id === pai) ?? null : null;
  }

  get totalCapitulos(): number {
    return this.modelo?.Capitulos.length ?? 0;
  }

  get totalTravados(): number {
    return this.modelo?.Capitulos.filter(c => c.Travado).length ?? 0;
  }

  numero(c: PeDocModeloCapitulo): string {
    return this.numeros.get(c.Id) ?? '';
  }

  blocos(c: PeDocModeloCapitulo): PeDocModeloBloco[] {
    return blocosEmOrdem(c.Blocos);
  }

  citacao(c: Pick<PeDocModeloCapitulo, 'IncisoDecreto'>): string {
    return citacaoTravado(c.IncisoDecreto);
  }

  tituloPasso(chave: string | null): string {
    if (!chave) return '';
    return this.titulosPassos.get(chave) ?? chave;
  }

  /** A chave do passo está na lista (senão a janela mostra a chave como veio, para não perder a escolha). */
  tituloPassoConhecido(chave: string): boolean {
    return this.titulosPassos.has(chave);
  }

  nomeTemaConhecido(valor: string): boolean {
    return this.temas.some(t => t.valor === valor);
  }

  fluxoConhecido(chave: string): boolean {
    return this.fluxos.some(f => f.valor === chave);
  }

  rotuloTipo(tipo: string): string {
    return rotuloTipoBloco(tipo);
  }

  explicacao(tipo: string): string {
    return explicacaoTipoBloco(tipo);
  }

  resumo(b: PeDocModeloBloco): string {
    return resumoBlocoModelo(b, this.nomes);
  }

  /** O filtro das linhas do bloco em edição, em palavras (vem do modelo da SGDI e continua como está). */
  get filtroDaEdicao(): string {
    const e = this.edicaoBloco;
    return e ? textoFiltroTabela(e.original.Filtro, e.secao, this.nomes) : '';
  }

  textoDoMarcador(m: PeDocMarcador): string {
    return textoMarcador(m.Chave);
  }

  deitada(b: PeDocModeloBloco): boolean {
    return !!b.Config?.PaginaDeitada;
  }

  textoPadrao(b: PeDocModeloBloco): unknown {
    return b.Config?.Texto ?? null;
  }

  porId(_: number, item: { Id: number }): number {
    return item.Id;
  }

  porRamo(_: number, ramo: RamoCapitulo): number {
    return ramo.capitulo.Id;
  }

  porChave(_: number, m: PeDocMarcador): string {
    return m.Chave;
  }

  secaoDaEdicao(): SecaoParaTabela | null {
    const e = this.edicaoBloco;
    return e?.secao ? this.secoes.get(e.secao) ?? null : null;
  }

  // ── Navegação na árvore ───────────────────────────────────────────────────

  selecionar(c: PeDocModeloCapitulo): void {
    if (c.Id === this.selecionadoId) {
      this.focoPendente = 'pe-md-capitulo-titulo';
      return;
    }
    if (this.edicaoBloco && this.blocoMudou() && !confirm('O bloco em edição tem mudanças que ainda não foram salvas. Trocar de capítulo assim mesmo? Elas vão se perder.')) {
      return;
    }
    this.edicaoBloco = null;
    this.errosBloco = [];
    this.selecionadoId = c.Id;
    this.focoPendente = 'pe-md-capitulo-titulo';
    this.router.navigate([], { relativeTo: this.rota, queryParams: { capitulo: c.Id }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  // ── Capítulo: janela de edição ────────────────────────────────────────────

  novoCapitulo(pai: PeDocModeloCapitulo | null): void {
    this.errosCapitulo = [];
    this.edicaoCapitulo = {
      novo: true, id: null, paiId: pai?.Id ?? null, titulo: '', numerado: true, obrigatorio: false, passoChave: '',
      travado: false, inciso: null
    };
  }

  editarCapitulo(c: PeDocModeloCapitulo): void {
    this.errosCapitulo = [];
    this.edicaoCapitulo = {
      novo: false, id: c.Id, paiId: c.PaiId, titulo: c.Titulo, numerado: c.Numerado, obrigatorio: c.Obrigatorio || c.Travado,
      passoChave: c.PassoChave ?? '', travado: c.Travado, inciso: c.IncisoDecreto
    };
  }

  get tituloJanelaCapitulo(): string {
    const e = this.edicaoCapitulo;
    if (!e) return '';
    if (!e.novo) return e.paiId ? 'Editar o subcapítulo' : 'Editar o capítulo';
    const pai = e.paiId ? this.modelo?.Capitulos.find(c => c.Id === e.paiId) : null;
    return pai ? `Novo subcapítulo de "${pai.Titulo}"` : 'Novo capítulo';
  }

  fecharCapitulo(): void {
    if (this.salvandoCapitulo) return;
    if (this.capituloMudou() && !confirm('Fechar sem salvar? As mudanças no capítulo vão se perder.')) return;
    this.edicaoCapitulo = null;
    this.errosCapitulo = [];
  }

  salvarCapitulo(): void {
    const e = this.edicaoCapitulo;
    const modelo = this.modelo;
    if (!e || !modelo || this.salvandoCapitulo) return;
    const titulo = e.titulo.trim();
    this.errosCapitulo = titulo ? [] : ['Escreva o título do capítulo.'];
    if (this.errosCapitulo.length) {
      this.focoPendente = 'pe-md-cap-erros';
      return;
    }
    const corpo = {
      Titulo: titulo,
      Numerado: e.numerado,
      Obrigatorio: e.travado || e.obrigatorio,
      PassoChave: e.passoChave || null
    };
    this.salvandoCapitulo = true;
    const pedido = e.novo
      ? this.documentoService.criarCapitulo({
        ...corpo,
        Tipo: modelo.Tipo || 'pdtic',
        PaiId: e.paiId,
        Chave: chaveNovaDeCapitulo(titulo, modelo.Capitulos.map(c => c.Chave))
      })
      : this.documentoService.atualizarCapitulo(e.id!, corpo);
    pedido.subscribe({
      next: salvo => {
        this.salvandoCapitulo = false;
        this.edicaoCapitulo = null;
        const texto = e.novo ? `Capítulo "${titulo}" criado.` : `Capítulo "${titulo}" salvo.`;
        this.notificacoes.success(texto);
        this.acessibilidade.anunciar(texto);
        const id = salvo?.Id ?? e.id;
        this.carregar(() => {
          if (id) this.selecionadoId = id;
          this.garantirSelecao();
          this.focoPendente = 'pe-md-capitulo-titulo';
        });
      },
      error: erro => {
        this.salvandoCapitulo = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível salvar o capítulo. Tente de novo.');
        if (mensagem === null) return;
        this.errosCapitulo = [mensagem];
        this.focoPendente = 'pe-md-cap-erros';
      }
    });
  }

  private capituloMudou(): boolean {
    const e = this.edicaoCapitulo;
    if (!e) return false;
    if (e.novo) return !!e.titulo.trim();
    const c = this.modelo?.Capitulos.find(x => x.Id === e.id);
    return !!c && (e.titulo.trim() !== c.Titulo || e.numerado !== c.Numerado
      || e.obrigatorio !== (c.Obrigatorio || c.Travado) || (e.passoChave || null) !== (c.PassoChave ?? null));
  }

  // ── Capítulo: ordem e apagar ──────────────────────────────────────────────

  irmaos(c: PeDocModeloCapitulo): PeDocModeloCapitulo[] {
    return capitulosDoModelo(this.modelo?.Capitulos ?? [], c.PaiId ?? null);
  }

  posicao(c: PeDocModeloCapitulo): number {
    return this.irmaos(c).findIndex(x => x.Id === c.Id);
  }

  moverCapitulo(c: PeDocModeloCapitulo, passo: -1 | 1): void {
    if (this.movendo) return;
    const irmaos = this.irmaos(c);
    const i = irmaos.findIndex(x => x.Id === c.Id);
    const j = i + passo;
    if (i < 0 || j < 0 || j >= irmaos.length) return;
    [irmaos[i], irmaos[j]] = [irmaos[j], irmaos[i]];
    this.movendo = true;
    this.documentoService.ordenarCapitulos(irmaos.map(x => x.Id)).subscribe({
      next: () => {
        this.movendo = false;
        this.acessibilidade.anunciar(`"${c.Titulo}" agora está na posição ${j + 1} de ${irmaos.length}.`);
        this.carregar(() => {
          // O foco fica no mesmo botão (ou no outro, quando este desliga na ponta)
          const ponta = passo < 0 ? j === 0 : j === irmaos.length - 1;
          this.focoPendente = `pe-md-cap-${ponta ? (passo < 0 ? 'descer' : 'subir') : (passo < 0 ? 'subir' : 'descer')}-${c.Id}`;
        });
      },
      error: erro => {
        this.movendo = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível mudar a ordem. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  podeApagar(c: PeDocModeloCapitulo): boolean {
    return !c.Sistema && !c.Travado;
  }

  apagarCapitulo(c: PeDocModeloCapitulo): void {
    if (this.apagando || !this.podeApagar(c)) return;
    const filhos = capitulosDoModelo(this.modelo?.Capitulos ?? [], c.Id).length;
    const aviso = `Apagar o capítulo "${c.Titulo}"? Ele sai do documento de todos os órgãos`
      + (filhos ? `, com os ${filhos === 1 ? 'um subcapítulo' : filhos + ' subcapítulos'} dele` : '')
      + '. A mudança vale na hora e fica no histórico do modelo.';
    if (!confirm(aviso)) return;
    this.apagando = true;
    this.documentoService.apagarCapitulo(c.Id).subscribe({
      next: () => {
        this.apagando = false;
        const texto = `Capítulo "${c.Titulo}" apagado.`;
        this.notificacoes.success(texto);
        this.acessibilidade.anunciar(texto);
        this.selecionadoId = c.PaiId;
        this.edicaoBloco = null;
        this.carregar(() => {
          this.garantirSelecao();
          this.focoPendente = 'pe-md-capitulo-titulo';
        });
      },
      error: erro => {
        this.apagando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível apagar o capítulo. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  // ── Blocos ────────────────────────────────────────────────────────────────

  novoBloco(c: PeDocModeloCapitulo): void {
    if (this.edicaoBloco && this.blocoMudou() && !confirm('O bloco em edição tem mudanças que ainda não foram salvas. Descartar?')) return;
    const tipo = this.tipoNovo;
    this.errosBloco = [];
    this.edicaoBloco = this.edicaoDe(c.Id, null, tipo, {});
    this.focoPendente = this.primeiroCampo(tipo);
  }

  editarBloco(c: PeDocModeloCapitulo, b: PeDocModeloBloco): void {
    if (this.edicaoBloco?.id === b.Id) return;
    if (this.edicaoBloco && this.blocoMudou() && !confirm('O bloco em edição tem mudanças que ainda não foram salvas. Descartar?')) return;
    this.errosBloco = [];
    this.edicaoBloco = this.edicaoDe(c.Id, b.Id, b.Tipo, b.Config ?? {});
    this.focoPendente = this.primeiroCampo(b.Tipo);
  }

  /** O primeiro campo do formulário do bloco (no texto, o editor põe o cursor sozinho). */
  private primeiroCampo(tipo: PeTipoBlocoDoc): string | null {
    switch (tipo) {
      case 'texto': return null;
      case 'tabela_secao': return 'pe-md-secao';
      case 'lista_tema': return 'pe-md-tema';
      case 'fluxo': return 'pe-md-fluxo';
      case 'quebra_pagina': return 'pe-md-bloco-salvar';
      default: return 'pe-md-deitada';
    }
  }

  private edicaoDe(capituloId: number, id: number | null, tipo: PeTipoBlocoDoc, config: PeDocConfigBloco): EdicaoBloco {
    const texto = normalizarDocumento(config.Texto ?? null);
    const colunas = Array.isArray(config.Colunas) ? config.Colunas.filter((c): c is string => typeof c === 'string') : null;
    const e: EdicaoBloco = {
      novo: id === null,
      id,
      capituloId,
      tipo,
      texto,
      rascunho: texto,
      secao: typeof config.Secao === 'string' ? config.Secao : '',
      todasColunas: !colunas || colunas.length === 0,
      colunas: colunas ?? [],
      tema: typeof config.Tema === 'string' ? config.Tema : '',
      fluxo: typeof config.Fluxo === 'string' ? config.Fluxo : '',
      paginaDeitada: !!config.PaginaDeitada,
      original: { ...config },
      retrato: ''
    };
    e.retrato = JSON.stringify(this.configDe(e));
    return e;
  }

  cancelarBloco(): void {
    const e = this.edicaoBloco;
    if (!e || this.salvandoBloco) return;
    if (this.blocoMudou() && !confirm('Descartar as mudanças do bloco?')) return;
    this.edicaoBloco = null;
    this.errosBloco = [];
    this.focoPendente = e.id ? `pe-md-bloco-editar-${e.id}` : 'pe-md-novo-tipo';
  }

  aoMudarTextoPadrao(doc: PeDocTextoRico | null): void {
    if (this.edicaoBloco) this.edicaoBloco.rascunho = doc;
  }

  trocarSecao(chave: string): void {
    const e = this.edicaoBloco;
    if (!e) return;
    e.secao = chave;
    // As colunas escolhidas e o filtro eram da outra seção
    e.colunas = [];
    e.todasColunas = true;
    delete e.original.Filtro;
  }

  colunaMarcada(chave: string): boolean {
    return !!this.edicaoBloco?.colunas.includes(chave);
  }

  alternarColuna(chave: string, evento: Event): void {
    const e = this.edicaoBloco;
    if (!e) return;
    const marcada = (evento.target as HTMLInputElement).checked;
    const campos = this.secaoDaEdicao()?.campos.map(c => c.valor) ?? [];
    const escolhidas = new Set(e.colunas);
    if (marcada) escolhidas.add(chave);
    else escolhidas.delete(chave);
    // Na ordem dos campos da seção
    e.colunas = [...campos.filter(c => escolhidas.has(c)), ...[...escolhidas].filter(c => !campos.includes(c))];
  }

  /** A configuração do bloco como vai para o servidor (as chaves desconhecidas preservadas). */
  private configDe(e: EdicaoBloco): PeDocConfigBloco {
    const config: PeDocConfigBloco = { ...e.original };
    delete config.Texto;
    delete config.Secao;
    delete config.Colunas;
    delete config.Tema;
    delete config.Fluxo;
    if (e.tipo === 'texto') config.Texto = docParaEnvio(e.rascunho);
    if (e.tipo === 'tabela_secao') {
      config.Secao = e.secao || null;
      config.Colunas = e.todasColunas || e.colunas.length === 0 ? null : [...e.colunas];
    }
    if (e.tipo === 'lista_tema') config.Tema = e.tema || null;
    if (e.tipo === 'fluxo') config.Fluxo = e.fluxo.trim() || null;
    config.PaginaDeitada = e.tipo !== 'quebra_pagina' && e.paginaDeitada;
    return config;
  }

  blocoMudou(): boolean {
    const e = this.edicaoBloco;
    return !!e && JSON.stringify(this.configDe(e)) !== e.retrato;
  }

  private temMudanca(): boolean {
    return this.blocoMudou() || this.capituloMudou();
  }

  private errosDoBloco(e: EdicaoBloco): string[] {
    switch (e.tipo) {
      case 'texto': return docVazio(normalizarDocumento(e.rascunho)) ? ['Escreva o texto padrão.'] : [];
      case 'tabela_secao': {
        if (!e.secao) return ['Escolha a seção da tabela.'];
        return !e.todasColunas && e.colunas.length === 0 ? ['Escolha ao menos uma coluna, ou use todas as colunas da planilha.'] : [];
      }
      case 'lista_tema': return e.tema ? [] : ['Escolha o tema das ações.'];
      case 'fluxo': return e.fluxo.trim() ? [] : [this.fluxos.length ? 'Escolha o fluxo.' : 'Escreva a chave do fluxo.'];
      default: return [];
    }
  }

  salvarBloco(): void {
    const e = this.edicaoBloco;
    if (!e || this.salvandoBloco) return;
    this.errosBloco = this.errosDoBloco(e);
    if (this.errosBloco.length) {
      this.focoPendente = 'pe-md-bloco-erros';
      return;
    }
    const config = this.configDe(e);
    this.salvandoBloco = true;
    const pedido = e.novo
      ? this.documentoService.criarBloco({ CapituloId: e.capituloId, Tipo: e.tipo, Config: config })
      : this.documentoService.atualizarBloco(e.id!, { Config: config });
    pedido.subscribe({
      next: salvo => {
        this.salvandoBloco = false;
        this.edicaoBloco = null;
        this.errosBloco = [];
        const texto = e.novo ? `Bloco "${rotuloTipoBloco(e.tipo)}" incluído.` : `Bloco "${rotuloTipoBloco(e.tipo)}" salvo.`;
        this.notificacoes.success(texto);
        this.acessibilidade.anunciar(texto);
        const id = salvo?.Id ?? e.id;
        this.carregar(() => {
          this.focoPendente = id ? `pe-md-bloco-editar-${id}` : 'pe-md-capitulo-titulo';
        });
      },
      error: erro => {
        this.salvandoBloco = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível salvar o bloco. Tente de novo.');
        if (mensagem === null) return;
        this.errosBloco = [mensagem];
        this.focoPendente = 'pe-md-bloco-erros';
      }
    });
  }

  moverBloco(c: PeDocModeloCapitulo, b: PeDocModeloBloco, passo: -1 | 1): void {
    if (this.movendo || this.edicaoBloco) return;
    const lista = this.blocos(c);
    const i = lista.findIndex(x => x.Id === b.Id);
    const j = i + passo;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    this.movendo = true;
    this.documentoService.ordenarBlocos(lista.map(x => x.Id)).subscribe({
      next: () => {
        this.movendo = false;
        this.acessibilidade.anunciar(`O bloco agora é o ${j + 1}º de ${lista.length}.`);
        this.carregar(() => {
          const ponta = passo < 0 ? j === 0 : j === lista.length - 1;
          this.focoPendente = `pe-md-bloco-${ponta ? (passo < 0 ? 'descer' : 'subir') : (passo < 0 ? 'subir' : 'descer')}-${b.Id}`;
        });
      },
      error: erro => {
        this.movendo = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível mudar a ordem dos blocos. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  apagarBloco(b: PeDocModeloBloco): void {
    if (this.apagando || this.edicaoBloco) return;
    const aviso = b.Tipo === 'texto'
      ? 'Apagar este bloco de texto? Ele sai do documento de todos os órgãos, inclusive dos que editaram a cópia deles.'
      : `Apagar o bloco "${rotuloTipoBloco(b.Tipo)}"? Ele sai do documento de todos os órgãos (os dados continuam nos passos).`;
    if (!confirm(`${aviso} A mudança vale na hora e fica no histórico do modelo.`)) return;
    this.apagando = true;
    this.documentoService.apagarBloco(b.Id).subscribe({
      next: () => {
        this.apagando = false;
        const texto = 'Bloco apagado.';
        this.notificacoes.success(texto);
        this.acessibilidade.anunciar(texto);
        this.carregar(() => {
          this.focoPendente = 'pe-md-capitulo-titulo';
        });
      },
      error: erro => {
        this.apagando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível apagar o bloco. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }
}
