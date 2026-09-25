/**
 * Fluxos de trabalho (E6), sem Angular: os tipos de elemento em linguagem
 * simples, a ordem do fluxo (com os retornos) e a numeração provisória, os nomes
 * do dicionário nas raias, os rótulos dos passos, a descrição do fluxo em texto
 * (o texto alternativo do desenho), as mudanças na definição que o editor faz,
 * a leitura dos erros da API e o tamanho do desenho.
 *
 * As mudanças valem para os dois modos de edição (E9): o editor em lista e o
 * visual, de arrastar e soltar, mexem na mesma definição com estas funções.
 *
 * O desenho e a numeração que valem são os do servidor: a numeração daqui só
 * aparece enquanto há mudança não salva, com a mesma regra (tarefas e
 * subprocessos pela ordem do fluxo, com o prefixo).
 */
import type { HttpErrorResponse } from '@angular/common/http';
import {
  PeErroFluxo, PeFluxoDefinicao, PeFluxoElemento, PeFluxoLigacao, PeFluxoRaia, PeRegistrosDaSecao, PeTipoElementoFluxo
} from '../../../api/planejamento/interface';
import { OpcaoRotulo, juntar } from './pe-modelo-rotulos';

// ── Tipos de elemento ────────────────────────────────────────────────────────

export interface TipoElementoFluxo extends OpcaoRotulo<PeTipoElementoFluxo> {
  icone: string;
  /** O que o tipo faz, para quem escolhe. */
  explicacao: string;
  /** Rótulo do campo do nome ("Pergunta da decisão"). */
  rotuloNome: string;
}

export const TIPOS_ELEMENTO_FLUXO: readonly TipoElementoFluxo[] = [
  {
    valor: 'tarefa', rotulo: 'Tarefa', icone: 'check_box_outline_blank', rotuloNome: 'Nome da tarefa',
    explicacao: 'Uma atividade que a raia faz. Recebe um número automático, como 1.3.'
  },
  {
    valor: 'subprocesso', rotulo: 'Subprocesso', icone: 'add_box', rotuloNome: 'Nome do subprocesso',
    explicacao: 'Um conjunto de atividades que tem o próprio fluxo, como a preparação dentro da elaboração. Também recebe número.'
  },
  {
    valor: 'decisao', rotulo: 'Decisão', icone: 'help_outline', rotuloNome: 'Pergunta da decisão',
    explicacao: 'Uma pergunta com duas ou mais saídas, como "Sim" e "Não". Cada saída leva a um passo.'
  },
  {
    valor: 'paralelo', rotulo: 'Paralelo', icone: 'add_circle_outline', rotuloNome: 'Nome do paralelo (opcional)',
    explicacao: 'Divide o caminho em passos que acontecem ao mesmo tempo, ou junta esses caminhos de volta.'
  },
  {
    valor: 'ligacao', rotulo: 'Ligação com outro fluxo', icone: 'link', rotuloNome: 'Nome da ligação',
    explicacao: 'Um ponto que liga este fluxo a outro, como a volta da revisão do PDTIC para o diagnóstico.'
  },
  {
    valor: 'inicio', rotulo: 'Início', icone: 'play_circle_outline', rotuloNome: 'Nome do início (opcional)',
    explicacao: 'Onde o fluxo começa. Todo fluxo tem um início.'
  },
  {
    valor: 'fim', rotulo: 'Fim', icone: 'stop_circle', rotuloNome: 'Nome do fim (opcional)',
    explicacao: 'Onde o fluxo termina. Todo fluxo tem pelo menos um fim.'
  }
];

function tipoElemento(tipo: string | null | undefined): TipoElementoFluxo | null {
  return TIPOS_ELEMENTO_FLUXO.find(t => t.valor === tipo) ?? null;
}

export function rotuloTipoElemento(tipo: string | null | undefined): string {
  return tipoElemento(tipo)?.rotulo ?? (tipo || 'Passo');
}

export function iconeTipoElemento(tipo: string | null | undefined): string {
  return tipoElemento(tipo)?.icone ?? 'label';
}

export function explicacaoTipoElemento(tipo: string | null | undefined): string {
  return tipoElemento(tipo)?.explicacao ?? '';
}

export function rotuloNomeElemento(tipo: string | null | undefined): string {
  return tipoElemento(tipo)?.rotuloNome ?? 'Nome';
}

/** Tarefa e subprocesso: recebem número e podem ter documentos (artefatos). */
export function tipoNumerado(tipo: string | null | undefined): boolean {
  return tipo === 'tarefa' || tipo === 'subprocesso';
}

/** Tipos cujo nome o servidor pede (os demais têm nome opcional). */
export function tipoPedeNome(tipo: string | null | undefined): boolean {
  return tipoNumerado(tipo) || tipo === 'decisao' || tipo === 'ligacao';
}

// ── Definição ────────────────────────────────────────────────────────────────

/** Tamanhos que a tela aceita (o servidor confere de novo). */
export const MAX_NOME_FLUXO = 200;
export const MAX_NOME_RAIA = 120;
export const MAX_NOME_ELEMENTO = 200;
export const MAX_ARTEFATO = 200;
export const MAX_ROTULO_SAIDA = 60;
export const MAX_PREFIXO = 10;

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

/**
 * A definição como a tela usa, a partir do que veio do servidor: listas sempre
 * presentes, textos sempre texto, raias na ordem. Tolerante a campos faltando.
 */
export function normalizarDefinicao(bruta: unknown): PeFluxoDefinicao {
  const d = (bruta && typeof bruta === 'object' ? bruta : {}) as Partial<Record<keyof PeFluxoDefinicao, unknown>>;
  const lista = (v: unknown): Record<string, unknown>[] =>
    Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];
  const raias: PeFluxoRaia[] = lista(d.Raias).map((r, i) => ({
    Id: texto(r['Id']), Nome: texto(r['Nome']), Ordem: typeof r['Ordem'] === 'number' ? r['Ordem'] : i + 1
  }));
  const elementos: PeFluxoElemento[] = lista(d.Elementos).map(e => ({
    Id: texto(e['Id']),
    Tipo: (texto(e['Tipo']) || 'tarefa') as PeTipoElementoFluxo,
    RaiaId: texto(e['RaiaId']),
    Nome: texto(e['Nome']),
    Numero: typeof e['Numero'] === 'string' && e['Numero'] ? e['Numero'] : null,
    Artefatos: Array.isArray(e['Artefatos']) ? (e['Artefatos'] as unknown[]).filter((a): a is string => typeof a === 'string') : []
  }));
  const ligacoes: PeFluxoLigacao[] = lista(d.Ligacoes).map(l => ({
    Id: texto(l['Id']),
    De: texto(l['De']),
    Para: texto(l['Para']),
    Rotulo: typeof l['Rotulo'] === 'string' && l['Rotulo'] ? l['Rotulo'] : null
  }));
  const prefixo = d.PrefixoNumeracao;
  return {
    PrefixoNumeracao: typeof prefixo === 'string' ? prefixo : typeof prefixo === 'number' ? String(prefixo) : null,
    Raias: [...raias].sort((a, b) => a.Ordem - b.Ordem),
    Elementos: elementos,
    Ligacoes: ligacoes
  };
}

export function clonarDefinicao(def: PeFluxoDefinicao): PeFluxoDefinicao {
  return normalizarDefinicao(JSON.parse(JSON.stringify(def)));
}

/** As raias na ordem (a de cima primeiro). */
export function raiasEmOrdem(def: PeFluxoDefinicao): PeFluxoRaia[] {
  return [...(def.Raias ?? [])].sort((a, b) => a.Ordem - b.Ordem);
}

/**
 * Retrato do que se edita (nome, prefixo, raias, elementos na ordem da lista e
 * ligações), sem o número: dois retratos iguais = nada mudou.
 */
export function retratoFluxo(nome: string, def: PeFluxoDefinicao): string {
  return JSON.stringify({
    n: nome,
    p: def.PrefixoNumeracao ?? '',
    r: raiasEmOrdem(def).map(r => [r.Id, r.Nome]),
    e: def.Elementos.map(e => [e.Id, e.Tipo, e.RaiaId, e.Nome, e.Artefatos]),
    l: def.Ligacoes.map(l => [l.Id, l.De, l.Para, l.Rotulo ?? null])
  });
}

/**
 * A definição como vai para a API: textos sem espaço nas pontas, raias com a
 * ordem pela posição, número nulo (o servidor calcula), rótulo vazio nulo e
 * documento vazio fora.
 */
export function definicaoParaEnvio(def: PeFluxoDefinicao): PeFluxoDefinicao {
  const prefixo = (def.PrefixoNumeracao ?? '').trim();
  return {
    PrefixoNumeracao: prefixo || null,
    Raias: raiasEmOrdem(def).map((r, i) => ({ Id: r.Id, Nome: r.Nome.trim(), Ordem: i + 1 })),
    Elementos: def.Elementos.map(e => ({
      Id: e.Id,
      Tipo: e.Tipo,
      RaiaId: e.RaiaId,
      Nome: e.Nome.trim(),
      Numero: null,
      Artefatos: e.Artefatos.map(a => a.trim()).filter(Boolean)
    })),
    Ligacoes: def.Ligacoes.map(l => ({ Id: l.Id, De: l.De, Para: l.Para, Rotulo: l.Rotulo?.trim() || null }))
  };
}

/** Id curto e novo ("r3", "e12", "l20"): o maior número usado com o prefixo, mais um. */
export function novoId(prefixo: string, usados: Iterable<string>): string {
  const existentes = new Set(usados);
  let maior = 0;
  const padrao = new RegExp(`^${prefixo}(\\d+)$`);
  for (const id of existentes) {
    const m = padrao.exec(id);
    if (m) maior = Math.max(maior, Number(m[1]));
  }
  let n = maior + 1;
  while (existentes.has(`${prefixo}${n}`)) n++;
  return `${prefixo}${n}`;
}

// ── Ordem do fluxo e numeração ───────────────────────────────────────────────

export interface OrdemFluxo {
  /** Todos os elementos, na ordem do fluxo (camada, raia, posição na lista); os soltos no fim. */
  ordem: PeFluxoElemento[];
  /** Ligações que voltam para um passo anterior (laços, como o "Não" da aprovação da minuta). */
  retornos: ReadonlySet<string>;
  /** Ligações válidas (os dois lados existem e são diferentes), na ordem da lista. */
  ligacoes: PeFluxoLigacao[];
}

/**
 * A ordem do fluxo: parte do início (e dos pontos sem entrada, como a ligação que
 * vem de outro fluxo), marca como retorno a ligação que volta a um passo do
 * caminho, e ordena por camada (o caminho mais longo até o passo, sem os
 * retornos), depois pela raia (a de cima primeiro) e pela posição na lista.
 * Passo sem nenhuma ligação vai para o fim.
 */
export function ordemDoFluxo(def: PeFluxoDefinicao): OrdemFluxo {
  const elementos = def.Elementos ?? [];
  const ids = new Set(elementos.map(e => e.Id));
  const indice = new Map<string, number>();
  elementos.forEach((e, i) => indice.set(e.Id, i));
  const ordemRaia = new Map<string, number>();
  raiasEmOrdem(def).forEach((r, i) => ordemRaia.set(r.Id, i));
  const ligacoes = (def.Ligacoes ?? []).filter(l => ids.has(l.De) && ids.has(l.Para) && l.De !== l.Para);

  const saidas = new Map<string, PeFluxoLigacao[]>();
  const comEntrada = new Set<string>();
  for (const l of ligacoes) {
    const lista = saidas.get(l.De) ?? [];
    lista.push(l);
    saidas.set(l.De, lista);
    comEntrada.add(l.Para);
  }
  const posicaoRaia = (e: PeFluxoElemento) => ordemRaia.get(e.RaiaId) ?? Number.MAX_SAFE_INTEGER;
  const porRaiaELista = (a: PeFluxoElemento, b: PeFluxoElemento) =>
    posicaoRaia(a) - posicaoRaia(b) || (indice.get(a.Id) ?? 0) - (indice.get(b.Id) ?? 0);

  // Busca em profundidade a partir das raízes: a ligação para um passo ainda na pilha é um retorno
  const retornos = new Set<string>();
  const estado = new Map<string, 'pilha' | 'feito'>();
  const visitar = (raiz: string) => {
    if (estado.has(raiz)) return;
    const pilha: { id: string; proxima: number }[] = [{ id: raiz, proxima: 0 }];
    estado.set(raiz, 'pilha');
    while (pilha.length) {
      const topo = pilha[pilha.length - 1];
      const lista = saidas.get(topo.id) ?? [];
      if (topo.proxima >= lista.length) {
        estado.set(topo.id, 'feito');
        pilha.pop();
        continue;
      }
      const l = lista[topo.proxima++];
      const alvo = estado.get(l.Para);
      if (alvo === 'pilha') retornos.add(l.Id);
      else if (!alvo) {
        estado.set(l.Para, 'pilha');
        pilha.push({ id: l.Para, proxima: 0 });
      }
    }
  };
  const inicios = elementos.filter(e => e.Tipo === 'inicio').sort(porRaiaELista);
  const semEntrada = elementos.filter(e => e.Tipo !== 'inicio' && !comEntrada.has(e.Id)).sort(porRaiaELista);
  [...inicios, ...semEntrada, ...[...elementos].sort(porRaiaELista)].forEach(e => visitar(e.Id));

  // Camadas: o caminho mais longo no grafo sem os retornos
  const grau = new Map<string, number>(elementos.map(e => [e.Id, 0]));
  for (const l of ligacoes) if (!retornos.has(l.Id)) grau.set(l.Para, (grau.get(l.Para) ?? 0) + 1);
  const camada = new Map<string, number>(elementos.map(e => [e.Id, 0]));
  const fila = elementos.filter(e => grau.get(e.Id) === 0).map(e => e.Id);
  for (let i = 0; i < fila.length; i++) {
    const id = fila[i];
    for (const l of saidas.get(id) ?? []) {
      if (retornos.has(l.Id)) continue;
      camada.set(l.Para, Math.max(camada.get(l.Para) ?? 0, (camada.get(id) ?? 0) + 1));
      const resta = (grau.get(l.Para) ?? 1) - 1;
      grau.set(l.Para, resta);
      if (resta === 0) fila.push(l.Para);
    }
  }
  // Passo solto (sem entrada e sem saída, fora o início): no fim da lista
  const maior = Math.max(0, ...camada.values());
  for (const e of elementos) {
    if (e.Tipo !== 'inicio' && !comEntrada.has(e.Id) && !saidas.has(e.Id)) camada.set(e.Id, maior + 1);
  }

  const ordem = [...elementos].sort((a, b) => (camada.get(a.Id) ?? 0) - (camada.get(b.Id) ?? 0) || porRaiaELista(a, b));
  return { ordem, retornos, ligacoes };
}

/**
 * Número de cada tarefa e subprocesso pela ordem do fluxo: "1.1", "1.2"... com o
 * prefixo; sem prefixo, nenhum número (como o servidor e o documento).
 */
export function numerosDoFluxo(def: PeFluxoDefinicao, ordem: PeFluxoElemento[] = ordemDoFluxo(def).ordem): Map<string, string> {
  const prefixo = (def.PrefixoNumeracao ?? '').trim();
  const numeros = new Map<string, string>();
  // Sem prefixo, o servidor não numera (o desenho sai sem números): a descrição segue a mesma regra (F1, B17)
  if (!prefixo) return numeros;
  let n = 0;
  for (const e of ordem) {
    if (!tipoNumerado(e.Tipo)) continue;
    n++;
    numeros.set(e.Id, `${prefixo}.${n}`);
  }
  return numeros;
}

/** Os números que o servidor calculou (os que valem quando não há mudança pendente). */
export function numerosDoServidor(def: PeFluxoDefinicao): Map<string, string> {
  const numeros = new Map<string, string>();
  for (const e of def.Elementos) if (e.Numero && tipoNumerado(e.Tipo)) numeros.set(e.Id, e.Numero);
  return numeros;
}

// ── Nomes do dicionário ──────────────────────────────────────────────────────

/** Um nome do dicionário de nomes que dá para usar numa raia (marcador sem as chaves). */
export interface OpcaoNomeDicionario {
  marcador: string;
  descricao: string;
}

/**
 * Os nomes do dicionário e o valor de cada um: no PDTIC, os que o órgão
 * escreveu no passo do dicionário de nomes; no modelo, os nomes padrão do guia.
 */
export interface DicionarioFluxo {
  opcoes: OpcaoNomeDicionario[];
  valores: ReadonlyMap<string, string>;
  /** Os valores são os nomes padrão (modelo do guia, ou o dicionário do órgão não veio). */
  padrao: boolean;
}

/** Como o modelo mostra os marcadores (os nomes do Guia de PDTIC). */
export const NOMES_PADRAO_FLUXO: Readonly<Record<string, string>> = {
  'nomes.comite': 'Comitê de Governança Digital',
  'nomes.equipe': 'Equipe de Elaboração do PDTIC',
  'nomes.equipe_acompanhamento': 'Equipe de Acompanhamento do PDTIC',
  'nomes.autoridade': 'Autoridade Máxima',
  'nomes.autoridade_cargo': 'Autoridade Máxima',
  'nomes.unidade_tic': 'Unidade de TIC'
};

// Mesma ordem e mesmos textos do servidor (PeFluxoNomes.Fixos): a raia da autoridade usa o cargo
const OPCOES_PADRAO: readonly OpcaoNomeDicionario[] = [
  { marcador: 'nomes.comite', descricao: 'Comitê interno de TIC (SGTIC)' },
  { marcador: 'nomes.equipe', descricao: 'Equipe de elaboração do PDTIC' },
  { marcador: 'nomes.equipe_acompanhamento', descricao: 'Equipe de acompanhamento do PDTIC' },
  { marcador: 'nomes.autoridade_cargo', descricao: 'Autoridade máxima do órgão (o cargo)' },
  { marcador: 'nomes.autoridade', descricao: 'Autoridade máxima do órgão (o nome da pessoa)' },
  { marcador: 'nomes.unidade_tic', descricao: 'Unidade de TIC' }
];

/** Marcadores de nome curto: o campo do dicionário tem outra chave (o mesmo mapa do servidor). */
const CAMPO_DO_MARCADOR: Readonly<Record<string, string>> = {
  'nomes.equipe': 'equipe_elaboracao',
  'nomes.autoridade': 'autoridade_nome'
};
const MARCADOR_DO_CAMPO: Readonly<Record<string, string>> = {
  equipe_elaboracao: 'nomes.equipe',
  autoridade_nome: 'nomes.autoridade'
};
/** Campos do dicionário que não servem de nome de raia. */
const CAMPOS_FORA_DAS_RAIAS: ReadonlySet<string> = new Set(['sigla_orgao', 'logotipo']);

/** Chave da seção do dicionário de nomes no PDTIC (passo 1.2). */
export const SECAO_DICIONARIO_NOMES = 'nomes';

export function dicionarioPadrao(): DicionarioFluxo {
  return { opcoes: [...OPCOES_PADRAO], valores: new Map(Object.entries(NOMES_PADRAO_FLUXO)), padrao: true };
}

/**
 * O dicionário do órgão, lido da seção `nomes` do PDTIC: os campos de texto
 * viram opções (inclusive os que o administrador criou) e o registro dá os valores.
 */
export function dicionarioDoRegistro(dados: PeRegistrosDaSecao | null | undefined): DicionarioFluxo {
  const opcoes = [...OPCOES_PADRAO];
  for (const campo of dados?.Secao?.Campos ?? []) {
    if ((campo.Tipo !== 'texto_curto' && campo.Tipo !== 'texto_longo') || CAMPOS_FORA_DAS_RAIAS.has(campo.Chave)) continue;
    const marcador = MARCADOR_DO_CAMPO[campo.Chave] ?? `nomes.${campo.Chave}`;
    if (!opcoes.some(o => o.marcador === marcador)) opcoes.push({ marcador, descricao: campo.Rotulo });
  }
  const dadosDoRegistro = dados?.Registros?.[0]?.Dados ?? {};
  const valores = new Map<string, string>();
  for (const o of opcoes) {
    const campo = CAMPO_DO_MARCADOR[o.marcador] ?? o.marcador.slice('nomes.'.length);
    const valor = dadosDoRegistro[campo];
    if (typeof valor === 'string' && valor.trim()) valores.set(o.marcador, valor.trim());
  }
  return { opcoes, valores, padrao: false };
}

const REGEX_MARCADOR_NOME = /\{(nomes\.[A-Za-z0-9_]+)\}/g;

/** O nome é só um marcador do dicionário ("{nomes.comite}"): o marcador sem as chaves; senão null. */
export function marcadorDoNome(nome: string | null | undefined): string | null {
  const m = /^\s*\{(nomes\.[A-Za-z0-9_]+)\}\s*$/.exec(nome ?? '');
  return m ? m[1] : null;
}

/** Como o marcador aparece no texto: "{nomes.comite}". */
export function textoDoMarcador(marcador: string): string {
  return `{${marcador}}`;
}

/** O valor de um marcador: o do dicionário, senão o nome padrão, senão a descrição. */
export function valorDoMarcador(marcador: string, dic: DicionarioFluxo): string {
  return dic.valores.get(marcador)
    ?? NOMES_PADRAO_FLUXO[marcador]
    ?? dic.opcoes.find(o => o.marcador === marcador)?.descricao
    ?? textoDoMarcador(marcador);
}

/** O marcador ainda não tem valor no dicionário do órgão (vale o nome padrão). */
export function marcadorSemValor(marcador: string, dic: DicionarioFluxo): boolean {
  return !dic.padrao && !dic.valores.has(marcador);
}

/** O texto com os marcadores do dicionário trocados pelos nomes ("{nomes.comite}" vira o nome do comitê). */
export function resolverNomes(textoOriginal: string | null | undefined, dic: DicionarioFluxo): string {
  return (textoOriginal ?? '').replace(REGEX_MARCADOR_NOME, (_, marcador: string) => valorDoMarcador(marcador, dic));
}

/** A descrição de um marcador do dicionário ("Comitê interno de TIC (SGTIC)"). */
export function descricaoDoMarcador(marcador: string, dic: DicionarioFluxo): string {
  return dic.opcoes.find(o => o.marcador === marcador)?.descricao ?? marcador;
}

// ── Rótulos dos passos ───────────────────────────────────────────────────────

/** Entradas e saídas de cada elemento (só as ligações válidas). */
export interface VizinhosFluxo {
  entradas: Map<string, PeFluxoLigacao[]>;
  saidas: Map<string, PeFluxoLigacao[]>;
}

export function vizinhosDoFluxo(ligacoes: readonly PeFluxoLigacao[]): VizinhosFluxo {
  const entradas = new Map<string, PeFluxoLigacao[]>();
  const saidas = new Map<string, PeFluxoLigacao[]>();
  for (const l of ligacoes) {
    entradas.set(l.Para, [...(entradas.get(l.Para) ?? []), l]);
    saidas.set(l.De, [...(saidas.get(l.De) ?? []), l]);
  }
  return { entradas, saidas };
}

/** O que o paralelo faz com os caminhos, pelas ligações. */
function papelDoParalelo(id: string, v: VizinhosFluxo): 'divide' | 'junta' | 'junta e divide' | null {
  const entra = v.entradas.get(id)?.length ?? 0;
  const sai = v.saidas.get(id)?.length ?? 0;
  if (entra > 1 && sai > 1) return 'junta e divide';
  if (sai > 1) return 'divide';
  if (entra > 1) return 'junta';
  return null;
}

/**
 * Rótulo curto de cada elemento, para as listas de escolha e os resumos:
 * "1.3 Descrever a metodologia", "Decisão: Minuta aprovada?", "Paralelo 1
 * (divide)", "Início", "Fim 2", "Ligação: Revisão do PDTIC".
 */
export function rotulosDosElementos(
  def: PeFluxoDefinicao, numeros: ReadonlyMap<string, string>, dic: DicionarioFluxo, v: VizinhosFluxo, ordem: readonly PeFluxoElemento[]
): Map<string, string> {
  const rotulos = new Map<string, string>();
  const contagem = new Map<string, number>();
  const total = new Map<string, number>();
  for (const e of def.Elementos) total.set(e.Tipo, (total.get(e.Tipo) ?? 0) + 1);
  let semNome = 0;
  for (const e of ordem) {
    const n = (contagem.get(e.Tipo) ?? 0) + 1;
    contagem.set(e.Tipo, n);
    const varios = (total.get(e.Tipo) ?? 0) > 1;
    const nome = resolverNomes(e.Nome, dic).trim();
    let rotulo: string;
    switch (e.Tipo) {
      case 'inicio': rotulo = nome ? `Início: ${nome}` : varios ? `Início ${n}` : 'Início'; break;
      case 'fim': rotulo = nome ? `Fim: ${nome}` : varios ? `Fim ${n}` : 'Fim'; break;
      case 'decisao':
        rotulo = nome ? `Decisão: ${nome}` : ehEncontroDeCaminhos(e, v) ? 'Encontro dos caminhos' : 'Decisão: sem pergunta';
        break;
      case 'paralelo': {
        const papel = papelDoParalelo(e.Id, v);
        rotulo = `${nome ? `Paralelo: ${nome}` : varios ? `Paralelo ${n}` : 'Paralelo'}${papel ? ` (${papel})` : ''}`;
        break;
      }
      case 'ligacao': rotulo = `Ligação: ${nome || 'sem nome'}`; break;
      default: {
        const numero = numeros.get(e.Id);
        if (!nome) semNome++;
        const base = nome || `${rotuloTipoElemento(e.Tipo)} sem nome ${semNome}`;
        rotulo = numero ? `${numero} ${base}` : base;
      }
    }
    rotulos.set(e.Id, rotulo);
  }
  return rotulos;
}

/** Decisão sem pergunta que só junta caminhos: várias entradas e uma saída sem rótulo. */
function ehEncontroDeCaminhos(e: PeFluxoElemento, v: VizinhosFluxo): boolean {
  const saidas = v.saidas.get(e.Id) ?? [];
  return e.Tipo === 'decisao' && saidas.length === 1 && !saidas[0].Rotulo && (v.entradas.get(e.Id)?.length ?? 0) > 1;
}

/** "de" com o artigo da referência: "do início", "da decisão", "de 2.9 Identificar...". */
function comDe(referencia: string): string {
  const m = /^(o|a|os|as) (.*)$/.exec(referencia);
  return m ? `d${m[1]} ${m[2]}` : `de ${referencia}`;
}

/** Referência a um elemento dentro de uma frase ("a decisão "Minuta aprovada?"", "o fim"). */
function referencia(e: PeFluxoElemento, rotulos: ReadonlyMap<string, string>, dic: DicionarioFluxo, v: VizinhosFluxo): string {
  const nome = resolverNomes(e.Nome, dic).trim();
  switch (e.Tipo) {
    case 'inicio': return nome ? `o início "${nome}"` : 'o início';
    case 'fim': return nome ? `o fim "${nome}"` : 'o fim do fluxo';
    case 'decisao':
      if (!nome && ehEncontroDeCaminhos(e, v)) return 'o ponto em que os caminhos se encontram';
      return nome ? `a decisão "${nome}"` : 'a decisão sem pergunta';
    case 'paralelo': {
      const papel = papelDoParalelo(e.Id, v);
      if (papel === 'junta') return 'o ponto em que os caminhos se juntam';
      if (papel === 'divide') return 'o ponto em que o caminho se divide';
      return nome ? `o paralelo "${nome}"` : 'o paralelo';
    }
    case 'ligacao': return nome ? `a ligação com outro fluxo "${nome}"` : 'a ligação com outro fluxo';
    default: return rotulos.get(e.Id) ?? nome;
  }
}

// ── Descrição do fluxo em texto (o texto alternativo do desenho) ─────────────

export interface DescricaoFluxo {
  /** "O fluxo tem 2 raias (quem faz): ..." */
  resumo: string;
  /** Um item por passo, na ordem do fluxo. */
  itens: string[];
}

/**
 * A descrição do fluxo em lista numerada, para quem não vê o desenho: cada passo
 * com quem faz, os documentos que gera e o que vem depois; as decisões com as
 * saídas; os paralelos dizendo o que acontece ao mesmo tempo; os retornos como
 * "volta para".
 */
export function descricaoDoFluxo(def: PeFluxoDefinicao, dic: DicionarioFluxo, numeros?: ReadonlyMap<string, string>): DescricaoFluxo {
  const { ordem, retornos, ligacoes } = ordemDoFluxo(def);
  const nums = numeros ?? numerosDoFluxo(def, ordem);
  const v = vizinhosDoFluxo(ligacoes);
  const rotulos = rotulosDosElementos(def, nums, dic, v, ordem);
  const porId = new Map(def.Elementos.map(e => [e.Id, e]));
  const raias = raiasEmOrdem(def);
  const nomeRaia = (id: string) => {
    const raia = raias.find(r => r.Id === id);
    return raia ? resolverNomes(raia.Nome, dic).trim() || 'raia sem nome' : 'raia não encontrada';
  };
  const destino = (l: PeFluxoLigacao) => {
    const alvo = porId.get(l.Para);
    const ref = alvo ? referencia(alvo, rotulos, dic, v) : 'um passo que não existe mais';
    return retornos.has(l.Id) ? `volta para ${ref}` : ref;
  };
  const depois = (e: PeFluxoElemento) => {
    const saidas = v.saidas.get(e.Id) ?? [];
    if (!saidas.length) return e.Tipo === 'fim' ? '' : ' Não segue para nenhum passo.';
    const partes = saidas.map(l => l.Rotulo ? `${destino(l)} (${l.Rotulo})` : destino(l));
    return ` Depois: ${juntar(partes)}.`;
  };
  /** "do início e da ligação com outro fluxo", "de 2.9 ..., de 2.10 ... e de 2.11 ...". */
  const origensDe = (e: PeFluxoElemento) => juntar((v.entradas.get(e.Id) ?? [])
    .map(l => porId.get(l.De))
    .filter((x): x is PeFluxoElemento => !!x)
    .map(x => comDe(referencia(x, rotulos, dic, v))));

  const itens = ordem.map(e => {
    const nome = resolverNomes(e.Nome, dic).trim();
    const raia = nomeRaia(e.RaiaId);
    switch (e.Tipo) {
      case 'inicio':
        return `O fluxo começa${nome ? ` (${nome})` : ''} na raia ${raia}.${depois(e)}`;
      case 'fim':
        return `O fluxo termina${nome ? ` (${nome})` : ''} na raia ${raia}.`;
      case 'decisao': {
        const saidas = v.saidas.get(e.Id) ?? [];
        const pergunta = nome ? `Decisão: ${nome}` : 'Decisão sem pergunta';
        // Decisão com uma saída sem rótulo e várias entradas: é o ponto em que os caminhos se encontram
        if (!nome && ehEncontroDeCaminhos(e, v)) return `Os caminhos que vêm ${origensDe(e)} se encontram, na raia ${raia}.${depois(e)}`;
        const ramos = saidas.map(l => `${l.Rotulo ? `Se ${l.Rotulo}` : 'Por uma saída sem rótulo'}: ${destino(l)}.`);
        return `${pergunta}${/[?.!]$/.test(pergunta) ? '' : '.'} Quem decide: ${raia}.${ramos.length ? ' ' + ramos.join(' ') : ' Ainda não tem saídas.'}`;
      }
      case 'paralelo': {
        const saidas = v.saidas.get(e.Id) ?? [];
        const entradas = v.entradas.get(e.Id) ?? [];
        const destinos = saidas.map(destino);
        if (entradas.length > 1 && saidas.length > 1) {
          return `Os caminhos que vêm ${origensDe(e)} se juntam e se dividem de novo, na raia ${raia}: ${juntar(destinos)} acontecem ao mesmo tempo.`;
        }
        if (saidas.length > 1) return `O caminho se divide, na raia ${raia}: ${juntar(destinos)} acontecem ao mesmo tempo.`;
        if (entradas.length > 1) return `Os caminhos que vêm ${origensDe(e)} se juntam, na raia ${raia}.${depois(e)}`;
        return `Paralelo${nome ? ` (${nome})` : ''}, na raia ${raia}.${depois(e)}`;
      }
      case 'ligacao':
        return `Ligação com outro fluxo${nome ? `: ${nome}` : ''}, na raia ${raia}.${depois(e)}`;
      default: {
        const artefatos = e.Artefatos.map(a => a.trim()).filter(Boolean);
        const gera = artefatos.length ? ` Gera: ${juntar(artefatos)}.` : '';
        const tipo = e.Tipo === 'subprocesso' ? ' (subprocesso)' : '';
        return `${rotulos.get(e.Id) ?? nome}${tipo}. Quem faz: ${raia}.${gera}${depois(e)}`;
      }
    }
  });

  const nomes = raias.map(r => resolverNomes(r.Nome, dic).trim() || 'raia sem nome');
  const resumo = !nomes.length
    ? 'O fluxo ainda não tem raias.'
    : nomes.length === 1
      ? `O fluxo tem 1 raia (quem faz): ${nomes[0]}. Os passos, na ordem:`
      : `O fluxo tem ${nomes.length} raias (quem faz): ${juntar(nomes)}. Os passos, na ordem:`;
  return { resumo, itens };
}

// ── Mudanças na definição (o editor guarda o retrato antes, para o "Desfazer") ─

/** Refaz a ordem das raias pela posição (1, 2, 3...), com a lista na mesma ordem. */
function renumerarRaias(def: PeFluxoDefinicao, emOrdem: PeFluxoRaia[] = raiasEmOrdem(def)): void {
  emOrdem.forEach((r, i) => r.Ordem = i + 1);
  def.Raias.splice(0, def.Raias.length, ...emOrdem);
}

export function incluirRaia(def: PeFluxoDefinicao, nome: string): PeFluxoRaia {
  const raia: PeFluxoRaia = { Id: novoId('r', def.Raias.map(r => r.Id)), Nome: nome, Ordem: def.Raias.length + 1 };
  def.Raias.push(raia);
  renumerarRaias(def);
  return raia;
}

/** Sobe (-1) ou desce (1) a raia. Devolve a posição nova (a partir de 0), ou -1 se não deu. */
export function moverRaia(def: PeFluxoDefinicao, raiaId: string, passo: -1 | 1): number {
  const lista = raiasEmOrdem(def);
  const i = lista.findIndex(r => r.Id === raiaId);
  const j = i + passo;
  if (i < 0 || j < 0 || j >= lista.length) return -1;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  renumerarRaias(def, lista);
  return j;
}

/** Tira a raia, os passos dela e as ligações desses passos. Devolve quantos passos saíram. */
export function removerRaia(def: PeFluxoDefinicao, raiaId: string): number {
  const saem = new Set(def.Elementos.filter(e => e.RaiaId === raiaId).map(e => e.Id));
  def.Elementos = def.Elementos.filter(e => !saem.has(e.Id));
  def.Ligacoes = def.Ligacoes.filter(l => !saem.has(l.De) && !saem.has(l.Para));
  def.Raias = def.Raias.filter(r => r.Id !== raiaId);
  renumerarRaias(def);
  return saem.size;
}

/** Passo novo numa raia (na lista, logo depois de `depoisDe`, quando informado). */
export function incluirElemento(def: PeFluxoDefinicao, raiaId: string, tipo: PeTipoElementoFluxo, depoisDe: string | null = null): PeFluxoElemento {
  const elemento: PeFluxoElemento = {
    Id: novoId('e', def.Elementos.map(e => e.Id)), Tipo: tipo, RaiaId: raiaId, Nome: '', Numero: null, Artefatos: []
  };
  const i = depoisDe ? def.Elementos.findIndex(e => e.Id === depoisDe) : -1;
  if (i >= 0) def.Elementos.splice(i + 1, 0, elemento);
  else def.Elementos.push(elemento);
  return elemento;
}

/** Dá para incluir um passo logo depois deste: não é decisão nem fim, e tem no máximo uma saída. */
export function aceitaPassoDepois(def: PeFluxoDefinicao, elementoId: string): boolean {
  const e = def.Elementos.find(x => x.Id === elementoId);
  if (!e || e.Tipo === 'decisao' || e.Tipo === 'fim') return false;
  return def.Ligacoes.filter(l => l.De === elementoId).length <= 1;
}

/**
 * Passo novo logo depois de outro, na mesma raia (uma tarefa, se o tipo não vier):
 * o que vinha depois dele passa a vir depois do passo novo (o fluxo continua
 * ligado). Só tipos que ficam no meio de um caminho (`tipoEntraNaSeta`).
 */
export function incluirPassoDepois(def: PeFluxoDefinicao, elementoId: string, tipo: PeTipoElementoFluxo = 'tarefa'): PeFluxoElemento | null {
  const ref = def.Elementos.find(e => e.Id === elementoId);
  if (!ref || !aceitaPassoDepois(def, elementoId) || !tipoEntraNaSeta(tipo)) return null;
  const novo = incluirElemento(def, ref.RaiaId, tipo, ref.Id);
  for (const l of def.Ligacoes) if (l.De === ref.Id) l.De = novo.Id;
  def.Ligacoes.push({ Id: novoId('l', def.Ligacoes.map(l => l.Id)), De: ref.Id, Para: novo.Id, Rotulo: null });
  return novo;
}

/**
 * Tira as ligações do passo, que continua no fluxo (solto). Com uma entrada e uma
 * saída, o passo de antes passa a ligar direto no de depois (o fluxo continua
 * ligado; a ligação mantém o rótulo, se vier de uma decisão). Devolve os dois
 * religados, ou null.
 */
export function desligarElemento(def: PeFluxoDefinicao, elementoId: string): { de: string; para: string } | null {
  const entradas = def.Ligacoes.filter(l => l.Para === elementoId && l.De !== elementoId);
  const saidas = def.Ligacoes.filter(l => l.De === elementoId && l.Para !== elementoId);
  let religou: { de: string; para: string } | null = null;
  if (entradas.length === 1 && saidas.length === 1) {
    const de = entradas[0].De;
    const para = saidas[0].Para;
    if (de !== para && !def.Ligacoes.some(l => l.De === de && l.Para === para)) {
      // A entrada vira a ligação direta (e mantém o rótulo, se vier de uma decisão)
      entradas[0].Para = para;
      religou = { de, para };
    }
  }
  def.Ligacoes = def.Ligacoes.filter(l => l.De !== elementoId && l.Para !== elementoId);
  return religou;
}

/**
 * Tira o passo e as ligações dele. Com uma entrada e uma saída, o passo de antes
 * passa a ligar direto no de depois (o fluxo continua ligado). Devolve os dois
 * religados, ou null.
 */
export function removerElemento(def: PeFluxoDefinicao, elementoId: string): { de: string; para: string } | null {
  const religou = desligarElemento(def, elementoId);
  def.Elementos = def.Elementos.filter(e => e.Id !== elementoId);
  return religou;
}

// ── Mudanças do editor visual (E9), também usadas pelo editor em lista ───────

/** Tipos que ficam no meio de um caminho (recebem e seguem): entram sobre uma seta. */
export function tipoEntraNaSeta(tipo: string | null | undefined): boolean {
  return tipo === 'tarefa' || tipo === 'subprocesso' || tipo === 'decisao' || tipo === 'paralelo';
}

/** Leva o elemento para logo depois de outro na lista (a posição desempata a ordem no desenho). */
function colocarDepoisNaLista(def: PeFluxoDefinicao, elementoId: string, depoisDe: string): void {
  const i = def.Elementos.findIndex(e => e.Id === elementoId);
  if (i < 0 || elementoId === depoisDe) return;
  const [elemento] = def.Elementos.splice(i, 1);
  const j = def.Elementos.findIndex(e => e.Id === depoisDe);
  def.Elementos.splice(j < 0 ? def.Elementos.length : j + 1, 0, elemento);
}

/**
 * Passo novo sobre a seta (entre os dois passos dela), na raia pedida (sem ela, na
 * raia do passo de antes): a seta vira duas, e o rótulo da saída de decisão fica
 * no primeiro trecho. Devolve o passo novo, ou null.
 */
export function inserirNaLigacao(
  def: PeFluxoDefinicao, ligacaoId: string, tipo: PeTipoElementoFluxo, raiaId: string | null = null
): PeFluxoElemento | null {
  const l = def.Ligacoes.find(x => x.Id === ligacaoId);
  const antes = l ? def.Elementos.find(e => e.Id === l.De) : undefined;
  if (!l || !antes || !def.Elementos.some(e => e.Id === l.Para) || !tipoEntraNaSeta(tipo)) return null;
  const raia = raiaId && def.Raias.some(r => r.Id === raiaId) ? raiaId : antes.RaiaId;
  const novo = incluirElemento(def, raia, tipo, antes.Id);
  const para = l.Para;
  l.Para = novo.Id;
  def.Ligacoes.push({ Id: novoId('l', def.Ligacoes.map(x => x.Id)), De: novo.Id, Para: para, Rotulo: null });
  return novo;
}

/**
 * Tira o passo de onde está (religando o de antes ao de depois, como ao remover)
 * e o põe sobre a seta, entre os dois passos dela, na raia pedida (sem ela, fica
 * a raia dele). Não vale na seta que já entra ou sai do passo. Devolve os passos
 * religados na saída (ou null) e os dois da seta; null quando não deu.
 */
export function moverParaLigacao(
  def: PeFluxoDefinicao, elementoId: string, ligacaoId: string, raiaId: string | null = null
): { religou: { de: string; para: string } | null; de: string; para: string } | null {
  const e = def.Elementos.find(x => x.Id === elementoId);
  const l = def.Ligacoes.find(x => x.Id === ligacaoId);
  if (!e || !l || !tipoEntraNaSeta(e.Tipo) || l.De === elementoId || l.Para === elementoId) return null;
  if (!def.Elementos.some(x => x.Id === l.De) || !def.Elementos.some(x => x.Id === l.Para)) return null;
  const religou = desligarElemento(def, elementoId);
  // A seta continua a mesma (não era do passo), então ainda está na lista
  const seta = def.Ligacoes.find(x => x.Id === ligacaoId)!;
  if (raiaId && def.Raias.some(r => r.Id === raiaId)) e.RaiaId = raiaId;
  colocarDepoisNaLista(def, elementoId, seta.De);
  const para = seta.Para;
  seta.Para = elementoId;
  def.Ligacoes.push({ Id: novoId('l', def.Ligacoes.map(x => x.Id)), De: elementoId, Para: para, Rotulo: null });
  return { religou, de: seta.De, para };
}

/** Troca a raia do passo e mantém as ligações. Devolve se mudou. */
export function moverParaRaia(def: PeFluxoDefinicao, elementoId: string, raiaId: string): boolean {
  const e = def.Elementos.find(x => x.Id === elementoId);
  if (!e || e.RaiaId === raiaId || !def.Raias.some(r => r.Id === raiaId)) return false;
  e.RaiaId = raiaId;
  return true;
}

export function renomearElemento(def: PeFluxoDefinicao, elementoId: string, nome: string): void {
  const e = def.Elementos.find(x => x.Id === elementoId);
  if (e) e.Nome = nome;
}

export function renomearRaia(def: PeFluxoDefinicao, raiaId: string, nome: string): void {
  const r = def.Raias.find(x => x.Id === raiaId);
  if (r) r.Nome = nome;
}

/** Rótulo de uma saída (vazio vira nulo). */
export function mudarRotuloLigacao(def: PeFluxoDefinicao, ligacaoId: string, rotulo: string | null): void {
  const l = def.Ligacoes.find(x => x.Id === ligacaoId);
  if (l) l.Rotulo = rotulo || null;
}

/**
 * Por que não dá para ligar `de` a `para` (em linguagem simples), ou null quando
 * dá. As mesmas regras do editor em lista: o fim não segue, o início não recebe,
 * sem ligar a si mesmo e sem repetir.
 */
export function motivoParaNaoLigar(def: PeFluxoDefinicao, de: string, para: string): string | null {
  const origem = def.Elementos.find(e => e.Id === de);
  const destino = def.Elementos.find(e => e.Id === para);
  if (!origem || !destino) return 'Esse passo não existe mais.';
  if (de === para) return 'Um passo não liga nele mesmo.';
  if (origem.Tipo === 'fim') return 'O fim não leva a outro passo.';
  if (destino.Tipo === 'inicio') return 'O início não vem depois de nenhum passo.';
  if (def.Ligacoes.some(l => l.De === de && l.Para === para)) return 'Essa ligação já existe.';
  return null;
}

/** Rótulo sugerido para a próxima saída da decisão: "Sim", depois "Não" (vazio quando os dois já existem). */
export function rotuloSugeridoSaida(def: PeFluxoDefinicao, decisaoId: string): string {
  const usados = new Set(def.Ligacoes
    .filter(l => l.De === decisaoId && l.Rotulo)
    .map(l => l.Rotulo!.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')));
  if (!usados.has('sim')) return 'Sim';
  if (!usados.has('nao')) return 'Não';
  return '';
}

/** Documento novo na tarefa ou no subprocesso: "ok", "vazio" (sem nome) ou "repetido". */
export function incluirDocumento(def: PeFluxoDefinicao, elementoId: string, nome: string): 'ok' | 'vazio' | 'repetido' {
  const e = def.Elementos.find(x => x.Id === elementoId);
  const limpo = nome.trim();
  if (!e || !limpo) return 'vazio';
  if (e.Artefatos.some(a => a.trim().toLowerCase() === limpo.toLowerCase())) return 'repetido';
  e.Artefatos = [...e.Artefatos, limpo];
  return 'ok';
}

/** Tira o documento da posição `indice`. Devolve o nome dele, ou null. */
export function tirarDocumento(def: PeFluxoDefinicao, elementoId: string, indice: number): string | null {
  const e = def.Elementos.find(x => x.Id === elementoId);
  if (!e || indice < 0 || indice >= e.Artefatos.length) return null;
  const nome = e.Artefatos[indice];
  e.Artefatos = e.Artefatos.filter((_, j) => j !== indice);
  return nome;
}

/**
 * Troca o tipo: fora da decisão, as saídas perdem o rótulo; fora da tarefa e do
 * subprocesso, os documentos saem; o início perde o que vinha antes dele e o fim,
 * o que vinha depois (o editor não mostra essas ligações nesses tipos).
 */
export function mudarTipoElemento(def: PeFluxoDefinicao, elementoId: string, tipo: PeTipoElementoFluxo): void {
  const e = def.Elementos.find(x => x.Id === elementoId);
  if (!e) return;
  e.Tipo = tipo;
  if (tipo !== 'decisao') for (const l of def.Ligacoes) if (l.De === elementoId) l.Rotulo = null;
  if (!tipoNumerado(tipo)) e.Artefatos = [];
  if (tipo === 'inicio') def.Ligacoes = def.Ligacoes.filter(l => l.Para !== elementoId);
  if (tipo === 'fim') def.Ligacoes = def.Ligacoes.filter(l => l.De !== elementoId);
}

/** Nova ligação de `de` para `para` (nada se for o mesmo passo ou se já existir). */
export function incluirLigacao(def: PeFluxoDefinicao, de: string, para: string, rotulo: string | null = null): PeFluxoLigacao | null {
  if (!de || !para || de === para) return null;
  if (!def.Elementos.some(e => e.Id === de) || !def.Elementos.some(e => e.Id === para)) return null;
  if (def.Ligacoes.some(l => l.De === de && l.Para === para)) return null;
  const ligacao: PeFluxoLigacao = { Id: novoId('l', def.Ligacoes.map(l => l.Id)), De: de, Para: para, Rotulo: rotulo };
  def.Ligacoes.push(ligacao);
  return ligacao;
}

export function removerLigacao(def: PeFluxoDefinicao, ligacaoId: string): void {
  def.Ligacoes = def.Ligacoes.filter(l => l.Id !== ligacaoId);
}

// ── Erros da API ─────────────────────────────────────────────────────────────

export interface ErroFluxoLido {
  status: number;
  /** A `Message` do servidor (ou null). */
  mensagem: string | null;
  /** Os problemas do fluxo (400 de validação), em linguagem simples. */
  erros: string[];
}

/**
 * O erro de uma chamada de fluxo: o corpo `{ Code, Message, Erros }` chega como
 * objeto (JSON) ou como texto (a chamada do desenho pede texto, o SVG).
 */
export function lerErroFluxo(erro: unknown): ErroFluxoLido {
  const e = erro as HttpErrorResponse | null;
  let corpo: unknown = e?.error;
  if (typeof corpo === 'string') {
    try {
      corpo = JSON.parse(corpo);
    } catch {
      corpo = null;
    }
  }
  const c = (corpo && typeof corpo === 'object' ? corpo : null) as PeErroFluxo | null;
  const erros = Array.isArray(c?.Erros)
    ? c!.Erros!.filter((x): x is string => typeof x === 'string' && !!x.trim()).map(x => x.trim())
    : [];
  const mensagem = typeof c?.Message === 'string' && c.Message.trim() ? c.Message.trim() : null;
  return { status: typeof e?.status === 'number' ? e.status : 0, mensagem, erros };
}

// ── O desenho (SVG) ──────────────────────────────────────────────────────────

/** Largura e altura do desenho, lidas do elemento raiz do SVG (width e height, ou o viewBox). */
export function tamanhoDoSvg(svg: string | null | undefined): { largura: number; altura: number } | null {
  const raiz = /<svg\b[^>]*>/i.exec(svg ?? '');
  if (!raiz) return null;
  const atributo = (nome: string) => new RegExp(`\\s${nome}\\s*=\\s*["']([^"']*)["']`, 'i').exec(raiz[0])?.[1] ?? null;
  const numero = (valor: string | null) => {
    const m = /^\s*(\d+(?:\.\d+)?)\s*(?:px)?\s*$/i.exec(valor ?? '');
    return m ? Number(m[1]) : 0;
  };
  let largura = numero(atributo('width'));
  let altura = numero(atributo('height'));
  const caixa = (atributo('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  if ((!largura || !altura) && caixa.length === 4 && caixa.every(Number.isFinite) && caixa[2] > 0 && caixa[3] > 0) {
    if (!largura && !altura) {
      largura = caixa[2];
      altura = caixa[3];
    } else if (!largura) {
      largura = altura * caixa[2] / caixa[3];
    } else {
      altura = largura * caixa[3] / caixa[2];
    }
  }
  return largura > 0 && altura > 0 ? { largura, altura } : null;
}

/** O SVG pronto para virar imagem: sem o `xmlns`, o navegador não mostra o SVG dentro de uma imagem. */
export function svgParaImagem(svg: string): string {
  return /<svg\b[^>]*\sxmlns\s*=/i.test(svg) ? svg : svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}
