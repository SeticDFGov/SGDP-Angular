import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EtapaService } from '../etapa.service';
import { Etapa, EtapaForm } from '../etapa.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EtapaFormComponent } from '../etapa-form/etapa-form.component';
import { GanttChartComponent } from '../gantt-chart/gantt-chart.component';
import { AuthService } from '../../../auth/services/auth';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SERVICE_API_URL } from '../../../../api/consts';
import { DemandaDetalhada, EntregavelUpdatePercentForm } from '../../../../api/demanda/interface';
import { DemandaService } from '../../../demanda/service/demanda.service';

@Component({
  selector: 'app-etapa-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EtapaFormComponent,
    GanttChartComponent
  ],
  templateUrl: './etapa-list.component.html',
  styleUrls: ['./etapa-list.component.css']
})
export class EtapaListComponent implements OnInit {
  demanda: DemandaDetalhada | null = null;
  demandaId!: number;
  etapas: Etapa[] = [];
  loading = true;
  isModalOpen = false;
  visualizacao: 'lista' | 'gantt' = 'lista';

  editState: { [key: number]: { percentual: number; observacao: string } } = {};
  percentOptions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  isGestor = false;
  message: string | null = null;
  messageType: 'success' | 'error' = 'success';

  canCreateEtapa$: Observable<boolean>;

  constructor(
    private route: ActivatedRoute,
    private etapaService: EtapaService,
    private demandaService: DemandaService,
    private authService: AuthService
  ) {
    this.canCreateEtapa$ = this.authService.canCreate('etapa');
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.demandaId = +idParam;
      this.loadDemanda();
      this.loadEtapas();
      this.checkIfGestor();
    }
  }

  checkIfGestor(): void {
    this.authService.getPerfil().subscribe({
      next: (perfil) => {
        this.isGestor = perfil === 'gestor' || perfil === 'admin';
      },
    });
  }

  loadDemanda(): void {
    this.demandaService.getDemandaById(this.demandaId).subscribe({
      next: (data) => { this.demanda = data; },
    });
  }

  loadEtapas(): void {
    this.loading = true;
    this.etapaService.getAllEtapas(this.demandaId).subscribe({
      next: (data) => {
        this.etapas = data;
        // Inicializar o estado de edição para cada entregável
        this.etapas.forEach(e => {
          this.editState[e.EtapaProjetoId] = {
            percentual: e.PERCENT_EXECUTADO ?? 0,
            observacao: e.Descricao ?? ''
          };
        });
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
      }
    });
  }

  openModal(): void { this.isModalOpen = true; }

  handleCadastroEtapa(novaEtapa: EtapaForm): void {
    this.etapaService.cadastrarEtapa(novaEtapa).subscribe({
      next: () => {
        this.loadEtapas();
        this.isModalOpen = false;
      },
      error: (err) => {
      }
    });
  }

  mudarVisualizacao(tipo: 'lista' | 'gantt'): void {
    this.visualizacao = tipo;
  }

  getCodigoEntregavel(index: number): string {
    return `1.${index + 1}`;
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  getSituacaoClass(situacao: string): string {
    const classes: Record<string, string> = {
      'Concluído': 'bg-green-100 text-green-700 border-green-200',
      'Em Andamento': 'bg-blue-100 text-blue-700 border-blue-200',
      'Atrasado': 'bg-red-100 text-red-700 border-red-200',
      'Não Iniciado': 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return classes[situacao] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  }

  deleteEntregavel(id: number): void {
    if (!confirm('Deseja remover este entregável?')) return;
    this.etapaService.deleteEntregavel(id).subscribe({
      next: () => this.loadEtapas(),
    });
  }

  salvarAtualizacao(etapaId: number): void {
    const state = this.editState[etapaId];
    const updateData: EntregavelUpdatePercentForm = {
      PERCENT_EXECUTADO: state.percentual,
      Descricao: state.observacao
    };

    this.etapaService.updatePercentual(etapaId, updateData).subscribe({
      next: () => {
        this.showMessage('Entregável atualizado com sucesso!', 'success');
        this.loadEtapas();
      },
      error: (err) => {
        this.showMessage('Erro ao atualizar entregável.', 'error');
      }
    });
  }

  showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
