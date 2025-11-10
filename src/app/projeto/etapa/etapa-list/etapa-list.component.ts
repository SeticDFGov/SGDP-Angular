import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EtapaService } from '../etapa.service';
import { Etapa } from '../etapa.model';
import { CommonModule } from '@angular/common';
import { EtapaFormComponent } from  '../etapa-form/etapa-form.component';
import { EtapaInicioFormComponent } from '../etapa-inicio-form/etapa-inicio-form.component';
import { EtapaDesempenhoFormComponent } from '../etapa-desempenho-form/etapa-desempenho-form.component';
import { KanbanBoardComponent } from '../kanban-board/kanban-board.component';
import { ExportManagerComponent } from '../export-manager/export-manager.component';

@Component({
  selector: 'app-etapa-list',
  standalone: true,
  imports: [
    CommonModule,
    EtapaFormComponent,
    EtapaInicioFormComponent,
    EtapaDesempenhoFormComponent,
    KanbanBoardComponent,
    ExportManagerComponent
  ],
  templateUrl: './etapa-list.component.html',
  styleUrls: ['./etapa-list.component.css']
})
export class EtapaListComponent implements OnInit {

  projetoId!: number;
  etapas: Etapa[] = [];
  loading = true;
  isModalOpen = false;
  showModalInicio = false;
  showDesempenho = false;
  etapaSelecionada: Etapa | null = null;
  mostrarTabela = true;

  constructor(
    private route: ActivatedRoute,
    private etapaService: EtapaService
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.projetoId = +idParam;
      this.loadEtapas();
    }
  }

  loadEtapas(): void {
    this.loading = true;
    this.etapaService.getAllEtapas(this.projetoId).subscribe(
      (data) => {
        this.etapas = data.sort((a, b) => a.order - b.order);
        this.loading = false;
      },
      (error) => {
        console.error('Erro ao carregar etapas:', error);
        this.loading = false;
      }
    );
  }

  handleToggleView(): void {
    this.mostrarTabela = !this.mostrarTabela;
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  handleCadastroEtapa(novaEtapa: Etapa): void {
    this.etapas = [...this.etapas, novaEtapa];
    this.isModalOpen = false;
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
      this.etapaService.iniciarEtapa(etapa.etapaProjetoId).subscribe(
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
}
