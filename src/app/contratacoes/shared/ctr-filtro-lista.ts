import { ParamMap, Params } from '@angular/router';
import { CtrProcessoFiltro } from '../../../api/contratacoes/interface';

/**
 * Filtros da lista de processos na URL (`/analises/processos/lista?situacao=...`).
 *
 * A lista grava os filtros aplicados na URL, então voltar de um processo, recarregar
 * a página ou mandar o link a alguém mostra a mesma lista; o painel usa os mesmos
 * parâmetros para abrir a lista já filtrada. Nomes curtos e minúsculos, próprios da
 * tela (não são os da API).
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
  { campo: 'Origem', parametro: 'origem' },
  { campo: 'EsclarecimentoPendente', parametro: 'esclarecimento', booleano: true },
  { campo: 'Restituidos', parametro: 'restituidos', booleano: true },
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
