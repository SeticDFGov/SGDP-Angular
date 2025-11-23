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
