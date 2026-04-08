import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/services/auth';
import { DemandaService } from '../demanda/service/demanda.service';
import { EtapaService } from '../projeto/etapa/etapa.service';
import { DemandaDetalhada, Entregavel } from '../../api/demanda/interface';
import { UserProfile } from '../../api/auth/interface';

@Component({
  selector: 'app-parceiro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parceiro.component.html',
  styleUrls: ['./parceiro.component.css']
})
export class ParceiroComponent implements OnInit {
  currentUser: UserProfile | null = null;
  demandas: DemandaDetalhada[] = [];
  loading = false;
  expandedDemandas: Set<number> = new Set();
  entregaveisByDemanda: { [demandaId: number]: Entregavel[] } = {};
  loadingEntregaveis: { [demandaId: number]: boolean } = {};

  constructor(
    private authService: AuthService,
    private demandaService: DemandaService,
    private etapaService: EtapaService
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.currentUser = user;
      this.loadDemandas();
    });
  }

  loadDemandas(): void {
    this.loading = true;
    this.demandaService.getDemandas().subscribe({
      next: (response) => {
        this.demandas = response.Items;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
      }
    });
  }

  toggleDemanda(demandaId: number): void {
    if (this.expandedDemandas.has(demandaId)) {
      this.expandedDemandas.delete(demandaId);
    } else {
      this.expandedDemandas.add(demandaId);
      if (!this.entregaveisByDemanda[demandaId]) {
        this.loadEntregaveis(demandaId);
      }
    }
  }

  loadEntregaveis(demandaId: number): void {
    this.loadingEntregaveis[demandaId] = true;
    this.etapaService.getAllEtapas(demandaId).subscribe({
      next: (data) => {
        this.entregaveisByDemanda[demandaId] = data;
        this.loadingEntregaveis[demandaId] = false;
      },
      error: (err) => {
        this.loadingEntregaveis[demandaId] = false;
      }
    });
  }

  isExpanded(demandaId: number): boolean {
    return this.expandedDemandas.has(demandaId);
  }

  logout(): void {
    this.authService.logout();
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  getSituacaoClass(situacao: string): string {
    const classes: Record<string, string> = {
      'Concluído': 'bg-green-100 text-green-700',
      'Em Andamento': 'bg-blue-100 text-blue-700',
      'Atrasado': 'bg-red-100 text-red-700',
      'Não Iniciado': 'bg-gray-100 text-gray-600'
    };
    return classes[situacao] ?? 'bg-gray-100 text-gray-600';
  }
}
