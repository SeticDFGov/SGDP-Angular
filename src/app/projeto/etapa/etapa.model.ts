export interface Etapa {
  etapaProjetoId: number;
  nmEtapa: string;
  dtInicioPrevisto: Date;
  dtTerminoPrevisto: Date;
  dtInicioReal: Date;
  dtTerminoReal: Date;
  situacao: string;
  percentPlanejado: number;
  percentExecEtapa: number;
  order: number;
  percentTotalEtapa: number;
  analise:string;
}
