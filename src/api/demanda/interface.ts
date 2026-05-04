export interface AreaExecutora {
  AreaExecutoraId: number;
  Nome: string;
}

export interface AreaDemandante {
  AreaDemandanteID: number;
  NM_DEMANDANTE: string;
  NM_SIGLA: string;
}

export interface Esteira {
  EsteiraId: string;
  Nome: string;
}

export interface Entregavel {
  EtapaProjetoId: number;
  NM_ETAPA: string;
  Responsavel: AreaExecutora | null;
  PERCENT_EXECUTADO: number;
  TIPO_ENTREGA: string;
  DT_INICIO: string;
  DT_FIM: string;
  Descricao: string | null;
  SITUACAO: string;
  CriadoEm: string | null;
  CriadoPor: string | null;
  AlteradoEm: string | null;
  AlteradoPor: string | null;
  DemandaId?: number;
  DemandaNome?: string;
}

export interface DemandaDetalhada {
  demandaId: number;
  NM_PROJETO: string;
  NR_PROCESSO_SEI: string | null;
  AREA_DEMANDANTE: AreaDemandante | null;
  Esteira: Esteira | null;
  SITUACAO?: string;
  CriadoEm: string | null;
  CriadoPor: string | null;
  Entregaveis?: Entregavel[];
}

export interface DemandaForm {
  NM_PROJETO: string;
  NR_PROCESSO_SEI?: string;
  NM_AREA_DEMANDANTE: number;
  EsteiraId: string;
}

export interface EntregavelCreateForm {
  DemandaId: number;
  NM_ETAPA: string;
  AreaExecutoraId: number;
  TIPO_ENTREGA: string;
  DT_INICIO: string;
  DT_FIM: string;
  Descricao?: string;
}

export interface EntregavelUpdatePercentForm {
  PERCENT_EXECUTADO: number;
  Descricao?: string;
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
