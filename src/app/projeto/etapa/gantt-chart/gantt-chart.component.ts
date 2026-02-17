import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AtividadeResponseDTO } from '../../../../api/atividade/interface';

interface GanttRow {
  id: string;
  code: string; // ID hierárquico: 1.1, 1.1.1, etc
  type: 'entregavel' | 'atividade';
  name: string;
  startPlanejado: Date;
  endPlanejado: Date;
  startReal?: Date;
  endReal?: Date;
  status: string;
  leftPlanejado: number;
  widthPlanejado: number;
  leftReal: number;
  widthReal: number;
  hasReal: boolean;
  peso?: number;
  percentExecutado?: number;
  level: number; // Nível de indentação (0 = entregável, 1 = atividade)
  parentId?: string; // ID do entregável pai (para atividades)
  expanded?: boolean; // Expandido ou colapsado (para entregáveis)
  children?: GanttRow[]; // Atividades filhas (para entregáveis)
}

@Component({
  selector: 'app-gantt-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gantt-chart.component.html',
  styleUrls: ['./gantt-chart.component.css']
})
export class GanttChartComponent implements OnInit, OnChanges {
  @Input() atividades: AtividadeResponseDTO[] = [];
  @Input() etapas: any[] = [];

  ganttRows: GanttRow[] = []; // Estrutura hierárquica
  flattenedRows: GanttRow[] = []; // Lista achatada para renderização
  startDate: Date = new Date();
  endDate: Date = new Date();
  months: { name: string, days: number, left: number }[] = [];
  totalDays: number = 0;
  dayWidth: number = 30; // pixels por dia

  ngOnInit(): void {
    this.processarDados();
  }

  ngOnChanges(): void {
    this.processarDados();
  }

  processarDados(): void {
    if (this.atividades.length === 0) return;

    // Encontrar data mínima e máxima
    const datas = this.atividades.map(a => [
      new Date(a.DT_INICIO_PREVISTO || new Date()),
      new Date(a.DT_TERMINO_PREVISTO || new Date())
    ]).flat();

    this.startDate = new Date(Math.min(...datas.map(d => d.getTime())));
    this.endDate = new Date(Math.max(...datas.map(d => d.getTime())));

    // Adicionar margem de 1 semana antes e depois
    this.startDate.setDate(this.startDate.getDate() - 7);
    this.endDate.setDate(this.endDate.getDate() + 7);

    this.totalDays = Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Gerar meses
    this.gerarMeses();

    // Agrupar atividades por entregável
    const atividadesPorEntregavel = new Map<string, AtividadeResponseDTO[]>();
    this.atividades.forEach(atividade => {
      const entregavelNome = atividade.EtapaNome || 'Sem Entregável';
      if (!atividadesPorEntregavel.has(entregavelNome)) {
        atividadesPorEntregavel.set(entregavelNome, []);
      }
      atividadesPorEntregavel.get(entregavelNome)!.push(atividade);
    });

    // Criar estrutura hierárquica
    this.ganttRows = [];
    let entregavelIndex = 1;

    atividadesPorEntregavel.forEach((atividades, entregavelNome) => {
      const entregavelCode = `1.${entregavelIndex}`;

      // Calcular datas do entregável baseado nas atividades
      const datasAtividades = atividades.map(a => ({
        inicioPlanejado: new Date(a.DT_INICIO_PREVISTO || new Date()),
        terminoPlanejado: new Date(a.DT_TERMINO_PREVISTO || new Date()),
        inicioReal: a.DT_INICIO_REAL ? new Date(a.DT_INICIO_REAL) : undefined,
        terminoReal: a.DT_TERMINO_REAL ? new Date(a.DT_TERMINO_REAL) : undefined
      }));

      // Data início planejado = mínima das atividades
      const entregavelInicioPlanejado = new Date(Math.min(...datasAtividades.map(d => d.inicioPlanejado.getTime())));
      // Data término planejado = máxima das atividades
      const entregavelTerminoPlanejado = new Date(Math.max(...datasAtividades.map(d => d.terminoPlanejado.getTime())));

      // Data início real = mínima das atividades que iniciaram (se alguma iniciou)
      const datasIniciaisReais = datasAtividades.filter(d => d.inicioReal).map(d => d.inicioReal!.getTime());
      const entregavelInicioReal = datasIniciaisReais.length > 0 ? new Date(Math.min(...datasIniciaisReais)) : undefined;

      // Data término real = máxima das atividades concluídas (se todas concluíram)
      const todasConcluidas = atividades.every(a => a.DT_TERMINO_REAL);
      const datasFinaisReais = datasAtividades.filter(d => d.terminoReal).map(d => d.terminoReal!.getTime());
      const entregavelTerminoReal = todasConcluidas && datasFinaisReais.length > 0
        ? new Date(Math.max(...datasFinaisReais))
        : undefined;

      // Calcular posicionamento das barras do entregável
      const daysFromStartPlanejado = Math.ceil((entregavelInicioPlanejado.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const durationPlanejado = Math.ceil((entregavelTerminoPlanejado.getTime() - entregavelInicioPlanejado.getTime()) / (1000 * 60 * 60 * 24));

      let daysFromStartReal = 0;
      let durationReal = 0;
      let hasReal = !!entregavelInicioReal;

      if (entregavelInicioReal) {
        const endReal = entregavelTerminoReal || new Date();
        daysFromStartReal = Math.ceil((entregavelInicioReal.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
        durationReal = Math.ceil((endReal.getTime() - entregavelInicioReal.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Criar atividades filhas
      const atividadesRows: GanttRow[] = atividades.map((atividade, idx) => {
        const startPlanejado = new Date(atividade.DT_INICIO_PREVISTO || new Date());
        const endPlanejado = new Date(atividade.DT_TERMINO_PREVISTO || new Date());
        const daysFromStartPlanejadoAtiv = Math.ceil((startPlanejado.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const durationPlanejadoAtiv = Math.ceil((endPlanejado.getTime() - startPlanejado.getTime()) / (1000 * 60 * 60 * 24));

        let startReal: Date | undefined;
        let endReal: Date | undefined;
        let daysFromStartRealAtiv = 0;
        let durationRealAtiv = 0;
        let hasRealAtiv = false;

        if (atividade.DT_INICIO_REAL) {
          hasRealAtiv = true;
          startReal = new Date(atividade.DT_INICIO_REAL);
          endReal = atividade.DT_TERMINO_REAL ? new Date(atividade.DT_TERMINO_REAL) : new Date();
          daysFromStartRealAtiv = Math.ceil((startReal.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
          durationRealAtiv = Math.ceil((endReal.getTime() - startReal.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          id: `atividade-${atividade.AtividadeId}`,
          code: `${entregavelCode}.${idx + 1}`,
          type: 'atividade' as const,
          name: atividade.Titulo,
          startPlanejado,
          endPlanejado,
          startReal,
          endReal,
          status: atividade.SITUACAO,
          leftPlanejado: daysFromStartPlanejadoAtiv * this.dayWidth,
          widthPlanejado: Math.max(durationPlanejadoAtiv * this.dayWidth, 10),
          leftReal: daysFromStartRealAtiv * this.dayWidth,
          widthReal: Math.max(durationRealAtiv * this.dayWidth, 10),
          hasReal: hasRealAtiv,
          peso: (atividade as any).PESO_ATIVIDADE || 0,
          percentExecutado: (atividade as any).PERCENT_EXECUTADO || 0,
          level: 1,
          parentId: `entregavel-${entregavelIndex}`
        };
      });

      // Criar linha do entregável
      const entregavelRow: GanttRow = {
        id: `entregavel-${entregavelIndex}`,
        code: entregavelCode,
        type: 'entregavel',
        name: entregavelNome,
        startPlanejado: entregavelInicioPlanejado,
        endPlanejado: entregavelTerminoPlanejado,
        startReal: entregavelInicioReal,
        endReal: entregavelTerminoReal,
        status: todasConcluidas ? 'Concluído' : (hasReal ? 'Em Andamento' : 'Não Iniciada'),
        leftPlanejado: daysFromStartPlanejado * this.dayWidth,
        widthPlanejado: Math.max(durationPlanejado * this.dayWidth, 10),
        leftReal: daysFromStartReal * this.dayWidth,
        widthReal: Math.max(durationReal * this.dayWidth, 10),
        hasReal,
        level: 0,
        expanded: true, // Expandido por padrão
        children: atividadesRows
      };

      this.ganttRows.push(entregavelRow);
      entregavelIndex++;
    });

    // Achatar a estrutura para renderização
    this.flattenRows();
  }

  gerarMeses(): void {
    this.months = [];
    const current = new Date(this.startDate);
    let totalDaysProcessed = 0;

    while (current <= this.endDate) {
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const daysToShow = Math.min(daysInMonth - current.getDate() + 1, this.totalDays - totalDaysProcessed);

      this.months.push({
        name: current.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        days: daysToShow,
        left: totalDaysProcessed * this.dayWidth
      });

      totalDaysProcessed += daysToShow;
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }
  }

  flattenRows(): void {
    this.flattenedRows = [];
    this.ganttRows.forEach(row => {
      this.flattenedRows.push(row);
      if (row.expanded && row.children) {
        this.flattenedRows.push(...row.children);
      }
    });
  }

  toggleRow(row: GanttRow): void {
    if (row.type === 'entregavel') {
      row.expanded = !row.expanded;
      this.flattenRows();
    }
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Concluído': 'bg-green-500',
      'Em Andamento': 'bg-blue-500',
      'Atrasado para Início': 'bg-red-500',
      'Atrasado para Conclusão': 'bg-orange-500',
      'Não Iniciada': 'bg-gray-400'
    };
    return colors[status] || 'bg-gray-400';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  get chartWidth(): number {
    return this.totalDays * this.dayWidth;
  }
}
