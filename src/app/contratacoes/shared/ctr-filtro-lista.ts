import { ParamMap, Params } from '@angular/router';
import { CtrProcessoFiltro, ORIGEM_PADRAO, ORIGEM_TCDF } from '../../../api/contratacoes/interface';

/**
 * As duas listas de processos (desde 2026-09-24), sub-abas de Processos, separadas pela
 * origem: `lista` são os processos de supervisão contínua (vindos do órgão comunicante) e
 * `comunicacoes-tcdf` os que nasceram de uma comunicação do TCDF.
 */
export const SECAO_LISTA_SUPERVISAO = 'lista';
export const SECAO_LISTA_TCDF = 'comunicacoes-tcdf';

/** A seção da lista que mostra os processos dessa origem. */
export function secaoDaLista(origem: string | null | undefined): string {
  return origem === ORIGEM_TCDF ? SECAO_LISTA_TCDF : SECAO_LISTA_SUPERVISAO;
}

/** A origem que a seção da lista mostra; nulo quando a seção não é uma lista. */
export function origemDaSecao(secao: string): string | null {
  if (secao === SECAO_LISTA_TCDF) return ORIGEM_TCDF;
  if (secao === SECAO_LISTA_SUPERVISAO) return ORIGEM_PADRAO;
  return null;
}

/**
 * Filtros da lista de processos na URL (`/analises/processos/lista?situacao=...`).
 *
 * A lista grava os filtros aplicados na URL, então voltar de um processo, recarregar
 * a página ou mandar o link a alguém mostra a mesma lista; o painel usa os mesmos
 * parâmetros para abrir a lista já filtrada. Nomes curtos e minúsculos, próprios da
 * tela (não são os da API). A origem não entra: é a sub-aba que a escolhe. A restituição
 * também saiu (2026-09-24): as telas não a pedem mais.
 */
interface ParametroFiltro {
  campo: keyof CtrProcessoFiltro;
  parametro: string;
  /** Tri-estado da API (true/false/nulo) vira `sim`/`nao` na URL. */
  booleano?: boolean;
}

const PARAMETROS: ParametroFiltro[] = [
  { campo: 'Filtro', parametro: 'busca' },
  { campo: 'Situacao', parametro: 'situacao' },
  { campo: 'IncluirConcluidos', parametro: 'concluidos', booleano: true },
  { campo: 'NivelRiscoDeclarado', parametro: 'nivel' },
  { campo: 'Categoria', parametro: 'categoria' },
  { campo: 'Sigla', parametro: 'sigla' },
  { campo: 'Criticidade', parametro: 'criticidade' },
  { campo: 'EtapaPlanejamento', parametro: 'etapa' },
  { campo: 'EsclarecimentoPendente', parametro: 'esclarecimento', booleano: true },
  { campo: 'De', parametro: 'de' },
  { campo: 'Ate', parametro: 'ate' }
];

/** Parâmetros de URL dos filtros preenchidos (os vazios ficam de fora). */
export function parametrosDaLista(filtro: CtrProcessoFiltro): Params {
  const params: Params = {};
  for (const p of PARAMETROS) {
    const valor = filtro[p.campo];
    if (valor === null || valor === undefined || valor === '') continue;
    params[p.parametro] = p.booleano ? (valor ? 'sim' : 'nao') : String(valor);
  }
  return params;
}

/** Filtros lidos da URL; parâmetro ausente ou booleano estranho fica vazio. */
export function filtroDosParametros(params: ParamMap): Partial<CtrProcessoFiltro> {
  const filtro: Partial<CtrProcessoFiltro> = {};
  for (const p of PARAMETROS) {
    const valor = params.get(p.parametro);
    if (valor === null || valor === '') continue;
    if (p.booleano) {
      if (valor === 'sim' || valor === 'nao') (filtro as Record<string, unknown>)[p.campo] = valor === 'sim';
    } else {
      (filtro as Record<string, unknown>)[p.campo] = valor;
    }
  }
  return filtro;
}
