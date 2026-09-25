/**
 * Documento do PDTIC (E5), sem Angular: os marcadores do texto, as páginas da
 * prévia (cara de A4: cada capítulo começa numa página, a quebra de página abre
 * outra e o bloco de página deitada fica numa página em paisagem), os rótulos
 * das versões em PDF e o que a tela do modelo do documento mostra (tipos de
 * bloco, números dos capítulos, resumo da configuração). As classes dos selos são
 * as que o projeto já usa.
 */
import {
  PeCiclo, PeDocBloco, PeDocCapitulo, PeDocConfigBloco, PeDocFiltroTabela, PeDocMarcador, PeDocModeloBloco, PeDocModeloCapitulo,
  PeTipoBlocoDoc, PeTipoDocumento
} from '../../../api/planejamento/interface';
import { OpcaoRotulo, juntar } from './pe-modelo-rotulos';

// ── Qual documento (E7 rodada B) ─────────────────────────────────────────────

/**
 * O relatório que a prévia mostra no lugar do documento do PDTIC: o de
 * acompanhamento (RA) de um ciclo ou o de resultados (RR).
 */
export type RelatorioDoc = { tipo: 'ra'; ciclo: PeCiclo } | { tipo: 'rr' };

/**
 * O documento que a prévia mostra e grava: o do PDTIC, o relatório de
 * acompanhamento (RA) de um ciclo ou o relatório de resultados (RR). Os três têm
 * as mesmas sub-rotas e a mesma forma; muda só a base.
 */
export type AlvoDocumento =
  | { tipo: 'pdtic'; pdticId: number }
  | { tipo: 'ra'; pdticId: number; cicloId: number }
  | { tipo: 'rr'; pdticId: number };

/** A base do documento sob api/planejamento ("pdtic/12/documento", "pdtic/12/ciclos/5/relatorio", "pdtic/12/relatorio-resultados"). */
export function caminhoDocumento(alvo: AlvoDocumento): string {
  switch (alvo.tipo) {
    case 'ra': return `pdtic/${alvo.pdticId}/ciclos/${alvo.cicloId}/relatorio`;
    case 'rr': return `pdtic/${alvo.pdticId}/relatorio-resultados`;
    default: return `pdtic/${alvo.pdticId}/documento`;
  }
}

/** Identifica o documento (muda de PDTIC, de tipo ou de ciclo: a prévia busca de novo). */
export function chaveDoAlvo(alvo: AlvoDocumento): string {
  return alvo.tipo === 'ra' ? `ra:${alvo.pdticId}:${alvo.cicloId}` : `${alvo.tipo}:${alvo.pdticId}`;
}

/** Os três modelos que o administrador edita, na ordem do seletor. */
export const TIPOS_DOCUMENTO: readonly { valor: PeTipoDocumento; rotulo: string; curto: string }[] = [
  { valor: 'pdtic', rotulo: 'Documento do PDTIC', curto: 'PDTIC' },
  { valor: 'ra', rotulo: 'Relatório de acompanhamento (RA)', curto: 'RA' },
  { valor: 'rr', rotulo: 'Relatório de resultados (RR)', curto: 'RR' }
];

export function tipoDocumentoValido(valor: string | null | undefined): PeTipoDocumento | null {
  return TIPOS_DOCUMENTO.find(t => t.valor === valor)?.valor ?? null;
}

/** "o documento do PDTIC", "o relatório de acompanhamento", "o relatório de resultados" (no meio da frase). */
export function nomeDoDocumento(tipo: PeTipoDocumento): string {
  switch (tipo) {
    case 'ra': return 'o relatório de acompanhamento';
    case 'rr': return 'o relatório de resultados';
    default: return 'o documento do PDTIC';
  }
}

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
  { Chave: 'hoje', Descricao: 'Data de hoje (no PDF, a data em que ele foi gerado)', Exemplo: '24/09/2026' },
  // E7: as aprovações e a publicação (valem nos três documentos)
  { Chave: 'aprovacao.sgtic.data', Descricao: 'Data da aprovação do SGTIC', Exemplo: '10/03/2027' },
  { Chave: 'aprovacao.sgtic.ato', Descricao: 'Ato da aprovação do SGTIC', Exemplo: 'Ata nº 3' },
  { Chave: 'aprovacao.cgtic.data', Descricao: 'Data da aprovação do CGTIC', Exemplo: '20/03/2027' },
  { Chave: 'aprovacao.cgtic.ato', Descricao: 'Ato da aprovação do CGTIC', Exemplo: 'Resolução nº 12' },
  { Chave: 'publicacao.data', Descricao: 'Data da publicação do PDTIC', Exemplo: '25/03/2027' },
  { Chave: 'publicacao.endereco', Descricao: 'Endereço do PDTIC publicado na internet', Exemplo: 'https://www.saude.df.gov.br/pdtic' }
];

/** Os marcadores do ciclo, só no relatório de acompanhamento (RA). */
const MARCADORES_DO_CICLO: readonly PeDocMarcador[] = [
  { Chave: 'ciclo.rotulo', Descricao: 'Nome do ciclo', Exemplo: '2027 · 1º trimestre' },
  { Chave: 'ciclo.inicio', Descricao: 'Início do período do ciclo', Exemplo: '01/01/2027' },
  { Chave: 'ciclo.fim', Descricao: 'Fim do período do ciclo', Exemplo: '31/03/2027' }
];

/** A reserva dos marcadores de cada documento, enquanto a lista do servidor não chega (GET modelo/documento?tipo=). */
export function marcadoresPadraoDo(tipo: PeTipoDocumento): readonly PeDocMarcador[] {
  return tipo === 'ra' ? [...MARCADORES_PADRAO, ...MARCADORES_DO_CICLO] : MARCADORES_PADRAO;
}

/**
 * F1 (B07): os marcadores que valem no documento. Os do ciclo ({ciclo.rotulo},
 * {ciclo.inicio}, {ciclo.fim}) só existem no RA: no PDTIC e no RR ficariam sempre
 * sem valor, e saem da lista mesmo que o servidor os mande.
 */
export function marcadoresDoTipo(tipo: PeTipoDocumento, lista: readonly PeDocMarcador[]): PeDocMarcador[] {
  return tipo === 'ra' ? [...lista] : lista.filter(m => !m.Chave.startsWith('ciclo.'));
}

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
  // E7: a aprovação do SGTIC (passo do envio) e a publicação; a do CGTIC vem da deliberação
  if (chave.startsWith('aprovacao.sgtic.')) return 'aprovacao_sgtic';
  if (chave.startsWith('publicacao.')) return 'publicacao';
  return null;
}

/** Os passos do modelo inicial onde se preenchem as aprovações e a publicação (3.11, 3.12 e 3.13 no Avançado). */
const PASSO_APROVACAO_SGTIC = 'planejamento.aprovacao-sgtic';
const PASSO_DELIBERACAO_CGTIC = 'planejamento.deliberacao-cgtic';
const PASSO_PUBLICACAO = 'planejamento.publicacao';

/**
 * Onde o valor do marcador se preenche, para o link "preencha no passo N.M" (F2): o
 * passo ou a seção que o servidor indica no marcador; sem isso, as aprovações e a
 * publicação pelos passos do modelo inicial (a aprovação do SGTIC no passo do envio,
 * a do CGTIC no da deliberação e a publicação no dela) e os demais pela seção.
 */
export function ondeSePreencheMarcador(chave: string, lista: readonly PeDocMarcador[] = []): { passo: string | null; secao: string | null } {
  const m = lista.find(x => x.Chave === chave);
  if (m?.PassoChave) return { passo: m.PassoChave, secao: m.SecaoChave ?? null };
  if (m?.SecaoChave) return { passo: null, secao: m.SecaoChave };
  if (chave.startsWith('aprovacao.sgtic.')) return { passo: PASSO_APROVACAO_SGTIC, secao: 'aprovacao_sgtic' };
  if (chave.startsWith('aprovacao.cgtic.')) return { passo: PASSO_DELIBERACAO_CGTIC, secao: null };
  if (chave.startsWith('publicacao.')) return { passo: PASSO_PUBLICACAO, secao: 'publicacao' };
  return { passo: null, secao: secaoDoMarcador(chave) };
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
  /** E7 rodada B: os parâmetros do link dos dados (o passo e, no RA, o ciclo do relatório). */
  query?: Record<string, string | number>;
  /**
   * F1 (C32 e B15): quem está logado grava no passo agora (o `PodeEditar` da situação
   * do passo). Sem a situação, vale o do documento.
   */
  editavel?: boolean;
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

/**
 * Texto de um capítulo sem blocos, na prévia. No relatório de acompanhamento de
 * um ciclo de monitoramento (`cicloDeMonitoramento`), os capítulos da avaliação
 * vêm vazios (o guia manda assim).
 */
export function textoCapituloVazio(c: Pick<PeDocCapitulo, 'Chave'>, tipo: PeTipoDocumento = 'pdtic', cicloDeMonitoramento = false): string {
  switch (especialDoCapitulo(c.Chave)) {
    case 'rosto':
      return tipo === 'pdtic'
        ? 'No PDF, a folha de rosto traz a equipe de elaboração e quem aprovou o PDTIC.'
        : 'No PDF, a folha de rosto traz a equipe de acompanhamento.';
    case 'historico': return 'No PDF, o histórico traz as versões do documento: data, versão, descrição e autor.';
    default:
      return tipo === 'ra' && cicloDeMonitoramento
        ? 'Num ciclo de monitoramento, este capítulo fica em branco, como pede o guia: ele se preenche na avaliação intermediária.'
        : 'Este capítulo não tem conteúdo no modelo do documento.';
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

/** "2027 · 1º trimestre" vira "2027_1o_trimestre" (o rótulo curto do ciclo no nome do PDF de reserva do RA). */
export function rotuloCurtoDoCiclo(rotulo: string | null | undefined): string {
  const semAcento = (rotulo ?? '').replace(/º/g, 'o').replace(/ª/g, 'a').normalize('NFD')
    .split('').filter(c => c.charCodeAt(0) < 0x300 || c.charCodeAt(0) > 0x36f).join('');
  return semAcento.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'ciclo';
}

/**
 * Nome do PDF quando o `Content-Disposition` não chega (o mesmo desenho do
 * servidor): PDTIC_SES_v1.0_3.pdf; E7 rodada B: RA_SES_v1.0_2027_1o_trimestre_2.pdf
 * e RR_SES_v1.0_1.pdf.
 */
export function nomeArquivoVersao(sigla: string | null | undefined, versao: string | null | undefined, numero: number,
  tipo: PeTipoDocumento = 'pdtic', rotuloCiclo: string | null = null): string {
  const limpa = (sigla ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '_') || 'orgao';
  const v = versao || '1.0';
  if (tipo === 'ra') return `RA_${limpa}_v${v}_${rotuloCurtoDoCiclo(rotuloCiclo)}_${numero}.pdf`;
  if (tipo === 'rr') return `RR_${limpa}_v${v}_${numero}.pdf`;
  return `PDTIC_${limpa}_v${v}_${numero}.pdf`;
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
  { valor: 'acoes_por_situacao', rotulo: 'Ações do ciclo por situação' },
  { valor: 'metas_por_resultado', rotulo: 'Metas por resultado' },
  { valor: 'riscos_ocorridos', rotulo: 'Riscos que ocorreram' },
  { valor: 'medicoes', rotulo: 'Medições dos indicadores' },
  { valor: 'quebra_pagina', rotulo: 'Quebra de página' }
];

/** Os blocos de dados dos relatórios do acompanhamento (E7 rodada B): só a página deitada se configura. */
export const TIPOS_BLOCO_ACOMPANHAMENTO: ReadonlySet<string> = new Set(['acoes_por_situacao', 'metas_por_resultado', 'riscos_ocorridos', 'medicoes']);

/**
 * Os tipos de bloco que cada modelo oferece: o PDTIC tem as listas de tema, a
 * matriz SWOT e os fluxos; os relatórios (RA e RR), os blocos do acompanhamento.
 */
export function tiposBlocoDoModelo(tipo: PeTipoDocumento): OpcaoRotulo<PeTipoBlocoDoc>[] {
  return TIPOS_BLOCO_DOC.filter(t => tipo === 'pdtic'
    ? !TIPOS_BLOCO_ACOMPANHAMENTO.has(t.valor)
    : t.valor === 'texto' || t.valor === 'tabela_secao' || t.valor === 'quebra_pagina' || TIPOS_BLOCO_ACOMPANHAMENTO.has(t.valor));
}

export function rotuloTipoBloco(tipo: string | null | undefined): string {
  return TIPOS_BLOCO_DOC.find(t => t.valor === tipo)?.rotulo ?? (tipo || '-');
}

/** O que cada tipo de bloco faz, para quem escolhe. */
export function explicacaoTipoBloco(tipo: string | null | undefined): string {
  switch (tipo) {
    case 'texto': return 'Texto com formatação e marcadores. O órgão pode editar a cópia dele na prévia.';
    case 'tabela_secao': return 'Os registros de uma seção do PDTIC, com as colunas escolhidas. No documento, a tabela só se lê: os dados se editam no passo da seção. Nos relatórios, a seção por ciclo mostra só os registros do ciclo do relatório.';
    case 'lista_tema': return 'As ações do plano marcadas com um tema, com o código e a situação de cada uma.';
    case 'matriz_swot': return 'O quadro com as forças, as fraquezas, as oportunidades e as ameaças da análise SWOT.';
    case 'fluxo': return 'O desenho de um fluxo: o que o órgão adaptou ou, sem adaptação, o modelo do guia. O desenho sai sozinho, com a descrição em texto.';
    case 'acoes_por_situacao': return 'As ações do ciclo em grupos: em dia, atrasadas, não iniciadas e canceladas, com a execução física, a orçamentária e a observação de cada uma.';
    case 'metas_por_resultado': return 'As metas em grupos: alcançadas, não alcançadas e canceladas, com o motivo. No relatório de acompanhamento, vêm dos resultados intermediários da avaliação; no de resultados, do resultado de cada meta.';
    case 'riscos_ocorridos': return 'Os riscos que ocorreram: os do ciclo, no relatório de acompanhamento, e os de toda a vigência, no de resultados.';
    case 'medicoes': return 'As medições dos indicadores de monitoramento no ciclo, com o valor de referência de cada um.';
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
    case 'acoes_por_situacao': return `As ações do ciclo em dia, atrasadas, não iniciadas e canceladas${deitada}`;
    case 'metas_por_resultado': return `As metas alcançadas, não alcançadas e canceladas, com o motivo${deitada}`;
    case 'riscos_ocorridos': return `Os riscos que ocorreram${deitada}`;
    case 'medicoes': return `As medições dos indicadores, com o valor de referência${deitada}`;
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
