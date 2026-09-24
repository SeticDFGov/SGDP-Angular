/**
 * Critérios do art. 11, § 3º, da IN SGDI nº 1/2026 e a regra que deriva a criticidade
 * deles. ESPELHO da fonte única do backend (`CtrCriticidade.cs`): serve só para a
 * prévia ao vivo no formulário; o valor gravado é sempre o calculado pelo servidor.
 *
 * Regra da SGDI (2026-09-22, com os ajustes de 2026-09-24): I "Sim" (alinhado à EGD/DF,
 * que é bom) tira 1 ponto; II (impacta diretamente algum projeto de Transformação Digital
 * do órgão) vale 0 no "Sim" e 1 no "Não" e no "Desconhecido", e sem resposta conta como
 * Desconhecido; III vale 0 no "Sim" e 1 no "Não" (a resposta padrão); IV e VI valem 0, 1,
 * 2 ou 3 conforme o grau; V vale 3 quando "Sim"; VII "Sim" é Alta, seja qual for o resto.
 * A soma nunca fica negativa. Baixa até 2 pontos, Média de 3 a 5, Alta com 6 ou mais. O
 * critério IV aceita também "Não foi possível avaliar com as informações apresentadas",
 * que não soma pontos (decisão da SGDI em 2026-09-22).
 *
 * Até 2026-09-24 o II perguntava o impacto sobre a prestação de serviços públicos
 * digitais (Nenhum, Baixo, Médio ou Alto). Essa resposta continua gravada nos processos
 * que a têm, conta como Desconhecido e aparece como referência até alguém responder à
 * pergunta nova (`respostaAnteriorII`).
 */

export const RESPOSTAS_SIM_NAO = ['Não', 'Sim'] as const;

export const RESPOSTAS_GRAU = ['Nenhum', 'Baixo', 'Médio', 'Alto'] as const;

/** Critério II, na ordem decidida pela SGDI. */
export const RESPOSTAS_PROJETO_TD = ['Sim', 'Não', 'Desconhecido'] as const;

/** Resposta do II quando não se sabe (e o valor de quem não respondeu). */
export const RESPOSTA_DESCONHECIDO = 'Desconhecido';

/** Só no critério IV: sem informação para avaliar o impacto. Vale 0 ponto. */
export const RESPOSTA_NAO_AVALIAVEL = 'Não foi possível avaliar com as informações apresentadas';

/** A pergunta que o II fazia até 2026-09-24 (a resposta a ela aparece como referência). */
export const PERGUNTA_ANTERIOR_II = 'Qual o impacto sobre a prestação de serviços públicos digitais?';

export const PONTOS_MINIMOS_MEDIA = 3;

export const PONTOS_MINIMOS_ALTA = 6;

export interface CriterioCriticidade {
  /** Inciso do § 3º: "I" a "VII" (é a chave gravada). */
  codigo: string;
  /** A pergunta, em linguagem simples. */
  pergunta: string;
  /** Nome curto, para a composição da soma. */
  rotulo: string;
  /** Como a resposta pontua. */
  ajuda: string;
  /** Citação no formato que o chip da IN reconhece. */
  citacao: string;
  /** As respostas possíveis, na ordem da tela. */
  respostas: readonly string[];
  /** Resposta de quem não respondeu (Desconhecido no II; nos demais, a primeira da lista). */
  padrao: string;
}

export const CRITERIOS_CRITICIDADE: CriterioCriticidade[] = [
  {
    codigo: 'I',
    pergunta: 'A contratação está alinhada às diretrizes da Estratégia de Governo Digital do DF (EGD/DF)?',
    rotulo: 'Alinhamento à EGD/DF',
    ajuda: 'Estar alinhada é bom: Sim tira 1 ponto e baixa a criticidade.',
    citacao: 'art. 11, § 3º, I',
    respostas: RESPOSTAS_SIM_NAO,
    padrao: 'Não'
  },
  {
    codigo: 'II',
    pergunta: 'A contratação impacta diretamente algum projeto de Transformação Digital do Órgão/Entidade?',
    rotulo: 'Impacto em projeto de Transformação Digital',
    ajuda: 'Sim vale 0 ponto; Não e Desconhecido valem 1 ponto. Sem resposta, conta como Desconhecido.',
    citacao: 'art. 11, § 3º, II',
    respostas: RESPOSTAS_PROJETO_TD,
    padrao: RESPOSTA_DESCONHECIDO
  },
  {
    codigo: 'III',
    pergunta: 'A solução tem potencial de compartilhamento ou de utilização corporativa?',
    rotulo: 'Compartilhamento ou uso corporativo',
    ajuda: 'Sim vale 0 ponto e Não vale 1 ponto.',
    citacao: 'art. 11, § 3º, III',
    respostas: RESPOSTAS_SIM_NAO,
    padrao: 'Não'
  },
  {
    codigo: 'IV',
    pergunta: 'Qual o impacto sobre a arquitetura corporativa, a interoperabilidade ou a governança de dados?',
    rotulo: 'Impacto na arquitetura, interoperabilidade ou dados',
    ajuda: 'Nenhum 0, Baixo 1, Médio 2 e Alto 3 pontos. Sem informação suficiente, marque "Não foi possível avaliar": não soma pontos.',
    citacao: 'art. 11, § 3º, IV',
    respostas: [...RESPOSTAS_GRAU, RESPOSTA_NAO_AVALIAVEL],
    padrao: 'Nenhum'
  },
  {
    codigo: 'V',
    pergunta: 'Usa tecnologias emergentes, computação em nuvem ou soluções baseadas em inteligência artificial?',
    rotulo: 'Tecnologias emergentes, nuvem ou IA',
    ajuda: 'Sim vale 3 pontos: é crítico por si.',
    citacao: 'art. 11, § 3º, V',
    respostas: RESPOSTAS_SIM_NAO,
    padrao: 'Não'
  },
  {
    codigo: 'VI',
    pergunta: 'Qual o risco para a segurança da informação, a proteção de dados pessoais (LGPD) ou a continuidade dos serviços públicos?',
    rotulo: 'Riscos de segurança, dados pessoais ou continuidade',
    ajuda: 'Nenhum 0, Baixo 1, Médio 2 e Alto 3 pontos: quanto mais risco, mais crítica a contratação.',
    citacao: 'art. 11, § 3º, VI',
    respostas: RESPOSTAS_GRAU,
    padrao: 'Nenhum'
  },
  {
    codigo: 'VII',
    pergunta: 'O valor estimado atinge o limite do inciso VII?',
    rotulo: 'Valor estimado no limite do inciso VII',
    ajuda: 'R$ 5 milhões em desenvolvimento, evolução, sustentação de sistemas e fábrica de software; '
      + 'R$ 10 milhões em contratações estruturantes; R$ 1 milhão nas demais contratações de TIC. '
      + 'Sim: a criticidade é Alta, seja qual for o resto.',
    citacao: 'art. 11, § 3º, VII',
    respostas: RESPOSTAS_SIM_NAO,
    padrao: 'Não'
  }
];

/** Chave = código do critério, valor = resposta (o mesmo objeto que vai no POST/PUT). */
export type RespostasCriticidade = Record<string, string>;

/** A resposta gravada no II é da pergunta anterior (Nenhum, Baixo, Médio ou Alto). */
export function ehRespostaAnteriorII(resposta: string | null | undefined): boolean {
  return !!resposta && (RESPOSTAS_GRAU as readonly string[]).includes(resposta);
}

/** A resposta à pergunta anterior do II, quando é ela que está gravada; senão, nulo. */
export function respostaAnteriorII(respostas: RespostasCriticidade | null | undefined): string | null {
  const resposta = respostas ? respostas['II'] : null;
  return ehRespostaAnteriorII(resposta) ? resposta! : null;
}

/** Todos os critérios na resposta padrão (Desconhecido no II; Não ou Nenhum nos demais). */
export function respostasPadrao(): RespostasCriticidade {
  const respostas: RespostasCriticidade = {};
  for (const c of CRITERIOS_CRITICIDADE) respostas[c.codigo] = c.padrao;
  return respostas;
}

/**
 * Respostas como vêm do servidor (podem faltar critérios) completadas com o padrão. A
 * resposta à pergunta anterior do II é mantida como veio: ela volta ao servidor até
 * alguém responder à pergunta nova.
 */
export function completarRespostas(respostas: RespostasCriticidade | null | undefined): RespostasCriticidade {
  const completas = respostasPadrao();
  for (const c of CRITERIOS_CRITICIDADE) {
    const resposta = respostas ? respostas[c.codigo] : undefined;
    if (!resposta) continue;
    if (c.respostas.includes(resposta) || (c.codigo === 'II' && ehRespostaAnteriorII(resposta))) {
      completas[c.codigo] = resposta;
    }
  }
  return completas;
}

/** Pontos de uma resposta (o VII não pontua: decide sozinho). */
export function pontosDoCriterio(codigo: string, resposta: string): number {
  switch (codigo) {
    case 'I':
      // Alinhado à EGD/DF é bom: o único critério que desconta
      return resposta === 'Sim' ? -1 : 0;
    case 'II':
      // Não, Desconhecido, sem resposta e a resposta à pergunta anterior valem o mesmo
      return resposta === 'Sim' ? 0 : 1;
    case 'III':
      return resposta === 'Sim' ? 0 : 1;
    case 'V':
      return resposta === 'Sim' ? 3 : 0;
    case 'IV':
    case 'VI': {
      // "Não foi possível avaliar" (só no IV) fica fora da escala: 0 ponto
      const grau = RESPOSTAS_GRAU.indexOf(resposta as typeof RESPOSTAS_GRAU[number]);
      return grau < 0 ? 0 : grau;
    }
    default:
      return 0;
  }
}

/** Uma linha da composição da soma. */
export interface ParcelaCriticidade {
  codigo: string;
  rotulo: string;
  /** A resposta considerada (a padrão quando o critério não foi respondido). */
  resposta: string;
  pontos: number;
}

/** Os pontos de cada critério, de I a VII, na ordem dos incisos (o VII com 0: decide sozinho). */
export function composicaoCriticidade(respostas: RespostasCriticidade): ParcelaCriticidade[] {
  return CRITERIOS_CRITICIDADE.map(c => {
    const resposta = respostas[c.codigo] || c.padrao;
    return { codigo: c.codigo, rotulo: c.rotulo, resposta, pontos: pontosDoCriterio(c.codigo, resposta) };
  });
}

/** Soma dos pontos, nunca negativa: o alinhamento à EGD só desconta o que os outros somaram. */
export function pontosCriticidade(respostas: RespostasCriticidade): number {
  return Math.max(0, composicaoCriticidade(respostas).reduce((total, p) => total + p.pontos, 0));
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
