// ============================================================================
// INTERFACE LEGADA (compatibilidade com Reports antigos)
// ============================================================================
export interface Atividade {
  NM_PROJETO: number,
  AtividadeId: number;
  categoria: string;
  descricao: string;
  situacao: number;
  titulo: string,
  data_fim: string,
}

export interface AtividadeForm {
  titulo: string;
  categoria: string;
  descricao: string;
  situacao: number;
  data_fim: string;
}

// ============================================================================
// NOVA ESTRUTURA (após refatoração - vinculado a Etapas)
// ============================================================================

export interface AtividadeCreateDTO {
  EtapaProjetoId: number;
  Titulo: string;
  Categoria?: string;
  Descricao?: string;
  DT_INICIO_PREVISTO: string;  // ISO 8601 format
  DT_TERMINO_PREVISTO: string; // ISO 8601 format
  RESPONSAVEL_ATIVIDADE?: string;
  Order?: number;
}

export interface AtividadeUpdateDTO {
  DT_INICIO_REAL?: string;
  DT_TERMINO_REAL?: string;
  Categoria?: string;
  Descricao?: string;
  RESPONSAVEL_ATIVIDADE?: string;
}

export interface AtividadeResponseDTO {
  AtividadeId: number;
  EtapaProjetoId: number;
  EtapaNome?: string;
  ProjetoId?: number;
  ProjetoNome?: string;
  Titulo: string;
  Categoria?: string;
  Descricao?: string;
  DT_INICIO_PREVISTO?: string;
  DT_TERMINO_PREVISTO?: string;
  DT_INICIO_REAL?: string;
  DT_TERMINO_REAL?: string;
  SITUACAO: SituacaoAtividade;
  RESPONSAVEL_ATIVIDADE?: string;
  PERCENT_PLANEJADO: number;
  DIAS_PREVISTOS: number;
  DIAS_EXECUTADOS?: number;
  Order: number;
  PESO_ATIVIDADE: number;
  PERCENT_EXECUTADO: number;
}

export type SituacaoAtividade =
  | 'Concluído'
  | 'Em Andamento'
  | 'Atrasado para Início'
  | 'Atrasado para Conclusão'
  | 'Não Iniciada';
