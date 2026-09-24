import {
  AfterViewChecked, Component, DestroyRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, PLATFORM_ID, SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import {
  PeFluxoDefinicao, PeFluxoElemento, PeFluxoLigacao, PeFluxoRaia, PeTipoElementoFluxo
} from '../../../api/planejamento/interface';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { NotificationService } from '../../core/services/notification.service';
import { PeFluxoAberto, PeFluxoItem, PeFonteFluxos } from '../services/pe-fluxos.service';
import { mensagemErroPe } from '../shared/pe-erros';
import {
  DescricaoFluxo, DicionarioFluxo, MAX_ARTEFATO, MAX_NOME_ELEMENTO, MAX_NOME_FLUXO, MAX_NOME_RAIA, MAX_PREFIXO,
  MAX_ROTULO_SAIDA, TIPOS_ELEMENTO_FLUXO, aceitaPassoDepois, clonarDefinicao, definicaoParaEnvio, descricaoDoFluxo,
  descricaoDoMarcador, dicionarioPadrao, explicacaoTipoElemento, iconeTipoElemento, incluirElemento, incluirLigacao,
  incluirPassoDepois, incluirRaia, lerErroFluxo, marcadorDoNome, marcadorSemValor, moverRaia, mudarTipoElemento,
  normalizarDefinicao, numerosDoFluxo, numerosDoServidor, ordemDoFluxo, raiasEmOrdem, removerElemento, removerLigacao,
  removerRaia, resolverNomes, retratoFluxo, rotuloNomeElemento, rotuloTipoElemento, rotulosDosElementos, tipoNumerado,
  tipoPedeNome, valorDoMarcador, vizinhosDoFluxo
} from '../shared/pe-fluxo-rotulos';
import { juntar } from '../shared/pe-modelo-rotulos';
import { quandoEQuem } from '../shared/pe-referenciais-rotulos';
import { PeFluxoDescricaoComponent } from './pe-fluxo-descricao.component';
import { PeFluxoDesenhoComponent } from './pe-fluxo-desenho.component';

/** Espera depois da última mudança antes de pedir o desenho (sem inundar a API). */
const ESPERA_DESENHO_MS = 800;
/** Mudanças seguidas no mesmo campo, com pausas menores que isto, viram um passo só do "Desfazer". */
const JANELA_AGRUPAR_MS = 4000;
const LIMITE_HISTORICO = 60;

/**
 * ocioso: nada pedido · esperando: mudou, o pedido sai em instantes · desenhando ·
 * ok · invalido: a API achou problemas (fica o último desenho bom) · erro: a
 * rede ou o servidor falhou.
 */
type EstadoDesenho = 'ocioso' | 'esperando' | 'desenhando' | 'ok' | 'invalido' | 'erro';

interface EntradaHistorico {
  retrato: string;
  descricao: string;
  agrupar: string | null;
  em: number;
}

/** A nova saída de uma decisão, antes de incluir. */
interface NovaSaida {
  rotulo: string;
  destino: string;
}

/**
 * Editor guiado de fluxos (E6), sem arrastar: tudo em listas e campos, por
 * teclado e leitor de tela.
 *
 * - Escolha do fluxo (os do guia, com a situação de cada um); o fluxo à vista fica
 *   no endereço (`?fluxo=`).
 * - Raias em lista: incluir, renomear (com os nomes do dicionário de nomes),
 *   subir, descer e remover (com confirmação).
 * - Passos por raia, na ordem do fluxo: tipo, nome, número automático, raia,
 *   "vem depois de", as saídas da decisão (rótulo e destino) e os documentos
 *   (artefatos); incluir um passo na raia ou logo depois de outro, e remover
 *   (religando o que vinha antes ao que vinha depois).
 * - Prévia do desenho ao lado, refeita pela API a cada mudança (com espera curta
 *   entre as digitações), com zoom e rolagem pelo teclado; os problemas que a API
 *   acha aparecem em lista, em linguagem simples; a descrição em texto, em lista
 *   numerada, é o texto alternativo do desenho.
 * - "Desfazer" (as mudanças seguidas no mesmo campo contam como uma), "Descartar
 *   as mudanças", "Salvar o fluxo" e, na cópia do órgão, "Voltar ao modelo do
 *   guia", a comparação com o modelo e "Manter a adaptação" quando o modelo mudou.
 *
 * Quem decide se a pessoa edita é a resposta do servidor (`PodeEditar`); quem só
 * lê vê o desenho salvo e a descrição. O mesmo editor serve à cópia do órgão
 * (passo da metodologia) e aos modelos do guia (administrador do módulo), pela
 * fonte (`PeFonteFluxos`).
 */
@Component({
  selector: 'app-pe-fluxo-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, PeFluxoDesenhoComponent, PeFluxoDescricaoComponent],
  templateUrl: './pe-fluxo-editor.component.html',
  host: { class: 'block' }
})
export class PeFluxoEditorComponent implements OnInit, OnChanges, AfterViewChecked, OnDestroy {
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) fonte!: PeFonteFluxos;
  /** Por que a pessoa só lê (a tela do passo explica: consulta, papel global, PDTIC fora de elaboração). */
  @Input() avisoLeitura: string | null = null;
  /** Há mudança não salva (a tela pergunta antes de sair). */
  @Output() readonly alterado = new EventEmitter<boolean>();
  /** Um fluxo foi salvo ou voltou ao modelo. */
  @Output() readonly salvou = new EventEmitter<void>();

  readonly tipos = TIPOS_ELEMENTO_FLUXO;
  readonly maxNomeFluxo = MAX_NOME_FLUXO;
  readonly maxNomeRaia = MAX_NOME_RAIA;
  readonly maxNomeElemento = MAX_NOME_ELEMENTO;
  readonly maxArtefato = MAX_ARTEFATO;
  readonly maxRotulo = MAX_ROTULO_SAIDA;
  readonly maxPrefixo = MAX_PREFIXO;

  // ── Lista dos fluxos ──────────────────────────────────────────────────────
  lista: PeFluxoItem[] = [];
  carregandoLista = false;
  erroLista: string | null = null;
  chaveAtual: string | null = null;

  // ── O fluxo aberto ────────────────────────────────────────────────────────
  aberto: PeFluxoAberto | null = null;
  carregandoFluxo = false;
  erroFluxo: string | null = null;
  /** A cópia de trabalho (o que está na tela). */
  def: PeFluxoDefinicao | null = null;
  nome = '';
  erroNome: string | null = null;
  sujo = false;
  private retratoSalvo = '';

  // ── Derivados (refeitos a cada mudança) ───────────────────────────────────
  raias: PeFluxoRaia[] = [];
  private porRaia = new Map<string, PeFluxoElemento[]>();
  /** Passos com a raia que não existe mais (dado antigo): a tela mostra para corrigir. */
  semRaia: PeFluxoElemento[] = [];
  numeros = new Map<string, string>();
  descricao: DescricaoFluxo | null = null;
  totalPassos = 0;
  private rotulos = new Map<string, string>();
  private elementos = new Map<string, PeFluxoElemento>();
  private resumos = new Map<string, string>();
  private antes = new Map<string, PeFluxoLigacao[]>();
  private chegaDeDecisao = new Map<string, PeFluxoLigacao[]>();
  private saidas = new Map<string, PeFluxoLigacao[]>();
  private origensJaUsadas = new Map<string, Set<string>>();
  private destinosJaUsados = new Map<string, Set<string>>();
  private origensPossiveis: PeFluxoElemento[] = [];
  private destinosPossiveis: PeFluxoElemento[] = [];

  dicionario: DicionarioFluxo = dicionarioPadrao();

  // ── Estado da tela ────────────────────────────────────────────────────────
  private readonly abertos = new Set<string>();
  renomeando: string | null = null;
  formRaia = { marcador: '', texto: '' };
  erroRaia: string | null = null;
  readonly novoAntes = new Map<string, string>();
  readonly novaSaida = new Map<string, NovaSaida>();
  readonly novoArtefato = new Map<string, string>();
  readonly errosLocais = new Map<string, string>();

  private historico: EntradaHistorico[] = [];

  // ── Problemas (validação da API) ──────────────────────────────────────────
  errosValidacao: string[] = [];
  mensagemValidacao: string | null = null;
  private retratoValidado = '';
  private totalAnunciado = -1;

  // ── Desenho ───────────────────────────────────────────────────────────────
  svg: string | null = null;
  estadoDesenho: EstadoDesenho = 'ocioso';
  erroDesenho: string | null = null;
  private retratoDesenhado = '';
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private pedidoDesenho?: Subscription;

  // ── Comparação com o modelo do guia ───────────────────────────────────────
  comparando = false;
  svgModelo: string | null = null;
  defModelo: PeFluxoDefinicao | null = null;
  numerosModelo: ReadonlyMap<string, string> | null = null;
  carregandoModelo = false;
  erroModelo: string | null = null;
  readonly dicionarioDoGuia = dicionarioPadrao();
  private chaveModelo: string | null = null;

  salvando = false;
  restaurando = false;

  private chaveFonte = '';
  private fluxoDaUrl: string | null = null;
  private focoPendente: string | null = null;
  private avisouAlterado = false;
  private cargaLista?: Subscription;
  private cargaFluxo?: Subscription;
  private cargaDicionario?: Subscription;
  private destruido = false;

  ngOnInit(): void {
    this.rota.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.fluxoDaUrl = params.get('fluxo');
        const pedido = this.fluxoDaUrl;
        if (!pedido || pedido === this.chaveAtual || !this.lista.some(f => f.Chave === pedido)) return;
        if (this.sujo && !confirm(this.textoTrocarComMudancas())) {
          this.gravarNaUrl(this.chaveAtual);
          return;
        }
        this.abrirFluxo(pedido);
      });
  }

  ngOnChanges(mudancas: SimpleChanges): void {
    if (!mudancas['fonte'] || !this.fonte || this.fonte.chave === this.chaveFonte) return;
    this.chaveFonte = this.fonte.chave;
    this.carregarDicionario();
    this.carregarLista();
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.temporizador) clearTimeout(this.temporizador);
    this.pedidoDesenho?.unsubscribe();
    this.cargaLista?.unsubscribe();
    this.cargaFluxo?.unsubscribe();
    this.cargaDicionario?.unsubscribe();
  }

  // ── Quem é quem ───────────────────────────────────────────────────────────

  get doOrgao(): boolean {
    return this.fonte?.modo === 'orgao';
  }

  get podeEditar(): boolean {
    return !!this.aberto?.PodeEditar;
  }

  get podeDesfazer(): boolean {
    return this.historico.length > 0;
  }

  get textoDesfazer(): string {
    const ultimo = this.historico[this.historico.length - 1];
    return ultimo ? `Desfazer: ${ultimo.descricao}` : 'Nada para desfazer';
  }

  get temProblemas(): boolean {
    return this.errosValidacao.length > 0 || !!this.mensagemValidacao;
  }

  get totalProblemas(): number {
    return this.errosValidacao.length || (this.mensagemValidacao ? 1 : 0);
  }

  get tituloFluxo(): string {
    const a = this.aberto;
    if (!a) return '';
    return a.FiguraGuia ? `${a.FiguraGuia} · ${a.Nome}` : a.Nome;
  }

  get alteradoEm(): string {
    const item = this.lista.find(f => f.Chave === this.chaveAtual);
    return item?.AlteradoEm ? quandoEQuem(item.AlteradoEm, item.AlteradoPor) : '';
  }

  get textoEstadoDesenho(): string {
    switch (this.estadoDesenho) {
      case 'esperando': return 'O desenho muda em instantes.';
      case 'desenhando': return 'Desenhando...';
      case 'ok': return this.sujo ? 'Desenho atualizado (ainda não salvo).' : 'Desenho do fluxo salvo.';
      case 'invalido': return 'O fluxo tem problemas: o desenho é o último sem problemas.';
      case 'erro': return '';
      default: return '';
    }
  }

  get altDesenho(): string {
    const nome = this.aberto?.Nome ?? '';
    const raias = this.raias.length === 1 ? '1 raia' : `${this.raias.length} raias`;
    const passos = this.totalPassos === 1 ? '1 passo' : `${this.totalPassos} passos`;
    return `Desenho do fluxo ${nome}, com ${raias} e ${passos}. A descrição em texto, em lista numerada, está logo abaixo do desenho.`;
  }

  get ajudaDicionario(): string {
    return this.doOrgao
      ? 'Com um nome do dicionário, a raia acompanha o nome que o órgão escreveu no passo do dicionário de nomes: trocou lá, muda em todos os fluxos.'
      : 'Com um nome do dicionário, cada órgão vê o nome que escreveu no dicionário de nomes dele. Aqui aparece o nome padrão do guia.';
  }

  // ── Rótulos (consultas baratas: os mapas são refeitos a cada mudança) ─────

  rotulo(e: PeFluxoElemento): string {
    return this.rotulos.get(e.Id) ?? e.Nome;
  }

  rotuloPorId(id: string): string {
    const e = this.elementos.get(id);
    return e ? this.rotulo(e) : 'um passo que não existe mais';
  }

  existe(id: string): boolean {
    return this.elementos.has(id);
  }

  existeRaia(id: string): boolean {
    return this.raias.some(r => r.Id === id);
  }

  resumo(e: PeFluxoElemento): string {
    return this.resumos.get(e.Id) ?? '';
  }

  rotuloTipo(tipo: string): string {
    return rotuloTipoElemento(tipo);
  }

  icone(e: PeFluxoElemento): string {
    return iconeTipoElemento(e.Tipo);
  }

  explicacaoTipo(tipo: string): string {
    return explicacaoTipoElemento(tipo);
  }

  rotuloNome(e: PeFluxoElemento): string {
    return rotuloNomeElemento(e.Tipo);
  }

  pedeNome(e: PeFluxoElemento): boolean {
    return tipoPedeNome(e.Tipo);
  }

  numerado(e: PeFluxoElemento): boolean {
    return tipoNumerado(e.Tipo);
  }

  numero(e: PeFluxoElemento): string {
    return this.numeros.get(e.Id) ?? '';
  }

  nomeRaia(r: PeFluxoRaia): string {
    return resolverNomes(r.Nome, this.dicionario).trim() || 'Raia sem nome';
  }

  marcadorDaRaia(r: PeFluxoRaia): string | null {
    return marcadorDoNome(r.Nome);
  }

  descricaoMarcador(marcador: string): string {
    return descricaoDoMarcador(marcador, this.dicionario);
  }

  valorMarcador(marcador: string): string {
    return valorDoMarcador(marcador, this.dicionario);
  }

  /** O nome do dicionário ainda não foi escrito pelo órgão: vale o nome padrão do guia. */
  raiaSemNomeNoDicionario(r: PeFluxoRaia): boolean {
    const m = marcadorDoNome(r.Nome);
    return !!m && marcadorSemValor(m, this.dicionario);
  }

  passosDaRaia(r: PeFluxoRaia): PeFluxoElemento[] {
    return this.porRaia.get(r.Id) ?? [];
  }

  quantosNaRaia(r: PeFluxoRaia): number {
    return this.porRaia.get(r.Id)?.length ?? 0;
  }

  antesDe(e: PeFluxoElemento): PeFluxoLigacao[] {
    return this.antes.get(e.Id) ?? [];
  }

  deDecisao(e: PeFluxoElemento): PeFluxoLigacao[] {
    return this.chegaDeDecisao.get(e.Id) ?? [];
  }

  saidasDe(e: PeFluxoElemento): PeFluxoLigacao[] {
    return this.saidas.get(e.Id) ?? [];
  }

  /** Quem pode vir antes de um passo: qualquer passo menos ele mesmo, o fim e as decisões (que ligam pelas saídas). */
  origensDe(e: PeFluxoElemento): PeFluxoElemento[] {
    return this.origensPossiveis.filter(o => o.Id !== e.Id);
  }

  /** Para onde a saída de uma decisão pode ir: qualquer passo menos ela mesma e o início. */
  destinosDe(e: PeFluxoElemento): PeFluxoElemento[] {
    return this.destinosPossiveis.filter(o => o.Id !== e.Id);
  }

  jaVemDepois(e: PeFluxoElemento, origem: PeFluxoElemento): boolean {
    return !!this.origensJaUsadas.get(e.Id)?.has(origem.Id);
  }

  jaESaida(e: PeFluxoElemento, destino: PeFluxoElemento): boolean {
    return !!this.destinosJaUsados.get(e.Id)?.has(destino.Id);
  }

  estaAberto(e: PeFluxoElemento): boolean {
    return this.abertos.has(e.Id);
  }

  aceitaDepois(e: PeFluxoElemento): boolean {
    return !!this.def && aceitaPassoDepois(this.def, e.Id);
  }

  artefatos(e: PeFluxoElemento): string {
    return juntar(e.Artefatos);
  }

  escolherAntes(e: PeFluxoElemento, valor: string): void {
    this.novoAntes.set(e.Id, valor);
    this.errosLocais.delete(`antes:${e.Id}`);
  }

  escreverArtefato(e: PeFluxoElemento, valor: string): void {
    this.novoArtefato.set(e.Id, valor);
    this.errosLocais.delete(`artefato:${e.Id}`);
  }

  erroLocal(chave: string): string | null {
    return this.errosLocais.get(chave) ?? null;
  }

  novaSaidaDe(e: PeFluxoElemento): NovaSaida {
    let nova = this.novaSaida.get(e.Id);
    if (!nova) {
      nova = { rotulo: '', destino: '' };
      this.novaSaida.set(e.Id, nova);
    }
    return nova;
  }

  // ── Ids na tela ───────────────────────────────────────────────────────────

  private seguro(id: string): string {
    return id.replace(/[^A-Za-z0-9_-]/g, '_');
  }

  idEl(e: PeFluxoElemento, parte: string): string {
    return `pe-fx-e-${this.seguro(e.Id)}-${parte}`;
  }

  idLig(l: PeFluxoLigacao, parte: string): string {
    return `pe-fx-l-${this.seguro(l.Id)}-${parte}`;
  }

  idRaia(r: PeFluxoRaia, parte: string): string {
    return `pe-fx-r-${this.seguro(r.Id)}-${parte}`;
  }

  porId(_: number, item: { Id: string }): string {
    return item.Id;
  }

  porChave(_: number, item: { Chave: string }): string {
    return item.Chave;
  }

  porIndice(i: number): number {
    return i;
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  carregarLista(silencioso = false): void {
    this.cargaLista?.unsubscribe();
    if (!silencioso) {
      this.carregandoLista = true;
      this.erroLista = null;
    }
    this.cargaLista = this.fonte.listar().subscribe({
      next: lista => {
        this.carregandoLista = false;
        this.lista = lista;
        if (silencioso) return;
        const pedido = [this.fluxoDaUrl, this.chaveAtual].find(c => !!c && lista.some(f => f.Chave === c));
        const chave = pedido ?? lista[0]?.Chave ?? null;
        if (chave) this.abrirFluxo(chave);
        else this.limparFluxo();
      },
      error: erro => {
        this.carregandoLista = false;
        if (silencioso) return;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar os fluxos.');
        if (mensagem !== null) this.erroLista = mensagem;
      }
    });
  }

  private carregarDicionario(): void {
    this.cargaDicionario?.unsubscribe();
    this.cargaDicionario = this.fonte.dicionario().subscribe(dicionario => {
      this.dicionario = dicionario;
      this.recalcular();
    });
  }

  /** Escolha na lista: pergunta antes de perder o que não foi salvo. */
  escolher(item: PeFluxoItem): void {
    if (item.Chave === this.chaveAtual) {
      this.focoPendente = 'pe-fx-fluxo-titulo';
      return;
    }
    if (this.sujo && !confirm(this.textoTrocarComMudancas())) return;
    this.abrirFluxo(item.Chave);
    this.gravarNaUrl(item.Chave);
  }

  private textoTrocarComMudancas(): string {
    return 'Este fluxo tem mudanças que ainda não foram salvas. Trocar de fluxo assim mesmo? Elas vão se perder.';
  }

  private gravarNaUrl(chave: string | null): void {
    this.router.navigate([], { relativeTo: this.rota, queryParams: { fluxo: chave }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private abrirFluxo(chave: string): void {
    this.cargaFluxo?.unsubscribe();
    this.chaveAtual = chave;
    this.carregandoFluxo = true;
    this.erroFluxo = null;
    this.cargaFluxo = this.fonte.abrir(chave).subscribe({
      next: aberto => {
        this.carregandoFluxo = false;
        this.aplicarAberto(aberto, true);
      },
      error: erro => {
        this.carregandoFluxo = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível abrir este fluxo.');
        if (mensagem !== null) this.erroFluxo = mensagem;
      }
    });
  }

  tentarAbrirDeNovo(): void {
    if (this.chaveAtual) this.abrirFluxo(this.chaveAtual);
    else this.carregarLista();
  }

  private limparFluxo(): void {
    this.aberto = null;
    this.def = null;
    this.svg = null;
    this.chaveAtual = null;
    this.definirSujo(false);
  }

  /**
   * O fluxo como veio do servidor vira a cópia de trabalho. `novo`: outro fluxo
   * (a tela volta ao começo: passos fechados, comparação fechada).
   */
  private aplicarAberto(aberto: PeFluxoAberto, novo: boolean): void {
    this.aberto = aberto;
    this.def = clonarDefinicao(aberto.Definicao);
    this.nome = aberto.Nome;
    this.erroNome = null;
    this.retratoSalvo = retratoFluxo(this.nome, this.def);
    this.historico = [];
    this.renomeando = null;
    this.erroRaia = null;
    this.errosLocais.clear();
    this.novoAntes.clear();
    this.novaSaida.clear();
    this.novoArtefato.clear();
    this.errosValidacao = [];
    this.mensagemValidacao = null;
    this.retratoValidado = '';
    this.totalAnunciado = -1;
    if (novo) {
      this.abertos.clear();
      this.svg = null;
      this.retratoDesenhado = '';
      this.comparando = false;
      this.svgModelo = null;
      this.defModelo = null;
      this.numerosModelo = null;
      this.chaveModelo = null;
    }
    this.recalcular();
    this.agendarDesenho(true);
  }

  // ── Derivados ─────────────────────────────────────────────────────────────

  /** Refaz a ordem, os números, os rótulos e as listas da tela depois de uma mudança. */
  private recalcular(): void {
    const def = this.def;
    if (!def) return;
    this.definirSujo(retratoFluxo(this.nome, def) !== this.retratoSalvo);

    const { ordem, ligacoes } = ordemDoFluxo(def);
    const doServidor = numerosDoServidor(def);
    // Sem mudança pendente valem os números do servidor (os do desenho); com mudança, a mesma regra aqui
    this.numeros = !this.sujo && doServidor.size > 0 ? doServidor : numerosDoFluxo(def, ordem);
    const vizinhos = vizinhosDoFluxo(ligacoes);
    this.rotulos = rotulosDosElementos(def, this.numeros, this.dicionario, vizinhos, ordem);
    this.elementos = new Map(def.Elementos.map(e => [e.Id, e]));
    this.raias = raiasEmOrdem(def);
    this.totalPassos = def.Elementos.length;

    const idsRaias = new Set(this.raias.map(r => r.Id));
    this.porRaia = new Map(this.raias.map(r => [r.Id, [] as PeFluxoElemento[]]));
    this.semRaia = [];
    for (const e of ordem) {
      if (idsRaias.has(e.RaiaId)) this.porRaia.get(e.RaiaId)!.push(e);
      else this.semRaia.push(e);
    }

    // Ligações pela ponta que se edita: a saída da decisão na decisão; as demais em "vem depois de"
    this.antes = new Map();
    this.chegaDeDecisao = new Map();
    this.saidas = new Map();
    this.origensJaUsadas = new Map();
    this.destinosJaUsados = new Map();
    for (const l of def.Ligacoes) {
      const de = this.elementos.get(l.De);
      if (de?.Tipo === 'decisao') {
        this.saidas.set(l.De, [...(this.saidas.get(l.De) ?? []), l]);
        this.destinosJaUsados.set(l.De, new Set([...(this.destinosJaUsados.get(l.De) ?? []), l.Para]));
        if (this.elementos.has(l.Para)) this.chegaDeDecisao.set(l.Para, [...(this.chegaDeDecisao.get(l.Para) ?? []), l]);
      } else {
        this.antes.set(l.Para, [...(this.antes.get(l.Para) ?? []), l]);
        this.origensJaUsadas.set(l.Para, new Set([...(this.origensJaUsadas.get(l.Para) ?? []), l.De]));
      }
    }
    this.origensPossiveis = ordem.filter(e => e.Tipo !== 'fim' && e.Tipo !== 'decisao');
    this.destinosPossiveis = ordem.filter(e => e.Tipo !== 'inicio');

    // Resumo de cada passo: o que vem antes e o que vem depois
    this.resumos = new Map();
    for (const e of def.Elementos) {
      const antes = (vizinhos.entradas.get(e.Id) ?? []).map(l => this.rotuloPorId(l.De));
      const depois = (vizinhos.saidas.get(e.Id) ?? []).map(l => l.Rotulo ? `${this.rotuloPorId(l.Para)} (${l.Rotulo})` : this.rotuloPorId(l.Para));
      const partes: string[] = [];
      if (e.Tipo !== 'inicio') partes.push(antes.length ? `Vem depois de: ${juntar(antes)}` : 'Não vem depois de nenhum passo');
      if (e.Tipo !== 'fim') partes.push(depois.length ? `Depois: ${juntar(depois)}` : 'Não segue para nenhum passo');
      this.resumos.set(e.Id, partes.join(' · '));
    }

    this.descricao = descricaoDoFluxo(def, this.dicionario, this.numeros);
  }

  private definirSujo(sujo: boolean): void {
    this.sujo = sujo;
    if (sujo === this.avisouAlterado) return;
    this.avisouAlterado = sujo;
    this.alterado.emit(sujo);
  }

  // ── Mudanças (cada uma guarda o retrato de antes, para o "Desfazer") ──────

  /** Aplica uma mudança na cópia de trabalho e devolve o que ela devolveu (null quando não pôde mudar). */
  private mudar<T>(descricao: string, mudanca: (def: PeFluxoDefinicao) => T, agrupar: string | null = null): T | null {
    if (!this.def || !this.podeEditar) return null;
    this.registrar(descricao, agrupar);
    const resultado = mudanca(this.def);
    this.depoisDeMudar();
    return resultado;
  }

  private registrar(descricao: string, agrupar: string | null): void {
    const agora = Date.now();
    const ultimo = this.historico[this.historico.length - 1];
    if (agrupar && ultimo?.agrupar === agrupar && agora - ultimo.em < JANELA_AGRUPAR_MS) {
      ultimo.em = agora;
      return;
    }
    this.historico.push({ retrato: JSON.stringify({ nome: this.nome, def: this.def }), descricao, agrupar, em: agora });
    if (this.historico.length > LIMITE_HISTORICO) this.historico.shift();
  }

  private depoisDeMudar(): void {
    this.recalcular();
    this.agendarDesenho();
  }

  desfazer(): void {
    const ultimo = this.historico.pop();
    if (!ultimo || !this.def) return;
    const { nome, def } = JSON.parse(ultimo.retrato) as { nome: string; def: PeFluxoDefinicao };
    this.nome = nome;
    this.def = normalizarDefinicao(def);
    this.renomeando = null;
    this.errosLocais.clear();
    for (const id of [...this.abertos]) if (!this.def.Elementos.some(e => e.Id === id)) this.abertos.delete(id);
    this.depoisDeMudar();
    this.acessibilidade.anunciar(`Desfeito: ${ultimo.descricao}.`);
  }

  descartar(): void {
    if (!this.aberto || !this.sujo) return;
    if (!confirm('Descartar as mudanças deste fluxo? Ele volta a ser como estava salvo.')) return;
    this.aplicarAberto(this.aberto, false);
    const texto = 'As mudanças foram descartadas.';
    this.notificacoes.info(texto);
    this.acessibilidade.anunciar(texto);
  }

  mudarNomeFluxo(valor: string): void {
    if (!this.def || !this.podeEditar) return;
    this.registrar('mudar o nome do fluxo', 'nome-fluxo');
    this.nome = valor;
    this.erroNome = null;
    this.recalcular();
  }

  mudarPrefixo(valor: string): void {
    this.mudar('mudar o prefixo da numeração', def => def.PrefixoNumeracao = valor, 'prefixo');
  }

  // ── Raias ─────────────────────────────────────────────────────────────────

  novaRaia(): void {
    const nova = this.mudar('incluir uma raia', def => incluirRaia(def, 'Nova raia'));
    if (!nova) return;
    this.renomear(nova, true);
    this.acessibilidade.anunciar('Raia nova incluída no fim da lista. Escolha um nome do dicionário ou escreva o nome dela.');
  }

  /** Abre o formulário do nome da raia (na raia nova, com o campo do nome em branco). */
  renomear(r: PeFluxoRaia, nova = false): void {
    const marcador = marcadorDoNome(r.Nome);
    this.renomeando = r.Id;
    this.erroRaia = null;
    this.formRaia = { marcador: marcador ?? '', texto: marcador || nova ? '' : r.Nome };
    this.focoPendente = this.idRaia(r, nova ? 'marcador' : marcador ? 'marcador' : 'texto');
  }

  cancelarRenomear(r: PeFluxoRaia): void {
    this.renomeando = null;
    this.erroRaia = null;
    this.focoPendente = this.idRaia(r, 'renomear');
  }

  confirmarRenomear(r: PeFluxoRaia): void {
    const texto = this.formRaia.texto.trim();
    const nome = this.formRaia.marcador ? `{${this.formRaia.marcador}}` : texto;
    if (!nome) {
      this.erroRaia = 'Escreva o nome da raia ou escolha um nome do dicionário.';
      this.focoPendente = this.idRaia(r, 'texto');
      return;
    }
    const antes = this.nomeRaia(r);
    if (nome !== r.Nome) this.mudar(`renomear a raia ${antes}`, () => r.Nome = nome);
    this.renomeando = null;
    this.erroRaia = null;
    this.focoPendente = this.idRaia(r, 'renomear');
    this.acessibilidade.anunciar(`Raia renomeada: ${this.nomeRaia(r)}.`);
  }

  subirOuDescer(r: PeFluxoRaia, passo: -1 | 1): void {
    const nome = this.nomeRaia(r);
    const posicao = this.mudar(passo < 0 ? `subir a raia ${nome}` : `descer a raia ${nome}`, def => moverRaia(def, r.Id, passo)) ?? -1;
    if (posicao < 0) return;
    const total = this.raias.length;
    this.acessibilidade.anunciar(`A raia ${nome} agora é a ${posicao + 1}ª de ${total}.`);
    // O foco fica no mesmo botão (ou no outro, quando este desliga na ponta)
    const ponta = passo < 0 ? posicao === 0 : posicao === total - 1;
    this.focoPendente = this.idRaia(r, ponta ? (passo < 0 ? 'descer' : 'subir') : (passo < 0 ? 'subir' : 'descer'));
  }

  tirarRaia(r: PeFluxoRaia): void {
    if (!this.def || !this.podeEditar) return;
    const nome = this.nomeRaia(r);
    const passos = this.quantosNaRaia(r);
    const aviso = `Remover a raia "${nome}"?`
      + (passos ? ` ${passos === 1 ? 'O passo dela sai' : `Os ${passos} passos dela saem`} junto, com as ligações.` : '')
      + ' Dá para desfazer com o botão "Desfazer".';
    if (!confirm(aviso)) return;
    const indice = this.raias.findIndex(x => x.Id === r.Id);
    this.mudar(`remover a raia ${nome}`, def => removerRaia(def, r.Id));
    if (this.renomeando === r.Id) this.renomeando = null;
    this.acessibilidade.anunciar(`Raia ${nome} removida.`);
    const vizinha = this.raias[Math.min(indice, this.raias.length - 1)];
    this.focoPendente = vizinha ? this.idRaia(vizinha, 'titulo') : 'pe-fx-incluir-raia';
  }

  // ── Passos ────────────────────────────────────────────────────────────────

  alternar(e: PeFluxoElemento): void {
    if (this.abertos.has(e.Id)) {
      this.abertos.delete(e.Id);
    } else {
      this.abertos.add(e.Id);
      this.focoPendente = this.idEl(e, 'tipo');
    }
  }

  incluirPassoNaRaia(r: PeFluxoRaia): void {
    const novo = this.mudar(`incluir um passo na raia ${this.nomeRaia(r)}`, def => incluirElemento(def, r.Id, 'tarefa'));
    if (!novo) return;
    this.abrirPassoNovo(novo, `Tarefa nova incluída na raia ${this.nomeRaia(r)}. Escreva o nome e diga, em "Vem depois de", o passo que vem antes dela.`);
  }

  incluirDepois(e: PeFluxoElemento): void {
    if (!this.aceitaDepois(e)) return;
    const ref = this.rotulo(e);
    const novo = this.mudar(`incluir um passo depois de ${ref}`, def => incluirPassoDepois(def, e.Id));
    if (!novo) return;
    this.abrirPassoNovo(novo, `Tarefa nova incluída depois de ${ref}. Escreva o nome dela.`);
  }

  private abrirPassoNovo(novo: PeFluxoElemento, aviso: string): void {
    this.abertos.add(novo.Id);
    this.focoPendente = this.idEl(novo, 'nome');
    this.acessibilidade.anunciar(aviso);
  }

  removerPasso(e: PeFluxoElemento): void {
    if (!this.def || !this.podeEditar) return;
    const nome = this.rotulo(e);
    if (!confirm(`Remover "${nome}"? As ligações dele saem junto. Dá para desfazer com o botão "Desfazer".`)) return;
    const raia = this.raias.find(r => r.Id === e.RaiaId) ?? null;
    const lista = this.porRaia.get(e.RaiaId) ?? [];
    const indice = lista.findIndex(x => x.Id === e.Id);
    const religou = this.mudar(`remover ${nome}`, def => removerElemento(def, e.Id));
    this.abertos.delete(e.Id);
    this.acessibilidade.anunciar(religou
      ? `${nome} saiu. ${this.rotuloPorId(religou.de)} agora liga direto em ${this.rotuloPorId(religou.para)}.`
      : `${nome} saiu. Confira as ligações dos passos em volta.`);
    const restantes = raia ? this.passosDaRaia(raia) : [];
    const vizinho = restantes[Math.min(Math.max(indice, 0), restantes.length - 1)];
    this.focoPendente = vizinho ? this.idEl(vizinho, 'editar') : raia ? this.idRaia(raia, 'incluir-passo') : 'pe-fx-incluir-raia';
  }

  mudarTipo(e: PeFluxoElemento, tipo: PeTipoElementoFluxo): void {
    if (tipo === e.Tipo) return;
    this.mudar(`mudar o tipo de ${this.rotulo(e)}`, def => mudarTipoElemento(def, e.Id, tipo), `tipo:${e.Id}`);
  }

  mudarNome(e: PeFluxoElemento, valor: string): void {
    this.mudar(`mudar o nome de ${this.rotulo(e)}`, () => e.Nome = valor, `nome:${e.Id}`);
  }

  mudarRaia(e: PeFluxoElemento, raiaId: string): void {
    if (raiaId === e.RaiaId) return;
    this.mudar(`mudar a raia de ${this.rotulo(e)}`, () => e.RaiaId = raiaId, `raia:${e.Id}`);
    this.focoPendente = this.idEl(e, 'raia');
  }

  // ── Ligações: "vem depois de" e as saídas da decisão ──────────────────────

  mudarOrigem(l: PeFluxoLigacao, origem: string, e: PeFluxoElemento): void {
    if (!origem || origem === l.De || origem === l.Para) return;
    if (this.def?.Ligacoes.some(x => x !== l && x.De === origem && x.Para === l.Para)) return;
    this.mudar(`mudar o passo antes de ${this.rotulo(e)}`, () => l.De = origem, `origem:${l.Id}`);
  }

  incluirAntes(e: PeFluxoElemento): void {
    const origem = this.novoAntes.get(e.Id) ?? '';
    if (!origem) {
      this.errosLocais.set(`antes:${e.Id}`, 'Escolha o passo que vem antes.');
      this.focoPendente = this.idEl(e, 'antes-novo');
      return;
    }
    if (this.def?.Ligacoes.some(l => l.De === origem && l.Para === e.Id)) {
      this.errosLocais.set(`antes:${e.Id}`, 'Este passo já vem depois do passo escolhido.');
      this.focoPendente = this.idEl(e, 'antes-novo');
      return;
    }
    if (!this.mudar(`incluir um passo antes de ${this.rotulo(e)}`, def => incluirLigacao(def, origem, e.Id))) return;
    this.errosLocais.delete(`antes:${e.Id}`);
    this.novoAntes.delete(e.Id);
    this.acessibilidade.anunciar(`${this.rotulo(e)} agora vem depois de ${this.rotuloPorId(origem)}.`);
    this.focoPendente = this.idEl(e, 'antes-novo');
  }

  tirarLigacao(l: PeFluxoLigacao, e: PeFluxoElemento, campoDepois: string): void {
    const de = this.rotuloPorId(l.De);
    const para = this.rotuloPorId(l.Para);
    this.mudar(`tirar a ligação de ${de} para ${para}`, def => removerLigacao(def, l.Id));
    this.acessibilidade.anunciar(`Ligação tirada: ${de} não leva mais a ${para}.`);
    this.focoPendente = this.idEl(e, campoDepois);
  }

  mudarRotulo(l: PeFluxoLigacao, valor: string, e: PeFluxoElemento): void {
    this.mudar(`mudar o rótulo de uma saída de ${this.rotulo(e)}`, () => l.Rotulo = valor || null, `rotulo:${l.Id}`);
  }

  mudarDestino(l: PeFluxoLigacao, destino: string, e: PeFluxoElemento): void {
    if (!destino || destino === l.Para || destino === l.De) return;
    if (this.def?.Ligacoes.some(x => x !== l && x.De === l.De && x.Para === destino)) return;
    this.mudar(`mudar o destino de uma saída de ${this.rotulo(e)}`, () => l.Para = destino, `destino:${l.Id}`);
  }

  incluirSaida(e: PeFluxoElemento): void {
    const nova = this.novaSaidaDe(e);
    const rotulo = nova.rotulo.trim();
    const chaveErro = `saida:${e.Id}`;
    if (!rotulo || !nova.destino) {
      this.errosLocais.set(chaveErro, !rotulo ? 'Escreva o rótulo da saída, como "Sim" ou "Não".' : 'Escolha para onde a saída vai.');
      this.focoPendente = this.idEl(e, !rotulo ? 'saida-nova-rotulo' : 'saida-nova-destino');
      return;
    }
    if (this.def?.Ligacoes.some(l => l.De === e.Id && l.Para === nova.destino)) {
      this.errosLocais.set(chaveErro, 'A decisão já tem uma saída para este passo.');
      this.focoPendente = this.idEl(e, 'saida-nova-destino');
      return;
    }
    if (!this.mudar(`incluir uma saída em ${this.rotulo(e)}`, def => incluirLigacao(def, e.Id, nova.destino, rotulo))) return;
    this.errosLocais.delete(chaveErro);
    this.novaSaida.delete(e.Id);
    this.acessibilidade.anunciar(`Saída "${rotulo}" incluída: vai para ${this.rotuloPorId(nova.destino)}.`);
    this.focoPendente = this.idEl(e, 'saida-nova-rotulo');
  }

  // ── Documentos (artefatos) ────────────────────────────────────────────────

  incluirArtefato(e: PeFluxoElemento, evento?: Event): void {
    evento?.preventDefault();
    const nome = (this.novoArtefato.get(e.Id) ?? '').trim();
    const chaveErro = `artefato:${e.Id}`;
    if (!nome) {
      this.errosLocais.set(chaveErro, 'Escreva o nome do documento.');
      this.focoPendente = this.idEl(e, 'artefato-novo');
      return;
    }
    if (e.Artefatos.some(a => a.trim().toLowerCase() === nome.toLowerCase())) {
      this.errosLocais.set(chaveErro, 'Este documento já está na lista.');
      return;
    }
    this.mudar(`incluir um documento em ${this.rotulo(e)}`, () => e.Artefatos = [...e.Artefatos, nome]);
    this.errosLocais.delete(chaveErro);
    this.novoArtefato.delete(e.Id);
    this.acessibilidade.anunciar(`Documento incluído: ${nome}.`);
    this.focoPendente = this.idEl(e, 'artefato-novo');
  }

  tirarArtefato(e: PeFluxoElemento, i: number): void {
    const nome = e.Artefatos[i];
    this.mudar(`tirar um documento de ${this.rotulo(e)}`, () => e.Artefatos = e.Artefatos.filter((_, j) => j !== i));
    this.acessibilidade.anunciar(`Documento tirado: ${nome}.`);
    this.focoPendente = this.idEl(e, 'artefato-novo');
  }

  // ── Desenho (prévia pela API, com espera entre as digitações) ─────────────

  private agendarDesenho(imediato = false): void {
    if (!this.def || !this.noNavegador) return;
    const retrato = JSON.stringify(definicaoParaEnvio(this.def));
    if (retrato === this.retratoDesenhado && this.estadoDesenho !== 'erro') {
      // Voltou ao que já está desenhado (ex.: "Desfazer"): nada a pedir
      if (this.temporizador) clearTimeout(this.temporizador);
      this.temporizador = null;
      this.pedidoDesenho?.unsubscribe();
      if (this.estadoDesenho === 'esperando' || this.estadoDesenho === 'desenhando') this.estadoDesenho = this.temProblemas ? 'invalido' : 'ok';
      return;
    }
    if (this.temporizador) clearTimeout(this.temporizador);
    this.estadoDesenho = 'esperando';
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      this.desenhar();
    }, imediato ? 0 : ESPERA_DESENHO_MS);
  }

  desenharDeNovo(): void {
    this.retratoDesenhado = '';
    this.agendarDesenho(true);
  }

  private desenhar(): void {
    const def = this.def;
    const chave = this.chaveAtual;
    if (!def || !chave || this.destruido) return;
    const envio = definicaoParaEnvio(def);
    const retrato = JSON.stringify(envio);
    // O pedido anterior, se ainda não voltou, não vale mais
    this.pedidoDesenho?.unsubscribe();
    this.estadoDesenho = 'desenhando';
    const pedido = this.podeEditar ? this.fonte.desenhar(envio) : this.fonte.desenhoSalvo(chave);
    this.pedidoDesenho = pedido.subscribe({
      next: svg => {
        this.svg = svg;
        this.retratoDesenhado = retrato;
        this.estadoDesenho = 'ok';
        this.erroDesenho = null;
        this.definirProblemas(retrato, [], null);
      },
      error: erro => {
        const lido = lerErroFluxo(erro);
        // 403: o interceptor já tirou a pessoa do módulo
        if (lido.status === 403) return;
        if (lido.status === 400) {
          this.retratoDesenhado = retrato;
          this.estadoDesenho = 'invalido';
          this.erroDesenho = null;
          this.definirProblemas(retrato, lido.erros, lido.erros.length ? null : (lido.mensagem ?? 'O fluxo tem um problema.'));
          return;
        }
        this.estadoDesenho = 'erro';
        this.erroDesenho = lido.mensagem ?? 'Não foi possível desenhar o fluxo agora. Confira a conexão e tente de novo.';
      }
    });
  }

  /** Os problemas que a API achou na definição (a lista na tela e o aviso ao leitor de tela quando a contagem muda). */
  private definirProblemas(retrato: string, erros: string[], mensagem: string | null): void {
    this.errosValidacao = erros;
    this.mensagemValidacao = mensagem;
    this.retratoValidado = retrato;
    const total = this.totalProblemas;
    if (total === this.totalAnunciado) return;
    const primeira = this.totalAnunciado < 0;
    this.totalAnunciado = total;
    // Ao abrir um fluxo sem problemas, não há o que avisar
    if (primeira && total === 0) return;
    this.acessibilidade.anunciar(total === 0
      ? 'O fluxo está sem problemas.'
      : total === 1 ? 'O fluxo tem 1 problema, na lista de problemas.' : `O fluxo tem ${total} problemas, na lista de problemas.`);
  }

  irParaPrevia(): void {
    this.focoPendente = 'pe-fx-desenho-regiao';
  }

  // ── Salvar, voltar ao modelo e comparar ───────────────────────────────────

  salvar(): void {
    const def = this.def;
    const aberto = this.aberto;
    if (!def || !aberto || this.salvando || !this.podeEditar) return;
    const nome = this.nome.trim();
    if (!nome) {
      this.erroNome = 'Escreva o nome do fluxo.';
      this.focoPendente = 'pe-fx-nome';
      return;
    }
    const envio = definicaoParaEnvio(def);
    const retrato = JSON.stringify(envio);
    if (this.retratoValidado === retrato && this.temProblemas) {
      this.focoPendente = 'pe-fx-problemas';
      this.acessibilidade.anunciar('Corrija os problemas do fluxo antes de salvar.');
      return;
    }
    this.gravar(aberto.Chave, nome, envio, retrato, `Fluxo "${nome}" salvo.`);
  }

  /** O modelo mudou: o órgão fica com a adaptação dele (gravar de novo tira o aviso). */
  manterAdaptacao(): void {
    const aberto = this.aberto;
    if (!aberto || !this.podeEditar || this.sujo || this.salvando) return;
    const envio = definicaoParaEnvio(aberto.Definicao);
    this.gravar(aberto.Chave, aberto.Nome.trim() || aberto.Chave, envio, JSON.stringify(envio), 'O órgão ficou com a adaptação dele neste fluxo.');
  }

  private gravar(chave: string, nome: string, envio: PeFluxoDefinicao, retrato: string, sucesso: string): void {
    this.salvando = true;
    // O que estava na tela ao enviar: se a pessoa mudou algo enquanto salvava, a mudança nova fica
    const naTelaAoEnviar = this.def ? retratoFluxo(this.nome, this.def) : '';
    this.fonte.salvar(chave, { Nome: nome, Definicao: envio }).subscribe({
      next: salvo => {
        this.salvando = false;
        if (this.chaveAtual !== chave) return;
        if (this.def && retratoFluxo(this.nome, this.def) !== naTelaAoEnviar) {
          this.aberto = salvo;
          this.retratoSalvo = retratoFluxo(salvo.Nome, salvo.Definicao);
          this.recalcular();
        } else {
          // O desenho da prévia é o do que foi salvo: só vem de novo se o servidor devolveu outra definição
          this.aplicarAberto(salvo, false);
        }
        this.notificacoes.success(sucesso);
        this.acessibilidade.anunciar(sucesso);
        this.salvou.emit();
        this.carregarLista(true);
      },
      error: erro => {
        this.salvando = false;
        const lido = lerErroFluxo(erro);
        if (lido.status === 403) return;
        if (lido.status === 400 && lido.erros.length) {
          this.definirProblemas(retrato, lido.erros, null);
          this.estadoDesenho = 'invalido';
          this.focoPendente = 'pe-fx-problemas';
          return;
        }
        this.notificacoes.error(lido.mensagem ?? 'Não foi possível salvar o fluxo. Tente de novo.');
      }
    });
  }

  get podeRestaurar(): boolean {
    return this.doOrgao && this.podeEditar && !!this.aberto && (!!this.aberto.Personalizado || this.sujo);
  }

  restaurar(): void {
    const aberto = this.aberto;
    if (!aberto || this.restaurando || !this.podeRestaurar) return;
    const pedido = this.fonte.restaurar(aberto.Chave);
    if (!pedido) return;
    if (!confirm('Voltar ao modelo do guia? As adaptações do órgão neste fluxo vão se perder, inclusive as que não foram salvas.')) return;
    this.restaurando = true;
    pedido.subscribe({
      next: modelo => {
        this.restaurando = false;
        if (this.chaveAtual !== aberto.Chave) return;
        this.aplicarAberto(modelo, false);
        const texto = 'O fluxo voltou ao modelo do guia.';
        this.notificacoes.success(texto);
        this.acessibilidade.anunciar(texto);
        this.salvou.emit();
        this.carregarLista(true);
        this.focoPendente = 'pe-fx-fluxo-titulo';
      },
      error: erro => {
        this.restaurando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível voltar ao modelo do guia. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  alternarComparacao(): void {
    this.comparando = !this.comparando;
    if (!this.comparando) return;
    const chave = this.chaveAtual;
    if (!chave || this.chaveModelo === chave) return;
    this.chaveModelo = chave;
    this.carregandoModelo = true;
    this.erroModelo = null;
    this.svgModelo = null;
    this.defModelo = null;
    this.numerosModelo = null;
    this.fonte.desenhoDoModelo(chave).subscribe({
      next: svg => {
        if (this.chaveModelo !== chave) return;
        this.svgModelo = svg;
        this.carregandoModelo = false;
      },
      error: erro => {
        if (this.chaveModelo !== chave) return;
        this.carregandoModelo = false;
        this.chaveModelo = null;
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar o desenho do modelo do guia.');
        if (mensagem !== null) this.erroModelo = mensagem;
      }
    });
    this.fonte.modeloDoGuia(chave).subscribe({
      next: modelo => {
        if (this.chaveModelo !== chave || !modelo) return;
        this.defModelo = normalizarDefinicao(modelo.Definicao);
        const numeros = numerosDoServidor(this.defModelo);
        this.numerosModelo = numeros.size ? numeros : null;
      },
      error: () => {
        // Sem a definição do modelo, a comparação fica só com o desenho
      }
    });
  }
}
