import { AreaExecutora } from '../../../api/area-executora/interface';

export interface Etapa {
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
}

export interface EtapaForm {
  DemandaId: number;
  NM_ETAPA: string;
  AreaExecutoraId: number;
  TIPO_ENTREGA: string;
  DT_INICIO: string;
  DT_FIM: string;
  Descricao?: string;
}
