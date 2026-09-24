/**
 * Documento do PDTIC (E5), sem Angular: os marcadores do texto, as páginas da
 * prévia (cara de A4: cada capítulo começa numa página, a quebra de página abre
 * outra e o bloco de página deitada fica numa página em paisagem), os rótulos
 * das versões em PDF e o que a tela do modelo do documento mostra (tipos de
 * bloco, números dos capítulos, resumo da configuração). As classes dos selos são
 * as que o projeto já usa.
 */
import {
  PeDocBloco, PeDocCapitulo, PeDocConfigBloco, PeDocFiltroTabela, PeDocMarcador, PeDocModeloBloco, PeDocModeloCapitulo,
  PeTipoBlocoDoc
} from '../../../api/planejamento/interface';
import { OpcaoRotulo, juntar } from './pe-modelo-rotulos';

// ── Marcadores ───────────────────────────────────────────────────────────────

/**
 * Os marcadores do documento do PDTIC (especificação da E5). O administrador
 * recebe a lista do servidor (GET modelo/documento); esta é a reserva do editor
 * do órgão, que não lê o modelo, e da tela do modelo quando o servidor não manda.
 */
export const MARCADORES_PADRAO: readonly PeDocMarcador[] = [
  { Chave: 'orgao.nome', Descricao: 'Nome do órgão', Exemplo: 'Secretaria de Estado de Saúde' },
  { Chave: 'orgao.sigla', Descricao: 'Sigla do órgão', Exemplo: 'SES' },
  { Chave: 'vigencia.inicio', Descricao: 'Início da vigência do PDTIC', Exemplo: '01/01/2026' },
  { Chave: 'vigencia.fim', Descricao: 'Fim da vigência do PDTIC', Exemplo: '31/12/2029' },
  { Chave: 'nomes.comite', Descricao: 'Nome do comitê interno de TIC (SGTIC)', Exemplo: 'Comitê de Governança de TIC' },
  { Chave: 'nomes.equipe', Descricao: 'Nome da equipe de elaboração', Exemplo: 'Equipe de Elaboração do PDTIC' },
  { Chave: 'nomes.equipe_acompanhamento', Descricao: 'Nome da equipe de acompanhamento', Exemplo: 'Equipe de Acompanhamento do PDTIC' },
  { Chave: 'nomes.autoridade', Descricao: 'Nome da autoridade máxima do órgão', Exemplo: 'Maria da Silva' },
  { Chave: 'nomes.autoridade_cargo', Descricao: 'Cargo da autoridade máxima', Exemplo: 'Secretária de Estado' },
  { Chave: 'nomes.unidade_tic', Descricao: 'Nome da unidade de TIC', Exemplo: 'Subsecretaria de Tecnologia da Informação' },
  { Chave: 'pdtic.versao', Descricao: 'Versão do PDTIC', Exemplo: '1.0' },
  { Chave: 'hoje', Descricao: 'Data de hoje (no PDF, a data em que ele foi gerado)', Exemplo: '24/09/2026' }
];

/** Como o marcador aparece no texto: "{orgao.nome}". */
export function textoMarcador(chave: string): string {
  return `{${chave}}`;
}

/** O que o marcador vira, em linguagem simples (a chave, se ninguém a descreveu). */
export function descricaoMarcador(chave: string, lista: readonly PeDocMarcador[] = MARCADORES_PADRAO): string {
  return lista.find(m => m.Chave === chave)?.Descricao ?? MARCADORES_PADRAO.find(m => m.Chave === chave)?.Descricao ?? textoMarcador(chave);
}

/**
 * A seção onde se preenche o valor do marcador (o passo que tem a seção dá o
 * link "preencha no passo N.M"): os nomes no dicionário de nomes e a vigência
 * na abrangência. Os do órgão vêm do cadastro do órgão; os demais, do sistema.
 */
export function secaoDoMarcador(chave: string): string | null {
  if (chave.startsWith('nomes.')) return 'nomes';
  if (chave.startsWith('vigencia.')) return 'abrangencia';
  return null;
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Regex (global) que acha no texto os marcadores da lista, escritos com as chaves; null com a lista vazia. */
export function regexMarcadores(chaves: readonly string[] | null | undefined): RegExp | null {
  const validas = (chaves ?? []).map(c => c.trim()).filter(Boolean);
  if (!validas.length) return null;
  return new RegExp(`\\{(${validas.map(escaparRegex).join('|')})\\}`, 'g');
}

// ── Capítulos e páginas da prévia ────────────────────────────────────────────

/** Capítulos que a prévia monta de um jeito próprio. */
export type EspecialDoc = 'capa' | 'sumario' | 'rosto' | 'historico';

/**
 * O papel especial de um capítulo pela chave, lida por partes ("capa",
 * "sumario", "folha_rosto", "historico_versoes"): "capacidade" não é capa.
 */
export function especialDoCapitulo(chave: string | null | undefined): EspecialDoc | null {
  const partes = (chave ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (partes.includes('capa')) return 'capa';
  if (partes.includes('sumario')) return 'sumario';
  if (partes.includes('rosto')) return 'rosto';
  if (partes.includes('historico')) return 'historico';
  return null;
}

/** "6.1 Soluções e ativos de TIC" (ou só o título, no capítulo sem número). */
export function tituloComNumero(c: Pick<PeDocCapitulo, 'Numero' | 'Titulo'>): string {
  return c.Numero ? `${c.Numero} ${c.Titulo}` : c.Titulo;
}

/** Os blocos do capítulo na ordem do modelo. */
export function blocosEmOrdem<T extends { Ordem: number; Id: number }>(blocos: readonly T[] | null | undefined): T[] {
  return [...(blocos ?? [])].sort((a, b) => a.Ordem - b.Ordem || a.Id - b.Id);
}

/** Um item de uma página: o título do capítulo (`bloco` null) ou um bloco dele. */
export interface ItemPaginaDoc {
  chave: string;
  capitulo: PeDocCapitulo;
  bloco: PeDocBloco | null;
}

export interface PaginaDoc {
  /** Fica a mesma quando as páginas mudam em volta (a capa, o sumário ou o primeiro item). */
  chave: string;
  /** Página em paisagem (bloco de página deitada: tabelas largas). */
  deitada: boolean;
  /** Capa ou sumário, montados pela tela; os itens são os blocos do capítulo deles, se houver. */
  especial: 'capa' | 'sumario' | null;
  itens: ItemPaginaDoc[];
}

/** O passo da trilha do órgão onde um dado se preenche (link "no passo N.M"). */
export interface PassoLinkDoc {
  rota: string;
  numero: string;
  titulo: string;
}

/**
 * As páginas da prévia, na ordem dos capítulos:
 * - a capa e o sumário têm página própria (a tela os monta; sem esses
 *   capítulos no modelo, entram no começo, como no PDF);
 * - cada capítulo começa numa página; o subcapítulo segue na página do anterior;
 * - a quebra de página faz o que vem depois começar numa página nova;
 * - o bloco de página deitada vai para uma página em paisagem (o título do
 *   capítulo vai junto quando o primeiro bloco já é deitado);
 * - o capítulo escondido aparece só com o título, onde estaria.
 */
export function montarPaginas(capitulos: readonly PeDocCapitulo[]): PaginaDoc[] {
  const paginas: PaginaDoc[] = [];
  let atual: PaginaDoc | null = null;
  let capaFeita = false;
  let sumarioFeito = false;
  const nova = (deitada: boolean, especial: PaginaDoc['especial'] = null): PaginaDoc => {
    const pagina: PaginaDoc = { chave: '', deitada, especial, itens: [] };
    paginas.push(pagina);
    return pagina;
  };
  const especial = (tipo: 'capa' | 'sumario', capitulo: PeDocCapitulo | null): void => {
    if ((tipo === 'capa' && capaFeita) || (tipo === 'sumario' && sumarioFeito)) return;
    if (tipo === 'capa') capaFeita = true;
    else sumarioFeito = true;
    const pagina = nova(false, tipo);
    pagina.chave = tipo;
    for (const b of blocosEmOrdem(capitulo?.Blocos)) {
      if (b.Tipo !== 'quebra_pagina') pagina.itens.push({ chave: `b${b.Id}`, capitulo: capitulo!, bloco: b });
    }
  };

  const temCapa = capitulos.some(c => especialDoCapitulo(c.Chave) === 'capa');
  const temSumario = capitulos.some(c => especialDoCapitulo(c.Chave) === 'sumario');
  if (!temCapa) {
    especial('capa', null);
    if (!temSumario) especial('sumario', null);
  }

  for (const c of capitulos) {
    const tipo = especialDoCapitulo(c.Chave);
    if (tipo === 'capa' || tipo === 'sumario') {
      especial(tipo, c);
      atual = null;
      if (tipo === 'capa' && !temSumario) especial('sumario', null);
      continue;
    }

    const cabecalho: ItemPaginaDoc = { chave: `c${c.Id}`, capitulo: c, bloco: null };
    if (c.Oculto) {
      if (!atual) atual = nova(false);
      atual.itens.push(cabecalho);
      continue;
    }

    const blocos = blocosEmOrdem(c.Blocos);
    const primeiro = blocos[0];
    const deitadaNoComeco = !!primeiro && primeiro.Tipo !== 'quebra_pagina' && !!primeiro.PaginaDeitada;
    if (c.Nivel === 1 || !atual || atual.deitada !== deitadaNoComeco) atual = nova(deitadaNoComeco);
    atual.itens.push(cabecalho);

    for (const b of blocos) {
      if (b.Tipo === 'quebra_pagina') {
        atual = null;
        continue;
      }
      const deitada = !!b.PaginaDeitada;
      if (!atual || atual.deitada !== deitada) atual = nova(deitada);
      atual.itens.push({ chave: `b${b.Id}`, capitulo: c, bloco: b });
    }
  }

  // Página comum: a chave é a do primeiro item (a mesma quando um capítulo antes dela some)
  paginas.forEach((p, i) => {
    if (!p.chave) p.chave = p.itens[0] ? `p-${p.itens[0].chave}` : `p${i}`;
  });
  return paginas;
}

/** O que entra no sumário: todos os capítulos, menos a capa e o próprio sumário (os escondidos, marcados). */
export function capitulosDoSumario(capitulos: readonly PeDocCapitulo[]): PeDocCapitulo[] {
  return capitulos.filter(c => {
    const especial = especialDoCapitulo(c.Chave);
    return especial !== 'capa' && especial !== 'sumario';
  });
}

/** O capítulo pode ser escondido pelo órgão: só o opcional (o travado e o obrigatório, não). */
export function capituloEscondivel(c: Pick<PeDocCapitulo, 'Obrigatorio' | 'Travado'>): boolean {
  return !c.Obrigatorio && !c.Travado;
}

/** Texto de um capítulo sem blocos, na prévia. */
export function textoCapituloVazio(c: Pick<PeDocCapitulo, 'Chave'>): string {
  switch (especialDoCapitulo(c.Chave)) {
    case 'rosto': return 'No PDF, a folha de rosto traz a equipe de elaboração e quem aprovou o PDTIC.';
    case 'historico': return 'No PDF, o histórico traz as versões do documento: data, versão, descrição e autor.';
    default: return 'Este capítulo não tem conteúdo no modelo do documento.';
  }
}

// ── Versões em PDF ───────────────────────────────────────────────────────────

export function rotuloSituacaoVersao(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'minuta': return 'Minuta';
    case 'enviada': return 'Enviada';
    case 'aprovada': return 'Aprovada';
    case 'publicada': return 'Publicada';
    default: return situacao || '-';
  }
}

export function classeSituacaoVersao(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'enviada': return 'bg-amber-100 text-amber-900';
    case 'aprovada':
    case 'publicada': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

/** Nome do PDF quando o `Content-Disposition` não chega (o mesmo desenho do servidor). */
export function nomeArquivoVersao(sigla: string | null | undefined, versao: string | null | undefined, numero: number): string {
  const limpa = (sigla ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '_') || 'orgao';
  return `PDTIC_${limpa}_v${versao || '1.0'}_${numero}.pdf`;
}

/** As versões da mais nova para a mais antiga. */
export function versoesEmOrdem<T extends { Numero: number }>(versoes: readonly T[] | null | undefined): T[] {
  return [...(versoes ?? [])].sort((a, b) => b.Numero - a.Numero);
}

// ── Modelo do documento (tela do administrador) ──────────────────────────────

export const TIPOS_BLOCO_DOC: OpcaoRotulo<PeTipoBlocoDoc>[] = [
  { valor: 'texto', rotulo: 'Texto' },
  { valor: 'tabela_secao', rotulo: 'Tabela de uma seção' },
  { valor: 'lista_tema', rotulo: 'Lista das ações de um tema' },
  { valor: 'matriz_swot', rotulo: 'Matriz SWOT' },
  { valor: 'fluxo', rotulo: 'Fluxo' },
  { valor: 'quebra_pagina', rotulo: 'Quebra de página' }
];

export function rotuloTipoBloco(tipo: string | null | undefined): string {
  return TIPOS_BLOCO_DOC.find(t => t.valor === tipo)?.rotulo ?? (tipo || '-');
}

/** O que cada tipo de bloco faz, para quem escolhe. */
export function explicacaoTipoBloco(tipo: string | null | undefined): string {
  switch (tipo) {
    case 'texto': return 'Texto com formatação e marcadores. O órgão pode editar a cópia dele na prévia.';
    case 'tabela_secao': return 'Os registros de uma seção do PDTIC, com as colunas escolhidas. No documento, a tabela só se lê: os dados se editam no passo da seção.';
    case 'lista_tema': return 'As ações do plano marcadas com um tema, com o código e a situação de cada uma.';
    case 'matriz_swot': return 'O quadro com as forças, as fraquezas, as oportunidades e as ameaças da análise SWOT.';
    case 'fluxo': return 'O desenho de um fluxo: o que o órgão adaptou ou, sem adaptação, o modelo do guia. O desenho sai sozinho, com a descrição em texto.';
    case 'quebra_pagina': return 'O que vem depois começa numa página nova.';
    default: return '';
  }
}

/** Os capítulos de um nível (os do alto com `paiId` null), na ordem. */
export function capitulosDoModelo(capitulos: readonly PeDocModeloCapitulo[], paiId: number | null): PeDocModeloCapitulo[] {
  return capitulos
    .filter(c => (c.PaiId ?? null) === paiId)
    .sort((a, b) => a.Ordem - b.Ordem || a.Id - b.Id);
}

/**
 * Os números como o documento mostra no modelo completo: 1, 2, 3... nos
 * capítulos numerados e 6.1, 6.2... nos subcapítulos numerados de um capítulo
 * numerado. No documento do órgão os números saem do que aparece para ele.
 */
export function numerosDoModelo(capitulos: readonly PeDocModeloCapitulo[]): Map<number, string> {
  const numeros = new Map<number, string>();
  let n = 0;
  for (const c of capitulosDoModelo(capitulos, null)) {
    if (!c.Numerado) continue;
    n++;
    numeros.set(c.Id, String(n));
    let m = 0;
    for (const f of capitulosDoModelo(capitulos, c.Id)) {
      if (!f.Numerado) continue;
      m++;
      numeros.set(f.Id, `${n}.${m}`);
    }
  }
  return numeros;
}

/** O que o modelo sabe dizer das seções, dos temas e dos fluxos, para o resumo dos blocos. */
export interface NomesDoDocumento {
  secao(chave: string): string | null;
  campo(secao: string, chave: string): string | null;
  tema(valor: string): string | null;
  /** O nome do fluxo-modelo pela chave (E6). */
  fluxo?(chave: string): string | null;
}

/** Uma linha sobre a configuração de um bloco de dados ("Tabela de Necessidades de TIC · colunas: ..."). */
export function resumoBlocoModelo(bloco: Pick<PeDocModeloBloco, 'Tipo' | 'Config'>, nomes: NomesDoDocumento): string {
  const config: PeDocConfigBloco = bloco.Config ?? {};
  const deitada = config.PaginaDeitada ? ' · página deitada' : '';
  switch (bloco.Tipo) {
    case 'tabela_secao': {
      const secao = typeof config.Secao === 'string' ? config.Secao : '';
      if (!secao) return `Tabela sem seção escolhida${deitada}`;
      const titulo = nomes.secao(secao) ?? secao;
      const colunas = Array.isArray(config.Colunas) && config.Colunas.length
        ? `colunas: ${juntar(config.Colunas.map(c => nomes.campo(secao, c) ?? c))}`
        : 'as colunas marcadas para o documento';
      const filtro = textoFiltroTabela(config.Filtro, secao, nomes);
      return `Tabela de "${titulo}" · ${colunas}${filtro ? ' · ' + filtro : ''}${deitada}`;
    }
    case 'lista_tema': {
      const tema = typeof config.Tema === 'string' ? config.Tema : '';
      return tema ? `Ações do tema "${nomes.tema(tema) ?? tema}"${deitada}` : `Lista sem tema escolhido${deitada}`;
    }
    case 'matriz_swot': return `Forças, fraquezas, oportunidades e ameaças da análise SWOT${deitada}`;
    case 'fluxo': {
      const fluxo = typeof config.Fluxo === 'string' ? config.Fluxo : '';
      return fluxo ? `Fluxo "${nomes.fluxo?.(fluxo) ?? fluxo}"${deitada}` : `Fluxo sem escolha${deitada}`;
    }
    case 'quebra_pagina': return 'O que vem depois começa numa página nova';
    default: return deitada ? 'Página deitada' : '';
  }
}

/** O filtro das linhas de uma tabela em palavras ("só as linhas em que "Priorizada?" é sim"); vazio sem filtro. */
export function textoFiltroTabela(filtro: PeDocFiltroTabela | null | undefined, secao: string, nomes: NomesDoDocumento): string {
  if (!filtro || typeof filtro !== 'object' || typeof filtro.Campo !== 'string' || !filtro.Campo) return '';
  const campo = nomes.campo(secao, filtro.Campo) ?? filtro.Campo;
  const bruto = filtro.Valor;
  const valor = typeof bruto === 'boolean' ? (bruto ? 'sim' : 'não') : String(bruto ?? '');
  return filtro.Excluir ? `sem as linhas em que "${campo}" é ${valor}` : `só as linhas em que "${campo}" é ${valor}`;
}

/** Chave nova de capítulo, gerada do título e diferente das que existem. */
export function chaveNovaDeCapitulo(titulo: string, existentes: readonly string[]): string {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'capitulo';
  const usadas = new Set(existentes);
  if (!usadas.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidata = `${base}_${i}`;
    if (!usadas.has(candidata)) return candidata;
  }
}
