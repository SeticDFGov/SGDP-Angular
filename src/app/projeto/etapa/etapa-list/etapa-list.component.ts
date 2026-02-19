import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EtapaService } from '../etapa.service';
import { Etapa, EtapaForm } from '../etapa.model';
import { CommonModule } from '@angular/common';
import { EtapaFormComponent } from '../etapa-form/etapa-form.component';
import { KanbanBoardComponent } from '../kanban-board/kanban-board.component';
import { ExportManagerComponent } from '../export-manager/export-manager.component';
import { EtapaAtividadesListComponent } from '../etapa-atividades-list/etapa-atividades-list.component';
import { GanttChartComponent } from '../gantt-chart/gantt-chart.component';
import { WbsChartComponent } from '../wbs-chart/wbs-chart.component';
import { AtividadeService } from '../../service/atividade.service';
import { AtividadeResponseDTO } from '../../../../api/atividade/interface';
import { AuthService } from '../../../auth/services/auth';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SERVICE_API_URL } from '../../../../api/consts';
import { ProjetoDetalhado } from '../../../../api/projeto/inteface';
@Component({
  selector: 'app-etapa-list',
  standalone: true,
  imports: [
    CommonModule,
    EtapaFormComponent,
    KanbanBoardComponent,
    ExportManagerComponent,
    EtapaAtividadesListComponent,
    GanttChartComponent,
    WbsChartComponent
  ],
  templateUrl: './etapa-list.component.html',
  styleUrls: ['./etapa-list.component.css']
})
export class EtapaListComponent implements OnInit {
  projetoName: ProjetoDetalhado | null = null;
  projetoId!: number;
  etapas: Etapa[] = [];
  atividades: AtividadeResponseDTO[] = [];
  loading = true;
  isModalOpen = false;
  expandedEtapas: Set<number> = new Set();
  visualizacao: 'lista' | 'kanban' | 'gantt' | 'wbs' = 'lista';

  // Observables de permissão
  canCreateEtapa$: Observable<boolean>;

  constructor(
    private route: ActivatedRoute,
    private etapaService: EtapaService,
    private atividadeService: AtividadeService,
    private authService: AuthService,
    private http: HttpClient
  ) {
    // Inicializa os observables de permissão
    this.canCreateEtapa$ = this.authService.canCreate('etapa');
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.projetoId = +idParam;
      this.loadEtapas();
      this.loadProjeto();
      this.loadAtividades();
    }
  }
  getProjeto(idProjeto: number): Observable<ProjetoDetalhado> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)
    return this.http.get<ProjetoDetalhado>(`${SERVICE_API_URL}/api/projeto/${idProjeto}`, { headers: headers })
      ;
  };

  loadProjeto(): void {
    this.loading = true;
    this.getProjeto(this.projetoId).subscribe(
      (data) => {
        this.projetoName = data;
        this.loading = false;
      }
    )
  }
  loadEtapas(): void {
    this.loading = true;
    this.etapaService.getAllEtapas(this.projetoId).subscribe(
      (data) => {
        this.etapas = data.sort((a, b) => a.Order - b.Order);
        this.loading = false;
      },
      (error) => {
        console.error('Erro ao carregar etapas:', error);
        this.loading = false;
      }
    );
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  loadAtividades(): void {
    this.atividadeService.listarPorProjeto(this.projetoId).subscribe({
      next: (data) => {
        this.atividades = data.sort((a, b) => a.Order - b.Order);
      },
      error: (error) => {
        console.error('Erro ao carregar atividades:', error);
      }
    });
  }

  handleCadastroEtapa(novaEtapa: EtapaForm): void {
    this.etapaService.cadastrarEtapa(novaEtapa).subscribe(
      {
        next: () => {
          this.loadEtapas();
          this.isModalOpen = false;
        },
        error: (err) => {
          console.log(`error ao cadastrar o entregável ${err}`);
        }
      }
    )
  }

  mudarVisualizacao(tipo: 'lista' | 'kanban' | 'gantt' | 'wbs'): void {
    this.visualizacao = tipo;
    if (tipo === 'gantt' || tipo === 'wbs') {
      this.loadAtividades(); // Recarregar atividades para garantir dados atualizados
    }
  }

  toggleEtapaAtividades(etapaId: number): void {
    if (this.expandedEtapas.has(etapaId)) {
      this.expandedEtapas.delete(etapaId);
    } else {
      this.expandedEtapas.add(etapaId);
    }
  }

  isEtapaExpanded(etapaId: number): boolean {
    return this.expandedEtapas.has(etapaId);
  }

  getCodigoEntregavel(index: number): string {
    return `1.${index + 1}`;
  }
}
