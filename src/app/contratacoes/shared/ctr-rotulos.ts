/**
 * Cores e rótulos das telas do módulo Análises de Contratações.
 *
 * Só apresentação: a situação do processo, a fase da contratação e o estágio da
 * manifestação são derivados no backend (nunca gravados) e chegam prontos nos
 * DTOs.
 */
import { ETAPAS_PLANEJAMENTO } from '../../../api/contratacoes/interface';

/** Badge da situação derivada do processo. */
export function badgeSituacao(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'Concluído': return 'bg-green-100 text-green-800';
    case 'Restituído': return 'bg-orange-100 text-orange-800';
    case 'Retornado ao Gab SGDI': return 'bg-blue-100 text-blue-800';
    case 'Em análise na UGTIC': return 'bg-indigo-100 text-indigo-800';
    case 'Em análise na SUBGD': return 'bg-cyan-100 text-cyan-800';
    case 'Em análise na SGDI': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-600'; // Sem movimentação
  }
}

/** Badge do estágio da manifestação ao TCDF (inclui os status do Tribunal). */
export function badgeEstagio(estagio: string | null | undefined): string {
  switch (estagio) {
    case 'Alinhada': return 'bg-green-100 text-green-800';
    case 'Risco resolvido': return 'bg-emerald-100 text-emerald-800';
    case 'Informações solicitadas': return 'bg-blue-100 text-blue-800';
    case 'Aguardando resposta': return 'bg-yellow-100 text-yellow-800';
    case 'Não pode prosseguir': return 'bg-red-100 text-red-800';
    case 'Notificação para regularizar': return 'bg-amber-100 text-amber-800';
    // Os dois status do TCDF têm precedência no cálculo do estágio.
    case 'Suspenso por irregularidades': return 'bg-red-100 text-red-800';
    case 'Edital revogado': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-600';
  }
}

/** Badge do status do processo no TCDF (fato do Tribunal, não da análise). */
export function badgeStatusTcdf(status: string | null | undefined): string {
  switch (status) {
    case 'Suspenso por irregularidades': return 'bg-red-100 text-red-800';
    case 'Edital revogado': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-600';
  }
}

/** Badge da fase derivada da contratação. */
export function badgeFase(fase: string | null | undefined): string {
  switch (fase) {
    case 'Execução': return 'bg-green-100 text-green-800';
    case 'Planejamento': return 'bg-slate-100 text-slate-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

/** Badge da criticidade da contratação (art. 11 da IN SGDI nº 1/2026). */
export function badgeCriticidade(criticidade: string | null | undefined): string {
  switch (criticidade) {
    case 'Alta': return 'bg-red-100 text-red-800';
    case 'Média': return 'bg-amber-100 text-amber-800';
    case 'Baixa': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-600';
  }
}

/** Nome por extenso da etapa do planejamento; a sigla é o que fica gravado. */
export function rotuloEtapaPlanejamento(etapa: string | null | undefined): string {
  const achada = ETAPAS_PLANEJAMENTO.find(e => e.valor === etapa);
  return achada ? achada.rotulo : (etapa || '');
}

/** Realce do tempo parado: quanto mais dias, mais forte. */
export function corDiasSemMovimento(dias: number | null | undefined): string {
  const d = dias ?? 0;
  if (d >= 30) return 'text-red-700 font-semibold';
  if (d >= 15) return 'text-amber-700 font-semibold';
  return 'text-gray-600';
}

/** Cor da linha do relatório de importação, pela ação da linha. */
export function corAcaoImportacao(acao: string | null | undefined): string {
  switch (acao) {
    case 'Criar': return 'bg-green-100 text-green-800';
    case 'Atualizar': return 'bg-blue-100 text-blue-800';
    default: return 'bg-red-100 text-red-800'; // Rejeitar
  }
}
