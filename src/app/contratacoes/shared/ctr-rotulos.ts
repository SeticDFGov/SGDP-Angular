/**
 * Cores e rótulos das telas do módulo Supervisão Contínua das Contratações.
 *
 * Só apresentação: a situação do processo, a fase da contratação e o estágio da
 * manifestação são derivados no backend (nunca gravados) e chegam prontos nos
 * DTOs.
 */
import { ETAPAS_PLANEJAMENTO } from '../../../api/contratacoes/interface';

/** Badge da situação derivada do processo (`Concluído` = contrato assinado). */
export function badgeSituacao(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'Concluído': return 'bg-green-100 text-green-800';
    case 'Análise concluída': return 'bg-emerald-100 text-emerald-800';
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

/**
 * Badge do nível de um risco da contratação: a cor cheia da célula do mapa da
 * CGDF (a mesma do mapa desenhado na seção de riscos do processo).
 */
export function badgeNivelRisco(nivel: string | null | undefined): string {
  switch (nivel) {
    case 'Baixo': return 'bg-green-500 text-gray-900';
    case 'Médio': return 'bg-yellow-300 text-gray-900';
    case 'Alto': return 'bg-orange-400 text-gray-900';
    case 'Extremo': return 'bg-red-600 text-white';
    default: return 'bg-gray-100 text-gray-600'; // Sem riscos declarados
  }
}

const FORMATO_REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FORMATO_NUMERO = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "R$ 1.234.567,89"; traço quando não informado. */
export function formatarReais(valor: number | null | undefined): string {
  return valor == null ? '-' : FORMATO_REAIS.format(valor);
}

/** "1.234.567,89" (sem o símbolo), para o campo do formulário. */
export function formatarNumeroReais(valor: number | null | undefined): string {
  return valor == null ? '' : FORMATO_NUMERO.format(valor);
}

/**
 * Lê o valor digitado em reais: aceita "R$", espaços, "1.234.567,89", "1234567,89",
 * "1500000" e ponto decimal quando não há vírgula ("1234.5"). Vazio = null;
 * texto que não é número = undefined (o formulário mostra o erro).
 */
export function lerReais(texto: string | null | undefined): number | null | undefined {
  const limpo = (texto || '').replace(/R\$/gi, '').replace(/\s/g, '');
  if (!limpo) return null;
  let normal = limpo;
  if (limpo.includes(',')) normal = limpo.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(limpo)) normal = limpo.replace(/\./g, '');
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return undefined;
  const numero = Math.round(Number(normal) * 100) / 100;
  return Number.isFinite(numero) ? numero : undefined;
}

/** Rede GDFNet: Sim, Não ou Não informado. */
export function rotuloGdfnet(usa: boolean | null | undefined): string {
  return usa == null ? 'Não informado' : (usa ? 'Sim' : 'Não');
}

/** "Decisão nº 1234/2026"; vazio quando a manifestação não tem o ato. */
export function rotuloAtoTcdf(ato: string | null | undefined, numero: string | null | undefined): string {
  if (!ato) return '';
  return numero ? `${ato} nº ${numero}` : ato;
}

// ── Campos com máscara ───────────────────────────────────────────────────────
// Os campos mascarados usam `[value]` + `(input)`, não `ngModel`: quando o que
// foi digitado é descartado pela máscara (uma letra, por exemplo), o modelo não
// muda, o Angular não reescreve a caixa de texto e a tela ficaria mostrando o
// caractere recusado. Escrevendo direto no elemento, os dois ficam iguais.

/** 19 dígitos com a pontuação do SEI: 00000-00000000/AAAA-DD. */
export function mascaraSei(valor: string): string {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 19);
  let saida = digitos.slice(0, 5);
  if (digitos.length > 5) saida += '-' + digitos.slice(5, 13);
  if (digitos.length > 13) saida += '/' + digitos.slice(13, 17);
  if (digitos.length > 17) saida += '-' + digitos.slice(17, 19);
  return saida;
}

/** Posição logo depois do n-ésimo dígito do texto já mascarado. */
function depoisDoDigito(texto: string, digitos: number): number {
  if (digitos <= 0) return 0;
  let vistos = 0;
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] >= '0' && texto[i] <= '9') {
      vistos++;
      if (vistos === digitos) return i + 1;
    }
  }
  return texto.length;
}

/**
 * Aplica a máscara do SEI no campo enquanto a pessoa digita e devolve o número
 * formatado. O cursor é reposicionado pela contagem de dígitos à esquerda dele:
 * sem isso qualquer correção no meio do número jogaria o cursor para o fim.
 */
export function digitarNumeroSei(input: HTMLInputElement): string {
  const bruto = input.value || '';
  const cursor = input.selectionStart ?? bruto.length;
  const digitosAntes = bruto.slice(0, cursor).replace(/\D/g, '').length;
  const formatado = mascaraSei(bruto);
  // Só reescrever quando a máscara mudou algo: reescrever à toa mexe no cursor.
  if (bruto !== formatado) {
    input.value = formatado;
    const posicao = depoisDoDigito(formatado, digitosAntes);
    input.setSelectionRange(posicao, posicao);
  }
  return formatado;
}

/** Sigla sempre em caixa alta, pelo mesmo motivo; devolve o texto do campo. */
export function digitarCaixaAlta(input: HTMLInputElement): string {
  const saida = (input.value || '').toUpperCase();
  if (input.value !== saida) {
    // A caixa alta não muda o tamanho do texto: o cursor fica onde estava.
    const cursor = input.selectionStart;
    input.value = saida;
    if (cursor !== null) input.setSelectionRange(cursor, cursor);
  }
  return saida;
}
