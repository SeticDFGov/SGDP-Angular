/**
 * Editor visual dos fluxos (E9), sem Angular: a geometria que o servidor devolve
 * (as medidas do mesmo layout que desenha o SVG da prévia e do PDF) vira a vista
 * que a tela desenha, juntando a definição de trabalho (o que a pessoa acabou de
 * mudar) e as posições provisórias (o bloco no ponto onde foi solto, enquanto a
 * geometria nova não chega). Também: onde o ponteiro está (raia, seta, bloco) e
 * o que acontece ao soltar ali.
 *
 * Coordenadas em unidades do SVG da E6 (px, origem no canto de cima à esquerda).
 */
import {
  PeFluxoDefinicao, PeFluxoElemento, PeFluxoGeometria, PeFluxoGeometriaArtefato, PeFluxoGeometriaElemento, PeFluxoGeometriaLigacao,
  PeFluxoGeometriaRaia, PeFluxoGeometriaTexto, PeTipoElementoFluxo
} from '../../../api/planejamento/interface';
import {
  DicionarioFluxo, motivoParaNaoLigar, raiasEmOrdem, resolverNomes, tipoEntraNaSeta, tipoNumerado
} from './pe-fluxo-rotulos';

// ── Medidas e cores (as do desenho do servidor) ──────────────────────────────

const MARGEM = 8;
const LARGURA_TAREFA = 112;
const ALTURA_TAREFA = 56;
const LADO_PORTA = 40;
const LADO_EVENTO = 30;
const FONTE_TAREFA = 10.5;
const LINHA_TAREFA = 13;
const MARCA_SUBPROCESSO = 13;
const FONTE_ROTULO = 9.5;
const LINHA_ROTULO = 11.5;
const FONTE_ARTEFATO = 9;
const LINHA_ARTEFATO = 11;
const FONTE_RAIA = 11.5;
const LINHA_RAIA = 14.5;
const ALTURA_MINIMA_RAIA = 90;
const LARGURA_CABECALHO = 30;
const INICIO_CONTEUDO = 18;
const GAP_COLUNA = 30;
const DOC_LARGURA = 22;
const DOC_ALTURA = 28;
const CONECTOR_ARTEFATO = 16;
const ALTURA_MAIUSCULA = 0.72;

export const CORES_FLUXO = {
  linha: '#374151',
  borda: '#6B7280',
  faixaPool: '#ECEEF2',
  faixaRaia: '#F5F6F8',
  texto: '#1F2937',
  rotulo: '#111827'
} as const;

/** Fundo e borda das tarefas pela etapa do prefixo, como o servidor (as cores dos subprocessos no guia). */
const PALETA_TAREFAS: Readonly<Record<string, readonly [string, string]>> = {
  '1': ['#FFF4CC', '#A8861B'],
  '2': ['#E4F1D9', '#557F36'],
  '3': ['#DCE9F7', '#3A6A9E'],
  '4': ['#E7E9EE', '#5B6677'],
  '5': ['#ECE5F6', '#65499A'],
  '6': ['#FCE6D6', '#B25E27'],
  '7': ['#EFE3DB', '#77503E']
};
const PALETA_PADRAO: readonly [string, string] = ['#E2ECF7', '#3E6C99'];

export interface CorFluxo {
  fundo: string;
  borda: string;
}

/** A cor das tarefas: a da geometria (quando vem) ou a da etapa do prefixo. */
export function corDasTarefas(prefixo: string | null | undefined, geo: PeFluxoGeometria | null): CorFluxo {
  if (geo?.Cor?.Fundo && geo.Cor.Borda) return { fundo: geo.Cor.Fundo, borda: geo.Cor.Borda };
  const etapa = (prefixo ?? '').trim().split('.')[0];
  const [fundo, borda] = PALETA_TAREFAS[etapa] ?? PALETA_PADRAO;
  return { fundo, borda };
}

/** Tamanho padrão da forma de cada tipo (o do servidor): tarefa 112 x 56, losango 40 x 40, círculo 30 x 30. */
export function tamanhoPadrao(tipo: PeTipoElementoFluxo): { largura: number; altura: number } {
  if (tipoNumerado(tipo)) return { largura: LARGURA_TAREFA, altura: ALTURA_TAREFA };
  if (tipo === 'decisao' || tipo === 'paralelo') return { largura: LADO_PORTA, altura: LADO_PORTA };
  return { largura: LADO_EVENTO, altura: LADO_EVENTO };
}

// ── Leitura da resposta (tolerante) ──────────────────────────────────────────

function numero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function textoDe(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function lista(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];
}

function textos(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function pontos(v: unknown): { X: number; Y: number }[] {
  return lista(v).map(p => ({ X: numero(p['X']), Y: numero(p['Y']) }));
}

function area(v: unknown): { X: number; Y: number; Largura: number; Altura: number } | null {
  if (!v || typeof v !== 'object') return null;
  const a = v as Record<string, unknown>;
  return { X: numero(a['X']), Y: numero(a['Y']), Largura: numero(a['Largura']), Altura: numero(a['Altura']) };
}

/**
 * A geometria como a tela usa, a partir do que veio do servidor: listas sempre
 * presentes, números sempre números. Os campos a mais que o contrato (textos com a
 * posição, cores, faixa do fluxo) ficam quando vêm bem formados.
 */
export function normalizarGeometria(bruta: unknown): PeFluxoGeometria {
  const g = (bruta && typeof bruta === 'object' ? bruta : {}) as Record<string, unknown>;
  const raias: PeFluxoGeometriaRaia[] = lista(g['Raias']).map(r => ({
    Id: textoDe(r['Id']),
    Nome: textoDe(r['Nome']),
    NomeOriginal: textoDe(r['NomeOriginal']),
    Y: numero(r['Y']),
    Altura: numero(r['Altura']),
    LarguraCabecalho: numero(r['LarguraCabecalho']) || LARGURA_CABECALHO,
    X: typeof r['X'] === 'number' ? numero(r['X']) : undefined,
    Largura: typeof r['Largura'] === 'number' ? numero(r['Largura']) : undefined,
    Linhas: Array.isArray(r['Linhas']) ? textos(r['Linhas']) : undefined
  }));
  const elementos: PeFluxoGeometriaElemento[] = lista(g['Elementos']).map(e => ({
    Id: textoDe(e['Id']),
    Tipo: (textoDe(e['Tipo']) || 'tarefa') as PeTipoElementoFluxo,
    RaiaId: textoDe(e['RaiaId']),
    Camada: numero(e['Camada']),
    X: numero(e['X']),
    Y: numero(e['Y']),
    Largura: numero(e['Largura']),
    Altura: numero(e['Altura']),
    Numero: typeof e['Numero'] === 'string' && e['Numero'] ? e['Numero'] : null,
    Nome: textoDe(e['Nome']),
    Linhas: textos(e['Linhas']),
    Solto: e['Solto'] === true,
    PosicaoNome: typeof e['PosicaoNome'] === 'string' ? e['PosicaoNome'] : null
  }));
  const ligacoes: PeFluxoGeometriaLigacao[] = lista(g['Ligacoes']).map(l => ({
    Id: textoDe(l['Id']),
    De: textoDe(l['De']),
    Para: textoDe(l['Para']),
    Rotulo: typeof l['Rotulo'] === 'string' && l['Rotulo'] ? l['Rotulo'] : null,
    Retorno: l['Retorno'] === true,
    Pontos: pontos(l['Pontos']),
    RotuloX: typeof l['RotuloX'] === 'number' ? l['RotuloX'] : null,
    RotuloY: typeof l['RotuloY'] === 'number' ? l['RotuloY'] : null,
    RotuloArea: area(l['RotuloArea'])
  }));
  const artefatos: PeFluxoGeometriaArtefato[] = lista(g['Artefatos']).map(a => ({
    ElementoId: textoDe(a['ElementoId']),
    Indice: numero(a['Indice']),
    Nome: textoDe(a['Nome']),
    X: numero(a['X']),
    Y: numero(a['Y']),
    Largura: numero(a['Largura']) || DOC_LARGURA,
    Altura: numero(a['Altura']) || DOC_ALTURA,
    Linhas: Array.isArray(a['Linhas']) ? textos(a['Linhas']) : undefined,
    Conector: Array.isArray(a['Conector']) ? pontos(a['Conector']) : undefined
  }));
  const numeros: Record<string, string> = {};
  const brutos = g['Numeros'];
  if (brutos && typeof brutos === 'object' && !Array.isArray(brutos)) {
    for (const [id, n] of Object.entries(brutos as Record<string, unknown>)) if (typeof n === 'string' && n) numeros[id] = n;
  }
  const faixa = area(g['FaixaTitulo']);
  const cor = g['Cor'] && typeof g['Cor'] === 'object' ? g['Cor'] as Record<string, unknown> : null;
  const textosGeo: PeFluxoGeometriaTexto[] = lista(g['Textos']).map(t => ({
    Texto: textoDe(t['Texto']),
    X: numero(t['X']),
    Y: numero(t['Y']),
    Tamanho: numero(t['Tamanho']) || FONTE_TAREFA,
    Negrito: t['Negrito'] === true,
    Vertical: t['Vertical'] === true,
    Cor: textoDe(t['Cor']) || CORES_FLUXO.texto,
    Dono: textoDe(t['Dono'])
  }));
  return {
    Largura: numero(g['Largura']),
    Altura: numero(g['Altura']),
    Raias: raias,
    Elementos: elementos,
    Ligacoes: ligacoes,
    Artefatos: artefatos,
    Erros: textos(g['Erros']).map(e => e.trim()).filter(Boolean),
    Numeros: numeros,
    Titulo: textoDe(g['Titulo']),
    FaixaTitulo: faixa && faixa.Largura > 0 ? { ...faixa, Linhas: textos((g['FaixaTitulo'] as Record<string, unknown>)['Linhas']) } : null,
    Cor: cor && typeof cor['Fundo'] === 'string' && typeof cor['Borda'] === 'string' ? { Fundo: cor['Fundo'], Borda: cor['Borda'] } : null,
    Textos: textosGeo
  };
}

// ── A vista (o que a tela desenha) ───────────────────────────────────────────

export interface PontoFluxo {
  x: number;
  y: number;
}

/** Uma linha de texto: relativa ao dono (bloco) ou absoluta (raia, seta, faixa do fluxo). */
export interface VistaTexto {
  texto: string;
  x: number;
  y: number;
  tamanho: number;
  negrito: boolean;
  cor: string;
  /** "start": x é o começo da linha; "middle": x é o meio. */
  ancora: 'start' | 'middle';
  /** Na vertical, de baixo para cima (nomes das raias): gira em volta de (x, y). */
  vertical: boolean;
}

export interface VistaRaia {
  id: string;
  /** 1, 2, 3... de cima para baixo. */
  posicao: number;
  nome: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  larguraCabecalho: number;
  textos: VistaTexto[];
}

/** Um documento da tarefa: caminhos e textos relativos ao canto do bloco. */
export interface VistaArtefato {
  conector: string;
  ponta: string;
  documento: string;
  dobra: string;
  textos: VistaTexto[];
}

export interface VistaBloco {
  id: string;
  tipo: PeTipoElementoFluxo;
  raiaId: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  numero: string | null;
  textos: VistaTexto[];
  artefatos: VistaArtefato[];
  /** Sem nenhuma ligação (o desenho mostra). */
  solto: boolean;
  /** Posição ainda não confirmada pela geometria (a mudança acabou de acontecer). */
  provisorio: boolean;
  cor: CorFluxo;
  /** Ligação com outro fluxo que recebe ligação: a seta cheia (o fluxo segue em outro). */
  recebe: boolean;
}

export interface VistaLigacao {
  id: string;
  de: string;
  para: string;
  rotulo: string | null;
  retorno: boolean;
  pontos: PontoFluxo[];
  /** O caminho da linha (o último trecho para dentro da ponta). */
  caminho: string;
  ponta: string;
  /** O rótulo (saída da decisão): o texto e o fundo branco atrás dele. */
  rotuloTexto: VistaTexto | null;
  rotuloFundo: { x: number; y: number; largura: number; altura: number } | null;
  /** Desenhada em linha reta, enquanto a geometria nova não chega. */
  provisoria: boolean;
  /** O meio do caminho (onde abre o campo do rótulo). */
  meio: PontoFluxo;
}

export interface VistaFluxo {
  largura: number;
  altura: number;
  raias: VistaRaia[];
  blocos: VistaBloco[];
  ligacoes: VistaLigacao[];
  faixa: { x: number; y: number; largura: number; altura: number; textos: VistaTexto[] } | null;
}

export interface ContextoVista {
  dicionario: DicionarioFluxo;
  /** Os números que valem agora (os da geometria, ou a numeração provisória). */
  numeros: ReadonlyMap<string, string>;
  /** Blocos com a posição provisória (o centro, onde foram soltos). */
  provisorios: ReadonlyMap<string, PontoFluxo>;
}

/** Largura aproximada de um texto (a fonte do desenho tem, em média, pouco mais de meio tamanho por letra). */
export function larguraAproximada(texto: string, tamanho: number, negrito = false): number {
  return texto.length * tamanho * (negrito ? 0.56 : 0.52);
}

/**
 * Quebra o texto em linhas de até `larguraMaxima` (palavra por palavra, pela
 * largura aproximada), no máximo `maximo` linhas; a última leva reticências quando
 * o texto não cabe. Serve enquanto a geometria nova não chega (as linhas que valem
 * são as do servidor).
 */
export function quebrarTexto(texto: string, larguraMaxima: number, tamanho: number, maximo: number, negrito = false): string[] {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (!atual || larguraAproximada(tentativa, tamanho, negrito) <= larguraMaxima) {
      atual = tentativa;
    } else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length <= maximo) return linhas;
  const cortadas = linhas.slice(0, maximo);
  cortadas[maximo - 1] = `${cortadas[maximo - 1].replace(/[\s.,;:]+$/, '')}…`;
  return cortadas;
}

/** Linhas centradas em `cx`, com o bloco começando (topo) em `topo`, como o servidor escreve. */
function bloco(linhas: string[], cx: number, topo: number, tamanho: number, altura: number, negrito: boolean, cor: string = CORES_FLUXO.texto): VistaTexto[] {
  return linhas.map((texto, i) => ({
    texto, x: cx, y: topo + i * altura + (altura + tamanho * ALTURA_MAIUSCULA) / 2, tamanho, negrito, cor, ancora: 'middle', vertical: false
  }));
}

/**
 * Os textos de um bloco, relativos ao canto dele, pela mesma regra do servidor:
 * na tarefa, o número em negrito e o nome dentro; no losango, o nome acima (ou à
 * direita, ou abaixo, quando o servidor diz); no círculo, o nome embaixo.
 */
export function textosDoBloco(
  tipo: PeTipoElementoFluxo, numero: string | null, linhas: string[], largura: number, altura: number, posicao: string | null = null
): VistaTexto[] {
  const cx = largura / 2;
  if (tipoNumerado(tipo)) {
    const numeroLinhas = numero ? [numero] : [];
    const total = numeroLinhas.length + Math.max(1, linhas.length);
    const marca = tipo === 'subprocesso' ? MARCA_SUBPROCESSO : 0;
    const topo = (altura - marca - total * LINHA_TAREFA) / 2;
    return [
      ...bloco(numeroLinhas, cx, topo, FONTE_TAREFA, LINHA_TAREFA, true),
      ...bloco(linhas, cx, topo + numeroLinhas.length * LINHA_TAREFA, FONTE_TAREFA, LINHA_TAREFA, false)
    ];
  }
  if (!linhas.length) return [];
  const cy = altura / 2;
  if (tipo === 'decisao' || tipo === 'paralelo') {
    const alturaNome = linhas.length * LINHA_ROTULO;
    if (posicao === 'direita') {
      return linhas.map((texto, i) => ({
        texto, x: cx + LADO_PORTA / 2 + 6, y: cy - alturaNome / 2 + i * LINHA_ROTULO + (LINHA_ROTULO + FONTE_ROTULO * ALTURA_MAIUSCULA) / 2,
        tamanho: FONTE_ROTULO, negrito: false, cor: CORES_FLUXO.texto, ancora: 'start', vertical: false
      }));
    }
    if (posicao === 'abaixo') return bloco(linhas, cx, cy + LADO_PORTA / 2 + 4, FONTE_ROTULO, LINHA_ROTULO, false);
    return bloco(linhas, cx, cy - LADO_PORTA / 2 - 4 - alturaNome, FONTE_ROTULO, LINHA_ROTULO, false);
  }
  return bloco(linhas, cx, cy + LADO_EVENTO / 2 + 3, FONTE_ROTULO, LINHA_ROTULO, false);
}

/** As linhas do nome de um elemento quando a geometria não serve (nome novo): a mesma largura do servidor. */
function linhasDoNome(tipo: PeTipoElementoFluxo, nome: string): string[] {
  if (!nome.trim()) return [];
  if (tipoNumerado(tipo)) return quebrarTexto(nome, LARGURA_TAREFA - 12, FONTE_TAREFA, 3);
  if (tipo === 'decisao' || tipo === 'paralelo') return quebrarTexto(nome, 118, FONTE_ROTULO, 4);
  return quebrarTexto(nome, 108, FONTE_ROTULO, 4);
}

/** O caminho da linha de uma seta: o último trecho para 4 unidades antes da ponta (a ponta fica fina). */
export function caminhoDaLinha(pts: readonly PontoFluxo[]): string {
  if (pts.length < 2) return '';
  const partes = [`M${r1(pts[0].x)} ${r1(pts[0].y)}`];
  for (let i = 1; i < pts.length; i++) {
    let { x, y } = pts[i];
    if (i === pts.length - 1) {
      const dx = x - pts[i - 1].x;
      const dy = y - pts[i - 1].y;
      const tamanho = Math.hypot(dx, dy);
      if (tamanho > 5) {
        x -= dx / tamanho * 4;
        y -= dy / tamanho * 4;
      }
    }
    partes.push(`L${r1(x)} ${r1(y)}`);
  }
  return partes.join('');
}

/** A ponta da seta (triângulo cheio) no último ponto. */
export function pontaDaSeta(pts: readonly PontoFluxo[], comprimento = 7.5, meia = 3.6): string {
  if (pts.length < 2) return '';
  const de = pts[pts.length - 2];
  const para = pts[pts.length - 1];
  const dx = para.x - de.x;
  const dy = para.y - de.y;
  const tamanho = Math.hypot(dx, dy);
  if (tamanho < 0.01) return '';
  const ux = dx / tamanho;
  const uy = dy / tamanho;
  const bx = para.x - ux * comprimento;
  const by = para.y - uy * comprimento;
  return `M${r1(para.x)} ${r1(para.y)}L${r1(bx - uy * meia)} ${r1(by + ux * meia)}L${r1(bx + uy * meia)} ${r1(by - ux * meia)}Z`;
}

function r1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** O ponto no meio do caminho (pelo comprimento). */
export function meioDoCaminho(pts: readonly PontoFluxo[]): PontoFluxo {
  if (!pts.length) return { x: 0, y: 0 };
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  let resta = total / 2;
  for (let i = 1; i < pts.length; i++) {
    const trecho = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (trecho >= resta && trecho > 0) {
      const t = resta / trecho;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
    }
    resta -= trecho;
  }
  return { ...pts[pts.length - 1] };
}

/** Os caminhos do documento (com a ponta dobrada) e do conector pontilhado, relativos ao canto do bloco. */
function artefatoRelativo(doc: { x: number; y: number; largura: number; altura: number }, conector: PontoFluxo[], linhas: string[],
  textosProntos: VistaTexto[] | null): VistaArtefato {
  const dobra = 7;
  const direita = doc.x + doc.largura;
  const base = doc.y + doc.altura;
  const ultimo = conector[conector.length - 1] ?? { x: doc.x + doc.largura / 2, y: doc.y - 1 };
  return {
    conector: conector.length ? `M${conector.map(p => `${r1(p.x)} ${r1(p.y)}`).join(' L')}` : '',
    ponta: `M${r1(ultimo.x - 3.2)} ${r1(ultimo.y - 4.5)}L${r1(ultimo.x)} ${r1(ultimo.y)}L${r1(ultimo.x + 3.2)} ${r1(ultimo.y - 4.5)}`,
    documento: `M${r1(doc.x)} ${r1(doc.y)}L${r1(direita - dobra)} ${r1(doc.y)}L${r1(direita)} ${r1(doc.y + dobra)}L${r1(direita)} ${r1(base)}L${r1(doc.x)} ${r1(base)}Z`,
    dobra: `M${r1(direita - dobra)} ${r1(doc.y)}L${r1(direita - dobra)} ${r1(doc.y + dobra)}L${r1(direita)} ${r1(doc.y + dobra)}`,
    textos: textosProntos ?? bloco(linhas, doc.x + doc.largura / 2, base + 3, FONTE_ARTEFATO, LINHA_ARTEFATO, false)
  };
}

/** Os documentos de uma tarefa sem a geometria (lado a lado, embaixo dela), relativos ao canto do bloco. */
function artefatosLocais(nomes: string[], largura: number, altura: number): VistaArtefato[] {
  if (!nomes.length) return [];
  const larguras = nomes.map(n => Math.max(DOC_LARGURA + 8, Math.min(90, larguraAproximada(n, FONTE_ARTEFATO) + 4)));
  const total = larguras.reduce((s, l) => s + l, 0) + 6 * (nomes.length - 1);
  let x = largura / 2 - total / 2;
  return nomes.map((nome, i) => {
    const dx = x + larguras[i] / 2;
    const doc = { x: dx - DOC_LARGURA / 2, y: altura + CONECTOR_ARTEFATO, largura: DOC_LARGURA, altura: DOC_ALTURA };
    const saida = Math.min(Math.max(dx, 10), largura - 10);
    const conector = [
      { x: saida, y: altura }, { x: saida, y: altura + CONECTOR_ARTEFATO / 2 }, { x: dx, y: altura + CONECTOR_ARTEFATO / 2 }, { x: dx, y: doc.y - 1 }
    ];
    x += larguras[i] + 6;
    return artefatoRelativo(doc, conector, quebrarTexto(nome, larguras[i], FONTE_ARTEFATO, 3), null);
  });
}

function textoDaGeometria(t: PeFluxoGeometriaTexto, dx: number, dy: number): VistaTexto {
  return {
    texto: t.Texto, x: t.X - dx, y: t.Y - dy, tamanho: t.Tamanho, negrito: t.Negrito, cor: t.Cor || CORES_FLUXO.texto,
    ancora: 'start', vertical: t.Vertical
  };
}

/** O nome de uma raia na vertical, centrado no cabeçalho (de baixo para cima). */
function textosDaRaia(linhas: string[], x: number, y: number, larguraCabecalho: number, altura: number): VistaTexto[] {
  const inicio = x + larguraCabecalho / 2 - linhas.length * LINHA_RAIA / 2;
  return linhas.map((texto, i) => ({
    texto, x: inicio + i * LINHA_RAIA + (LINHA_RAIA + FONTE_RAIA * ALTURA_MAIUSCULA) / 2, y: y + altura / 2,
    tamanho: FONTE_RAIA, negrito: true, cor: CORES_FLUXO.texto, ancora: 'middle', vertical: true
  }));
}

function mesmaLista(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/**
 * A vista do fluxo: a geometria do servidor para o que ela já conhece, e o
 * provisório para o que acabou de mudar:
 * - bloco solto agora (arrastado): no ponto onde foi solto;
 * - bloco novo sem ponto (teclado, um clique): no fim da raia dele;
 * - bloco que trocou de raia sem ponto: na mesma coluna, no meio da raia nova;
 * - raias na ordem da definição (subir e descer mudam a altura na hora), raia nova
 *   embaixo, com a altura mínima;
 * - seta nova, ou com uma ponta que mudou de lugar: reta, até a geometria chegar;
 * - nome, número ou documentos mudados: o texto quebrado aqui, até a geometria chegar.
 */
export function montarVista(def: PeFluxoDefinicao, geo: PeFluxoGeometria | null, ctx: ContextoVista): VistaFluxo {
  const geoRaias = new Map((geo?.Raias ?? []).map(r => [r.Id, r]));
  const geoElementos = new Map((geo?.Elementos ?? []).map(e => [e.Id, e]));
  const geoLigacoes = new Map((geo?.Ligacoes ?? []).map(l => [l.Id, l]));
  const textosPorDono = new Map<string, PeFluxoGeometriaTexto[]>();
  for (const t of geo?.Textos ?? []) textosPorDono.set(t.Dono, [...(textosPorDono.get(t.Dono) ?? []), t]);
  const cor = corDasTarefas(def.PrefixoNumeracao, geo);

  // Raias: na ordem da definição, empilhadas a partir do topo da primeira
  const faixaGeo = geo?.FaixaTitulo ?? null;
  const xPadrao = faixaGeo ? faixaGeo.X + faixaGeo.Largura : MARGEM;
  const primeiraGeo = geo?.Raias[0];
  let cursor = primeiraGeo ? Math.min(...geo!.Raias.map(r => r.Y)) : MARGEM;
  const larguraGeo = geo?.Largura ?? 0;
  const deslocamentoRaia = new Map<string, number>();
  const raias: VistaRaia[] = raiasEmOrdem(def).map((r, i) => {
    const g = geoRaias.get(r.Id);
    const altura = g && g.Altura > 0 ? g.Altura : ALTURA_MINIMA_RAIA;
    const y = cursor;
    cursor += altura;
    const x = g?.X ?? xPadrao;
    const larguraCabecalho = g?.LarguraCabecalho || LARGURA_CABECALHO;
    const largura = g?.Largura ?? Math.max(larguraGeo - x - MARGEM, larguraCabecalho + 200);
    deslocamentoRaia.set(r.Id, g ? y - g.Y : 0);
    const nome = resolverNomes(r.Nome, ctx.dicionario).trim() || 'Raia sem nome';
    let textosRaia: VistaTexto[];
    const donos = g && g.NomeOriginal === r.Nome ? textosPorDono.get(`raia:${r.Id}`) : undefined;
    if (g && donos?.length) {
      textosRaia = donos.map(t => textoDaGeometria(t, 0, -(y - g.Y)));
    } else {
      const linhas = g && g.NomeOriginal === r.Nome && g.Linhas?.length
        ? g.Linhas
        : quebrarTexto(nome, Math.max(40, altura - 16), FONTE_RAIA, 3, true);
      textosRaia = textosDaRaia(linhas, x, y, larguraCabecalho, altura);
    }
    return { id: r.Id, posicao: i + 1, nome, x, y, largura, altura, larguraCabecalho, textos: textosRaia };
  });
  const raiaPorId = new Map(raias.map(r => [r.id, r]));
  const primeiraRaia = raias[0] ?? null;

  // Entradas e saídas (para "solto" e para a seta cheia da ligação com outro fluxo)
  const ids = new Set(def.Elementos.map(e => e.Id));
  const validas = def.Ligacoes.filter(l => ids.has(l.De) && ids.has(l.Para) && l.De !== l.Para);
  const temLigacao = new Set<string>();
  const recebem = new Set<string>();
  for (const l of validas) {
    temLigacao.add(l.De);
    temLigacao.add(l.Para);
    recebem.add(l.Para);
  }

  // Blocos
  const artefatosGeo = new Map<string, PeFluxoGeometriaArtefato[]>();
  for (const a of geo?.Artefatos ?? []) artefatosGeo.set(a.ElementoId, [...(artefatosGeo.get(a.ElementoId) ?? []), a]);
  const blocos: VistaBloco[] = [];
  /** Blocos que ficaram onde a geometria os pôs (as setas deles podem usar o caminho do servidor). */
  const noLugar = new Map<string, number>();
  const semLugar: PeFluxoElemento[] = [];
  for (const e of def.Elementos) {
    const g = geoElementos.get(e.Id);
    const raia = raiaPorId.get(e.RaiaId) ?? primeiraRaia;
    const tamanho = g && g.Tipo === e.Tipo && g.Largura > 0 ? { largura: g.Largura, altura: g.Altura } : tamanhoPadrao(e.Tipo);
    const ponto = ctx.provisorios.get(e.Id);
    let x: number;
    let y: number;
    let provisorio = true;
    if (ponto) {
      x = ponto.x - tamanho.largura / 2;
      y = ponto.y - tamanho.altura / 2;
    } else if (g && raia && g.RaiaId === e.RaiaId) {
      const dy = deslocamentoRaia.get(e.RaiaId) ?? 0;
      x = g.X;
      y = g.Y + dy;
      provisorio = false;
      noLugar.set(e.Id, dy);
    } else if (g && raia) {
      // Trocou de raia sem ponto (teclado): a mesma coluna, no meio da raia nova
      x = g.X;
      y = raia.y + raia.altura / 2 - tamanho.altura / 2;
    } else {
      semLugar.push(e);
      continue;
    }
    blocos.push(montarBloco(e, g, x, y, tamanho, provisorio));
  }
  // Novos sem ponto: no fim da raia deles, um depois do outro
  for (const e of semLugar) {
    const raia = raiaPorId.get(e.RaiaId) ?? primeiraRaia;
    const tamanho = tamanhoPadrao(e.Tipo);
    const naRaia = blocos.filter(b => raia && b.y + b.altura / 2 >= raia.y && b.y + b.altura / 2 <= raia.y + raia.altura);
    const direita = naRaia.length
      ? Math.max(...naRaia.map(b => b.x + b.largura)) + GAP_COLUNA
      : (raia ? raia.x + raia.larguraCabecalho + INICIO_CONTEUDO : MARGEM);
    const y = raia ? raia.y + raia.altura / 2 - tamanho.altura / 2 : MARGEM;
    blocos.push(montarBloco(e, undefined, direita, y, tamanho, true));
  }
  const blocoPorId = new Map(blocos.map(b => [b.id, b]));

  function montarBloco(
    e: PeFluxoElemento, g: PeFluxoGeometriaElemento | undefined, x: number, y: number, tamanho: { largura: number; altura: number },
    provisorio: boolean
  ): VistaBloco {
    const nome = resolverNomes(e.Nome, ctx.dicionario).trim();
    const numeroAtual = tipoNumerado(e.Tipo) ? ctx.numeros.get(e.Id) ?? null : null;
    const mesmoTexto = !!g && g.Tipo === e.Tipo && g.Nome.trim() === nome && (g.Numero ?? null) === numeroAtual
      && g.Largura === tamanho.largura && g.Altura === tamanho.altura;
    let textosBloco: VistaTexto[];
    const donos = mesmoTexto ? textosPorDono.get(e.Id) : undefined;
    if (g && donos?.length) textosBloco = donos.map(t => textoDaGeometria(t, g.X, g.Y));
    else {
      const linhas = g && g.Tipo === e.Tipo && g.Nome.trim() === nome && g.Linhas.length ? g.Linhas : linhasDoNome(e.Tipo, nome);
      textosBloco = textosDoBloco(e.Tipo, numeroAtual, linhas, tamanho.largura, tamanho.altura, g?.PosicaoNome ?? null);
    }
    let artefatos: VistaArtefato[] = [];
    if (tipoNumerado(e.Tipo) && e.Artefatos.length) {
      const doServidor = g ? (artefatosGeo.get(e.Id) ?? []).sort((a, b) => a.Indice - b.Indice) : [];
      if (g && mesmaLista(doServidor.map(a => a.Nome), e.Artefatos) && g.Largura === tamanho.largura && g.Altura === tamanho.altura) {
        artefatos = doServidor.map(a => {
          const doc = { x: a.X - g.X, y: a.Y - g.Y, largura: a.Largura, altura: a.Altura };
          const conector = a.Conector?.length
            ? a.Conector.map(p => ({ x: p.X - g.X, y: p.Y - g.Y }))
            : [{ x: doc.x + doc.largura / 2, y: tamanho.altura }, { x: doc.x + doc.largura / 2, y: doc.y - 1 }];
          const prontos = textosPorDono.get(`artefato:${e.Id}:${a.Indice}`);
          const linhas = a.Linhas?.length ? a.Linhas : quebrarTexto(a.Nome, 90, FONTE_ARTEFATO, 3);
          return artefatoRelativo(doc, conector, linhas, prontos?.length ? prontos.map(t => textoDaGeometria(t, g.X, g.Y)) : null);
        });
      } else {
        artefatos = artefatosLocais(e.Artefatos.map(a => a.trim()).filter(Boolean), tamanho.largura, tamanho.altura);
      }
    }
    return {
      id: e.Id, tipo: e.Tipo, raiaId: e.RaiaId, x, y, largura: tamanho.largura, altura: tamanho.altura, numero: numeroAtual,
      textos: textosBloco, artefatos, solto: !temLigacao.has(e.Id), provisorio, cor, recebe: recebem.has(e.Id)
    };
  }

  // Setas
  const ligacoes: VistaLigacao[] = [];
  for (const l of validas) {
    const de = blocoPorId.get(l.De);
    const para = blocoPorId.get(l.Para);
    if (!de || !para) continue;
    const g = geoLigacoes.get(l.Id);
    const dyDe = noLugar.get(l.De);
    const dyPara = noLugar.get(l.Para);
    const doServidor = !!g && g.De === l.De && g.Para === l.Para && g.Pontos.length >= 2
      && dyDe !== undefined && dyPara !== undefined && dyDe === dyPara;
    let pts: PontoFluxo[];
    let rotuloTexto: VistaTexto | null = null;
    let rotuloFundo: VistaLigacao['rotuloFundo'] = null;
    const rotulo = l.Rotulo?.trim() || null;
    if (doServidor) {
      const dy = dyDe!;
      pts = g!.Pontos.map(p => ({ x: p.X, y: p.Y + dy }));
      if (rotulo) {
        const prontos = g!.Rotulo === rotulo ? textosPorDono.get(`ligacao:${l.Id}`) : undefined;
        if (prontos?.length) rotuloTexto = textoDaGeometria(prontos[0], 0, -dy);
        else if (g!.Rotulo === rotulo && g!.RotuloX !== null && g!.RotuloY !== null) {
          rotuloTexto = {
            texto: rotulo, x: g!.RotuloX, y: g!.RotuloY + dy, tamanho: FONTE_ROTULO, negrito: false, cor: CORES_FLUXO.rotulo,
            ancora: 'start', vertical: false
          };
        }
        const areaGeo = g!.Rotulo === rotulo ? g!.RotuloArea : null;
        if (rotuloTexto && areaGeo) rotuloFundo = { x: areaGeo.X, y: areaGeo.Y + dy, largura: areaGeo.Largura, altura: areaGeo.Altura };
      }
    } else {
      pts = caminhoProvisorio(de, para);
    }
    if (rotulo && !rotuloTexto) {
      rotuloTexto = {
        texto: rotulo, x: pts[0].x + 5, y: pts[0].y - 5, tamanho: FONTE_ROTULO, negrito: false, cor: CORES_FLUXO.rotulo,
        ancora: 'start', vertical: false
      };
    }
    if (rotuloTexto && !rotuloFundo) {
      const largura = larguraAproximada(rotulo!, FONTE_ROTULO) + 4;
      rotuloFundo = { x: rotuloTexto.x - 2, y: rotuloTexto.y - FONTE_ROTULO * 0.78 - 1, largura, altura: FONTE_ROTULO + 2 };
    }
    ligacoes.push({
      id: l.Id, de: l.De, para: l.Para, rotulo, retorno: doServidor ? g!.Retorno : false, pontos: pts, caminho: caminhoDaLinha(pts),
      ponta: pontaDaSeta(pts), rotuloTexto, rotuloFundo, provisoria: !doServidor, meio: meioDoCaminho(pts)
    });
  }

  // A faixa do fluxo (o "pool" do guia), quando o servidor desenha
  let faixa: VistaFluxo['faixa'] = null;
  if (faixaGeo && raias.length) {
    const topo = Math.min(...raias.map(r => r.y));
    const base = Math.max(...raias.map(r => r.y + r.altura));
    const prontos = textosPorDono.get('pool');
    faixa = {
      x: faixaGeo.X, y: topo, largura: faixaGeo.Largura, altura: base - topo,
      textos: prontos?.length
        ? prontos.map(t => textoDaGeometria(t, 0, 0))
        : textosDaRaia(faixaGeo.Linhas ?? [], faixaGeo.X, topo, faixaGeo.Largura, base - topo)
    };
  }

  // O tamanho: o da geometria, ou mais, se algo provisório passou da borda
  const direitaConteudo = Math.max(0, ...blocos.map(b => b.x + b.largura), ...ligacoes.flatMap(l => l.pontos.map(p => p.x)));
  const baseRaias = raias.length ? Math.max(...raias.map(r => r.y + r.altura)) : 0;
  const largura = Math.max(geo?.Largura ?? 0, direitaConteudo + 40, (primeiraRaia?.x ?? MARGEM) + 240);
  const altura = Math.max(geo?.Altura ?? 0, baseRaias + MARGEM, 120);
  for (const r of raias) r.largura = Math.max(r.largura, largura - r.x - MARGEM);
  return { largura, altura, raias, blocos, ligacoes, faixa };
}

/** Seta provisória: da direita do bloco de antes à esquerda do de depois, em cotovelo. */
function caminhoProvisorio(de: VistaBloco, para: VistaBloco): PontoFluxo[] {
  const x1 = de.x + de.largura;
  const y1 = de.y + de.altura / 2;
  const x2 = para.x;
  const y2 = para.y + para.altura / 2;
  if (x2 > x1 + 12 && Math.abs(y2 - y1) > 1) {
    const xm = (x1 + x2) / 2;
    return [{ x: x1, y: y1 }, { x: xm, y: y1 }, { x: xm, y: y2 }, { x: x2, y: y2 }];
  }
  if (x2 > x1 + 12) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  // Para trás (ou em cima): sai por baixo e chega por baixo
  const baixo = Math.max(de.y + de.altura, para.y + para.altura) + 14;
  const xs = de.x + de.largura / 2;
  const xc = para.x + para.largura / 2;
  return [{ x: xs, y: de.y + de.altura }, { x: xs, y: baixo }, { x: xc, y: baixo }, { x: xc, y: para.y + para.altura }];
}

// ── Onde está o ponteiro ─────────────────────────────────────────────────────

/** A raia no ponto (as faixas cobrem da borda de cima à de baixo); fora das raias, null. */
export function raiaNoPonto(vista: VistaFluxo, p: PontoFluxo): VistaRaia | null {
  return vista.raias.find(r => p.y >= r.y && p.y <= r.y + r.altura && p.x >= r.x - MARGEM && p.x <= r.x + r.largura + MARGEM) ?? null;
}

/** O bloco no ponto (a caixa da forma, com folga), o de cima primeiro. */
export function blocoNoPonto(vista: VistaFluxo, p: PontoFluxo, folga = 4): VistaBloco | null {
  for (let i = vista.blocos.length - 1; i >= 0; i--) {
    const b = vista.blocos[i];
    if (p.x >= b.x - folga && p.x <= b.x + b.largura + folga && p.y >= b.y - folga && p.y <= b.y + b.altura + folga) return b;
  }
  return null;
}

export function distanciaAoSegmento(p: PontoFluxo, a: PontoFluxo, b: PontoFluxo): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const tamanho2 = dx * dx + dy * dy;
  const t = tamanho2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / tamanho2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** A seta mais perto do ponto, até a `tolerancia`, fora as do elemento que se arrasta. */
export function ligacaoNoPonto(vista: VistaFluxo, p: PontoFluxo, tolerancia: number, ignorarElemento: string | null = null): VistaLigacao | null {
  let melhor: VistaLigacao | null = null;
  let menor = tolerancia;
  for (const l of vista.ligacoes) {
    if (ignorarElemento && (l.de === ignorarElemento || l.para === ignorarElemento)) continue;
    for (let i = 1; i < l.pontos.length; i++) {
      const d = distanciaAoSegmento(p, l.pontos[i - 1], l.pontos[i]);
      if (d <= menor) {
        menor = d;
        melhor = l;
      }
    }
  }
  return melhor;
}

// ── O que acontece ao soltar ─────────────────────────────────────────────────

/** O que se arrasta: um bloco da paleta, um bloco do desenho ou a alça de ligar de um bloco. */
export type ArrastoFluxo =
  | { origem: 'paleta'; tipo: PeTipoElementoFluxo }
  | { origem: 'bloco'; id: string }
  | { origem: 'alca'; id: string };

export type SolturaFluxo =
  | { acao: 'incluir'; tipo: PeTipoElementoFluxo; raiaId: string }
  | { acao: 'inserir'; tipo: PeTipoElementoFluxo; ligacaoId: string; raiaId: string }
  | { acao: 'mover-raia'; elementoId: string; raiaId: string }
  | { acao: 'mover-seta'; elementoId: string; ligacaoId: string; raiaId: string }
  | { acao: 'ligar'; de: string; para: string }
  | { acao: 'nada' };

export interface AlvoFluxo {
  soltura: SolturaFluxo;
  /** O que vai acontecer, em linguagem simples ("Soltar aqui: inserir entre 2.3 e 2.4"). */
  texto: string;
  /** O que realçar. */
  raiaId: string | null;
  ligacaoId: string | null;
  blocoId: string | null;
}

export interface ReferenciasFluxo {
  /** Referência curta a um elemento ("2.3 Descrever o ambiente", "a decisão Minuta aprovada?"). */
  elemento(id: string): string;
  raia(id: string): string;
}

/**
 * O alvo do arrasto no ponto `p`: sobre uma seta (inserir ou mover para entre os
 * dois passos dela), numa raia (incluir no fim dela ou trocar a raia) ou sobre um
 * bloco (ligar, quando se arrasta a alça). O texto diz o que vai acontecer.
 */
export function alvoDoArrasto(
  def: PeFluxoDefinicao, vista: VistaFluxo, arrasto: ArrastoFluxo, p: PontoFluxo | null, tolerancia: number, ref: ReferenciasFluxo
): AlvoFluxo {
  const nada = (texto: string): AlvoFluxo => ({ soltura: { acao: 'nada' }, texto, raiaId: null, ligacaoId: null, blocoId: null });
  if (arrasto.origem === 'alca') {
    const deTexto = ref.elemento(arrasto.id);
    const alvo = p ? blocoNoPonto(vista, p, 6) : null;
    if (!alvo || alvo.id === arrasto.id) return nada(`Solte sobre o passo que vem depois de ${deTexto}.`);
    const motivo = motivoParaNaoLigar(def, arrasto.id, alvo.id);
    if (motivo) return { ...nada(motivo), blocoId: null };
    return {
      soltura: { acao: 'ligar', de: arrasto.id, para: alvo.id },
      texto: `Soltar aqui: ligar ${deTexto} a ${ref.elemento(alvo.id)}`,
      raiaId: null, ligacaoId: null, blocoId: alvo.id
    };
  }
  const raia = p ? raiaNoPonto(vista, p) : null;
  if (!p || !raia) return nada(arrasto.origem === 'paleta' ? 'Solte numa raia ou sobre uma seta.' : 'Solte em outra raia ou sobre uma seta.');
  const tipo = arrasto.origem === 'paleta' ? arrasto.tipo : def.Elementos.find(e => e.Id === arrasto.id)?.Tipo;
  const seta = tipoEntraNaSeta(tipo) ? ligacaoNoPonto(vista, p, tolerancia, arrasto.origem === 'bloco' ? arrasto.id : null) : null;
  if (arrasto.origem === 'paleta') {
    if (seta) {
      return {
        soltura: { acao: 'inserir', tipo: arrasto.tipo, ligacaoId: seta.id, raiaId: raia.id },
        texto: `Soltar aqui: inserir entre ${ref.elemento(seta.de)} e ${ref.elemento(seta.para)}`,
        raiaId: raia.id, ligacaoId: seta.id, blocoId: null
      };
    }
    return {
      soltura: { acao: 'incluir', tipo: arrasto.tipo, raiaId: raia.id },
      texto: `Soltar aqui: no fim da raia ${ref.raia(raia.id)}, ainda sem ligação`,
      raiaId: raia.id, ligacaoId: null, blocoId: null
    };
  }
  const elemento = def.Elementos.find(e => e.Id === arrasto.id);
  if (!elemento) return nada('Este passo não existe mais.');
  if (seta) {
    return {
      soltura: { acao: 'mover-seta', elementoId: elemento.Id, ligacaoId: seta.id, raiaId: raia.id },
      texto: `Soltar aqui: mover ${ref.elemento(elemento.Id)} para entre ${ref.elemento(seta.de)} e ${ref.elemento(seta.para)}`,
      raiaId: raia.id, ligacaoId: seta.id, blocoId: null
    };
  }
  if (raia.id === elemento.RaiaId) {
    return { ...nada('Na mesma raia, a posição é automática. Solte em outra raia ou sobre uma seta.'), raiaId: raia.id };
  }
  return {
    soltura: { acao: 'mover-raia', elementoId: elemento.Id, raiaId: raia.id },
    texto: `Soltar aqui: mover ${ref.elemento(elemento.Id)} para a raia ${ref.raia(raia.id)}`,
    raiaId: raia.id, ligacaoId: null, blocoId: null
  };
}

/** A ordem em que as setas são visitadas pelo teclado: pela ordem do bloco de onde saem, e depois pela de chegada. */
export function ordemDasLigacoes(ligacoes: readonly VistaLigacao[], ordemDosBlocos: readonly string[]): VistaLigacao[] {
  const posicao = new Map(ordemDosBlocos.map((id, i) => [id, i]));
  const p = (id: string) => posicao.get(id) ?? Number.MAX_SAFE_INTEGER;
  return [...ligacoes].sort((a, b) => p(a.de) - p(b.de) || p(a.para) - p(b.para));
}
