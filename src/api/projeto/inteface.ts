export interface ProjetoInterfaceForm {
  NM_PROJETO: string;
  GERENTE_PROJETO: string;
  NR_PROCESSO_SEI: string;
  NM_AREA_DEMANDANTE: number;
  DT_INICIO:string;
  DT_TERMINO:string;
  ANO: string;
  TEMPLATE: string;
  PROFISCOII: boolean;
  PDTIC2427: boolean;
  PTD2427: boolean;
  valorEstimado: number;
  UnidadeId: string;
  EsteiraId: string;

}

export interface ProjetoDetalhado {
  projetoId: number;
  NM_PROJETO: string;
  GERENTE_PROJETO: string;
  SITUACAO: string;
  NR_PROCESSO_SEI: string;
  AREA_DEMANDANTE: AreaDemandante;
  ANO: string;
  TEMPLATE: string;
  PROFISCOII: boolean;
  PDTIC2427: boolean;
  PTD2427: boolean;
  valorEstimado: number;
  Unidade: Unidade;
  Esteira: Esteira;
}

export interface Esteira {
  EsteiraId: string;
  Nome: string;
}

export interface Unidade {
  id: string;
  Nome: string;
}

export interface AreaDemandante {
  AreaDemandanteID: number;
  NM_DEMANDANTE: string;
  NM_SIGLA: string;
}

// Pagination interfaces
export interface PagedResponse<T> {
  Items: T[];
  CurrentPage: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  HasPreviousPage: boolean;
  HasNextPage: boolean;
}

// Response DTOs matching backend structure
export interface ProjetoResponseDTO {
  ProjetoId: number;
  NM_PROJETO: string;
  GERENTE_PROJETO: string;
  SITUACAO: string;
  NR_PROCESSO_SEI: string;
  ANO: string;
  TEMPLATE: string;
  PROFISCOII: boolean;
  PDTIC2427: boolean;
  PTD2427: boolean;
  ValorEstimado: number;
  DT_INICIO: string;
  DT_TERMINO: string;

  // Simplified relationships
  UnidadeNome: string | null;
  UnidadeId: string | null;
  EsteiraNome: string | null;
  EsteiraId: string | null;
  AreaDemandanteNome: string | null;
  AreaDemandanteSigla: string | null;
  AreaDemandanteId: number | null;

  // Statistics
  TotalEtapas: number | null;
  EtapasConcluidas: number | null;
  PercentualConclusao: number | null;
}
