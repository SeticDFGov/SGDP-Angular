/**
 * Rótulos e filtros dos painéis da Governança Estratégica (E8): os grupos e os
 * itens da conformidade, os filtros da conformidade no endereço, os alertas do
 * painel e os textos da página do órgão. Só funções puras e constantes (as
 * classes dos selos são as que o projeto já usa).
 */
import {
  PeAtendimentoConformidade, PeConformidadeOrgao, PeGrupoConformidade, PeTipoDocumento
} from '../../../api/planejamento/interface';
import { rotuloSituacaoPdtic } from './pe-pdtic-rotulos';

// ── Conformidade ─────────────────────────────────────────────────────────────

export interface GrupoConformidade {
  valor: PeGrupoConformidade;
  rotulo: string;
  curto: string;
  faixa: string;
  classe: string;
  icone: string;
}

/** Os três grupos, como no painel de conformidade do mock (alta a partir de 70%, média de 25% a 69%, baixa abaixo de 25%). */
export const GRUPOS_CONFORMIDADE: readonly GrupoConformidade[] = [
  {
    valor: 'alta', rotulo: 'Alta conformidade', curto: 'Alta', faixa: '70% dos itens ou mais',
    classe: 'bg-green-50 text-green-800 border-green-200', icone: 'verified'
  },
  {
    valor: 'media', rotulo: 'Média conformidade', curto: 'Média', faixa: 'de 25% a 69% dos itens',
    classe: 'bg-amber-50 text-amber-900 border-amber-200', icone: 'rule'
  },
  {
    valor: 'baixa', rotulo: 'Baixa conformidade', curto: 'Baixa', faixa: 'menos de 25% dos itens',
    classe: 'bg-red-50 text-red-800 border-red-200', icone: 'report_problem'
  }
];

export function grupoConformidade(valor: string | null | undefined): GrupoConformidade | null {
  return GRUPOS_CONFORMIDADE.find(g => g.valor === valor) ?? null;
}

/** O grupo pelo percentual (a regra do servidor, para conferência: 24 é baixa, 25 é média, 69 é média, 70 é alta). */
export function grupoDoPercentual(percentual: number): PeGrupoConformidade {
  if (percentual >= 70) return 'alta';
  if (percentual >= 25) return 'media';
  return 'baixa';
}

/**
 * Os seis itens de TIC com o rótulo, a base legal e o que cada um pede (a tabela
 * da especificação da E8, com as frases do servidor). A conformidade manda os
 * itens na resposta; o resumo do órgão manda só a linha dele, e a página usa
 * estes, na mesma ordem.
 */
export const ITENS_CONFORMIDADE_PADRAO: readonly { Chave: string; Rotulo: string; Base: string; AtendeQuando: string }[] = [
  {
    Chave: 'aprovado_cgtic', Rotulo: 'PDTIC aprovado pelo CGTIC', Base: 'art. 5º do Decreto nº 48.900/2026',
    AtendeQuando: 'Há deliberação do CGTIC que aprova a versão do PDTIC.'
  },
  {
    Chave: 'comunicado_sgdi', Rotulo: 'PDTIC comunicado à SGDI', Base: 'art. 7º, V, do Decreto nº 48.899/2026',
    AtendeQuando: 'A versão foi enviada pelo sistema ou registrada fora dele com a aprovação.'
  },
  {
    Chave: 'vigente', Rotulo: 'PDTIC vigente', Base: 'art. 12 do Decreto nº 48.900/2026',
    AtendeQuando: 'O PDTIC está publicado ou em acompanhamento e hoje está dentro da vigência.'
  },
  {
    Chave: 'nove_conteudos', Rotulo: 'Os nove conteúdos preenchidos', Base: 'art. 12, § 2º, do Decreto nº 48.900/2026',
    AtendeQuando: 'Os passos dos nove conteúdos mínimos estão feitos.'
  },
  {
    Chave: 'revisao_em_dia', Rotulo: 'Revisão em dia', Base: 'art. 12 do Decreto nº 48.900/2026 (manter o PDTIC atualizado)',
    AtendeQuando: 'A última aprovação do CGTIC (no PDTIC registrado fora do sistema, a publicação) está dentro da periodicidade de '
      + 'revisão do passo da abrangência (anual por padrão).'
  },
  {
    Chave: 'acompanhamento_em_dia', Rotulo: 'Acompanhamento em dia', Base: 'Guia de PDTIC do SISP, capítulo 7',
    AtendeQuando: 'Nenhum ciclo de monitoramento passou do prazo de fechamento. Antes da publicação, o item não se aplica.'
  }
];

/** O que o item pede: a frase do servidor ou, sem ela, a do front para a chave (item desconhecido: vazio). */
export function atendeQuando(item: { Chave: string; AtendeQuando?: string | null }): string {
  return item.AtendeQuando?.trim() || ITENS_CONFORMIDADE_PADRAO.find(i => i.Chave === item.Chave)?.AtendeQuando || '';
}

/** Os itens da linha de um órgão na ordem da tabela padrão; chave desconhecida vai no fim, com a própria chave. */
export function itensDaLinha(itens: Record<string, unknown> | null | undefined): { Chave: string; Rotulo: string; Base: string; AtendeQuando: string }[] {
  const chaves = Object.keys(itens ?? {});
  const conhecidos = ITENS_CONFORMIDADE_PADRAO.filter(i => chaves.includes(i.Chave));
  const outros = chaves.filter(c => !ITENS_CONFORMIDADE_PADRAO.some(i => i.Chave === c)).map(c => ({ Chave: c, Rotulo: c, Base: '', AtendeQuando: '' }));
  return [...conhecidos, ...outros];
}

export interface MarcaAtendimento {
  texto: string;
  icone: string;
  classe: string;
}

const MARCA_SIM: MarcaAtendimento = { texto: 'Sim', icone: 'check_circle', classe: 'text-green-700' };
const MARCA_NAO: MarcaAtendimento = { texto: 'Não', icone: 'cancel', classe: 'text-red-700' };
const MARCA_NAO_SE_APLICA: MarcaAtendimento = { texto: 'Não se aplica', icone: 'remove_circle_outline', classe: 'text-gray-600' };
const MARCA_SEM_DADO: MarcaAtendimento = { texto: 'Sem dado', icone: 'help_outline', classe: 'text-gray-600' };

/** A marca de um item na linha do órgão: texto e ícone, nunca só a cor. */
export function marcaAtendimento(item: PeAtendimentoConformidade | null | undefined): MarcaAtendimento {
  if (!item) return MARCA_SEM_DADO;
  if (item.Atende === true) return MARCA_SIM;
  if (item.Atende === false) return MARCA_NAO;
  return MARCA_NAO_SE_APLICA;
}

/** "67% (4 de 6 itens)". */
export function textoPercentualConformidade(o: Pick<PeConformidadeOrgao, 'Percentual' | 'Atendidos' | 'Aplicaveis'>): string {
  const percentual = Number.isFinite(o.Percentual) ? Math.round(o.Percentual) : 0;
  const itens = o.Aplicaveis === 1 ? 'item' : 'itens';
  return `${percentual}% (${o.Atendidos} de ${o.Aplicaveis} ${itens})`;
}

/** Situação do PDTIC da linha, com "Sem PDTIC" quando o órgão ainda não tem. */
export function rotuloSituacaoDoOrgao(situacao: string | null | undefined): string {
  return !situacao || situacao === 'sem_pdtic' ? 'Sem PDTIC' : rotuloSituacaoPdtic(situacao);
}

/** A chave da situação da linha, na forma do painel (`sem_pdtic` quando não há PDTIC). */
export function chaveSituacaoDoOrgao(o: Pick<PeConformidadeOrgao, 'PdticSituacao'>): string {
  return o.PdticSituacao ?? 'sem_pdtic';
}

/** Chaves de situação que a conformidade entende no endereço (as do painel). */
export const CHAVES_SITUACAO_PAINEL: readonly string[] = [
  'sem_pdtic', 'em_elaboracao', 'em_aprovacao', 'devolvido', 'aprovado', 'publicado', 'em_acompanhamento', 'encerrado'
];

/**
 * Filtros que só a tela aplica, sobre a lista que chegou, para os alertas do
 * painel abrirem a conformidade já filtrada: vigência vencida (PDTIC publicado
 * sem estar dentro da vigência), revisão vencida, ciclo atrasado e notificação ou
 * inadimplência em aberto.
 */
export type AlertaConformidade = 'vigencia' | 'revisao' | 'ciclo' | 'inadimplencia';

export const ALERTAS_CONFORMIDADE: readonly { valor: AlertaConformidade; rotulo: string }[] = [
  { valor: 'vigencia', rotulo: 'PDTIC publicado com a vigência vencida' },
  { valor: 'revisao', rotulo: 'Revisão do PDTIC vencida' },
  { valor: 'ciclo', rotulo: 'Ciclo de acompanhamento atrasado' },
  { valor: 'inadimplencia', rotulo: 'Notificação ou inadimplência em aberto' }
];

export function alertaValido(valor: string | null | undefined): AlertaConformidade | null {
  return ALERTAS_CONFORMIDADE.find(a => a.valor === valor)?.valor ?? null;
}

export function rotuloAlerta(valor: AlertaConformidade | null): string {
  return ALERTAS_CONFORMIDADE.find(a => a.valor === valor)?.rotulo ?? '';
}

function naoAtende(o: PeConformidadeOrgao, chave: string): boolean {
  return o.Itens?.[chave]?.Atende === false;
}

/** O órgão entra no filtro do alerta. */
export function temAlerta(o: PeConformidadeOrgao, alerta: AlertaConformidade): boolean {
  switch (alerta) {
    case 'vigencia': return (o.PdticSituacao === 'publicado' || o.PdticSituacao === 'em_acompanhamento') && naoAtende(o, 'vigente');
    case 'revisao': return naoAtende(o, 'revisao_em_dia');
    case 'ciclo': return naoAtende(o, 'acompanhamento_em_dia');
    case 'inadimplencia': return !!o.Inadimplencia;
  }
}

/** Filtros da conformidade como a tela guarda (o nível vai ao servidor; os demais, a tela aplica). */
export interface FiltroConformidade {
  grupo: PeGrupoConformidade | null;
  nivel: number | null;
  busca: string;
  situacoes: string[];
  alerta: AlertaConformidade | null;
}

export function filtroConformidadeVazio(): FiltroConformidade {
  return { grupo: null, nivel: null, busca: '', situacoes: [], alerta: null };
}

/** Número inteiro positivo de um parâmetro do endereço (id de nível ou de órgão), ou null. */
export function idDoParametro(valor: string | null | undefined): number | null {
  if (!valor || !/^\d{1,9}$/.test(valor)) return null;
  const id = Number(valor);
  return id > 0 ? id : null;
}

/** Os filtros lidos do endereço (`grupo`, `nivel`, `busca`, `situacao` separada por vírgula, `alerta`); o estranho fica vazio. */
export function filtroConformidadeDaUrl(ler: (nome: string) => string | null): FiltroConformidade {
  const grupo = grupoConformidade(ler('grupo'))?.valor ?? null;
  const situacoes = (ler('situacao') ?? '').split(',').map(s => s.trim()).filter(s => CHAVES_SITUACAO_PAINEL.includes(s));
  return {
    grupo,
    nivel: idDoParametro(ler('nivel')),
    busca: (ler('busca') ?? '').trim().slice(0, 100),
    situacoes: [...new Set(situacoes)],
    alerta: alertaValido(ler('alerta'))
  };
}

/**
 * Os parâmetros do endereço (com null nos vazios: a navegação com "merge" tira o
 * parâmetro e mantém os outros, como o `passo` da trilha).
 */
export function parametrosConformidade(f: FiltroConformidade): Record<string, string | null> {
  return {
    grupo: f.grupo,
    nivel: f.nivel ? String(f.nivel) : null,
    busca: f.busca.trim() || null,
    situacao: f.situacoes.length ? f.situacoes.join(',') : null,
    alerta: f.alerta
  };
}

/** Texto para comparar sem caixa e sem acento. */
export function normalizarBusca(texto: string | null | undefined): string {
  return (texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** A sigla ou o nome do órgão contém a busca (sem caixa e sem acento). */
export function orgaoCasaBusca(o: { Sigla: string; Nome: string }, busca: string): boolean {
  const alvo = normalizarBusca(busca);
  if (!alvo) return true;
  return normalizarBusca(o.Sigla).includes(alvo) || normalizarBusca(o.Nome).includes(alvo);
}

/** As linhas que passam na busca, na situação e no alerta (o grupo fica à parte: o resumo conta os três). */
export function filtrarSemGrupo(orgaos: readonly PeConformidadeOrgao[], f: FiltroConformidade): PeConformidadeOrgao[] {
  return orgaos.filter(o =>
    orgaoCasaBusca(o, f.busca)
    && (!f.situacoes.length || f.situacoes.includes(chaveSituacaoDoOrgao(o)))
    && (!f.alerta || temAlerta(o, f.alerta)));
}

/** Quantos órgãos em cada grupo, na lista que a tela mostra (o mesmo número do resumo). */
export function contarGrupos(orgaos: readonly PeConformidadeOrgao[]): Record<PeGrupoConformidade, number> {
  const contagem: Record<PeGrupoConformidade, number> = { alta: 0, media: 0, baixa: 0 };
  for (const o of orgaos) {
    if (o.Grupo in contagem) contagem[o.Grupo]++;
  }
  return contagem;
}

/** As linhas em ordem: a sigla, sem caixa e sem acento. */
export function orgaosEmOrdem<T extends { Sigla: string }>(orgaos: readonly T[]): T[] {
  return [...orgaos].sort((a, b) => a.Sigla.localeCompare(b.Sigla, 'pt-BR', { sensitivity: 'base' }));
}

// ── Página do órgão ──────────────────────────────────────────────────────────

/** A decisão registrada num passo de aprovação, em palavras. */
export function rotuloDecisao(decisao: string | null | undefined): string {
  switch ((decisao ?? '').trim().toLowerCase()) {
    case 'aprovado': return 'Aprovado';
    case 'devolvido': return 'Devolvido para ajustes';
    case 'seguir': return 'Seguir com o PDTIC';
    case 'revisar': return 'Revisar o PDTIC';
    case '': return '-';
    default: return decisao!.trim();
  }
}

export function rotuloTipoDocumento(tipo: PeTipoDocumento | string | null | undefined, doServidor?: string | null): string {
  if (doServidor?.trim()) return doServidor.trim();
  switch (tipo) {
    case 'pdtic': return 'Documento do PDTIC';
    case 'ra': return 'Relatório de acompanhamento (RA)';
    case 'rr': return 'Relatório de resultados (RR)';
    default: return tipo || 'Documento';
  }
}

/** Situação de uma versão em PDF (minuta, enviada, aprovada, publicada). */
export function rotuloSituacaoDocumento(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'minuta': return 'Minuta';
    case 'enviada': return 'Enviada ao CGTIC';
    case 'aprovada': return 'Aprovada';
    case 'publicada': return 'Publicada';
    default: return situacao || '-';
  }
}

/** Nome do PDF quando o `Content-Disposition` não chega. */
export function nomeDocumentoReserva(sigla: string, tipo: string, numero: number): string {
  const limpa = (sigla ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '_') || 'orgao';
  const prefixo = tipo === 'ra' ? 'RA' : tipo === 'rr' ? 'RR' : 'PDTIC';
  return `${prefixo}_${limpa}_${numero}.pdf`;
}
