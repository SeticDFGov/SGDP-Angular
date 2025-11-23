import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AtividadeService } from '../../service/atividade.service';
import { ReportService } from '../../service/report.service';
import { Atividade, AtividadeForm } from '../../../../api/atividade/interface';
import { Report, ReportForm } from '../../../../api/report/interface';
import { Subject, takeUntil } from 'rxjs';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'; // Import FormsModule for ngModel

import { AtividadeCardComponent } from '../../atividade/atividade-card/atividade-card.component';
import { AtividadeModalComponent } from '../../atividade/atividade-modal/atividade-modal.component';

enum ReportStatus {
  VERIFICANDO = 'VERIFICANDO',
  AUSENTE = 'AUSENTE',
  EXISTENTE = 'EXISTENTE',
  CRIANDO = 'CRIANDO'
}

const STATUS = { PROXIMO: 2, ANDAMENTO: 1, CONCLUIDO: 3, FAZER: 4 };

interface KanbanColumn {
  id: string;
  name: string;
  atividades: Atividade[];
  statusValue: number; // To map column to activity status
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, ReactiveFormsModule, AtividadeCardComponent, AtividadeModalComponent],
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.css']
})
export class KanbanBoardComponent implements OnDestroy {
  @Input() projetoId!: number;

  reportStatus: ReportStatus = ReportStatus.VERIFICANDO;
  reportId: number | null = null;
  loadingAtividades = true;

  atividades: Atividade[] = [];
  isModalOpen = false;
  editingAtividade: Atividade | null = null;

  columns: KanbanColumn[] = [
    { id: 'proximo', name: 'Próximo', atividades: [], statusValue: STATUS.PROXIMO },
    { id: 'a-fazer', name: 'A fazer', atividades: [], statusValue: STATUS.FAZER },
    { id: 'em-andamento', name: 'Em Andamento', atividades: [], statusValue: STATUS.ANDAMENTO },
    { id: 'concluido', name: 'Concluído', atividades: [], statusValue: STATUS.CONCLUIDO }
  ];
  reportForm = new FormGroup({
    descricao: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    fase: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    data_fim: new FormControl<string>(new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  private destroy$ = new Subject<void>();

  constructor(
    private atividadeService: AtividadeService,
    private reportService: ReportService
  ) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  loadAtividades(): void {
    if (!this.reportId) {
      this.loadingAtividades = false;
      return;
    }
    this.loadingAtividades = true;
    this.atividadeService.getAtividadesByReportId(this.reportId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.atividades = data;
          this.updateColumns();
          this.loadingAtividades = false;
        },
        error: (err) => {
          console.error('Falha ao buscar atividades:', err);
          this.loadingAtividades = false;
        }
      });
  }

  updateColumns(): void {
    this.columns.forEach(col => col.atividades = []); // Clear existing activities
    this.atividades.forEach(atividade => {
      const column = this.columns.find(c => c.statusValue === atividade.situacao);
      if (column) {
        column.atividades.push(atividade);
      }
    });
  }

  handleCreateReport(): void {
    this.reportStatus = ReportStatus.CRIANDO;
    const payload = {
      ...this.reportForm.getRawValue(),
      NM_PROJETO: this.projetoId
    }

    this.reportService.createReport(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newReport) => {
          this.reportId = newReport.ReportId;
          this.loadAtividades();
        },
        error: (err) => {
          console.error('Falha ao criar o report:', err);
        }
      });
  }
  drop(event: CdkDragDrop<Atividade[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const atividade = event.previousContainer.data[event.previousIndex];
      const newColumnId = event.container.id;
      const newStatus = this.columns.find(col => col.id === newColumnId)?.statusValue;

      if (atividade && newStatus !== undefined) {
        const updatedAtividade: Atividade = { ...atividade, situacao: newStatus };

        this.atividadeService.updateAtividade(atividade.AtividadeId, updatedAtividade)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex
              );
              this.loadAtividades(); // Re-fetch to ensure consistency
            },
            error: (err) => {
              console.error('Falha ao atualizar situação da atividade:', err);
              // Optionally, revert UI changes here if API fails
            }
          });
      }
    }
  }

  handleDelete(atividadeId: number): void {
    if (window.confirm('Tem a certeza que quer apagar esta atividade?')) {
      this.atividadeService.deleteAtividade(atividadeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadAtividades();
          },
          error: (err) => {
            console.error('Falha ao apagar atividade:', err);
          }
        });
    }
  }

  handleOpenModal(atividade: Atividade | null = null): void {
    this.editingAtividade = atividade;
    this.isModalOpen = true;
  }

  handleCloseModal(): void {
    this.isModalOpen = false;
    this.editingAtividade = null;
  }

  handleSaveAtividade(atividadeData: AtividadeForm): void {
    if (!this.reportId) {
      console.error('Report ID is not available. Cannot save activity.');
      return;
    }

    const atividadeToSave: AtividadeForm = { ...atividadeData };

    if (this.editingAtividade) { // Update
      const updatedAtividade: Atividade = { ...atividadeToSave, AtividadeId: this.editingAtividade.AtividadeId };
      this.atividadeService.updateAtividade(this.editingAtividade.AtividadeId, updatedAtividade)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.handleCloseModal();
            this.loadAtividades();
          },
          error: (err) => {
            console.error('Falha ao atualizar atividade:', err);
          }
        });
    } else { // Create
      this.atividadeService.createAtividade(atividadeToSave, this.reportId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.handleCloseModal();
            this.loadAtividades();
          },
          error: (err) => {
            console.error('Falha ao criar atividade:', err);
          }
        });
    }
  }

  get ReportStatus() {
    return ReportStatus;
  }
}
