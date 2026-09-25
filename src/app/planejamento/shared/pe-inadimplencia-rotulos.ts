/**
 * Rótulos da inadimplência (E8; arts. 7º, § 3º, e 11 do Decreto nº 48.899/2026),
 * em linguagem simples: situação, motivo, o prazo de 5 dias úteis em texto e quando
 * o registro fica disponível. Só funções puras e constantes (as classes dos selos
 * são as que o projeto já usa).
 */
import {
  PeInadimplencia, PeMotivoInadimplencia, PeSituacaoInadimplencia
} from '../../../api/planejamento/interface';
import { textoData } from './registros/pe-valores';

export const SITUACOES_INADIMPLENCIA: readonly { valor: PeSituacaoInadimplencia; rotulo: string }[] = [
  { valor: 'notificado', rotulo: 'Notificado' },
  { valor: 'inadimplente', rotulo: 'Inadimplente' },
  { valor: 'justificado', rotulo: 'Justificativa aceita' },
  { valor: 'saneado', rotulo: 'Saneado' }
];

export function situacaoInadimplenciaValida(valor: string | null | undefined): PeSituacaoInadimplencia | null {
  return SITUACOES_INADIMPLENCIA.find(s => s.valor === valor)?.valor ?? null;
}

export function rotuloSituacaoInadimplencia(situacao: string | null | undefined, doServidor?: string | null): string {
  return SITUACOES_INADIMPLENCIA.find(s => s.valor === situacao)?.rotulo ?? (doServidor?.trim() || situacao || '-');
}

/** Selo da situação (o texto sempre vai junto; a cor só acompanha). */
export function classeSituacaoInadimplencia(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'notificado': return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'inadimplente': return 'bg-red-50 text-red-800 border-red-200';
    case 'justificado': return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'saneado': return 'bg-green-50 text-green-800 border-green-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

export function iconeSituacaoInadimplencia(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'notificado': return 'hourglass_top';
    case 'inadimplente': return 'report';
    case 'justificado': return 'fact_check';
    case 'saneado': return 'task_alt';
    default: return 'help_outline';
  }
}

/** Notificado ou inadimplente: a marca vale no painel, na conformidade e na página do órgão. */
export function inadimplenciaVigente(situacao: string | null | undefined): boolean {
  return situacao === 'notificado' || situacao === 'inadimplente';
}

/** Os motivos do art. 11, III, do Decreto nº 48.899/2026, com o que cada um quer dizer. */
export const MOTIVOS_INADIMPLENCIA: readonly { valor: PeMotivoInadimplencia; rotulo: string; explicacao: string }[] = [
  {
    valor: 'descumprimento_prazo', rotulo: 'Descumprimento de prazo',
    explicacao: 'O órgão não comunicou no prazo e não regularizou depois da notificação.'
  },
  {
    valor: 'omissao_reiterada', rotulo: 'Omissão reiterada',
    explicacao: 'O órgão deixou de comunicar mais de uma vez, mesmo notificado.'
  },
  {
    valor: 'recusa_injustificada', rotulo: 'Recusa injustificada de comunicação',
    explicacao: 'O órgão se recusou a comunicar e não apresentou justificativa aceita.'
  }
];

export function rotuloMotivoInadimplencia(motivo: string | null | undefined, doServidor?: string | null): string {
  return MOTIVOS_INADIMPLENCIA.find(m => m.valor === motivo)?.rotulo ?? (doServidor?.trim() || motivo || '-');
}

/**
 * A comunicação que a notificação cobra, já com a citação completa (o nome do
 * decreto logo depois do artigo, para a dica abrir o Decreto nº 48.899/2026, e
 * não o 48.900).
 */
export const OBRIGACAO_PADRAO = 'Comunicar à SGDI o PDTIC aprovado pelo comitê interno de governança de TIC (art. 7º, V, do Decreto nº 48.899/2026).';

/** Tamanhos dos textos (o servidor confere de novo). */
export const LIMITES_INADIMPLENCIA = {
  obrigacao: 500,
  prazoDescumprido: 300,
  documento: 200,
  sei: 50,
  /** O mesmo máximo do servidor (F2). */
  justificativa: 2000,
  nota: 8000,
  observacao: 2000
} as const;

/**
 * O prazo em texto. Na notificação em aberto: "Faltam 3 dias úteis (até
 * 30/09/2026)", "Termina hoje (30/09/2026)" ou "Prazo vencido em 30/09/2026". Nas
 * demais situações, só a data.
 */
export function textoPrazoInadimplencia(i: Pick<PeInadimplencia, 'Prazo' | 'DiasUteisRestantes' | 'Vencido' | 'Situacao'>): string {
  const data = i.Prazo ? textoData(i.Prazo) : null;
  if (i.Situacao !== 'notificado') return data ?? '-';
  if (i.Vencido) return data ? `Prazo vencido em ${data}` : 'Prazo vencido';
  const dias = i.DiasUteisRestantes;
  if (dias === null || dias === undefined || dias < 0) return data ? `Até ${data}` : '-';
  if (dias === 0) return data ? `Termina hoje (${data})` : 'Termina hoje';
  const quantos = dias === 1 ? 'Falta 1 dia útil' : `Faltam ${dias} dias úteis`;
  return data ? `${quantos} (até ${data})` : quantos;
}

/**
 * Por que "Registrar a inadimplência" ainda não está disponível (a notificação em
 * aberto, com o prazo correndo): o registro só vem depois dos 5 dias úteis
 * (art. 11, II e III, do Decreto nº 48.899/2026). Null quando já pode.
 */
export function quandoPodeRegistrar(i: Pick<PeInadimplencia, 'Prazo' | 'Vencido' | 'Situacao'>): string | null {
  if (i.Situacao !== 'notificado' || i.Vencido) return null;
  const data = i.Prazo ? textoData(i.Prazo) : null;
  return data
    ? `Disponível depois de ${data}, quando terminam os 5 dias úteis que o órgão tem para regularizar ou se justificar.`
    : 'Disponível depois dos 5 dias úteis que o órgão tem para regularizar ou se justificar.';
}
