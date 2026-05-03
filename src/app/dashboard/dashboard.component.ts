import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GanttChartComponent } from '../projeto/etapa/gantt-chart/gantt-chart.component';
import { DashboardService } from './dashboard.service';
import { DemandaDetalhada, Entregavel } from '../../api/demanda/interface';
import { Etapa } from '../projeto/etapa/etapa.model';

interface StatItem {
  name: string;
  count: number;
}

interface SituacaoStat extends StatItem {
  colorClass: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, GanttChartComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  demandas: DemandaDetalhada[] = [];
  loading = false;

  filtroSituacaoDemanda: string | null = null;
  filtroDemandante: string | null = null;
  filtroEsteira: string | null = null;
  filtroSituacaoEntregavel: string | null = null;
  filtroAreaExecutora: string | null = null;
  selectedDemandaId: number | null = null;

  readonly SITUACOES = ['Não Iniciado', 'Em Andamento', 'Atrasado', 'Concluído'];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loading = true;
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.demandas = data.map(d => ({
          ...d,
          Entregaveis: (d.Entregaveis ?? []).map(e => ({
            ...e,
            DemandaId: d.demandaId,
            DemandaNome: d.NM_PROJETO
          }))
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private matchesEntregavelFilter(e: Entregavel): boolean {
    if (this.filtroSituacaoEntregavel && e.SITUACAO !== this.filtroSituacaoEntregavel) return false;
    if (this.filtroAreaExecutora && e.Responsavel?.Nome !== this.filtroAreaExecutora) return false;
    return true;
  }

  get filteredDemandas(): DemandaDetalhada[] {
    return this.demandas.filter(d => {
      if (this.filtroSituacaoDemanda && d.SITUACAO !== this.filtroSituacaoDemanda) return false;
      if (this.filtroDemandante && d.AREA_DEMANDANTE?.NM_SIGLA !== this.filtroDemandante) return false;
      if (this.filtroEsteira && d.Esteira?.Nome !== this.filtroEsteira) return false;
      if (this.filtroSituacaoEntregavel || this.filtroAreaExecutora) {
        return (d.Entregaveis ?? []).some(e => this.matchesEntregavelFilter(e));
      }
      return true;
    });
  }

  get filteredEntregaveis(): Entregavel[] {
    return this.filteredDemandas
      .flatMap(d => (d.Entregaveis ?? []).filter(e => this.matchesEntregavelFilter(e)))
      .sort((a, b) => new Date(a.DT_INICIO).getTime() - new Date(b.DT_INICIO).getTime());
  }

  get totalAtrasadoDemanda(): number {
    return this.filteredDemandas.filter(d => d.SITUACAO === 'Atrasado').length;
  }

  get totalConcluidoDemanda(): number {
    return this.filteredDemandas.filter(d => d.SITUACAO === 'Concluído').length;
  }

  get situacaoDemandaStats(): SituacaoStat[] {
    return this.SITUACOES.map(s => ({
      name: s,
      count: this.filteredDemandas.filter(d => d.SITUACAO === s).length,
      colorClass: this.getSituacaoCardClass(s)
    }));
  }

  get demandanteStats(): StatItem[] {
    const map = new Map<string, number>();
    for (const d of this.filteredDemandas) {
      if (d.AREA_DEMANDANTE) {
        const key = d.AREA_DEMANDANTE.NM_SIGLA || d.AREA_DEMANDANTE.NM_DEMANDANTE;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }

  get esteiraStats(): StatItem[] {
    const map = new Map<string, number>();
    for (const d of this.filteredDemandas) {
      if (d.Esteira) map.set(d.Esteira.Nome, (map.get(d.Esteira.Nome) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }

  get situacaoEntregavelStats(): SituacaoStat[] {
    return this.SITUACOES.map(s => ({
      name: s,
      count: this.filteredEntregaveis.filter(e => e.SITUACAO === s).length,
      colorClass: this.getSituacaoCardClass(s)
    }));
  }

  get areaExecutoraStats(): StatItem[] {
    const map = new Map<string, number>();
    for (const e of this.filteredEntregaveis) {
      if (e.Responsavel) map.set(e.Responsavel.Nome, (map.get(e.Responsavel.Nome) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }

  get maxDemandanteCount(): number {
    const c = this.demandanteStats.map(s => s.count);
    return c.length ? Math.max(...c) : 1;
  }

  get maxEsteiraCount(): number {
    const c = this.esteiraStats.map(s => s.count);
    return c.length ? Math.max(...c) : 1;
  }

  get maxAreaExecutoraCount(): number {
    const c = this.areaExecutoraStats.map(s => s.count);
    return c.length ? Math.max(...c) : 1;
  }

  get hasActiveFilters(): boolean {
    return !!(this.filtroSituacaoDemanda || this.filtroDemandante || this.filtroEsteira ||
      this.filtroSituacaoEntregavel || this.filtroAreaExecutora);
  }

  get ganttEtapas(): Etapa[] {
    if (this.selectedDemandaId === null) return [];
    const demanda = this.demandas.find(d => d.demandaId === this.selectedDemandaId);
    return (demanda?.Entregaveis ?? []) as unknown as Etapa[];
  }

  get selectedDemandaNome(): string {
    if (this.selectedDemandaId === null) return '';
    return this.demandas.find(d => d.demandaId === this.selectedDemandaId)?.NM_PROJETO ?? '';
  }

  toggleFiltroSituacaoDemanda(s: string): void {
    this.filtroSituacaoDemanda = this.filtroSituacaoDemanda === s ? null : s;
    this.selectedDemandaId = null;
  }

  toggleFiltroDemandante(sigla: string): void {
    this.filtroDemandante = this.filtroDemandante === sigla ? null : sigla;
    this.selectedDemandaId = null;
  }

  toggleFiltroEsteira(nome: string): void {
    this.filtroEsteira = this.filtroEsteira === nome ? null : nome;
    this.selectedDemandaId = null;
  }

  toggleFiltroSituacaoEntregavel(s: string): void {
    this.filtroSituacaoEntregavel = this.filtroSituacaoEntregavel === s ? null : s;
    this.selectedDemandaId = null;
  }

  toggleFiltroAreaExecutora(nome: string): void {
    this.filtroAreaExecutora = this.filtroAreaExecutora === nome ? null : nome;
    this.selectedDemandaId = null;
  }

  limparFiltros(): void {
    this.filtroSituacaoDemanda = null;
    this.filtroDemandante = null;
    this.filtroEsteira = null;
    this.filtroSituacaoEntregavel = null;
    this.filtroAreaExecutora = null;
    this.selectedDemandaId = null;
  }

  selectEntregavel(demandaId: number): void {
    this.selectedDemandaId = this.selectedDemandaId === demandaId ? null : demandaId;
  }

  getSituacaoCardClass(situacao: string): string {
    const map: Record<string, string> = {
      'Concluído': 'bg-green-50 text-green-800 border-green-200',
      'Em Andamento': 'bg-blue-50 text-blue-800 border-blue-200',
      'Atrasado': 'bg-red-50 text-red-800 border-red-200',
      'Não Iniciado': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return map[situacao] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  }

  getSituacaoBadgeClass(situacao: string): string {
    const map: Record<string, string> = {
      'Concluído': 'bg-green-100 text-green-700',
      'Em Andamento': 'bg-blue-100 text-blue-700',
      'Atrasado': 'bg-red-100 text-red-700',
      'Não Iniciado': 'bg-gray-100 text-gray-600'
    };
    return map[situacao] ?? 'bg-gray-100 text-gray-600';
  }

  formatDate(d: string): string {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR');
  }
}
