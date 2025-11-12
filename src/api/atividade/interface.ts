export interface Atividade {
  AtividadeId: number;
  categoria: string;
  descricao: string;
  situacao: number;
  // Add other properties as needed from the backend API
}

export interface AtividadeForm {
  categoria: string;
  descricao: string;
  situacao: number;
  reportId: number; // When creating a new activity, it needs to be linked to a report
}
