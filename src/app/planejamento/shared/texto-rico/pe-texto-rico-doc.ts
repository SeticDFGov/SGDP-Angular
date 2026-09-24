/**
 * Texto rico da Governança Estratégica (campos `texto_rico`), sem depender do
 * TipTap: a forma do documento, a lista fechada de nós e marcas que o back-end
 * aceita (o mesmo recorte é aplicado aqui antes de enviar), o texto simples para
 * resumos e a ponte entre a tela (Angular) e o editor, que só é carregado sob
 * demanda (`pe-editor-tiptap.ts`, por import dinâmico).
 *
 * Lista fechada (contrato da E4): nós doc, paragraph, heading (level 3 ou 4),
 * bulletList, orderedList, listItem, table, tableRow, tableHeader, tableCell,
 * image (src `api/planejamento/arquivos/{id}`), hardBreak e text; marcas bold,
 * italic, underline e link (href http ou https). Os atributos vão só quando
 * dizem algo: level do título, start da lista numerada diferente de 1, colspan e
 * rowspan maiores que 1, src e alt da imagem, href do link.
 */
import { PeDocTextoRico, PeMarcaTextoRico, PeNoTextoRico } from '../../../../api/planejamento/interface';

/** Caminho da imagem dentro do documento: o arquivo enviado em POST api/planejamento/arquivos. */
export const PREFIXO_IMAGEM = 'api/planejamento/arquivos/';

/** Imagens do texto: PNG ou JPEG, até 5 MB (o servidor confere de novo). */
export const EXTENSOES_IMAGEM = ['png', 'jpg', 'jpeg'];
export const MAX_MB_IMAGEM_TEXTO = 5;

/** Tamanho máximo do documento em JSON (o servidor recusa acima disso). */
export const MAX_CARACTERES_DOCUMENTO = 200000;

/** Descrição da imagem (texto alternativo). */
export const MAX_DESCRICAO_IMAGEM = 250;

export function srcDaImagem(id: number): string {
  return `${PREFIXO_IMAGEM}${id}`;
}

/** Id do arquivo de uma imagem do documento (aceita o caminho com o endereço da API na frente). */
export function idDaImagem(src: unknown): number | null {
  if (typeof src !== 'string') return null;
  const achado = /(?:^|\/)api\/planejamento\/arquivos\/(\d+)$/.exec(src.trim());
  const id = achado ? Number(achado[1]) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Endereço de link aceito: só http e https, sem espaços. */
export function hrefSeguro(href: unknown): string | null {
  if (typeof href !== 'string') return null;
  const texto = href.trim();
  if (!/^https?:\/\/[^\s/?#]+[^\s]*$/i.test(texto)) return null;
  try {
    const url = new URL(texto);
    return url.protocol === 'http:' || url.protocol === 'https:' ? texto : null;
  } catch {
    return null;
  }
}

// ── Classes (as mesmas no editor e na leitura; todas já usadas no projeto) ──

export const CLASSES_TEXTO_RICO = {
  raiz: 'space-y-2 text-sm text-gray-800 leading-relaxed break-words',
  titulo: 'text-base font-semibold text-gray-900',
  subtitulo: 'text-sm font-semibold text-gray-900',
  listaMarcadores: 'list-disc ml-5 space-y-1',
  listaNumerada: 'list-decimal ml-5 space-y-1',
  tabela: 'w-full text-sm border-collapse',
  cabecalho: 'border border-gray-300 bg-gray-50 px-2 py-1 text-left font-semibold align-top',
  celula: 'border border-gray-300 px-2 py-1 align-top',
  imagem: 'rounded border border-gray-200',
  link: 'text-blue-700 underline'
} as const;

/** Estilo em linha da imagem (evita classe inédita no CSS inicial). */
export const ESTILO_IMAGEM = 'max-width: 100%; height: auto;';

// ── Normalização (a lista fechada) ───────────────────────────────────────────

const MARCAS_SIMPLES: ReadonlySet<string> = new Set(['bold', 'italic', 'underline']);
const ORDEM_MARCAS = ['bold', 'italic', 'underline', 'link'];

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor as Record<string, unknown> : null;
}

function lerJson(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  const texto = valor.trim();
  if (!texto.startsWith('{')) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function inteiro(valor: unknown, padrao: number): number {
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isInteger(n) ? n : padrao;
}

function marcas(bruto: unknown): PeMarcaTextoRico[] {
  if (!Array.isArray(bruto)) return [];
  const vistas = new Map<string, PeMarcaTextoRico>();
  for (const item of bruto) {
    const m = objeto(item);
    const tipo = typeof m?.['type'] === 'string' ? m['type'] as string : '';
    if (MARCAS_SIMPLES.has(tipo)) {
      vistas.set(tipo, { type: tipo });
    } else if (tipo === 'link') {
      const href = hrefSeguro(objeto(m?.['attrs'])?.['href']);
      if (href) vistas.set('link', { type: 'link', attrs: { href } });
    }
  }
  return ORDEM_MARCAS.filter(t => vistas.has(t)).map(t => vistas.get(t)!);
}

/** Conteúdo em linha (texto e quebra de linha) de um parágrafo, título ou célula. */
function emLinha(bruto: unknown): PeNoTextoRico[] {
  if (!Array.isArray(bruto)) return [];
  const saida: PeNoTextoRico[] = [];
  for (const item of bruto) {
    const no = objeto(item);
    if (!no) continue;
    const tipo = no['type'];
    if (tipo === 'text' && typeof no['text'] === 'string' && no['text']) {
      const lista = marcas(no['marks']);
      saida.push(lista.length ? { type: 'text', text: no['text'], marks: lista } : { type: 'text', text: no['text'] });
    } else if (tipo === 'hardBreak') {
      saida.push({ type: 'hardBreak' });
    } else if (Array.isArray(no['content'])) {
      // Nó em linha desconhecido: fica o texto de dentro
      saida.push(...emLinha(no['content']));
    }
  }
  return saida;
}

function paragrafo(conteudo: PeNoTextoRico[]): PeNoTextoRico {
  return conteudo.length ? { type: 'paragraph', content: conteudo } : { type: 'paragraph' };
}

function itemDeLista(bruto: unknown): PeNoTextoRico | null {
  const no = objeto(bruto);
  if (!no) return null;
  const conteudo = blocos(no['content']);
  return { type: 'listItem', content: conteudo.length ? conteudo : [{ type: 'paragraph' }] };
}

function celula(bruto: unknown): PeNoTextoRico | null {
  const no = objeto(bruto);
  if (!no) return null;
  const tipo = no['type'] === 'tableHeader' ? 'tableHeader' : 'tableCell';
  const attrs = objeto(no['attrs']);
  const colspan = inteiro(attrs?.['colspan'], 1);
  const rowspan = inteiro(attrs?.['rowspan'], 1);
  const conteudo = blocos(no['content']);
  const saida: PeNoTextoRico = { type: tipo, content: conteudo.length ? conteudo : [{ type: 'paragraph' }] };
  if (colspan > 1 || rowspan > 1) saida.attrs = { colspan: Math.max(1, colspan), rowspan: Math.max(1, rowspan) };
  return saida;
}

function tabela(bruto: Record<string, unknown>): PeNoTextoRico | null {
  const linhas: PeNoTextoRico[] = [];
  for (const item of Array.isArray(bruto['content']) ? bruto['content'] : []) {
    const linha = objeto(item);
    if (!linha || linha['type'] !== 'tableRow') continue;
    const celulas = (Array.isArray(linha['content']) ? linha['content'] : [])
      .map(celula)
      .filter((c): c is PeNoTextoRico => !!c);
    if (celulas.length) linhas.push({ type: 'tableRow', content: celulas });
  }
  return linhas.length ? { type: 'table', content: linhas } : null;
}

/** Blocos (o conteúdo do documento, de um item de lista ou de uma célula). */
function blocos(bruto: unknown): PeNoTextoRico[] {
  if (!Array.isArray(bruto)) return [];
  const saida: PeNoTextoRico[] = [];
  for (const item of bruto) {
    const no = objeto(item);
    if (!no) continue;
    switch (no['type']) {
      case 'paragraph':
        saida.push(paragrafo(emLinha(no['content'])));
        break;
      case 'heading': {
        const nivel = inteiro(objeto(no['attrs'])?.['level'], 3);
        const conteudo = emLinha(no['content']);
        const titulo: PeNoTextoRico = { type: 'heading', attrs: { level: nivel >= 4 ? 4 : 3 } };
        if (conteudo.length) titulo.content = conteudo;
        saida.push(titulo);
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        const itens = (Array.isArray(no['content']) ? no['content'] : [])
          .map(itemDeLista)
          .filter((i): i is PeNoTextoRico => !!i);
        if (!itens.length) break;
        const lista: PeNoTextoRico = { type: no['type'] as string, content: itens };
        const inicio = inteiro(objeto(no['attrs'])?.['start'], 1);
        if (no['type'] === 'orderedList' && inicio > 1) lista.attrs = { start: inicio };
        saida.push(lista);
        break;
      }
      case 'table': {
        const t = tabela(no);
        if (t) saida.push(t);
        break;
      }
      case 'image': {
        const attrs = objeto(no['attrs']);
        const id = idDaImagem(attrs?.['src']);
        if (id === null) break;
        const alt = typeof attrs?.['alt'] === 'string' ? (attrs['alt'] as string).trim().slice(0, MAX_DESCRICAO_IMAGEM) : '';
        saida.push({ type: 'image', attrs: alt ? { src: srcDaImagem(id), alt } : { src: srcDaImagem(id) } });
        break;
      }
      case 'text':
      case 'hardBreak':
        // Texto solto no nível dos blocos vira parágrafo
        saida.push(paragrafo(emLinha([no])));
        break;
      default:
        // Bloco desconhecido (citação, código...): ficam os blocos de dentro
        if (Array.isArray(no['content'])) {
          const dentro = blocos(no['content']);
          saida.push(...(dentro.length ? dentro : [paragrafo(emLinha(no['content']))]));
        }
    }
  }
  return saida;
}

/**
 * O documento só com o que a lista fechada aceita, ou null quando o valor não é
 * um documento. Aceita o JSON em texto (valor antigo) e o objeto.
 */
export function normalizarDocumento(valor: unknown): PeDocTextoRico | null {
  const no = objeto(lerJson(valor));
  if (!no || no['type'] !== 'doc') return null;
  return { type: 'doc', content: blocos(no['content']) };
}

/** Sem texto, sem imagem e sem tabela: vale como vazio (obrigatório e envio). */
export function docVazio(doc: PeDocTextoRico | null): boolean {
  if (!doc) return true;
  const temAlgo = (nos: PeNoTextoRico[] | undefined): boolean => (nos ?? []).some(n =>
    n.type === 'image' || n.type === 'table' || (n.type === 'text' && !!n.text?.trim()) || temAlgo(n.content));
  return !temAlgo(doc.content);
}

/** O documento como vai para a API: normalizado, e null quando vazio. */
export function docParaEnvio(valor: unknown): PeDocTextoRico | null {
  const doc = normalizarDocumento(valor);
  return doc && !docVazio(doc) ? doc : null;
}

/** Texto simples do documento (resumo na tabela e na planilha da tela), com as imagens pela descrição. */
export function textoPlano(valor: unknown): string {
  const doc = normalizarDocumento(valor);
  if (!doc) return '';
  const partes: string[] = [];
  const andar = (nos: PeNoTextoRico[] | undefined): void => {
    for (const n of nos ?? []) {
      if (n.type === 'text') partes.push(n.text ?? '');
      else if (n.type === 'hardBreak') partes.push(' ');
      else if (n.type === 'image') partes.push(` [imagem${n.attrs?.['alt'] ? ': ' + String(n.attrs['alt']) : ''}] `);
      else {
        // Bloco (parágrafo, título, item, célula): separado do seguinte por um espaço
        andar(n.content);
        partes.push(' ');
      }
    }
  };
  andar(doc.content);
  return partes.join('').replace(/\s+/g, ' ').trim();
}

// ── Ponte com o editor carregado sob demanda ─────────────────────────────────

/** O que a barra de ferramentas mostra como ligado ou desligado. */
export interface EstadoFormatacao {
  titulo: boolean;
  subtitulo: boolean;
  negrito: boolean;
  italico: boolean;
  sublinhado: boolean;
  listaMarcadores: boolean;
  listaNumerada: boolean;
  link: boolean;
  /** Endereço do link onde está o cursor. */
  hrefLink: string | null;
  /** Há texto selecionado (o link vai nele). */
  temSelecao: boolean;
  /** O cursor está numa tabela (aparecem as ações da tabela). */
  tabela: boolean;
  cabecalhoTabela: boolean;
  podeAumentarRecuo: boolean;
  podeDiminuirRecuo: boolean;
  podeDesfazer: boolean;
  podeRefazer: boolean;
}

export const ESTADO_FORMATACAO_VAZIO: EstadoFormatacao = {
  titulo: false, subtitulo: false, negrito: false, italico: false, sublinhado: false,
  listaMarcadores: false, listaNumerada: false, link: false, hrefLink: null, temSelecao: false,
  tabela: false, cabecalhoTabela: false, podeAumentarRecuo: false, podeDiminuirRecuo: false,
  podeDesfazer: false, podeRefazer: false
};

export type ComandoTextoRico =
  | 'titulo' | 'subtitulo' | 'negrito' | 'italico' | 'sublinhado'
  | 'listaMarcadores' | 'listaNumerada' | 'aumentarRecuo' | 'diminuirRecuo'
  | 'desfazer' | 'refazer' | 'tirarLink'
  | 'inserirTabela' | 'linhaAcima' | 'linhaAbaixo' | 'colunaAntes' | 'colunaDepois'
  | 'apagarLinha' | 'apagarColuna' | 'cabecalhoTabela' | 'apagarTabela';

/** O editor já montado (a implementação mora no pacote do TipTap). */
export interface EditorTextoRico {
  executar(comando: ComandoTextoRico): void;
  /** Link no texto selecionado; sem seleção, o próprio endereço entra como texto. */
  definirLink(href: string): void;
  inserirImagem(src: string, alt: string): void;
  focar(): void;
  definirDocumento(doc: PeDocTextoRico | null): void;
  /** Atributos do elemento editável (ids da ajuda e do erro mudam com a tela). */
  definirAtributos(atributos: Record<string, string>): void;
  destruir(): void;
}

export interface OpcoesEditorTextoRico {
  /** Onde o editor é montado. */
  elemento: HTMLElement;
  documento: PeDocTextoRico | null;
  /** Atributos do elemento editável (role, rótulo, descrição, obrigatório...). */
  atributos: Record<string, string>;
  /** Endereço local (blob) da imagem de um arquivo, baixada com o token. */
  resolverImagem(id: number): Promise<string>;
  aoMudar(doc: PeDocTextoRico | null): void;
  aoMudarEstado(estado: EstadoFormatacao): void;
  /** Ctrl+K no texto: a tela abre o painel do link. */
  aoPedirLink(): void;
}

/** O que o pacote do editor exporta. */
export type CriarEditorTextoRico = (opcoes: OpcoesEditorTextoRico) => EditorTextoRico;
