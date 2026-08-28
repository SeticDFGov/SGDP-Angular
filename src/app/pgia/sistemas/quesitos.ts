/**
 * Quesitos da classificação de risco (arts. 15 a 17 do Decreto nº 48.901/2026).
 *
 * A tela do órgão exibe a lista em ordem fixa e embaralhada, sem títulos de grupo:
 * quem preenche não deve conseguir inferir o enquadramento de cada item.
 * As telas centrais (SGDI e CGTIC) reagrupam por artigo e mostram os pesos.
 */
export interface PgiaQuesitoTexto {
  artigo: 15 | 16 | 17;
  inciso: string;
  texto: string;
}

/** Ordem de apresentação no formulário do órgão (embaralhada de propósito). */
export const QUESITOS: PgiaQuesitoTexto[] = [
  { artigo: 16, inciso: 'VII', texto: 'Apoia decisões administrativas com efeitos jurídicos relevantes sobre direitos individuais' },
  { artigo: 17, inciso: 'II', texto: 'Produz ou distribui conteúdo informativo ou educativo para o público' },
  { artigo: 15, inciso: 'I', texto: 'Instiga ou induz comportamento que cause dano à saúde, à segurança ou a direitos fundamentais' },
  { artigo: 16, inciso: 'I', texto: 'Concede, revisa, suspende ou cancela benefícios sociais ou serviços essenciais' },
  { artigo: 17, inciso: 'III', texto: 'Faz recomendações a agentes públicos, sem decidir nada sozinho' },
  { artigo: 15, inciso: 'IV', texto: 'Faz identificação biométrica à distância, em tempo real, em espaço público, fora das exceções legais' },
  { artigo: 16, inciso: 'IV', texto: 'Apoia diagnóstico ou procedimento de saúde com risco relevante para as pessoas' },
  { artigo: 17, inciso: 'I', texto: 'Conversa com cidadãos por assistente virtual ou atendimento automatizado' },
  { artigo: 15, inciso: 'II', texto: 'Explora vulnerabilidades de pessoas ou grupos para induzir comportamento que cause dano' },
  { artigo: 16, inciso: 'V', texto: 'Opera infraestrutura crítica, como trânsito, água ou energia' },
  { artigo: 16, inciso: 'VIII', texto: 'Usa biometria para dar acesso a serviços públicos essenciais' },
  { artigo: 15, inciso: 'VI', texto: 'Prevê risco de infração com base em características pessoais ou comportamentais' },
  { artigo: 16, inciso: 'II', texto: 'Faz avaliações determinantes em seleções para ensino ou formação profissional' },
  { artigo: 17, inciso: 'IV', texto: 'Gera conteúdo sintético para a comunicação institucional' },
  { artigo: 15, inciso: 'III', texto: 'Pontua ou ranqueia pessoas pelo comportamento social ou pela personalidade, de forma ilegítima ou desproporcional' },
  { artigo: 16, inciso: 'VI', texto: 'Fiscaliza e autua pessoas físicas ou jurídicas de forma automatizada' },
  { artigo: 15, inciso: 'V', texto: 'Possibilita ou facilita material de abuso ou exploração sexual de crianças e adolescentes' },
  { artigo: 16, inciso: 'IX', texto: 'Faz análise preditiva de comportamentos para segurança pública ou assistência social' },
  { artigo: 16, inciso: 'III', texto: 'Apoia recrutamento, triagem, avaliação de desempenho, promoção ou desligamento de agentes públicos' }
];

/** Ordem canônica dos incisos, para ordenar o checklist enviado ao servidor. */
export const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

/** Texto do quesito a partir do artigo e do inciso gravados no checklist. */
export function textoDoQuesito(artigo: number, inciso: string): string {
  return QUESITOS.find(q => q.artigo === artigo && q.inciso === inciso)?.texto
    ?? `Art. ${artigo}, ${inciso}`;
}
