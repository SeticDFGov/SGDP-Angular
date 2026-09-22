import { Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Citações de uma norma viram chips com o texto do dispositivo no hover.
 *
 * Núcleo compartilhado (2026-09-22) do que antes vivia só em
 * `pgia/shared/cita-decreto.directive.ts`: a diretiva concreta de cada norma
 * (`citaDecreto` para o Decreto nº 48.901/2026, `citaIn` para a IN SGDI nº
 * 1/2026) só diz qual norma é (`NormaCitavel`). O texto de cada norma continua
 * no chunk lazy do seu módulo: este arquivo não importa nenhum deles.
 *
 * A diretiva entra UMA vez no elemento-raiz da página. Depois do render ela
 * varre os textos visíveis, acha as citações ("art. 23, III", "arts. 15 a 17",
 * "art. 16, § 1º"...) e embrulha cada uma num chip. Um MutationObserver
 * reprocessa o que aparece depois (dados que chegam da API, `*ngIf`).
 *
 * Só roda no browser: no SSR não existe DOM e nada acontece.
 */

// ── Modelo da norma transcrita ──────────────────────────────────────────────

export interface ItemNorma {
  /** "I", "§ 1º", "Parágrafo único"... */
  rotulo: string;
  texto: string;
}

export interface ParagrafoNorma extends ItemNorma {
  /** Incisos que pertencem ao parágrafo (e não ao caput), quando a norma os separa. */
  incisos?: ItemNorma[];
}

export interface DispositivoNorma {
  rotulo: string;                 // "Art. 23"
  caput: string;                  // texto do caput, verbatim
  incisos?: ItemNorma[];          // incisos do caput
  paragrafos?: ParagrafoNorma[];  // rotulo "§ 1º" ou "Parágrafo único"
}

export interface NormaCitavel {
  /** Nome curto, para o leitor de tela ("Decreto nº 48.901/2026"). */
  titulo: string;
  /** Rodapé do painel ("Decreto nº 48.901, de 03 de julho de 2026."). */
  rodape: string;
  dispositivos: Record<number, DispositivoNorma>;
  /**
   * Testada no texto logo depois da citação: citação de OUTRA norma ("art. 5º da
   * Lei...", "art. 6º, IV, do Decreto...") não vira chip.
   */
  outrasNormas: RegExp;
}

// ── Modelo do que o painel mostra ───────────────────────────────────────────

export interface DispositivoExibido {
  /** "Art. 23" */
  rotulo: string;
  caput: string;
  /** Incisos e parágrafos que a citação nomeou. */
  itens: { rotulo: string; texto: string }[];
}

type TipoParte = 'inciso' | 'paragrafo' | 'alinea';

interface ReferenciaArtigo {
  artigo: number;
  partes: { tipo: TipoParte; valor: string }[];
}

// ── Reconhecimento da citação no texto ──────────────────────────────────────

/**
 * Formas cobertas: `art. 23` · `art. 5º` · `art. 23, III` · `art. 25, I, b` ·
 * `art. 16, § 1º` · `art. 25, § 1º, d` · `art. 1º, parágrafo único` ·
 * `arts. 28 e 29` · `arts. 15 a 17` · `arts. 26, § 3º, 35 e 37` ·
 * `arts. 7º, IV e 16, § 1º` · `art. 11, § 3º, VII`. Sem a flag `i` de
 * propósito: é ela que separa inciso (romano maiúsculo) de alínea (letra
 * minúscula).
 */
export const REGEX_CITACAO = new RegExp(
  '\\b[Aa]rts?\\.\\s*' +                       // "art." ou "arts."
  '\\d+(?:\\s*[º°])?' +                        // primeiro artigo
  '(?:' +
    // inciso, parágrafo ou parágrafo único; a alínea só vem depois de um deles
    '\\s*,\\s*(?:§\\s*(?:\\d+(?:\\s*[º°])?|[úu]nico)|[Pp]ar[áa]grafo\\s+[úu]nico|[IVXLCDM]+\\b)(?:\\s*,\\s*[a-z]\\b)?' +
    '|\\s*,\\s*\\d+(?:\\s*[º°])?' +            // outro artigo, separado por vírgula
    '|\\s+[ea]\\s+\\d+(?:\\s*[º°])?' +         // outro artigo ("e") ou faixa ("a")
  ')*',
  'g'
);

const TOKENS_CITACAO = new RegExp(
  '§\\s*(\\d+)(?:\\s*[º°])?' +                 // 1: parágrafo numerado
  '|(§\\s*[úu]nico|[Pp]ar[áa]grafo\\s+[úu]nico)' + // 2: parágrafo único (abreviado ou por extenso)
  '|(\\d+)(?:\\s*[º°])?' +                     // 3: número do artigo
  '|([IVXLCDM]+)\\b' +                         // 4: inciso
  '|\\b([ae])\\b' +                            // 5: separador ("e" lista, "a" faixa)
  '|([a-z])\\b',                               // 6: alínea
  'g'
);

/** Tira acentos, espaços e o indicador ordinal para comparar rótulos. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\sº°.]/g, '');
}

/** Quebra a citação nos artigos e nas partes que ela nomeia. */
export function analisarCitacao(citacao: string): ReferenciaArtigo[] {
  const corpo = citacao.replace(/^\s*[Aa]rts?\.\s*/, '');
  const referencias: ReferenciaArtigo[] = [];
  let faixa = false;

  const adicionarParte = (tipo: TipoParte, valor: string) => {
    const ultima = referencias[referencias.length - 1];
    if (ultima) ultima.partes.push({ tipo, valor });
  };

  TOKENS_CITACAO.lastIndex = 0;
  let token: RegExpExecArray | null;
  while ((token = TOKENS_CITACAO.exec(corpo)) !== null) {
    if (token[1]) {
      adicionarParte('paragrafo', `§ ${token[1]}º`);
    } else if (token[2]) {
      adicionarParte('paragrafo', 'Parágrafo único');
    } else if (token[3]) {
      const numero = Number(token[3]);
      const anterior = referencias[referencias.length - 1];
      if (faixa && anterior) {
        // "arts. 15 a 17": mostra 15, 16 e 17
        for (let i = anterior.artigo + 1; i <= numero; i++) {
          referencias.push({ artigo: i, partes: [] });
        }
      } else {
        referencias.push({ artigo: numero, partes: [] });
      }
      faixa = false;
    } else if (token[4]) {
      adicionarParte('inciso', token[4]);
    } else if (token[5]) {
      faixa = token[5] === 'a';
    } else if (token[6]) {
      adicionarParte('alinea', token[6]);
    }
  }

  return referencias;
}

/**
 * Resolve o texto de uma citação nos dispositivos a exibir. Função pura,
 * separada da diretiva de propósito, para conferir à mão o que cada forma
 * de citação devolve. Inciso citado logo depois de um parágrafo que tem os
 * seus próprios incisos ("art. 11, § 3º, VII") é procurado dentro do parágrafo.
 */
export function resolverCitacaoNorma(norma: NormaCitavel, citacao: string): DispositivoExibido[] {
  const exibidos: DispositivoExibido[] = [];

  for (const referencia of analisarCitacao(citacao)) {
    const dispositivo: DispositivoNorma | undefined = norma.dispositivos[referencia.artigo];
    if (!dispositivo) continue;

    const itens: { rotulo: string; texto: string }[] = [];
    let paragrafoAtual: ParagrafoNorma | undefined;
    for (const parte of referencia.partes) {
      if (parte.tipo === 'inciso') {
        const dentroDoParagrafo = paragrafoAtual?.incisos
          ?.find(i => normalizar(i.rotulo) === normalizar(parte.valor));
        if (dentroDoParagrafo && paragrafoAtual) {
          itens.push({ rotulo: `${paragrafoAtual.rotulo}, ${dentroDoParagrafo.rotulo}`, texto: dentroDoParagrafo.texto });
          continue;
        }
        const inciso = (dispositivo.incisos ?? [])
          .find(i => normalizar(i.rotulo) === normalizar(parte.valor));
        if (inciso) itens.push({ rotulo: inciso.rotulo, texto: inciso.texto });
      } else if (parte.tipo === 'paragrafo') {
        const paragrafo = (dispositivo.paragrafos ?? [])
          .find(p => normalizar(p.rotulo) === normalizar(parte.valor));
        if (paragrafo) itens.push({ rotulo: paragrafo.rotulo, texto: paragrafo.texto });
        paragrafoAtual = paragrafo;
      }
      // Alínea: as normas transcritas não separam alíneas: o texto do inciso
      // ou do parágrafo já as contém.
    }

    exibidos.push({ rotulo: dispositivo.rotulo, caput: dispositivo.caput, itens });
  }

  return exibidos;
}

// ── Painel flutuante (um só para a página inteira) ──────────────────────────

const CLASSES_CHIP = 'bg-blue-50 text-blue-900 rounded px-1 cursor-help whitespace-nowrap';
const CLASSES_PAINEL = 'fixed z-50 w-max max-w-[28rem] max-h-80 overflow-y-auto bg-white ' +
  'border border-gray-300 rounded-lg shadow-lg p-4 text-sm leading-relaxed text-gray-800';

class PainelCitacao {
  private static instancia: PainelCitacao | null = null;

  static obter(): PainelCitacao {
    if (!PainelCitacao.instancia) PainelCitacao.instancia = new PainelCitacao();
    return PainelCitacao.instancia;
  }

  static destruir(): void {
    PainelCitacao.instancia?.remover();
    PainelCitacao.instancia = null;
  }

  private el: HTMLElement;
  private fechamentoAgendado: number | null = null;

  private constructor() {
    this.el = document.createElement('div');
    this.el.className = CLASSES_PAINEL;
    this.el.setAttribute('role', 'tooltip');
    this.el.style.display = 'none';
    this.el.addEventListener('mouseenter', () => this.cancelarFechamento());
    this.el.addEventListener('mouseleave', () => this.agendarFechamento());
    document.body.appendChild(this.el);
    document.addEventListener('keydown', this.aoTeclar, true);
  }

  private aoTeclar = (evento: KeyboardEvent): void => {
    if (evento.key === 'Escape') this.fechar();
  };

  mostrar(chip: HTMLElement, dispositivos: DispositivoExibido[], rodape: string): void {
    this.cancelarFechamento();
    this.el.innerHTML = '';

    for (const d of dispositivos) {
      const bloco = document.createElement('div');
      bloco.className = 'mb-3 last:mb-0';

      const rotulo = document.createElement('p');
      rotulo.className = 'font-bold text-blue-900 mb-1';
      rotulo.textContent = d.rotulo;
      bloco.appendChild(rotulo);

      const caput = document.createElement('p');
      caput.className = 'mb-1';
      caput.textContent = d.caput;
      bloco.appendChild(caput);

      for (const item of d.itens) {
        const linha = document.createElement('p');
        linha.className = 'pl-3 mt-1';
        const marca = document.createElement('strong');
        marca.textContent = item.rotulo + ': ';
        linha.appendChild(marca);
        linha.appendChild(document.createTextNode(item.texto));
        bloco.appendChild(linha);
      }

      this.el.appendChild(bloco);
    }

    const pe = document.createElement('p');
    pe.className = 'text-xs text-gray-400 italic mt-2 pt-2 border-t border-gray-200';
    pe.textContent = rodape;
    this.el.appendChild(pe);

    this.el.style.display = 'block';
    this.posicionar(chip);
  }

  private posicionar(chip: HTMLElement): void {
    const area = chip.getBoundingClientRect();
    const painel = this.el.getBoundingClientRect();
    const margem = 8;

    let topo = area.bottom + 6;
    if (topo + painel.height > window.innerHeight - margem) {
      const acima = area.top - painel.height - 6;
      topo = acima >= margem ? acima : Math.max(margem, window.innerHeight - painel.height - margem);
    }

    let esquerda = area.left;
    if (esquerda + painel.width > window.innerWidth - margem) {
      esquerda = window.innerWidth - painel.width - margem;
    }

    this.el.style.top = `${Math.max(margem, topo)}px`;
    this.el.style.left = `${Math.max(margem, esquerda)}px`;
  }

  agendarFechamento(): void {
    this.cancelarFechamento();
    // Dá tempo de o mouse atravessar do chip até o painel para rolar o texto.
    this.fechamentoAgendado = window.setTimeout(() => this.fechar(), 220);
  }

  cancelarFechamento(): void {
    if (this.fechamentoAgendado !== null) {
      clearTimeout(this.fechamentoAgendado);
      this.fechamentoAgendado = null;
    }
  }

  fechar(): void {
    this.cancelarFechamento();
    this.el.style.display = 'none';
  }

  private remover(): void {
    this.cancelarFechamento();
    document.removeEventListener('keydown', this.aoTeclar, true);
    this.el.remove();
  }
}

// ── Diretiva (base: cada norma tem a sua, com o seletor e o texto dela) ─────

const MARCA_CHIP = 'data-cita-norma';
/**
 * Filtro barato antes da regex completa. Precisa aceitar o plural: "arts." não
 * contém "art."; procurar só por "art." deixaria de fora toda citação de mais
 * de um artigo. Sem a flag `g`: `test` não pode guardar posição entre chamadas.
 */
const PREFILTRO_CITACAO = /[Aa]rts?\./;
const TAGS_IGNORADAS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION']);

/**
 * O que foi criado a partir de um nó de texto.
 *
 * Invariante: os derivados (chips e caudas) são **cache do sufixo** que estava
 * naquele nó. O Angular guarda a referência do primeiro fragmento e, quando a
 * interpolação muda, reescreve a string INTEIRA nele: o sufixo antigo, que
 * virou nós irmãos, fica órfão e o texto aparece duplicado. Por isso, texto da
 * cabeça diferente do registrado = cache inválido: apagar os derivados antes
 * de reprocessar.
 */
interface DerivacaoTexto {
  cabeca: Text;
  /** Valor que a cabeça tinha quando os derivados foram criados. */
  textoCabeca: string;
  derivados: Node[];
}

@Directive()
export abstract class CitaNormaDirective implements AfterViewInit, OnDestroy {
  /** A norma transcrita que as citações desta página referem. */
  protected abstract readonly norma: NormaCitavel;

  private observador: MutationObserver | null = null;
  private agendado: number | null = null;
  private derivacoes: DerivacaoTexto[] = [];

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Fora do Angular: a varredura mexe só no DOM e não precisa disparar
    // detecção de mudanças.
    this.zone.runOutsideAngular(() => {
      this.processar();
      this.observador = new MutationObserver(() => this.agendarProcessamento());
      this.observar();
    });
  }

  ngOnDestroy(): void {
    if (this.agendado !== null) clearTimeout(this.agendado);
    this.observador?.disconnect();
    this.observador = null;
    this.derivacoes = [];
    PainelCitacao.destruir();
  }

  private observar(): void {
    this.observador?.observe(this.elementRef.nativeElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  private agendarProcessamento(): void {
    if (this.agendado !== null) clearTimeout(this.agendado);
    this.agendado = window.setTimeout(() => {
      this.agendado = null;
      this.processar();
    }, 120);
  }

  /** Varre o conteúdo da página e transforma as citações em chips. */
  private processar(): void {
    // Desligar o observador evita que as próprias marcações reiniciem a
    // varredura, e que a limpeza abaixo se apague sozinha.
    this.observador?.disconnect();
    try {
      this.invalidarDerivados();
      for (const texto of this.textosVisiveis()) this.marcarCitacoes(texto);
    } finally {
      this.observador?.takeRecords();
      this.observar();
    }
  }

  /**
   * Descarta os chips e as caudas cujo nó de origem o Angular reescreveu. Sem
   * isso o texto antigo continua na tela ao lado do novo, e cada reescrita
   * empilha mais um chip.
   */
  private invalidarDerivados(): void {
    const vivas: DerivacaoTexto[] = [];

    for (const derivacao of this.derivacoes) {
      if (!derivacao.cabeca.isConnected) continue;            // nó saiu da tela

      if (derivacao.cabeca.nodeValue === derivacao.textoCabeca) {
        vivas.push(derivacao);                                 // cache ainda vale
        continue;
      }

      // A cabeça mudou: o Angular reescreveu a interpolação inteira nela.
      for (const no of derivacao.derivados) no.parentNode?.removeChild(no);
    }

    this.derivacoes = vivas;
  }

  private textosVisiveis(): Text[] {
    const raiz = this.elementRef.nativeElement;
    const encontrados: Text[] = [];
    const percurso = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: (no: Node) => {
        if (!no.nodeValue || !PREFILTRO_CITACAO.test(no.nodeValue)) return NodeFilter.FILTER_REJECT;
        for (let pai = no.parentElement; pai && pai !== raiz.parentElement; pai = pai.parentElement) {
          if (TAGS_IGNORADAS.has(pai.tagName)) return NodeFilter.FILTER_REJECT;
          if (pai.hasAttribute(MARCA_CHIP)) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let no = percurso.nextNode();
    while (no) {
      encontrados.push(no as Text);
      no = percurso.nextNode();
    }
    return encontrados;
  }

  private marcarCitacoes(no: Text): void {
    const texto = no.nodeValue ?? '';
    REGEX_CITACAO.lastIndex = 0;

    const achados: { inicio: number; fim: number; citacao: string; dispositivos: DispositivoExibido[] }[] = [];
    let encontrado: RegExpExecArray | null;
    while ((encontrado = REGEX_CITACAO.exec(texto)) !== null) {
      // O número do artigo pode vir seguido de espaço ("art. 23 do Decreto"):
      // o chip cobre só a citação, sem sobra.
      const citacao = encontrado[0].replace(/\s+$/, '');
      const inicio = encontrado.index;
      const fim = inicio + citacao.length;
      if (this.norma.outrasNormas.test(texto.slice(fim))) continue;   // "art. X da Lei ..."
      const dispositivos = resolverCitacaoNorma(this.norma, citacao);
      if (dispositivos.length === 0) continue;               // artigo desconhecido: fica texto
      achados.push({ inicio, fim, citacao, dispositivos });
    }

    if (achados.length === 0) return;

    // De trás para a frente: o nó original continua sendo o começo do texto,
    // que é a referência que o Angular guarda para as interpolações.
    const derivados: Node[] = [];
    for (let i = achados.length - 1; i >= 0; i--) {
      const achado = achados[i];
      const meio = no.splitText(achado.inicio);
      const cauda = meio.splitText(achado.fim - achado.inicio);
      const chip = this.criarChip(achado.citacao, achado.dispositivos);
      meio.parentNode?.replaceChild(chip, meio);
      derivados.push(chip, cauda);
    }

    // Registrar o que saiu deste nó: se o Angular reescrever a cabeça, estes
    // nós viram lixo e precisam ser apagados antes da próxima varredura.
    this.derivacoes.push({ cabeca: no, textoCabeca: no.nodeValue ?? '', derivados });
  }

  private criarChip(citacao: string, dispositivos: DispositivoExibido[]): HTMLElement {
    const chip = document.createElement('span');
    chip.className = CLASSES_CHIP;
    chip.setAttribute(MARCA_CHIP, '');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-label',
      `${dispositivos.map(d => d.rotulo).join(', ')} do ${this.norma.titulo}. Abra para ler o texto.`);
    chip.textContent = citacao;

    const abrir = () => PainelCitacao.obter().mostrar(chip, dispositivos, this.norma.rodape);
    chip.addEventListener('mouseenter', abrir);
    chip.addEventListener('focus', abrir);
    chip.addEventListener('click', evento => {
      // O chip pode estar dentro de um <label> (art. 13, V, no registro de uso;
      // os critérios da criticidade): sem isto o clique marcaria a caixa ou o
      // rádio do formulário.
      evento.preventDefault();
      evento.stopPropagation();
      abrir();
    });
    chip.addEventListener('mouseleave', () => PainelCitacao.obter().agendarFechamento());
    chip.addEventListener('blur', () => PainelCitacao.obter().agendarFechamento());

    return chip;
  }
}
