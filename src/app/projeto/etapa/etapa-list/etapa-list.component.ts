import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EtapaService } from '../etapa.service';
import { Etapa, EtapaForm } from '../etapa.model';
import { CommonModule } from '@angular/common';
import { EtapaFormComponent } from '../etapa-form/etapa-form.component';
import { EtapaInicioFormComponent } from '../etapa-inicio-form/etapa-inicio-form.component';
import { EtapaDesempenhoFormComponent } from '../etapa-desempenho-form/etapa-desempenho-form.component';
import { KanbanBoardComponent } from '../kanban-board/kanban-board.component';
import { ExportManagerComponent } from '../export-manager/export-manager.component';
import { EtapaAtividadesListComponent } from '../etapa-atividades-list/etapa-atividades-list.component';
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
    EtapaInicioFormComponent,
    EtapaDesempenhoFormComponent,
    KanbanBoardComponent,
    ExportManagerComponent,
    EtapaAtividadesListComponent
  ],
  templateUrl: './etapa-list.component.html',
  styleUrls: ['./etapa-list.component.css']
})
export class EtapaListComponent implements OnInit {
  projetoName: ProjetoDetalhado | null = null;
  projetoId!: number;
  etapas: Etapa[] = [];
  loading = true;
  isModalOpen = false;
  showModalInicio = false;
  showDesempenho = false;
  etapaSelecionada: Etapa | null = null;
  mostrarTabela = true;
  expandedEtapas: Set<number> = new Set();

  constructor(
    private route: ActivatedRoute,
    private etapaService: EtapaService,
    private authService: AuthService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.projetoId = +idParam;
      this.loadEtapas();
      this.loadProjeto()
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

  handleToggleView(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.mostrarTabela = !this.mostrarTabela;
    this.isModalOpen = false;
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  handleCadastroEtapa(novaEtapa: EtapaForm): void {
    this.etapaService.cadastrarEtapa(novaEtapa).subscribe(
      {
        next: () => {
          this.loadEtapas();
          this.isModalOpen = false;
        },
        error: (err) => {
          console.log(`error ao cadastrar a etapa ${err}`);
        }
      }
    )

  }

  openInicioEtapaModal(etapa: Etapa): void {
    this.etapaSelecionada = etapa;
    this.showModalInicio = true;
  }

  handleEtapaIniciada(): void {
    this.loadEtapas();
    this.showModalInicio = false;
  }

  openDesempenhoModal(etapa: Etapa): void {
    this.etapaSelecionada = etapa;
    this.showDesempenho = true;
  }

  handleEtapaAtualizada(): void {
    this.loadEtapas();
    this.showDesempenho = false;
  }

  iniciarEtapa(etapa: Etapa): void {
    if (confirm('Deseja realmente iniciar esta etapa?')) {
      this.etapaService.iniciarEtapa(etapa.EtapaProjetoId, '').subscribe(
        () => {
          this.loadEtapas();
        },
        (error) => {
          console.error('Erro ao iniciar etapa:', error);
          alert('Erro ao iniciar etapa.');
        }
      );
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
}
