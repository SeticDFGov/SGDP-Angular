export interface Etapa {
  EtapaProjetoId: number;
  NM_PROJETO: string | null;
  NM_ETAPA: string;
  DT_INICIO_PREVISTO: string;
  DT_TERMINO_PREVISTO: string;
  DT_INICIO_REAL: string | null;
  DT_TERMINO_REAL: string | null;
  DIAS_PREVISTOS: number;
  Order: number;
  SITUACAO: string;
  RESPONSAVEL_ETAPA: string;
  ANALISE: string;
  PERCENT_TOTAL_ETAPA: number;
  PERCENT_EXEC_ETAPA: number | null;
  PERCENT_EXEC_REAL: number;
  PERCENT_PLANEJADO: number;
}

export interface EtapaForm {
  NM_PROJETO: number;
  NM_ETAPA: string;
  RESPONSAVEL_ETAPA: string;
}

// Response DTO matching backend structure
export interface EtapaResponseDTO {
  EtapaProjetoId: number;
  NM_ETAPA: string;
  RESPONSAVEL_ETAPA: string | null;
  ANALISE: string | null;
  SITUACAO: string | null;

  // Dates
  DT_INICIO_PREVISTO: string | null;
  DT_TERMINO_PREVISTO: string | null;
  DT_INICIO_REAL: string | null;
  DT_TERMINO_REAL: string | null;

  // Percentages
  PERCENT_TOTAL_ETAPA: number;
  PERCENT_EXEC_ETAPA: number;
  PERCENT_EXEC_REAL: number;
  PERCENT_PLANEJADO: number;

  // Others
  DIAS_PREVISTOS: number;
  Order: number;

  // Simplified project reference
  ProjetoId: number;
  ProjetoNome: string | null;
}

