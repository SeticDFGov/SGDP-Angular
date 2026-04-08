import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/services/auth';
import { DemandaService } from '../demanda/service/demanda.service';
import { EtapaService } from '../projeto/etapa/etapa.service';
import { DemandaDetalhada, Entregavel, EntregavelUpdatePercentForm } from '../../api/demanda/interface';
import { UserProfile } from '../../api/auth/interface';

@Component({
  selector: 'app-centralit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './centralit.component.html',
  styleUrls: ['./centralit.component.css']
})
export class CentralITComponent implements OnInit {
  currentUser: UserProfile | null = null;
  demandas: DemandaDetalhada[] = [];
  loading = false;
  message = '';
  messageType = '';
  expandedDemandas: Set<number> = new Set();
  entregaveisByDemanda: { [demandaId: number]: Entregavel[] } = {};
  loadingEntregaveis: { [demandaId: number]: boolean } = {};

  percentOptions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  editState: { [id: number]: { percent: number; descricao: string } } = {};

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
    if (!this.currentUser?.Unidade?.Nome) return;

    const areaExecutoraNome = this.currentUser.Unidade.Nome;
    this.loadingEntregaveis[demandaId] = true;

    this.etapaService.getAllEtapas(demandaId).subscribe({
      next: (data) => {
        const filteredData = data.filter(e =>
          e.Responsavel?.Nome === areaExecutoraNome
        );
        this.entregaveisByDemanda[demandaId] = filteredData;
        filteredData.forEach(e => {
          this.editState[e.EtapaProjetoId] = {
            percent: e.PERCENT_EXECUTADO,
            descricao: e.Descricao ?? ''
          };
        });
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

  salvar(entregavel: Entregavel): void {
    const state = this.editState[entregavel.EtapaProjetoId];
    if (!state) return;

    const payload: EntregavelUpdatePercentForm = {
      PERCENT_EXECUTADO: state.percent,
      Descricao: state.descricao
    };

    this.etapaService.updatePercentual(entregavel.EtapaProjetoId, payload).subscribe({
      next: () => {
        entregavel.PERCENT_EXECUTADO = state.percent;
        entregavel.Descricao = state.descricao;
        this.showMessage('Salvo com sucesso!', 'success');
      },
      error: (err) => {
        this.showMessage('Erro ao salvar.', 'error');
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  showMessage(msg: string, type: string): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 3000);
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
