import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Etapa } from '../etapa.model';

interface GanttRow {
  id: string;
  code: string;
  name: string;
  start: Date;
  end: Date;
  status: string;
  left: number;
  width: number;
  percentExecutado: number;
  responsavel: string;
}

@Component({
  selector: 'app-gantt-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gantt-chart.component.html',
  styleUrls: ['./gantt-chart.component.css']
})
export class GanttChartComponent implements OnInit, OnChanges {
  @Input() etapas: Etapa[] = [];

  ganttRows: GanttRow[] = [];
  startDate: Date = new Date();
  endDate: Date = new Date();
  months: { name: string; days: number; left: number }[] = [];
  totalDays: number = 0;
  dayWidth: number = 30;

  ngOnInit(): void {
    this.processarDados();
  }

  ngOnChanges(): void {
    this.processarDados();
  }

  processarDados(): void {
    if (!this.etapas || this.etapas.length === 0) return;

    const datas = this.etapas.flatMap(e => [
      new Date(e.DT_INICIO),
      new Date(e.DT_FIM)
    ]).filter(d => !isNaN(d.getTime()));

    if (datas.length === 0) return;

    this.startDate = new Date(Math.min(...datas.map(d => d.getTime())));
    this.endDate = new Date(Math.max(...datas.map(d => d.getTime())));
    this.startDate.setDate(this.startDate.getDate() - 7);
    this.endDate.setDate(this.endDate.getDate() + 7);
    this.totalDays = Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));

    this.gerarMeses();

    this.ganttRows = this.etapas.map((etapa, idx) => {
      const start = new Date(etapa.DT_INICIO);
      const end = new Date(etapa.DT_FIM);
      const daysFromStart = Math.ceil((start.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const duration = Math.max(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)), 1);

      return {
        id: `etapa-${etapa.EtapaProjetoId}`,
        code: `1.${idx + 1}`,
        name: etapa.NM_ETAPA,
        start,
        end,
        status: etapa.SITUACAO,
        left: daysFromStart * this.dayWidth,
        width: Math.max(duration * this.dayWidth, 10),
        percentExecutado: etapa.PERCENT_EXECUTADO,
        responsavel: etapa.Responsavel?.Nome ?? '-'
      };
    });
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

  getStatusBarClass(status: string): string {
    const classes: Record<string, string> = {
      'Concluído': 'bg-green-500',
      'Em Andamento': 'bg-blue-500',
      'Atrasado': 'bg-red-500',
      'Não Iniciado': 'bg-gray-400'
    };
    return classes[status] ?? 'bg-gray-400';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  get chartWidth(): number {
    return this.totalDays * this.dayWidth;
  }
}
