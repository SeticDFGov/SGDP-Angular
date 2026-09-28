/**
 * F3 · Níveis no modo livre (funções puras): o modo dos níveis, a situação sem
 * ajuste de um item no modo livre (a tela dos ajustes do órgão), as formas de um
 * passo (o quadro "Forma deste passo") e o nível alcançado em palavras. Sem
 * Angular e sem classe nova do Tailwind.
 *
 * No modo livre, o nível base é o nível padrão (o primeiro ativo, pela ordem; o
 * Básico no modelo inicial): todo órgão começa por ele, os outros passos do Guia
 * aparecem como opcionais e o nível sai do que o PDTIC tem. No modo definido (e
 * sem o campo, na resposta anterior da API), vale o nível de cada órgão, como antes.
 */
import {
  PeModoNiveis, PeNivel, PeNivelAlcancado, PeOpcaoDetalhe, PeSituacao
} from '../../../api/planejamento/interface';

/** O modo de uma resposta que o traz (modelo, passo a passo, resumo); sem ele, o definido. */
export function modoDosNiveis(fonte: { ModoNiveis?: PeModoNiveis | null } | null | undefined): PeModoNiveis {
  return fonte?.ModoNiveis === 'livre' ? 'livre' : 'definido';
}

/** Um valor de modo (do servidor ou da tela) válido; qualquer outro vale o definido. */
export function modoValido(valor: string | null | undefined): PeModoNiveis {
  return valor === 'livre' ? 'livre' : 'definido';
}

const porOrdem = (a: PeNivel, b: PeNivel) => a.Ordem - b.Ordem || a.Id - b.Id;

/** Os níveis ativos, na ordem (o primeiro é o nível base). */
export function niveisAtivos(niveis: readonly PeNivel[] | null | undefined): PeNivel[] {
  return [...(niveis ?? [])].filter(n => n.Ativo).sort(porOrdem);
}

/** O nível base (o padrão): o primeiro ativo, pela ordem. */
export function nivelBase(niveis: readonly PeNivel[] | null | undefined): PeNivel | null {
  return niveisAtivos(niveis)[0] ?? null;
}

type ComNiveis = { Niveis: Record<string, PeSituacao> | null };

function naSituacao(item: ComNiveis, nivelId: number): PeSituacao {
  return item.Niveis?.[String(nivelId)] ?? 'desligado';
}

/**
 * C2: a situação de um passo no modo livre, sem ajuste do órgão: a do nível base,
 * quando o passo está ligado nele; senão opcional, quando está ligado em algum
 * nível ativo; senão desligado.
 */
export function situacaoLivreDoPasso(passo: ComNiveis, niveis: readonly PeNivel[]): PeSituacao {
  const ativos = niveisAtivos(niveis);
  const base = ativos[0];
  if (!base) return 'desligado';
  const noBase = naSituacao(passo, base.Id);
  if (noBase !== 'desligado') return noBase;
  return ativos.some(n => naSituacao(passo, n.Id) !== 'desligado') ? 'opcional' : 'desligado';
}

/**
 * C2: o nível da forma padrão de um passo no modo livre: o base, quando o passo está
 * ligado nele; senão o primeiro nível ativo em que está ligado. Null: o passo não
 * está ligado em nenhum nível ativo.
 */
export function nivelDaFormaPadrao(passo: ComNiveis, niveis: readonly PeNivel[]): number | null {
  const ligado = niveisAtivos(niveis).find(n => naSituacao(passo, n.Id) !== 'desligado');
  return ligado?.Id ?? null;
}

// ── A forma de um passo (C3) ─────────────────────────────────────────────────

/** Uma forma do passo como o quadro "Forma deste passo" mostra. */
export interface OpcaoDaForma {
  nivelId: number;
  nome: string;
  /** "o mínimo do decreto" na do nível base; "acrescenta 3 campos e 1 seção" nas outras. */
  descricao: string;
  /** A forma padrão do passo (a do nível base, ou a primeira quando o passo não está no base). */
  padrao: boolean;
}

function contagem(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`;
}

/**
 * O que uma forma muda em relação à padrão, pela diferença das contagens:
 * "acrescenta 3 campos e 1 seção", "acrescenta 2 campos", "tem 1 campo a menos"
 * ou, sem diferença nas contagens, que muda a obrigatoriedade.
 */
export function textoDiferencaDaForma(campos: number, secoes: number): string {
  const partes: string[] = [];
  if (campos > 0) partes.push(contagem(campos, 'campo', 'campos'));
  if (secoes > 0) partes.push(contagem(secoes, 'seção', 'seções'));
  if (partes.length) return `acrescenta ${partes.join(' e ')}`;
  const menos: string[] = [];
  if (campos < 0) menos.push(contagem(-campos, 'campo', 'campos'));
  if (secoes < 0) menos.push(contagem(-secoes, 'seção', 'seções'));
  if (menos.length) return `tem ${menos.join(' e ')} a menos`;
  return 'os mesmos campos, com outra obrigatoriedade';
}

/**
 * As formas oferecidas (a ordem do servidor: do nível mais baixo para o mais alto),
 * com o texto de cada uma: a do nível base é "o mínimo do decreto"; a padrão que não
 * é a do base, "a forma padrão deste passo"; as outras, a diferença para a padrão.
 */
export function opcoesDaForma(opcoes: readonly PeOpcaoDetalhe[] | null | undefined, nivelBaseId: number | null): OpcaoDaForma[] {
  const lista = opcoes ?? [];
  if (!lista.length) return [];
  const padrao = lista.find(o => o.NivelId === nivelBaseId) ?? lista[0];
  return lista.map(o => {
    const ehPadrao = o.NivelId === padrao.NivelId;
    const descricao = ehPadrao
      ? (o.NivelId === nivelBaseId ? 'o mínimo do decreto' : 'a forma padrão deste passo')
      : textoDiferencaDaForma(o.Campos - padrao.Campos, o.Secoes - padrao.Secoes);
    return { nivelId: o.NivelId, nome: o.NivelNome, descricao, padrao: ehPadrao };
  });
}

// ── O nível alcançado (C5 e C6) ──────────────────────────────────────────────

/**
 * Por que o nível não é calculado, no PDTIC registrado fora do sistema: o mesmo texto do
 * servidor. A situação dos passos o manda no `Nivel`; o resumo do órgão não, e a página do
 * órgão usa este quando o PDTIC dela foi registrado fora do sistema.
 */
export const MOTIVO_NIVEL_NAO_CALCULADO = 'O PDTIC foi aprovado fora do sistema: o nível não é calculado.';

/**
 * O nível alcançado numa linha curta, para o alto do passo a passo e o bloco "Seu
 * acesso": "Básico", "nenhum ainda" ou "não calculado" (PDTIC aprovado fora do
 * sistema). Null sem a informação (a API anterior, ou o PDTIC sem situação ainda).
 */
export function nomeDoNivelAlcancado(n: PeNivelAlcancado | null | undefined): string | null {
  if (!n) return null;
  if (n.AlcancadoNome?.trim()) return n.AlcancadoNome.trim();
  if (n.Motivo?.trim()) return 'não calculado';
  return 'nenhum ainda';
}

/**
 * A frase do quadro "Nível do PDTIC": "Nível alcançado: Intermediário" ou, sem nível
 * alcançado, "O PDTIC ainda não completa o nível Básico" (o próximo, que é o primeiro).
 */
export function fraseDoNivelAlcancado(n: PeNivelAlcancado, nomeBase: string | null): string {
  if (n.AlcancadoNome?.trim()) return `Nível alcançado: ${n.AlcancadoNome.trim()}`;
  const primeiro = n.ProximoNome?.trim() || nomeBase?.trim();
  return primeiro ? `O PDTIC ainda não completa o nível ${primeiro}` : 'O PDTIC ainda não alcançou nenhum nível';
}

/** "Para chegar ao nível Intermediário, faltam 17 passos" (ou "falta 1 passo"); vazio sem próximo nível. */
export function fraseDoQueFalta(n: PeNivelAlcancado): string {
  const proximo = n.ProximoNome?.trim();
  const faltam = n.Faltam?.length ?? 0;
  if (!proximo || !faltam) return '';
  return `Para chegar ao nível ${proximo}, ${faltam === 1 ? 'falta 1 passo' : `faltam ${faltam} passos`}`;
}
