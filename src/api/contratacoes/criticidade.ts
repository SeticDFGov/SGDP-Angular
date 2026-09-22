/**
 * Critérios do art. 11, § 3º, da IN SGDI nº 1/2026 e a regra que deriva a criticidade
 * deles. ESPELHO da fonte única do backend (`CtrCriticidade.cs`): serve só para a
 * prévia ao vivo no formulário; o valor gravado é sempre o calculado pelo servidor.
 *
 * Regra da SGDI (2026-09-22): I "Sim" (alinhado à EGD/DF, que é bom) tira 1 ponto;
 * III vale 1 ponto quando "Sim"; II, IV e VI valem 0, 1, 2 ou 3 conforme o grau; V vale
 * 3 quando "Sim"; VII "Sim" é Alta, seja qual for o resto. A soma nunca fica negativa.
 * Baixa até 2 pontos, Média de 3 a 5, Alta com 6 ou mais.
 */

export const RESPOSTAS_SIM_NAO = ['Não', 'Sim'] as const;

export const RESPOSTAS_GRAU = ['Nenhum', 'Baixo', 'Médio', 'Alto'] as const;

export const PONTOS_MINIMOS_MEDIA = 3;

export const PONTOS_MINIMOS_ALTA = 6;

export interface CriterioCriticidade {
  /** Inciso do § 3º: "I" a "VII" (é a chave gravada). */
  codigo: string;
  /** A pergunta, em linguagem simples. */
  pergunta: string;
  /** Como a resposta pontua. */
  ajuda: string;
  /** Citação no formato que o chip da IN reconhece. */
  citacao: string;
  /** As respostas possíveis, a primeira é a padrão. */
  respostas: readonly string[];
}

export const CRITERIOS_CRITICIDADE: CriterioCriticidade[] = [
  {
    codigo: 'I',
    pergunta: 'A contratação está alinhada às diretrizes da Estratégia de Governo Digital do DF (EGD/DF)?',
    ajuda: 'Estar alinhada é bom: Sim tira 1 ponto e baixa a criticidade.',
    citacao: 'art. 11, § 3º, I',
    respostas: RESPOSTAS_SIM_NAO
  },
  {
    codigo: 'II',
    pergunta: 'Qual o impacto sobre a prestação de serviços públicos digitais?',
    ajuda: 'Nenhum 0, Baixo 1, Médio 2 e Alto 3 pontos: quanto maior o impacto, mais crítica a contratação.',
    citacao: 'art. 11, § 3º, II',
    respostas: RESPOSTAS_GRAU
  },
  {
    codigo: 'III',
    pergunta: 'A solução tem potencial de compartilhamento ou de utilização corporativa?',
    ajuda: 'Sim vale 1 ponto.',
    citacao: 'art. 11, § 3º, III',
    respostas: RESPOSTAS_SIM_NAO
  },
  {
    codigo: 'IV',
    pergunta: 'Qual o impacto sobre a arquitetura corporativa, a interoperabilidade ou a governança de dados?',
    ajuda: 'Nenhum 0, Baixo 1, Médio 2 e Alto 3 pontos.',
    citacao: 'art. 11, § 3º, IV',
    respostas: RESPOSTAS_GRAU
  },
  {
    codigo: 'V',
    pergunta: 'Usa tecnologias emergentes, computação em nuvem ou soluções baseadas em inteligência artificial?',
    ajuda: 'Sim vale 3 pontos: é crítico por si.',
    citacao: 'art. 11, § 3º, V',
    respostas: RESPOSTAS_SIM_NAO
  },
  {
    codigo: 'VI',
    pergunta: 'Qual o risco para a segurança da informação, a proteção de dados pessoais (LGPD) ou a continuidade dos serviços públicos?',
    ajuda: 'Nenhum 0, Baixo 1, Médio 2 e Alto 3 pontos: quanto mais risco, mais crítica a contratação.',
    citacao: 'art. 11, § 3º, VI',
    respostas: RESPOSTAS_GRAU
  },
  {
    codigo: 'VII',
    pergunta: 'O valor estimado atinge o limite do inciso VII?',
    ajuda: 'R$ 5 milhões em desenvolvimento, evolução, sustentação de sistemas e fábrica de software; '
      + 'R$ 10 milhões em contratações estruturantes; R$ 1 milhão nas demais contratações de TIC. '
      + 'Sim: a criticidade é Alta, seja qual for o resto.',
    citacao: 'art. 11, § 3º, VII',
    respostas: RESPOSTAS_SIM_NAO
  }
];

/** Chave = código do critério, valor = resposta (o mesmo objeto que vai no POST/PUT). */
export type RespostasCriticidade = Record<string, string>;

/** Todos os critérios na resposta padrão (Não ou Nenhum). */
export function respostasPadrao(): RespostasCriticidade {
  const respostas: RespostasCriticidade = {};
  for (const c of CRITERIOS_CRITICIDADE) respostas[c.codigo] = c.respostas[0];
  return respostas;
}

/** Respostas como vêm do servidor (podem faltar critérios) completadas com o padrão. */
export function completarRespostas(respostas: RespostasCriticidade | null | undefined): RespostasCriticidade {
  const completas = respostasPadrao();
  for (const c of CRITERIOS_CRITICIDADE) {
    const resposta = respostas ? respostas[c.codigo] : undefined;
    if (resposta && c.respostas.includes(resposta)) completas[c.codigo] = resposta;
  }
  return completas;
}

/** Pontos de uma resposta (o VII não pontua: decide sozinho). */
export function pontosDoCriterio(codigo: string, resposta: string): number {
  switch (codigo) {
    case 'I':
      // Alinhado à EGD/DF é bom: o único critério que desconta
      return resposta === 'Sim' ? -1 : 0;
    case 'III':
      return resposta === 'Sim' ? 1 : 0;
    case 'V':
      return resposta === 'Sim' ? 3 : 0;
    case 'II':
    case 'IV':
    case 'VI': {
      const grau = RESPOSTAS_GRAU.indexOf(resposta as typeof RESPOSTAS_GRAU[number]);
      return grau < 0 ? 0 : grau;
    }
    default:
      return 0;
  }
}

/** Soma dos pontos, nunca negativa: o alinhamento à EGD só desconta o que os outros somaram. */
export function pontosCriticidade(respostas: RespostasCriticidade): number {
  return Math.max(0, CRITERIOS_CRITICIDADE.reduce(
    (total, c) => total + pontosDoCriterio(c.codigo, respostas[c.codigo] ?? c.respostas[0]), 0));
}

/** O valor estimado atinge o limite do inciso VII: Alta direto. */
export function valorNoLimite(respostas: RespostasCriticidade): boolean {
  return respostas['VII'] === 'Sim';
}

export function calcularCriticidade(respostas: RespostasCriticidade): 'Alta' | 'Média' | 'Baixa' {
  if (valorNoLimite(respostas)) return 'Alta';
  const pontos = pontosCriticidade(respostas);
  if (pontos >= PONTOS_MINIMOS_ALTA) return 'Alta';
  if (pontos >= PONTOS_MINIMOS_MEDIA) return 'Média';
  return 'Baixa';
}
