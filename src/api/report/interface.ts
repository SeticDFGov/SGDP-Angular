export interface Report {
  ReportId: number;
  NM_PROJETO: number; // Corresponds to projetoId
  descricao: string;
  fase: string;
  data_fim: string; // ISO string date
}

export interface ReportForm {
  NM_PROJETO: number;
  descricao: string;
  fase: string;
  data_fim: string;
}
