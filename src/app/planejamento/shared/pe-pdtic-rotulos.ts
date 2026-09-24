/**
 * Rótulos do PDTIC do órgão (E4), em linguagem simples: situação do PDTIC e de
 * cada passo, o que cada seção chama de item, a classificação de risco dos
 * sistemas de IA do PGIA e o andamento da trilha. Só funções puras e constantes
 * (as classes dos selos são as que o projeto já usa).
 */
import { PeAndamentoPdtic, PePassoTrilha, PeSituacaoPassoPdtic } from '../../../api/planejamento/interface';

export function rotuloSituacaoPdtic(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'em_elaboracao': return 'Em elaboração';
    case 'em_aprovacao': return 'Em aprovação';
    case 'devolvido': return 'Devolvido pelo CGTIC';
    case 'aprovado': return 'Aprovado';
    case 'publicado': return 'Publicado';
    case 'em_acompanhamento': return 'Em acompanhamento';
    case 'encerrado': return 'Encerrado';
    case 'substituido': return 'Substituído';
    default: return situacao || '-';
  }
}

export function classeSituacaoPdtic(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'em_elaboracao': return 'bg-blue-100 text-blue-800';
    case 'em_aprovacao': return 'bg-amber-100 text-amber-900';
    case 'devolvido': return 'bg-red-100 text-red-800';
    case 'aprovado':
    case 'publicado':
    case 'em_acompanhamento': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

/** Situações em que a equipe do órgão preenche (as demais: só leitura). */
export function pdticEmEdicao(situacao: string | null | undefined): boolean {
  return situacao === 'em_elaboracao' || situacao === 'devolvido';
}

/** "1 comentário" ou "3 comentários". */
export function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`;
}

export type EstadoPassoPdtic = 'feito' | 'pendente' | 'atencao' | 'nao_se_aplica';

/**
 * Situação de um passo para a trilha (bolinha, selo e próximo passo). O passo
 * `continuo` (tipo que ganha tela nas próximas entregas) fica sem situação.
 * Os avisos do guia não mudam a situação: entram no texto.
 */
export function statusDoPassoPdtic(s: PeSituacaoPassoPdtic): { estado: EstadoPassoPdtic; texto: string } | null {
  const avisos = s.Avisos?.length ? ` · ${plural(s.Avisos.length, 'aviso', 'avisos')}` : '';
  switch (s.Situacao) {
    case 'feito': return { estado: 'feito', texto: `Feito${avisos}` };
    case 'pendente': return { estado: 'pendente', texto: `Pendente${avisos}` };
    case 'atencao': return {
      estado: 'atencao',
      texto: s.ComentariosAbertos > 0 ? plural(s.ComentariosAbertos, 'comentário aberto', 'comentários abertos') : `Pede atenção${avisos}`
    };
    case 'nao_se_aplica': return { estado: 'nao_se_aplica', texto: 'Não se aplica' };
    default: return null;
  }
}

/** Quantos passos com situação estão resolvidos (feitos ou marcados como "não se aplica"). */
export function resumoAndamento(andamento: PeAndamentoPdtic | null | undefined): { feitos: number; total: number } {
  const comSituacao = (andamento?.Passos ?? []).filter(p => p.Situacao !== 'continuo');
  return {
    feitos: comSituacao.filter(p => p.Situacao === 'feito' || p.Situacao === 'nao_se_aplica').length,
    total: comSituacao.length
  };
}

/** Incisos do art. 12, § 2º, do passo ("V,VI,IX" vira três). */
export function incisosDoPasso(passo: Pick<PePassoTrilha, 'IncisoDecreto'> | null | undefined): string[] {
  return (passo?.IncisoDecreto ?? '').split(',').map(i => i.trim()).filter(Boolean);
}

/** O passo dos sistemas de IA (inciso VIII): mostra o inventário do PGIA antes das seções. */
export function ehPassoSistemasIa(passo: Pick<PePassoTrilha, 'IncisoDecreto'> | null | undefined): boolean {
  return incisosDoPasso(passo).includes('VIII');
}

/** O passo pode ser marcado como "não se aplica": opcional no nível do órgão, aceita e não é travado. */
export function aceitaNaoSeAplica(passo: Pick<PePassoTrilha, 'Situacao' | 'AceitaNaoSeAplica' | 'Travado'> | null | undefined): boolean {
  return !!passo && passo.Situacao === 'opcional' && passo.AceitaNaoSeAplica && !passo.Travado;
}

/** Tipos de passo do órgão que têm tela (os demais: "em construção"); o documento entrou na E5 e o fluxo, na E6. */
export const TIPOS_PASSO_COM_TELA: ReadonlySet<string> = new Set(['dados', 'conferencia_temas', 'documento', 'fluxo']);

/**
 * Passos de dados que também mostram os fluxos do órgão (E6): o da metodologia
 * ("Descreva a metodologia e ajuste o fluxo", 1.5 no Avançado), pela chave no modelo.
 */
const PASSOS_DE_DADOS_COM_FLUXOS: ReadonlySet<string> = new Set(['preparacao.metodologia']);

/** O passo mostra o editor dos fluxos: o do tipo fluxo ou o da metodologia. */
export function passoTemFluxos(passo: Pick<PePassoTrilha, 'Tipo' | 'Chave'> | null | undefined): boolean {
  return !!passo && (passo.Tipo === 'fluxo' || PASSOS_DE_DADOS_COM_FLUXOS.has(passo.Chave));
}

/** Seção do cronograma do plano de trabalho (1.9 no Avançado): com ela vazia, o passo sugere as linhas pelos fluxos. */
export const SECAO_CRONOGRAMA = 'cronograma_elaboracao';

/** Selo da classificação de risco do PGIA (Decreto nº 48.901/2026), nas cores do PGIA. */
export function classeRiscoPgia(classificacao: string | null | undefined): string {
  switch (classificacao) {
    case 'Risco Excessivo': return 'bg-red-100 text-red-800';
    case 'Alto Risco': return 'bg-orange-100 text-orange-800';
    case 'Risco Moderado': return 'bg-yellow-100 text-yellow-800';
    case 'Baixo Risco': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

/** Nome de um item de cada seção semeada do PDTIC ("Incluir necessidade"). */
const ITEM_DA_SECAO_PDTIC: Record<string, string> = {
  sgtic_membros: 'membro',
  equipe_elaboracao: 'pessoa',
  documentos_referencia: 'documento',
  estrategias: 'estratégia',
  instrumentos_ausentes: 'instrumento',
  principios_diretrizes: 'princípio ou diretriz',
  partes_interessadas: 'parte interessada',
  cronograma_elaboracao: 'atividade',
  objetivos_tic: 'objetivo',
  ativos: 'solução ou ativo',
  swot_forcas: 'força',
  swot_fraquezas: 'fraqueza',
  swot_oportunidades: 'oportunidade',
  swot_ameacas: 'ameaça',
  necessidades_informacao: 'necessidade de informação',
  necessidades: 'necessidade',
  aquisicoes_ia: 'aquisição',
  metas: 'meta',
  acoes: 'ação',
  contratacoes: 'contratação',
  capacitacoes: 'capacitação',
  orcamento_acoes: 'linha do orçamento',
  fatores_criticos: 'fator crítico',
  riscos: 'risco'
};

export function itemDaSecaoPdtic(chave: string): string {
  return ITEM_DA_SECAO_PDTIC[chave] ?? 'registro';
}
