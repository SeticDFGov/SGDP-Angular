/**
 * Cores e rótulos das telas do módulo Análises de Contratações.
 *
 * Só apresentação: a situação do processo e o estágio da manifestação são
 * derivados no backend (nunca gravados) e chegam prontos nos DTOs.
 */

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

/** Badge do estágio da manifestação ao TCDF. */
export function badgeEstagio(estagio: string | null | undefined): string {
  switch (estagio) {
    case 'Alinhada': return 'bg-green-100 text-green-800';
    case 'Risco resolvido': return 'bg-emerald-100 text-emerald-800';
    case 'Informações solicitadas': return 'bg-blue-100 text-blue-800';
    case 'Aguardando resposta': return 'bg-yellow-100 text-yellow-800';
    case 'Não pode prosseguir': return 'bg-red-100 text-red-800';
    case 'Notificação para regularizar': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-600';
  }
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
