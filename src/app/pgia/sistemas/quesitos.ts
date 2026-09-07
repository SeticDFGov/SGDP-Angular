/**
 * Quesitos da classificação de risco (arts. 15 a 17 do Decreto nº 48.901/2026).
 *
 * A tela do órgão exibe os quesitos em **três grupos rotulados** (Risco Excessivo,
 * Alto Risco, Risco Moderado) — ver `GRUPOS_QUESITOS`. O rótulo do grupo é a única
 * pista permitida: nenhum texto de consequência ("vedado", "passa pelo comitê",
 * prévia de risco) pode aparecer no momento do preenchimento.
 * As telas centrais (SGDI e CGTIC) mostram os mesmos grupos com os pesos.
 */
export interface PgiaQuesitoTexto {
  artigo: 15 | 16 | 17;
  inciso: string;
  texto: string;
}

/** Lista plana, na ordem em que foi cadastrada (a ordenação de tela vem dos grupos). */
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

export interface PgiaGrupoQuesitos {
  artigo: 15 | 16 | 17;
  /** Rótulo do grupo — permitido; texto de consequência, não. */
  rotulo: string;
  quesitos: PgiaQuesitoTexto[];
}

function doArtigo(artigo: 15 | 16 | 17): PgiaQuesitoTexto[] {
  return QUESITOS
    .filter(q => q.artigo === artigo)
    .sort((a, b) => ROMANOS.indexOf(a.inciso) - ROMANOS.indexOf(b.inciso));
}

/** Os três grupos do questionário, na ordem em que a tela os exibe. */
export const GRUPOS_QUESITOS: PgiaGrupoQuesitos[] = [
  // Sem "(art. N)" no rótulo de propósito: o chip de citação expandiria o
  // caput — e o do art. 15 diz "ficam vedados", consequência que não pode
  // aparecer no preenchimento (decisão do dono do produto)
  { artigo: 15, rotulo: 'Risco Excessivo', quesitos: doArtigo(15) },
  { artigo: 16, rotulo: 'Alto Risco', quesitos: doArtigo(16) },
  { artigo: 17, rotulo: 'Risco Moderado', quesitos: doArtigo(17) }
];

/** Texto do quesito a partir do artigo e do inciso gravados no checklist. */
export function textoDoQuesito(artigo: number, inciso: string): string {
  return QUESITOS.find(q => q.artigo === artigo && q.inciso === inciso)?.texto
    ?? `Art. ${artigo}, ${inciso}`;
}
