import {
  AfterViewChecked, AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, PLATFORM_ID,
  SimpleChanges, ViewChild, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PeFluxoDefinicao, PeFluxoElemento, PeFluxoGeometria, PeTipoElementoFluxo } from '../../../api/planejamento/interface';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import {
  AlvoFluxo, ArrastoFluxo, PontoFluxo, SolturaFluxo, VistaBloco, VistaFluxo, VistaLigacao, VistaRaia, alvoDoArrasto,
  montarVista, normalizarGeometria, ordemDasLigacoes
} from '../shared/pe-fluxo-geometria';
import {
  MAX_NOME_ELEMENTO, MAX_ROTULO_SAIDA, aceitaPassoDepois, definicaoParaEnvio, incluirElemento, incluirLigacao, incluirPassoDepois,
  inserirNaLigacao, lerErroFluxo, moverParaLigacao, moverParaRaia, mudarRotuloLigacao, ordemDoFluxo, raiasEmOrdem,
  renomearElemento, rotuloNomeElemento, rotuloSugeridoSaida, rotuloTipoElemento, tipoEntraNaSeta, tipoNumerado, tipoPedeNome
} from '../shared/pe-fluxo-rotulos';
import { juntar } from '../shared/pe-modelo-rotulos';
import { acertarRolagemSobCabecalho, alturaDoPePreso } from '../shared/pe-rolagem';
import { PeFluxoTrabalho, PeSelecaoFluxo, PeSelecionarFluxo, idNaTela } from './pe-fluxo-trabalho';

/** Espera depois da última mudança antes de pedir a geometria de novo (a mudança seguinte cancela o pedido). */
const ESPERA_GEOMETRIA_MS = 150;
/** Quanto o ponteiro anda antes de virar arrasto (menos que isso é um clique; o dedo treme mais). */
const LIMIAR_ARRASTO_PX = 6;
const LIMIAR_ARRASTO_TOQUE_PX = 10;
/** Distância da seta, na tela, que ainda conta como "sobre a seta". */
const TOLERANCIA_SETA_PX = 10;
const ZOOMS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
/**
 * Rolagem na borda durante o arrasto (F1, D04 e D09): a faixa perto da borda da área
 * do desenho, a velocidade máxima por passo e o intervalo entre os passos. A rolagem
 * continua com o ponteiro parado perto da borda, mas só depois de o ponteiro estar
 * dentro da área por um tempo: quem entra vindo da paleta não empurra o desenho.
 */
const BORDA_ROLAGEM_PX = 40;
const VELOCIDADE_BORDA_PX = 16;
const PASSO_BORDA_MS = 30;
const ESPERA_BORDA_MS = 300;
/** Folga em volta do bloco (e do campo do nome) ao rolar até ele. */
const FOLGA_VISTA_PX = 24;

/** A paleta, na ordem da especificação. */
const TIPOS_PALETA: readonly PeTipoElementoFluxo[] = ['tarefa', 'subprocesso', 'decisao', 'paralelo', 'inicio', 'fim', 'ligacao'];
const FEMININOS: ReadonlySet<string> = new Set(['tarefa', 'decisao', 'ligacao']);

interface EstadoArrasto {
  tipo: ArrastoFluxo;
  pointerId: number;
  /** No toque, o que vai acontecer aparece acima do dedo (o dedo cobre o que está embaixo). */
  toque: boolean;
  inicioX: number;
  inicioY: number;
  ativo: boolean;
  /** O que se arrasta, como o fantasma mostra ("Tarefa", "2.3 Descrever..."). */
  rotulo: string;
  forma: PeTipoElementoFluxo;
  ponto: PontoFluxo | null;
}

interface DestinoClique {
  acao: 'depois' | 'fim-depois' | 'seta' | 'raia';
  id: string;
  texto: string;
}

/**
 * Editor visual dos fluxos (E9), o modo de edição padrão: a paleta de blocos e o
 * desenho interativo (SVG com texto de verdade), desenhado pela geometria que o
 * servidor devolve (a mesma do SVG da prévia e do PDF).
 *
 * - Arrastar da paleta para uma raia (o bloco entra no fim dela, ainda sem
 *   ligação) ou para cima de uma seta (entra entre os dois passos); arrastar um
 *   bloco para outra raia (mantém as ligações) ou para cima de uma seta (sai de
 *   onde estava, religando, e entra entre os dois); ligar pela alça da direita
 *   (a saída de decisão pede o rótulo ali mesmo). Tudo com pointer events: mouse,
 *   toque e caneta. Durante o arrasto, o destino fica realçado e um texto diz o
 *   que vai acontecer.
 * - Clique seleciona (o painel do item fica com o editor); duplo clique (ou F2)
 *   renomeia ali mesmo; Delete remove (com a regra de religar da E6).
 * - Zoom (botões, Ctrl + roda do mouse, + e -), arrastar o fundo para mover e
 *   "Caber na tela".
 * - Cada mudança pede a geometria de novo (150 ms depois, cancelando o pedido
 *   anterior); enquanto ela não chega, a mudança aparece de forma provisória (o
 *   bloco no ponto onde foi solto, as setas novas retas). Os blocos vão para o
 *   lugar novo com uma transição curta (nenhuma com "Reduzir animações").
 * - Teclado (o arrastar nunca é o único caminho): Tab entra nos blocos, as setas
 *   do teclado andam entre eles pela ordem do fluxo, Enter abre o painel (com as
 *   alternativas de um clique), Delete remove, F2 renomeia; as setas (ligações) e
 *   as raias também recebem o foco. Os avisos vão para a região viva do site.
 *
 * O estado (a definição, o "Desfazer", o salvar e os problemas) é do editor, pelo
 * `PeFluxoTrabalho`: este componente só pede mudanças, com as mesmas funções do
 * modo em lista.
 */
@Component({
  selector: 'app-pe-fluxo-visual',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pe-fluxo-visual.component.html',
  styleUrl: './pe-fluxo-visual.component.css',
  host: { class: 'block' }
})
export class PeFluxoVisualComponent implements OnChanges, AfterViewInit, AfterViewChecked, OnDestroy {
  private readonly trabalho = inject(PeFluxoTrabalho);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly zone = inject(NgZone);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** A cópia de trabalho do editor (muda no lugar; `versao` avisa cada mudança). */
  @Input({ required: true }) def!: PeFluxoDefinicao;
  @Input() versao = 0;
  /** O fluxo à vista (outro fluxo: o desenho começa de novo). */
  @Input() chave: string | null = null;
  @Input() nomeFluxo = '';
  @Input() selecao: PeSelecaoFluxo | null = null;
  @Output() readonly selecionar = new EventEmitter<PeSelecionarFluxo>();

  @ViewChild('rolagem') private rolagem?: ElementRef<HTMLElement>;
  @ViewChild('desenho') private desenho?: ElementRef<SVGSVGElement>;
  @ViewChild('fantasma') private fantasma?: ElementRef<HTMLElement>;
  @ViewChild('linhaLigar') private linhaLigar?: ElementRef<SVGLineElement>;

  readonly paleta = TIPOS_PALETA;
  readonly maxNome = MAX_NOME_ELEMENTO;
  readonly maxRotulo = MAX_ROTULO_SAIDA;
  readonly idAjuda = 'pe-fxv-ajuda';
  readonly idAjudaBloco = 'pe-fxv-ajuda-bloco';

  // ── Desenho ───────────────────────────────────────────────────────────────
  vista: VistaFluxo | null = null;
  private geo: PeFluxoGeometria | null = null;
  /** O que a geometria à vista desenhou (o nome do fluxo e a definição) e o que está sendo pedido. */
  private geoChave = '';
  private pedidoChave = '';
  /** carregando: ainda sem desenho · esperando: mudou, o pedido sai em instantes · atualizando · ok · erro. */
  estado: 'carregando' | 'esperando' | 'atualizando' | 'ok' | 'erro' = 'carregando';
  erro: string | null = null;
  animar = false;
  zoom = 1;
  private readonly provisorios = new Map<string, PontoFluxo>();
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private temporizadorAnimar: ReturnType<typeof setTimeout> | null = null;
  private pedido?: Subscription;
  private chaveAtual: string | null = null;
  private defAtual: PeFluxoDefinicao | null = null;

  // ── Teclado e foco (um bloco e uma seta com tabindex 0 de cada vez) ───────
  ordem: string[] = [];
  setas: VistaLigacao[] = [];
  focoBloco: string | null = null;
  focoSeta: string | null = null;
  sobre: string | null = null;
  private nomes = new Map<string, string>();
  private nomesSetas = new Map<string, string>();
  private focoPendente: string | null = null;
  private rolagemPendente: { left: number; top: number } | null = null;
  /** O bloco da última mudança feita no desenho: quando a geometria chega, ele fica à vista. */
  private acompanhar: string | null = null;
  private visivelPendente: string | null = null;

  // ── Arrasto ───────────────────────────────────────────────────────────────
  arrasto: EstadoArrasto | null = null;
  alvo: AlvoFluxo | null = null;
  movendo = false;
  /** A linha tracejada da alça até o ponteiro (o começo; a ponta segue o ponteiro). */
  linha: { x1: number; y1: number } | null = null;
  private pararDeEscutar: (() => void) | null = null;
  private ignorarCliqueAte = 0;
  /** O último ponto do ponteiro no arrasto, desde quando ele está dentro da área, e o temporizador da rolagem na borda. */
  private ultimoPonteiro: { x: number; y: number } | null = null;
  private dentroDesde: number | null = null;
  private rolagemBorda: ReturnType<typeof setInterval> | null = null;
  private acumuladoRoda = 0;
  private tirarRoda: (() => void) | null = null;

  // ── Edição ali mesmo ──────────────────────────────────────────────────────
  edicaoNome: { id: string; valor: string } | null = null;
  edicaoRotulo: { id: string; valor: string; decisao: string } | null = null;
  /** Depois do nome, pedir o rótulo desta saída (decisão nova no meio de um caminho). */
  private rotuloDepoisDoNome: string | null = null;

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['chave'] && this.chave !== this.chaveAtual) {
      this.chaveAtual = this.chave;
      this.recomecar();
    }
    if (mudancas['def'] && this.def !== this.defAtual) {
      // Outra definição (abriu, desfez, descartou, salvou): as posições provisórias não valem mais
      this.defAtual = this.def;
      this.provisorios.clear();
      this.edicaoNome = null;
      this.edicaoRotulo = null;
    }
    if (mudancas['selecao'] && this.selecao) {
      if (this.selecao.tipo === 'elemento') this.focoBloco = this.selecao.id;
      if (this.selecao.tipo === 'ligacao') this.focoSeta = this.selecao.id;
    }
    if (mudancas['def'] || mudancas['versao'] || mudancas['chave']) {
      this.montar();
      this.agendar(!this.geo);
    }
  }

  ngAfterViewInit(): void {
    const rolagem = this.rolagem?.nativeElement;
    if (!this.noNavegador || !rolagem) return;
    // Ctrl + roda do mouse: zoom em volta do ponteiro (o ouvinte não é passivo, para segurar a rolagem da página)
    this.zone.runOutsideAngular(() => {
      const aoRodar = (evento: WheelEvent) => {
        if (!evento.ctrlKey && !evento.metaKey) return;
        evento.preventDefault();
        this.acumuladoRoda += evento.deltaY;
        if (Math.abs(this.acumuladoRoda) < 40) return;
        const aproximar = this.acumuladoRoda < 0;
        this.acumuladoRoda = 0;
        this.zone.run(() => this.passoDeZoom(aproximar ? 1 : -1, evento.clientX, evento.clientY));
      };
      rolagem.addEventListener('wheel', aoRodar, { passive: false });
      this.tirarRoda = () => rolagem.removeEventListener('wheel', aoRodar);
    });
  }

  ngAfterViewChecked(): void {
    if (!this.noNavegador) return;
    if (this.rolagemPendente && this.rolagem) {
      const r = this.rolagemPendente;
      this.rolagemPendente = null;
      this.rolagem.nativeElement.scrollLeft = r.left;
      this.rolagem.nativeElement.scrollTop = r.top;
    }
    if (this.visivelPendente) {
      // O bloco foi para o lugar da geometria (às vezes fora da área à vista): rola o mínimo para mostrá-lo
      const id = this.visivelPendente;
      this.visivelPendente = null;
      this.mostrarNaArea(id);
    }
    if (this.focoPendente) {
      const alvo = document.getElementById(this.focoPendente);
      if (!alvo) return;
      this.focoPendente = null;
      alvo.focus();
      if (alvo instanceof HTMLInputElement) alvo.select();
    }
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    if (this.temporizadorAnimar) clearTimeout(this.temporizadorAnimar);
    this.pararRolagemNaBorda();
    this.pedido?.unsubscribe();
    this.pararDeEscutar?.();
    this.tirarRoda?.();
  }

  // ── Geometria (pedida a cada mudança, com espera curta) ───────────────────

  private recomecar(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    this.pedido?.unsubscribe();
    this.geo = null;
    this.geoChave = '';
    this.pedidoChave = '';
    this.vista = null;
    this.estado = 'carregando';
    this.erro = null;
    this.provisorios.clear();
    this.focoBloco = null;
    this.focoSeta = null;
    this.edicaoNome = null;
    this.edicaoRotulo = null;
    this.zoom = 1;
    this.rolagemPendente = { left: 0, top: 0 };
  }

  /** A chave de um pedido: o nome do fluxo (a faixa do fluxo) e a definição como vai para a API. */
  private chaveDoPedido(envio: PeFluxoDefinicao): string {
    return JSON.stringify([this.trabalho.nome.trim(), envio]);
  }

  private agendar(imediato = false): void {
    if (!this.noNavegador || !this.def) return;
    const envio = definicaoParaEnvio(this.def);
    const chave = this.chaveDoPedido(envio);
    if (chave === this.geoChave && this.estado !== 'erro') {
      // Nada mudou no que se desenha (ou voltou a ele pelo "Desfazer"): nada a pedir
      if (this.temporizador) clearTimeout(this.temporizador);
      this.temporizador = null;
      this.pedido?.unsubscribe();
      this.estado = 'ok';
      return;
    }
    if (chave === this.pedidoChave && this.pedido && !this.pedido.closed) return;
    if (this.temporizador) clearTimeout(this.temporizador);
    this.pedido?.unsubscribe();
    this.pedidoChave = '';
    if (this.geo) this.estado = 'esperando';
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      this.pedir(envio, chave);
    }, imediato ? 0 : ESPERA_GEOMETRIA_MS);
  }

  private pedir(envio: PeFluxoDefinicao, chave: string): void {
    this.pedidoChave = chave;
    if (this.geo) this.estado = 'atualizando';
    const retrato = JSON.stringify(envio);
    this.pedido = this.trabalho.fonte.geometria(envio, this.trabalho.nome.trim() || null).subscribe({
      next: bruta => {
        const primeira = !this.geo;
        this.geo = normalizarGeometria(bruta);
        this.geoChave = chave;
        this.pedidoChave = '';
        this.estado = 'ok';
        this.erro = null;
        if (!primeira) this.animarTransicao();
        // A pessoa mudou algo antes de a resposta chegar: o provisório continua até a próxima
        if (retrato === JSON.stringify(definicaoParaEnvio(this.def))) {
          this.provisorios.clear();
          this.visivelPendente = this.acompanhar;
          this.acompanhar = null;
          // Os problemas e os números do servidor: o editor refaz os rótulos (e avisa de novo por `versao`)
          this.trabalho.receberGeometria(retrato, this.geo.Erros, this.geo.Numeros);
        }
        this.montar();
      },
      error: erro => {
        this.pedidoChave = '';
        const lido = lerErroFluxo(erro);
        // 403: o interceptor já tirou a pessoa do módulo
        if (lido.status === 403) return;
        this.estado = 'erro';
        this.erro = lido.status === 400
          ? (lido.mensagem ?? 'Não foi possível ler este fluxo.')
          : 'Não foi possível atualizar o desenho agora. Confira a conexão e tente de novo, ou use o modo em lista.';
      }
    });
  }

  tentarDeNovo(): void {
    this.geoChave = '';
    this.estado = this.geo ? 'esperando' : 'carregando';
    this.agendar(true);
  }

  private animarTransicao(): void {
    this.animar = true;
    if (this.temporizadorAnimar) clearTimeout(this.temporizadorAnimar);
    this.temporizadorAnimar = setTimeout(() => {
      this.temporizadorAnimar = null;
      this.animar = false;
    }, 400);
  }

  /** Refaz a vista, a ordem do teclado e os nomes para o leitor de tela. */
  private montar(): void {
    if (!this.def) return;
    this.vista = this.geo
      ? montarVista(this.def, this.geo, { dicionario: this.trabalho.dicionario, numeros: this.trabalho.numeros, provisorios: this.provisorios })
      : null;
    const vista = this.vista;
    if (!vista) {
      this.ordem = [];
      this.setas = [];
      return;
    }
    const existentes = new Set(vista.blocos.map(b => b.id));
    this.ordem = ordemDoFluxo(this.def).ordem.map(e => e.Id).filter(id => existentes.has(id));
    this.setas = ordemDasLigacoes(vista.ligacoes, this.ordem);
    const selecionado = this.selecao?.tipo === 'elemento' && existentes.has(this.selecao.id) ? this.selecao.id : null;
    if (!this.focoBloco || !existentes.has(this.focoBloco)) this.focoBloco = selecionado ?? this.ordem[0] ?? null;
    if (!this.focoSeta || !this.setas.some(l => l.id === this.focoSeta)) this.focoSeta = this.setas[0]?.id ?? null;

    // Os nomes para o leitor de tela ("Tarefa 2.3 Descrever..., raia Equipe, depois de 2.2")
    const entradas = new Map<string, string[]>();
    for (const l of vista.ligacoes) entradas.set(l.para, [...(entradas.get(l.para) ?? []), l.de]);
    this.nomes = new Map(vista.blocos.map(b => {
      const antes = (entradas.get(b.id) ?? []).map(id => this.curto(id));
      const rotulo = this.trabalho.rotuloPorId(b.id);
      const tipo = rotuloTipoElemento(b.tipo);
      // Sem repetir o tipo ("Tarefa sem nome...") nem a raia, quando o rótulo já a diz ("Fim, o 2º da raia Equipe"; F2)
      const principal = tipoNumerado(b.tipo) && !rotulo.startsWith(tipo) ? `${tipo} ${rotulo}` : rotulo;
      const nomeRaia = this.trabalho.nomeRaiaPorId(b.raiaId);
      const raia = rotulo.includes(`da raia ${nomeRaia}`) || /da \d+ª raia/.test(rotulo) ? '' : `, raia ${nomeRaia}`;
      const depois = b.tipo !== 'inicio' && antes.length ? `, depois de ${juntar(antes)}` : '';
      return [b.id, `${principal}${raia}${depois}${b.solto ? ', sem ligação' : ''}`];
    }));
    this.nomesSetas = new Map(vista.ligacoes.map(l => [
      l.id,
      `Seta de ${this.curto(l.de)} para ${this.curto(l.para)}${l.rotulo ? `, saída "${l.rotulo}"` : ''}${l.retorno ? ', volta a um passo anterior' : ''}`
    ]));
  }

  /**
   * Rola a área do desenho até o bloco pela posição que a geometria deu (F1, D02): o
   * bloco pode estar ainda no meio da transição, no lugar antigo, e rolar até o
   * elemento não mostraria o lugar novo. Com o campo do nome aberto nele, o campo
   * inteiro fica à vista, também na página (no celular, fora do pé preso da tela).
   */
  private mostrarNaArea(id: string): void {
    const rolagem = this.rolagem?.nativeElement;
    const b = this.blocoPorId(id);
    if (!rolagem || !b || !this.noNavegador) return;
    const z = this.zoom;
    const esquerda = b.x * z;
    let direita = (b.x + b.largura) * z;
    let topo = b.y * z;
    let baixo = (b.y + b.altura) * z;
    const comNome = this.edicaoNome?.id === id;
    if (comNome) {
      // O campo: a partir da esquerda do bloco, com 200 px ou mais, na altura do meio dele (como no molde)
      const topoCampo = (b.y + b.altura / 2) * z - 18;
      direita = Math.max(direita, esquerda + Math.max(b.largura * z, 200));
      topo = Math.min(topo, topoCampo);
      baixo = Math.max(baixo, topoCampo + 40);
    }
    let left = rolagem.scrollLeft;
    let top = rolagem.scrollTop;
    if (direita + FOLGA_VISTA_PX > left + rolagem.clientWidth) left = direita + FOLGA_VISTA_PX - rolagem.clientWidth;
    if (esquerda - FOLGA_VISTA_PX < left) left = Math.max(0, esquerda - FOLGA_VISTA_PX);
    if (baixo + FOLGA_VISTA_PX > top + rolagem.clientHeight) top = baixo + FOLGA_VISTA_PX - rolagem.clientHeight;
    if (topo - FOLGA_VISTA_PX < top) top = Math.max(0, topo - FOLGA_VISTA_PX);
    rolagem.scrollLeft = left;
    rolagem.scrollTop = top;
    const campo = comNome ? document.getElementById('pe-fxv-nome')?.closest('form') ?? null : null;
    if (!campo) return;
    campo.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // A página rolou até o campo: nenhuma linha da paleta (nem outro botão acima) fica cortada pela borda do
    // cabeçalho preso da tela (F2, A-N03 e D-O3)
    acertarRolagemSobCabecalho(rolagem.closest('app-pe-fluxo-editor') ?? rolagem, campo, alturaDoPePreso(), '.pe-fxv-rolagem');
  }

  // ── Consultas do modelo ───────────────────────────────────────────────────

  get podeEditar(): boolean {
    return this.trabalho.podeEditar;
  }

  get larguraTela(): number {
    return Math.max(1, Math.round((this.vista?.largura ?? 0) * this.zoom));
  }

  get alturaTela(): number {
    return Math.max(1, Math.round((this.vista?.altura ?? 0) * this.zoom));
  }

  get textoZoom(): string {
    return `${Math.round(this.zoom * 100)}%`;
  }

  get textoEstado(): string {
    switch (this.estado) {
      case 'carregando': return 'Montando o desenho...';
      case 'esperando':
      case 'atualizando': return 'Arrumando o desenho...';
      default: return '';
    }
  }

  get semRaias(): boolean {
    return !this.def?.Raias.length;
  }

  get rotuloGrupoBlocos(): string {
    return `Blocos do fluxo, na ordem do fluxo (${this.ordem.length})`;
  }

  get rotuloGrupoSetas(): string {
    return `Setas (ligações) do fluxo (${this.setas.length})`;
  }

  porId(_: number, item: { id: string }): string {
    return item.id;
  }

  porTipo(_: number, tipo: string): string {
    return tipo;
  }

  porIndice(i: number): number {
    return i;
  }

  rotuloTipo(tipo: string): string {
    return rotuloTipoElemento(tipo);
  }

  idBloco(id: string): string {
    return idNaTela('e', id, 'bloco');
  }

  idSeta(id: string): string {
    return idNaTela('l', id, 'seta');
  }

  idRaia(id: string): string {
    return idNaTela('r', id, 'cabecalho');
  }

  nomeBloco(b: VistaBloco): string {
    return this.nomes.get(b.id) ?? this.trabalho.rotuloPorId(b.id);
  }

  nomeSeta(l: VistaLigacao): string {
    return this.nomesSetas.get(l.id) ?? 'Seta';
  }

  nomeRaia(r: VistaRaia): string {
    return `Raia ${r.posicao} de ${this.vista?.raias.length ?? 0}: ${r.nome}. Ações da raia no painel`;
  }

  selecionado(b: VistaBloco): boolean {
    return this.selecao?.tipo === 'elemento' && this.selecao.id === b.id;
  }

  setaSelecionada(l: VistaLigacao): boolean {
    return this.selecao?.tipo === 'ligacao' && this.selecao.id === l.id;
  }

  raiaSelecionada(r: VistaRaia): boolean {
    return this.selecao?.tipo === 'raia' && this.selecao.id === r.id;
  }

  arrastado(b: VistaBloco): boolean {
    return !!this.arrasto?.ativo && this.arrasto.tipo.origem === 'bloco' && this.arrasto.tipo.id === b.id;
  }

  mostraAlca(b: VistaBloco): boolean {
    return this.podeEditar && b.tipo !== 'fim' && !this.arrasto?.ativo && (this.sobre === b.id || this.selecionado(b));
  }

  /** O raio da área de toque da alça: 12 px na tela, em qualquer zoom. */
  get raioAlca(): number {
    return 12 / this.zoom;
  }

  blocoPorId(id: string): VistaBloco | null {
    return this.vista?.blocos.find(b => b.id === id) ?? null;
  }

  setaPorId(id: string): VistaLigacao | null {
    return this.vista?.ligacoes.find(l => l.id === id) ?? null;
  }

  /** Referência curta a um elemento: o número, quando tem ("2.3"); senão o rótulo ("Decisão: Minuta aprovada?"). */
  private curto(id: string): string {
    const e = this.def?.Elementos.find(x => x.Id === id);
    if (!e) return 'um passo que não existe mais';
    const numero = tipoNumerado(e.Tipo) ? this.trabalho.numeros.get(id) : undefined;
    if (numero) return numero;
    const rotulo = this.trabalho.rotuloPorId(id);
    return rotulo.length > 48 ? `${rotulo.slice(0, 46).trimEnd()}…` : rotulo;
  }

  // ── Formas (caminhos relativos ao canto do bloco) ─────────────────────────

  losango(b: VistaBloco): string {
    const cx = b.largura / 2;
    const cy = b.altura / 2;
    return `M${cx} 0L${b.largura} ${cy}L${cx} ${b.altura}L0 ${cy}Z`;
  }

  marcaPorta(b: VistaBloco): string {
    const cx = b.largura / 2;
    const cy = b.altura / 2;
    const m = 7.5;
    return b.tipo === 'paralelo'
      ? `M${cx} ${cy - m - 1}L${cx} ${cy + m + 1}M${cx - m - 1} ${cy}L${cx + m + 1} ${cy}`
      : `M${cx - m} ${cy - m}L${cx + m} ${cy + m}M${cx + m} ${cy - m}L${cx - m} ${cy + m}`;
  }

  marcaSubprocesso(b: VistaBloco): string {
    const q = 11;
    const x = b.largura / 2 - q / 2;
    const y = b.altura - q - 3;
    return `M${b.largura / 2} ${y + 2.4}L${b.largura / 2} ${y + q - 2.4}M${x + 2.4} ${y + q / 2}L${x + q - 2.4} ${y + q / 2}`;
  }

  setaDaLigacao(b: VistaBloco): string {
    const x = b.largura / 2;
    const y = b.altura / 2;
    return `M${x - 6} ${y - 2.6}L${x + 0.5} ${y - 2.6}L${x + 0.5} ${y - 6}L${x + 6.5} ${y}L${x + 0.5} ${y + 6}L${x + 0.5} ${y + 2.6}L${x - 6} ${y + 2.6}Z`;
  }

  transformaTexto(t: { x: number; y: number; vertical: boolean }): string | null {
    return t.vertical ? `rotate(-90 ${t.x} ${t.y})` : null;
  }

  // ── Paleta: clicar inclui (o caminho de um clique do arrastar) ────────────

  /** Para onde vai o bloco clicado na paleta, pela seleção: depois do bloco, na seta, ou no fim da raia. */
  private destinoDoClique(tipo: PeTipoElementoFluxo): DestinoClique | null {
    const def = this.def;
    const raias = def ? raiasEmOrdem(def) : [];
    if (!def || !raias.length) return null;
    const noFimDa = (raiaId: string): DestinoClique => {
      const id = raias.some(r => r.Id === raiaId) ? raiaId : raias[0].Id;
      return { acao: 'raia', id, texto: `incluir no fim da raia ${this.trabalho.nomeRaiaPorId(id)}` };
    };
    const sel = this.selecao;
    if (sel?.tipo === 'elemento') {
      const e = def.Elementos.find(x => x.Id === sel.id);
      if (e) {
        if (tipoEntraNaSeta(tipo) && aceitaPassoDepois(def, e.Id)) return { acao: 'depois', id: e.Id, texto: `incluir depois de ${this.curto(e.Id)}` };
        if (tipo === 'fim' && e.Tipo !== 'fim' && !def.Ligacoes.some(l => l.De === e.Id)) {
          return { acao: 'fim-depois', id: e.Id, texto: `incluir depois de ${this.curto(e.Id)}` };
        }
        return noFimDa(e.RaiaId);
      }
    }
    if (sel?.tipo === 'ligacao') {
      const l = def.Ligacoes.find(x => x.Id === sel.id);
      if (l && tipoEntraNaSeta(tipo)) return { acao: 'seta', id: l.Id, texto: `inserir entre ${this.curto(l.De)} e ${this.curto(l.Para)}` };
      const de = l ? def.Elementos.find(x => x.Id === l.De) : undefined;
      if (de) return noFimDa(de.RaiaId);
    }
    if (sel?.tipo === 'raia') return noFimDa(sel.id);
    return noFimDa(raias[0].Id);
  }

  rotuloPaleta(tipo: PeTipoElementoFluxo): string {
    const destino = this.destinoDoClique(tipo);
    return destino ? `${rotuloTipoElemento(tipo)}: ${destino.texto}` : `${rotuloTipoElemento(tipo)}: inclua uma raia primeiro`;
  }

  cliquePaleta(tipo: PeTipoElementoFluxo): void {
    if (this.cliqueIgnorado() || !this.podeEditar) return;
    const destino = this.destinoDoClique(tipo);
    if (!destino) {
      this.acessibilidade.anunciar('Inclua uma raia antes de incluir blocos.');
      return;
    }
    const nome = rotuloTipoElemento(tipo).toLowerCase();
    let novo: PeFluxoElemento | null = null;
    let aviso = '';
    switch (destino.acao) {
      case 'depois': {
        const ref = this.curto(destino.id);
        novo = this.trabalho.mudar(`incluir ${this.artigo(tipo)} ${nome} depois de ${ref}`, def => incluirPassoDepois(def, destino.id, tipo));
        if (novo) aviso = `${this.tipoComNumero(novo)} ${this.flexao(tipo, 'incluíd')} depois de ${ref}.`;
        break;
      }
      case 'fim-depois': {
        const ref = this.curto(destino.id);
        novo = this.trabalho.mudar(`incluir o fim depois de ${ref}`, def => {
          const de = def.Elementos.find(x => x.Id === destino.id)!;
          const fim = incluirElemento(def, de.RaiaId, 'fim', de.Id);
          incluirLigacao(def, de.Id, fim.Id);
          return fim;
        });
        if (novo) aviso = `Fim incluído depois de ${ref}.`;
        break;
      }
      case 'seta': {
        const l = this.def.Ligacoes.find(x => x.Id === destino.id);
        const entre = l ? `${this.curto(l.De)} e ${this.curto(l.Para)}` : '';
        novo = this.trabalho.mudar(`incluir ${this.artigo(tipo)} ${nome} entre ${entre}`, def => inserirNaLigacao(def, destino.id, tipo));
        if (novo) aviso = `${this.tipoComNumero(novo)} ${this.flexao(tipo, 'inserid')} entre ${this.entreDepois(novo.Id)}.`;
        break;
      }
      default: {
        const raia = this.trabalho.nomeRaiaPorId(destino.id);
        novo = this.trabalho.mudar(`incluir ${this.artigo(tipo)} ${nome} na raia ${raia}`, def => incluirElemento(def, destino.id, tipo));
        if (novo) aviso = `${rotuloTipoElemento(tipo)} ${this.flexao(tipo, 'nov')} no fim da raia ${raia}, ainda sem ligação.`;
      }
    }
    if (novo) this.depoisDeIncluir(novo, aviso);
  }

  // ── Mudanças pedidas pelo desenho ─────────────────────────────────────────

  private executar(soltura: SolturaFluxo, ponto: PontoFluxo | null): void {
    switch (soltura.acao) {
      case 'incluir': {
        const raia = this.trabalho.nomeRaiaPorId(soltura.raiaId);
        const nome = rotuloTipoElemento(soltura.tipo).toLowerCase();
        const novo = this.trabalho.mudar(`incluir ${this.artigo(soltura.tipo)} ${nome} na raia ${raia}`,
          def => incluirElemento(def, soltura.raiaId, soltura.tipo));
        if (!novo) return;
        if (ponto) this.provisorios.set(novo.Id, ponto);
        this.depoisDeIncluir(novo, `${rotuloTipoElemento(soltura.tipo)} ${this.flexao(soltura.tipo, 'nov')} no fim da raia ${raia}, ainda sem ligação.`);
        return;
      }
      case 'inserir': {
        const l = this.def.Ligacoes.find(x => x.Id === soltura.ligacaoId);
        const entre = l ? `${this.curto(l.De)} e ${this.curto(l.Para)}` : '';
        const nome = rotuloTipoElemento(soltura.tipo).toLowerCase();
        const novo = this.trabalho.mudar(`incluir ${this.artigo(soltura.tipo)} ${nome} entre ${entre}`,
          def => inserirNaLigacao(def, soltura.ligacaoId, soltura.tipo, soltura.raiaId));
        if (!novo) return;
        if (ponto) this.provisorios.set(novo.Id, ponto);
        this.depoisDeIncluir(novo, `${this.tipoComNumero(novo)} ${this.flexao(soltura.tipo, 'inserid')} entre ${this.entreDepois(novo.Id)}.`);
        return;
      }
      case 'mover-raia': {
        const ref = this.trabalho.rotuloPorId(soltura.elementoId);
        const raia = this.trabalho.nomeRaiaPorId(soltura.raiaId);
        if (!this.trabalho.mudar(`mover ${ref} para a raia ${raia}`, def => moverParaRaia(def, soltura.elementoId, soltura.raiaId))) return;
        if (ponto) this.provisorios.set(soltura.elementoId, ponto);
        this.focarDepois(soltura.elementoId);
        this.trabalho.avisarMudanca(`${ref} agora está na raia ${raia}. As ligações continuam.`);
        return;
      }
      case 'mover-seta': {
        const ref = this.trabalho.rotuloPorId(soltura.elementoId);
        const l = this.def.Ligacoes.find(x => x.Id === soltura.ligacaoId);
        const entre = l ? `${this.curto(l.De)} e ${this.curto(l.Para)}` : '';
        const feito = this.trabalho.mudar(`mover ${ref} para entre ${entre}`,
          def => moverParaLigacao(def, soltura.elementoId, soltura.ligacaoId, soltura.raiaId));
        if (!feito) return;
        if (ponto) this.provisorios.set(soltura.elementoId, ponto);
        const religou = feito.religou ? ` ${this.curto(feito.religou.de)} agora liga direto em ${this.curto(feito.religou.para)}.` : '';
        this.focarDepois(soltura.elementoId);
        this.trabalho.avisarMudanca(`${this.trabalho.rotuloPorId(soltura.elementoId)} agora fica entre ${this.entreDepois(soltura.elementoId)}.${religou}`);
        this.pedirRotuloSeDecisao(soltura.elementoId);
        return;
      }
      case 'ligar':
        this.ligar(soltura.de, soltura.para);
        return;
    }
  }

  /** "Incluir raia", no pé do desenho: o nome dela abre no painel. */
  incluirRaia(): void {
    if (this.podeEditar) this.trabalho.incluirRaiaNoDesenho();
  }

  /** Liga `de` a `para` (a mesma regra do editor em lista). Da decisão, pede o rótulo da saída ali mesmo. */
  ligar(de: string, para: string): void {
    const origem = this.def.Elementos.find(e => e.Id === de);
    const nova = this.trabalho.mudar(`ligar ${this.curto(de)} a ${this.curto(para)}`, def => incluirLigacao(def, de, para));
    if (!nova || !origem) return;
    if (origem.Tipo === 'decisao') {
      this.abrirRotulo(nova.Id, true);
      this.trabalho.avisarMudanca(`Saída nova de ${this.trabalho.rotuloPorId(de)} para ${this.curto(para)}. Escreva o rótulo, como Sim ou Não.`);
      return;
    }
    this.focarDepois(de);
    this.trabalho.avisarMudanca(`${this.trabalho.rotuloPorId(de)} agora liga em ${this.trabalho.rotuloPorId(para)}.`);
  }

  /** Depois de incluir: seleciona, e abre o nome ali mesmo quando o tipo pede nome. */
  private depoisDeIncluir(novo: PeFluxoElemento, aviso: string): void {
    this.acompanhar = novo.Id;
    // Já no lugar provisório (o bloco incluído por clique vai para o fim da raia, às vezes fora da vista), e de
    // novo quando a geometria chegar: o bloco e o campo do nome ficam à vista (F1, D02)
    this.visivelPendente = novo.Id;
    this.selecionar.emit({ selecao: { tipo: 'elemento', id: novo.Id }, abrirPainel: false });
    this.focoBloco = novo.Id;
    // A decisão que entrou no meio de um caminho tem uma saída sem rótulo: pede depois do nome
    const saida = novo.Tipo === 'decisao' ? this.def.Ligacoes.find(l => l.De === novo.Id && !l.Rotulo) : undefined;
    this.rotuloDepoisDoNome = saida?.Id ?? null;
    if (tipoPedeNome(novo.Tipo)) {
      this.edicaoNome = { id: novo.Id, valor: '' };
      this.focoPendente = 'pe-fxv-nome';
      this.trabalho.avisarMudanca(`${aviso} Escreva o nome ${FEMININOS.has(novo.Tipo) ? 'dela' : 'dele'} e aperte Enter.`);
      return;
    }
    this.focarDepois(novo.Id);
    this.trabalho.avisarMudanca(aviso);
  }

  private pedirRotuloSeDecisao(id: string): void {
    const e = this.def.Elementos.find(x => x.Id === id);
    if (e?.Tipo !== 'decisao') return;
    const saida = this.def.Ligacoes.find(l => l.De === id && !l.Rotulo);
    if (saida) this.abrirRotulo(saida.Id, true);
  }

  private focarDepois(id: string): void {
    this.acompanhar = id;
    this.focoBloco = id;
    this.focoPendente = this.idBloco(id);
    this.selecionar.emit({ selecao: { tipo: 'elemento', id }, abrirPainel: false });
  }

  /** "2.3 e 2.5": os passos antes e depois do elemento, pelas ligações dele (depois da mudança). */
  private entreDepois(id: string): string {
    const antes = this.def.Ligacoes.filter(l => l.Para === id).map(l => this.curto(l.De));
    const depois = this.def.Ligacoes.filter(l => l.De === id).map(l => this.curto(l.Para));
    return `${juntar(antes) || 'o passo de antes'} e ${juntar(depois) || 'o passo de depois'}`;
  }

  private tipoComNumero(e: PeFluxoElemento): string {
    const numero = tipoNumerado(e.Tipo) ? this.trabalho.numeros.get(e.Id) : undefined;
    return numero ? `${rotuloTipoElemento(e.Tipo)} ${numero}` : rotuloTipoElemento(e.Tipo);
  }

  private artigo(tipo: string): string {
    return FEMININOS.has(tipo) ? 'uma' : 'um';
  }

  /** "incluíd" vira "incluída" ou "incluído", pelo tipo. */
  private flexao(tipo: string, raiz: string): string {
    return `${raiz}${FEMININOS.has(tipo) ? 'a' : 'o'}`;
  }

  // ── Nome e rótulo ali mesmo ───────────────────────────────────────────────

  abrirNome(id: string): void {
    if (!this.podeEditar || this.cliqueIgnorado()) return;
    const e = this.def.Elementos.find(x => x.Id === id);
    if (!e) return;
    this.edicaoRotulo = null;
    this.rotuloDepoisDoNome = null;
    this.edicaoNome = { id, valor: e.Nome };
    this.focoPendente = 'pe-fxv-nome';
  }

  rotuloDoCampoNome(id: string): string {
    const e = this.def.Elementos.find(x => x.Id === id);
    return `${e ? rotuloNomeElemento(e.Tipo) : 'Nome'} (Enter confirma, Esc cancela)`;
  }

  /** Enter confirma e o foco volta ao bloco; ao sair do campo (Tab, clique fora), confirma sem puxar o foco de volta. */
  confirmarNome(devolverFoco = true): void {
    const edicao = this.edicaoNome;
    if (!edicao) return;
    this.edicaoNome = null;
    const e = this.def.Elementos.find(x => x.Id === edicao.id);
    if (!e) return;
    const valor = edicao.valor.trim();
    if (valor !== e.Nome) {
      const antes = this.trabalho.rotuloPorId(e.Id);
      this.trabalho.mudar(`mudar o nome de ${antes}`, def => renomearElemento(def, e.Id, valor));
      this.trabalho.avisarMudanca(`Nome mudado: ${this.trabalho.rotuloPorId(e.Id)}.`);
    }
    const pendente = this.rotuloDepoisDoNome;
    this.rotuloDepoisDoNome = null;
    if (!devolverFoco) return;
    if (pendente && this.def.Ligacoes.some(l => l.Id === pendente && !l.Rotulo)) {
      this.abrirRotulo(pendente, true);
      return;
    }
    this.focoPendente = this.idBloco(e.Id);
  }

  cancelarNome(): void {
    const edicao = this.edicaoNome;
    this.edicaoNome = null;
    this.rotuloDepoisDoNome = null;
    if (edicao) this.focoPendente = this.idBloco(edicao.id);
  }

  /** O campo perdeu o foco para fora dele: vale o que foi escrito. */
  aoSairDoNome(): void {
    if (this.edicaoNome) this.confirmarNome(false);
  }

  abrirRotulo(ligacaoId: string, sugerir = false): void {
    if (!this.podeEditar) return;
    const l = this.def.Ligacoes.find(x => x.Id === ligacaoId);
    const de = l ? this.def.Elementos.find(e => e.Id === l.De) : undefined;
    if (!l || de?.Tipo !== 'decisao') return;
    this.edicaoNome = null;
    this.edicaoRotulo = { id: l.Id, valor: l.Rotulo ?? (sugerir ? rotuloSugeridoSaida(this.def, de.Id) : ''), decisao: de.Id };
    this.focoPendente = 'pe-fxv-rotulo';
  }

  usarRotulo(valor: string): void {
    if (!this.edicaoRotulo) return;
    this.edicaoRotulo.valor = valor;
    this.confirmarRotulo();
  }

  confirmarRotulo(devolverFoco = true): void {
    const edicao = this.edicaoRotulo;
    if (!edicao) return;
    this.edicaoRotulo = null;
    const l = this.def.Ligacoes.find(x => x.Id === edicao.id);
    if (!l) return;
    const valor = edicao.valor.trim();
    if ((l.Rotulo ?? '') !== valor) {
      this.trabalho.mudar(`mudar o rótulo de uma saída de ${this.trabalho.rotuloPorId(l.De)}`, def => mudarRotuloLigacao(def, l.Id, valor || null));
    }
    this.trabalho.avisarMudanca(valor
      ? `Saída "${valor}" de ${this.trabalho.rotuloPorId(l.De)} para ${this.curto(l.Para)}.`
      : 'A saída ficou sem rótulo. A decisão precisa de rótulo em cada saída.');
    if (devolverFoco) this.focoPendente = this.idBloco(l.De);
  }

  cancelarRotulo(): void {
    const edicao = this.edicaoRotulo;
    this.edicaoRotulo = null;
    if (edicao) this.focoPendente = this.idBloco(edicao.decisao);
  }

  aoSairDoRotulo(evento: FocusEvent): void {
    const formulario = evento.currentTarget as HTMLElement | null;
    const destino = evento.relatedTarget as Node | null;
    if (formulario && destino && formulario.contains(destino)) return;
    if (this.edicaoRotulo) this.confirmarRotulo(false);
  }

  // ── Cliques e teclado ─────────────────────────────────────────────────────

  private cliqueIgnorado(): boolean {
    return Date.now() < this.ignorarCliqueAte;
  }

  cliqueBloco(evento: MouseEvent, b: VistaBloco): void {
    if (this.cliqueIgnorado()) return;
    this.focoBloco = b.id;
    (evento.currentTarget as SVGGElement | null)?.focus({ preventScroll: true });
    this.selecionar.emit({ selecao: { tipo: 'elemento', id: b.id }, abrirPainel: false });
  }

  cliqueSeta(evento: MouseEvent, l: VistaLigacao): void {
    evento.stopPropagation();
    if (this.cliqueIgnorado()) return;
    this.focoSeta = l.id;
    this.selecionar.emit({ selecao: { tipo: 'ligacao', id: l.id }, abrirPainel: false });
  }

  cliqueRaia(r: VistaRaia): void {
    if (this.cliqueIgnorado()) return;
    this.selecionar.emit({ selecao: { tipo: 'raia', id: r.id }, abrirPainel: false });
  }

  cliqueFundo(): void {
    if (this.cliqueIgnorado() || !this.selecao) return;
    this.selecionar.emit({ selecao: null, abrirPainel: false });
  }

  /**
   * O foco chegou num bloco (Tab, clique, ou o foco que a tela põe): ele passa a ser
   * o do tabindex 0. Depois da detecção de mudanças, porque o foco pode chegar
   * durante ela (o anel do foco é do CSS, sem estado).
   */
  aoFocarBloco(b: VistaBloco): void {
    if (this.focoBloco !== b.id) void Promise.resolve().then(() => this.focoBloco = b.id);
  }

  aoFocarSeta(l: VistaLigacao): void {
    if (this.focoSeta !== l.id) void Promise.resolve().then(() => this.focoSeta = l.id);
  }

  sairDoPonteiro(b: VistaBloco): void {
    if (this.sobre === b.id) this.sobre = null;
  }

  teclaBloco(evento: KeyboardEvent, b: VistaBloco): void {
    switch (evento.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        this.focarVizinho(b.id, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        this.focarVizinho(b.id, -1);
        break;
      case 'Home':
        this.focarBloco(this.ordem[0]);
        break;
      case 'End':
        this.focarBloco(this.ordem[this.ordem.length - 1]);
        break;
      case 'Enter':
      case ' ':
        this.selecionar.emit({ selecao: { tipo: 'elemento', id: b.id }, abrirPainel: true });
        break;
      case 'Delete':
      case 'Backspace':
        if (!this.podeEditar) return;
        this.removerBloco(b.id);
        break;
      case 'F2':
        this.abrirNome(b.id);
        break;
      case 'Escape':
        if (!this.selecao) return;
        this.selecionar.emit({ selecao: null, abrirPainel: false });
        break;
      default:
        return;
    }
    evento.preventDefault();
    evento.stopPropagation();
  }

  private focarVizinho(id: string, passo: 1 | -1): void {
    const i = this.ordem.indexOf(id);
    const j = Math.min(Math.max(i + passo, 0), this.ordem.length - 1);
    if (i < 0 || j === i) return;
    this.focarBloco(this.ordem[j]);
  }

  private focarBloco(id: string | undefined): void {
    if (!id) return;
    this.focoBloco = id;
    this.focoPendente = this.idBloco(id);
    // A seleção acompanha o foco: o painel mostra o bloco
    this.selecionar.emit({ selecao: { tipo: 'elemento', id }, abrirPainel: false });
  }

  private removerBloco(id: string): void {
    const ordem = [...this.ordem];
    const i = ordem.indexOf(id);
    // A pergunta (quando o passo tem ligações) vem na janela do módulo (F1, A04)
    this.trabalho.removerPassoDoDesenho(id).then(removeu => {
      if (!removeu) return;
      const restantes = this.def.Elementos.map(e => e.Id);
      const vizinho = ordem.filter(x => x !== id && restantes.includes(x))[Math.max(0, Math.min(i, ordem.length - 2))];
      if (vizinho) {
        this.focoBloco = vizinho;
        this.focoPendente = this.idBloco(vizinho);
      }
    });
  }

  teclaSeta(evento: KeyboardEvent, l: VistaLigacao): void {
    const i = this.setas.findIndex(x => x.id === l.id);
    switch (evento.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        this.focarSeta(this.setas[Math.min(i + 1, this.setas.length - 1)]);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        this.focarSeta(this.setas[Math.max(i - 1, 0)]);
        break;
      case 'Enter':
      case ' ':
        this.selecionar.emit({ selecao: { tipo: 'ligacao', id: l.id }, abrirPainel: true });
        break;
      case 'Delete':
      case 'Backspace': {
        if (!this.podeEditar) return;
        const proxima = this.setas[i + 1] ?? this.setas[i - 1];
        this.trabalho.removerLigacaoDoDesenho(l.id);
        if (proxima) this.focarSeta(proxima);
        else this.focarBloco(l.de);
        break;
      }
      default:
        return;
    }
    evento.preventDefault();
    evento.stopPropagation();
  }

  private focarSeta(l: VistaLigacao | undefined): void {
    if (!l) return;
    this.focoSeta = l.id;
    this.focoPendente = this.idSeta(l.id);
    this.selecionar.emit({ selecao: { tipo: 'ligacao', id: l.id }, abrirPainel: false });
  }

  teclaRaia(evento: KeyboardEvent, r: VistaRaia): void {
    if (evento.key !== 'Enter' && evento.key !== ' ') return;
    evento.preventDefault();
    this.selecionar.emit({ selecao: { tipo: 'raia', id: r.id }, abrirPainel: true });
  }

  /** Teclas do desenho inteiro: + e - (zoom) e 0 (caber na tela). */
  teclaDesenho(evento: KeyboardEvent): void {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    const alvo = evento.target as HTMLElement | null;
    if (alvo?.tagName === 'INPUT') return;
    if (evento.key === '+' || evento.key === '=') this.passoDeZoom(1);
    else if (evento.key === '-' || evento.key === '_') this.passoDeZoom(-1);
    else if (evento.key === '0') this.caberNaTela();
    else return;
    evento.preventDefault();
  }

  // ── Zoom e movimento ──────────────────────────────────────────────────────

  aproximar(): void {
    this.passoDeZoom(1);
  }

  afastar(): void {
    this.passoDeZoom(-1);
  }

  tamanhoReal(): void {
    this.definirZoom(1);
  }

  /** Um passo de zoom, mantendo parado o ponto sob o ponteiro (ou o meio da área visível). */
  private passoDeZoom(sentido: 1 | -1, clientX?: number, clientY?: number): void {
    const novo = sentido > 0
      ? ZOOMS.find(z => z > this.zoom + 0.001) ?? ZOOMS[ZOOMS.length - 1]
      : [...ZOOMS].reverse().find(z => z < this.zoom - 0.001) ?? ZOOMS[0];
    this.definirZoom(novo, clientX, clientY);
  }

  private definirZoom(novo: number, clientX?: number, clientY?: number): void {
    const antes = this.zoom;
    if (Math.abs(novo - antes) < 0.001) return;
    const rolagem = this.rolagem?.nativeElement;
    if (rolagem && this.noNavegador) {
      const caixa = rolagem.getBoundingClientRect();
      const ax = clientX !== undefined ? clientX - caixa.left : rolagem.clientWidth / 2;
      const ay = clientY !== undefined ? clientY - caixa.top : rolagem.clientHeight / 2;
      const sx = (rolagem.scrollLeft + ax) / antes;
      const sy = (rolagem.scrollTop + ay) / antes;
      this.rolagemPendente = { left: Math.max(0, sx * novo - ax), top: Math.max(0, sy * novo - ay) };
    }
    this.zoom = novo;
    this.acessibilidade.anunciar(`Desenho em ${this.textoZoom}.`);
  }

  caberNaTela(): void {
    const rolagem = this.rolagem?.nativeElement;
    const vista = this.vista;
    if (!rolagem || !vista || !this.noNavegador) return;
    // A altura que o desenho pode ocupar (a área cresce com ele até o limite do CSS)
    const limite = parseFloat(getComputedStyle(rolagem).maxHeight);
    const largura = rolagem.clientWidth - 16;
    const altura = (Number.isFinite(limite) && limite > 0 ? limite : rolagem.clientHeight) - 16;
    const zoom = Math.min(largura / vista.largura, altura / vista.altura);
    // Cabe inteiro, sem passar do tamanho real (o desenho pequeno não é ampliado)
    this.zoom = Math.min(1, Math.max(0.25, Math.floor(zoom * 100) / 100));
    this.rolagemPendente = { left: 0, top: 0 };
    this.acessibilidade.anunciar(`O desenho cabe na tela: ${this.textoZoom}.`);
  }

  /**
   * Arrastar o fundo move o desenho, com o mouse, o dedo ou a caneta. No toque, o
   * svg de quem edita não deixa o navegador rolar (os blocos arrastam pelo toque;
   * F1, D01): o desenho anda por aqui e, quando chega ao fim dele, a página segue
   * rolando, para dar para passar do desenho no celular.
   */
  comecarMover(evento: PointerEvent): void {
    const rolagem = this.rolagem?.nativeElement;
    const toque = evento.pointerType !== 'mouse';
    if (!rolagem || !evento.isPrimary || evento.button !== 0 || this.arrasto || this.pararDeEscutar || !this.noNavegador) return;
    const inicio = { x: evento.clientX, y: evento.clientY };
    let anterior = { x: evento.clientX, y: evento.clientY };
    let moveu = false;
    this.zone.runOutsideAngular(() => {
      const mover = (e: PointerEvent) => {
        if (e.pointerId !== evento.pointerId) return;
        if (!moveu && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < (toque ? LIMIAR_ARRASTO_TOQUE_PX : 3)) return;
        if (!moveu) {
          moveu = true;
          this.zone.run(() => this.movendo = true);
        }
        const dx = anterior.x - e.clientX;
        const dy = anterior.y - e.clientY;
        anterior = { x: e.clientX, y: e.clientY };
        const antes = { left: rolagem.scrollLeft, top: rolagem.scrollTop };
        rolagem.scrollLeft += dx;
        rolagem.scrollTop += dy;
        // O que o desenho não andou (chegou ao fim dele), a página anda: no toque, dá para passar do desenho
        const sobraX = dx - (rolagem.scrollLeft - antes.left);
        const sobraY = dy - (rolagem.scrollTop - antes.top);
        if (toque && (Math.abs(sobraX) > 0.5 || Math.abs(sobraY) > 0.5)) window.scrollBy(sobraX, sobraY);
      };
      const soltar = (e: PointerEvent) => {
        if (e.pointerId !== evento.pointerId) return;
        this.pararDeEscutar?.();
        if (moveu) {
          this.ignorarCliqueAte = Date.now() + 300;
          this.zone.run(() => this.movendo = false);
        }
      };
      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
      window.addEventListener('pointercancel', soltar);
      this.pararDeEscutar = () => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', soltar);
        window.removeEventListener('pointercancel', soltar);
        this.pararDeEscutar = null;
      };
    });
  }

  // ── Arrastar (pointer events: mouse, toque e caneta) ──────────────────────

  comecarArrastoPaleta(evento: PointerEvent, tipo: PeTipoElementoFluxo): void {
    if (!this.podeComecar(evento) || this.semRaias) return;
    this.comecar(evento, { origem: 'paleta', tipo }, rotuloTipoElemento(tipo), tipo);
  }

  comecarArrastoBloco(evento: PointerEvent, b: VistaBloco): void {
    if (!this.podeComecar(evento)) return;
    this.comecar(evento, { origem: 'bloco', id: b.id }, this.trabalho.rotuloPorId(b.id), b.tipo);
  }

  comecarLigacao(evento: PointerEvent, b: VistaBloco): void {
    evento.stopPropagation();
    if (!this.podeComecar(evento)) return;
    this.comecar(evento, { origem: 'alca', id: b.id }, `Ligar ${this.curto(b.id)}`, b.tipo);
  }

  private podeComecar(evento: PointerEvent): boolean {
    return this.noNavegador && this.podeEditar && evento.isPrimary && !this.arrasto && !this.movendo
      && (evento.pointerType !== 'mouse' || evento.button === 0);
  }

  private comecar(evento: PointerEvent, tipo: ArrastoFluxo, rotulo: string, forma: PeTipoElementoFluxo): void {
    // Sem isto, o toque rola a página e o mouse seleciona texto
    if (evento.pointerType !== 'mouse') evento.preventDefault();
    this.arrasto = {
      tipo, pointerId: evento.pointerId, toque: evento.pointerType === 'touch', inicioX: evento.clientX, inicioY: evento.clientY, ativo: false,
      rotulo, forma, ponto: null
    };
    const pointerId = evento.pointerId;
    this.zone.runOutsideAngular(() => {
      const mover = (e: PointerEvent) => {
        if (e.pointerId === pointerId) this.aoMover(e);
      };
      const soltar = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        this.pararDeEscutar?.();
        this.zone.run(() => this.aoSoltar());
      };
      const cancelar = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        this.pararDeEscutar?.();
        this.zone.run(() => this.cancelarArrasto());
      };
      const tecla = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        this.pararDeEscutar?.();
        this.zone.run(() => this.cancelarArrasto(true));
      };
      window.addEventListener('pointermove', mover, { passive: false });
      window.addEventListener('pointerup', soltar);
      window.addEventListener('pointercancel', cancelar);
      window.addEventListener('keydown', tecla, true);
      this.pararDeEscutar = () => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', soltar);
        window.removeEventListener('pointercancel', cancelar);
        window.removeEventListener('keydown', tecla, true);
        this.pararDeEscutar = null;
      };
    });
  }

  /** Fora da zona do Angular: o fantasma e a linha seguem o ponteiro; a tela só muda quando o destino muda. */
  private aoMover(e: PointerEvent): void {
    const a = this.arrasto;
    if (!a) return;
    if (!a.ativo) {
      if (Math.hypot(e.clientX - a.inicioX, e.clientY - a.inicioY) < (a.toque ? LIMIAR_ARRASTO_TOQUE_PX : LIMIAR_ARRASTO_PX)) return;
      this.zone.run(() => this.ativar(a));
    }
    if (e.cancelable) e.preventDefault();
    this.posicionarFantasma(e.clientX, e.clientY, a.toque);
    this.ultimoPonteiro = { x: e.clientX, y: e.clientY };
    const area = this.rolagem?.nativeElement.getBoundingClientRect();
    const dentro = !!area && e.clientX >= area.left && e.clientX <= area.right && e.clientY >= area.top && e.clientY <= area.bottom;
    this.dentroDesde = dentro ? this.dentroDesde ?? Date.now() : null;
    if (dentro) this.comecarRolagemNaBorda();
    this.atualizarAlvo(a, e.clientX, e.clientY);
  }

  /** O ponto no desenho, a linha da alça e o destino, para o ponteiro em (x, y). */
  private atualizarAlvo(a: EstadoArrasto, x: number, y: number): void {
    const p = this.pontoNoDesenho(x, y);
    a.ponto = p;
    if (a.tipo.origem === 'alca' && p && this.linhaLigar) {
      this.linhaLigar.nativeElement.setAttribute('x2', String(p.x));
      this.linhaLigar.nativeElement.setAttribute('y2', String(p.y));
    }
    const alvo = this.vista ? alvoDoArrasto(this.def, this.vista, a.tipo, p, TOLERANCIA_SETA_PX / this.zoom, this.referencias) : null;
    if (this.chaveDoAlvo(alvo) !== this.chaveDoAlvo(this.alvo)) this.zone.run(() => this.alvo = alvo);
  }

  private readonly referencias = {
    elemento: (id: string) => this.curto(id),
    raia: (id: string) => this.trabalho.nomeRaiaPorId(id)
  };

  private chaveDoAlvo(alvo: AlvoFluxo | null): string {
    return alvo ? `${alvo.soltura.acao}|${alvo.raiaId}|${alvo.ligacaoId}|${alvo.blocoId}|${alvo.texto}` : '';
  }

  private ativar(a: EstadoArrasto): void {
    a.ativo = true;
    this.edicaoNome = null;
    this.edicaoRotulo = null;
    if (a.tipo.origem === 'alca') {
      const b = this.blocoPorId(a.tipo.id);
      if (b) this.linha = { x1: b.x + b.largura, y1: b.y + b.altura / 2 };
    }
    this.alvo = null;
  }

  /** O fantasma perto do ponteiro, sem sair da tela (no toque, acima do dedo). */
  private posicionarFantasma(x: number, y: number, toque: boolean): void {
    const fantasma = this.fantasma?.nativeElement;
    if (!fantasma) return;
    const largura = fantasma.offsetWidth;
    const altura = fantasma.offsetHeight;
    let esquerda = x + 14;
    let topo = toque ? y - altura - 28 : y + 16;
    esquerda = Math.max(4, Math.min(esquerda, window.innerWidth - largura - 4));
    if (topo < 4) topo = y + 28;
    if (topo + altura > window.innerHeight - 4) topo = Math.max(4, y - altura - 16);
    fantasma.style.transform = `translate(${Math.round(esquerda)}px, ${Math.round(topo)}px)`;
  }

  /**
   * Rolagem na borda (F1, D04 e D09): um temporizador anda o desenho enquanto o
   * ponteiro fica perto da borda da área, mesmo parado, mais rápido quanto mais perto;
   * só depois de o ponteiro estar dentro da área por 300 ms (quem chega da paleta
   * cruza a borda sem empurrar o desenho). Fora da zona do Angular: a tela só muda
   * quando o destino muda.
   */
  private comecarRolagemNaBorda(): void {
    if (this.rolagemBorda || !this.noNavegador) return;
    this.zone.runOutsideAngular(() => this.rolagemBorda = setInterval(() => this.passoNaBorda(), PASSO_BORDA_MS));
  }

  private pararRolagemNaBorda(): void {
    if (this.rolagemBorda) clearInterval(this.rolagemBorda);
    this.rolagemBorda = null;
    this.ultimoPonteiro = null;
    this.dentroDesde = null;
  }

  private passoNaBorda(): void {
    const rolagem = this.rolagem?.nativeElement;
    const p = this.ultimoPonteiro;
    const a = this.arrasto;
    if (!rolagem || !p || !a?.ativo) {
      this.pararRolagemNaBorda();
      return;
    }
    if (this.dentroDesde === null || Date.now() - this.dentroDesde < ESPERA_BORDA_MS) return;
    const r = rolagem.getBoundingClientRect();
    const velocidade = (perto: number, longe: number): number => {
      if (perto < BORDA_ROLAGEM_PX) return -Math.ceil((BORDA_ROLAGEM_PX - Math.max(perto, 0)) / BORDA_ROLAGEM_PX * VELOCIDADE_BORDA_PX);
      if (longe < BORDA_ROLAGEM_PX) return Math.ceil((BORDA_ROLAGEM_PX - Math.max(longe, 0)) / BORDA_ROLAGEM_PX * VELOCIDADE_BORDA_PX);
      return 0;
    };
    const dx = velocidade(p.x - r.left, r.right - p.x);
    const dy = velocidade(p.y - r.top, r.bottom - p.y);
    if (!dx && !dy) return;
    const antes = { left: rolagem.scrollLeft, top: rolagem.scrollTop };
    rolagem.scrollLeft += dx;
    rolagem.scrollTop += dy;
    // O desenho andou: o que está sob o ponteiro mudou, e o destino também
    if (rolagem.scrollLeft !== antes.left || rolagem.scrollTop !== antes.top) this.atualizarAlvo(a, p.x, p.y);
  }

  /** O ponto do ponteiro no desenho (unidades do SVG), ou null fora da área do desenho. */
  private pontoNoDesenho(x: number, y: number): PontoFluxo | null {
    const rolagem = this.rolagem?.nativeElement;
    const svg = this.desenho?.nativeElement;
    if (!rolagem || !svg) return null;
    const area = rolagem.getBoundingClientRect();
    if (x < area.left || x > area.right || y < area.top || y > area.bottom) return null;
    const caixa = svg.getBoundingClientRect();
    return { x: (x - caixa.left) / this.zoom, y: (y - caixa.top) / this.zoom };
  }

  private aoSoltar(): void {
    const a = this.arrasto;
    const alvo = this.alvo;
    this.limparArrasto();
    if (!a?.ativo) return;
    // O clique que o navegador manda depois do arrasto não conta
    this.ignorarCliqueAte = Date.now() + 400;
    if (!alvo || alvo.soltura.acao === 'nada') return;
    this.executar(alvo.soltura, a.ponto);
  }

  private cancelarArrasto(avisar = false): void {
    const ativo = !!this.arrasto?.ativo;
    this.limparArrasto();
    if (ativo) this.ignorarCliqueAte = Date.now() + 400;
    if (avisar && ativo) this.acessibilidade.anunciar('Arrasto cancelado.');
  }

  private limparArrasto(): void {
    this.pararRolagemNaBorda();
    this.arrasto = null;
    this.alvo = null;
    this.linha = null;
    const fantasma = this.fantasma?.nativeElement;
    if (fantasma) fantasma.style.transform = '';
  }
}
