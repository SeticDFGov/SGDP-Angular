import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AtividadeService } from '../../service/atividade.service';
import { ReportService } from '../../service/report.service';
import { Atividade, AtividadeForm, AtividadeResponseDTO } from '../../../../api/atividade/interface';
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

enum KanbanColumnType {
  PROXIMO = 'proximo',       // Sem data prevista e sem data real
  A_FAZER = 'a-fazer',       // Com data prevista, sem data real de início
  EM_ANDAMENTO = 'em-andamento', // Com data prevista e início real, sem término real
  CONCLUIDO = 'concluido'    // Com data prevista, início real e término real
}

interface KanbanColumn {
  id: KanbanColumnType;
  name: string;
  atividades: AtividadeResponseDTO[];
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, ReactiveFormsModule, FormsModule, AtividadeCardComponent, AtividadeModalComponent],
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.css']
})
export class KanbanBoardComponent implements OnDestroy, OnInit {
  @Input() projetoId!: number;

  reportStatus: ReportStatus = ReportStatus.VERIFICANDO;
  reportId: number | null = null;
  loadingAtividades = true;

  atividades: AtividadeResponseDTO[] = [];
  isModalOpen = false;
  editingAtividade: Atividade | null = null;

  // Modal de edição de datas ao mover cards
  isDateModalOpen = false;
  movingAtividade: AtividadeResponseDTO | null = null;
  targetColumn: KanbanColumnType | null = null;
  dateForm = new FormGroup({
    dataInicioPrevisto: new FormControl<string>(''),
    dataTerminoPrevisto: new FormControl<string>(''),
    dataInicioReal: new FormControl<string>(''),
    dataTerminoReal: new FormControl<string>('')
  });

  columns: KanbanColumn[] = [
    { id: KanbanColumnType.PROXIMO, name: 'Próximo', atividades: [] },
    { id: KanbanColumnType.A_FAZER, name: 'A Fazer', atividades: [] },
    { id: KanbanColumnType.EM_ANDAMENTO, name: 'Em Andamento', atividades: [] },
    { id: KanbanColumnType.CONCLUIDO, name: 'Concluído', atividades: [] }
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
  ngOnInit(): void {
    this.loadAtividades();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  loadAtividades(): void {
    this.loadingAtividades = true;
    this.atividadeService.listarPorProjeto(this.projetoId)
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
      const columnType = this.getColumnTypeByDates(atividade);
      const column = this.columns.find(c => c.id === columnType);
      if (column) {
        column.atividades.push(atividade);
      }
    });
  }

  /**
   * Determina a coluna baseado nas datas da atividade
   * - Próximo: SEM data prevista e SEM data real
   * - A Fazer: COM data prevista MAS SEM data real de início
   * - Em Andamento: COM data prevista E COM data real de início MAS SEM data real de término
   * - Concluído: COM todas as datas preenchidas
   */
  getColumnTypeByDates(atividade: AtividadeResponseDTO): KanbanColumnType {
    const temDataPrevista = !!atividade.DT_INICIO_PREVISTO && !!atividade.DT_TERMINO_PREVISTO;
    const temInicioReal = !!atividade.DT_INICIO_REAL;
    const temTerminoReal = !!atividade.DT_TERMINO_REAL;

    // Concluído: tem todas as datas
    if (temDataPrevista && temInicioReal && temTerminoReal) {
      return KanbanColumnType.CONCLUIDO;
    }

    // Em Andamento: tem data prevista e início real, mas não término
    if (temDataPrevista && temInicioReal && !temTerminoReal) {
      return KanbanColumnType.EM_ANDAMENTO;
    }

    // A Fazer: tem data prevista mas não iniciou
    if (temDataPrevista && !temInicioReal) {
      return KanbanColumnType.A_FAZER;
    }

    // Próximo: não tem datas previstas
    return KanbanColumnType.PROXIMO;
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
  drop(event: CdkDragDrop<AtividadeResponseDTO[]>): void {
    if (event.previousContainer === event.container) {
      // Movendo dentro da mesma coluna - apenas reordena
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Movendo para coluna diferente - abre modal para informar datas
      const atividade = event.previousContainer.data[event.previousIndex];
      const newColumnId = event.container.id as KanbanColumnType;

      if (atividade) {
        this.movingAtividade = atividade;
        this.targetColumn = newColumnId;

        // Preencher form com valores atuais
        this.dateForm.patchValue({
          dataInicioPrevisto: this.toDateInputFormat(atividade.DT_INICIO_PREVISTO),
          dataTerminoPrevisto: this.toDateInputFormat(atividade.DT_TERMINO_PREVISTO),
          dataInicioReal: this.toDateInputFormat(atividade.DT_INICIO_REAL),
          dataTerminoReal: this.toDateInputFormat(atividade.DT_TERMINO_REAL)
        });

        // Abrir modal
        this.isDateModalOpen = true;
      }
    }
  }

  toDateInputFormat(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  handleOpenModal(atividade: Atividade | AtividadeResponseDTO | null = null): void {
    // Converter para a interface antiga se necessário (compatibilidade com o modal antigo)
    if (atividade && 'Titulo' in atividade) {
      // É AtividadeResponseDTO, converter para Atividade
      this.editingAtividade = {
        NM_PROJETO: atividade.ProjetoId || 0,
        AtividadeId: atividade.AtividadeId,
        categoria: atividade.Categoria || '',
        descricao: atividade.Descricao || '',
        situacao: 0, // Não usado mais
        titulo: atividade.Titulo,
        data_fim: atividade.DT_TERMINO_PREVISTO || ''
      };
    } else {
      this.editingAtividade = atividade as Atividade | null;
    }
    this.isModalOpen = true;
  }

  handleCloseModal(): void {
    this.isModalOpen = false;
    this.editingAtividade = null;
  }

  handleSaveAtividade(atividadeData: AtividadeForm): void {


    const atividadeToSave: AtividadeForm = { ...atividadeData };
    if (atividadeToSave.data_fim) {
      atividadeToSave.data_fim = new Date(atividadeToSave.data_fim).toISOString();
    }
    if (this.editingAtividade) { // Update
      const updatedAtividade: AtividadeForm = { ...atividadeToSave };
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
      this.atividadeService.createAtividade(atividadeToSave, this.projetoId)
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

  handleCloseDateModal(): void {
    this.isDateModalOpen = false;
    this.movingAtividade = null;
    this.targetColumn = null;
    this.dateForm.reset();
  }

  handleSaveDates(): void {
    if (!this.movingAtividade || !this.targetColumn) return;

    const formValues = this.dateForm.value;
    const updateDTO: any = {};

    // Construir DTO baseado na coluna de destino e valores do form
    // Sempre enviamos as datas que foram preenchidas
    if (formValues.dataInicioPrevisto) {
      updateDTO.DT_INICIO_PREVISTO = formValues.dataInicioPrevisto;
    }
    if (formValues.dataTerminoPrevisto) {
      updateDTO.DT_TERMINO_PREVISTO = formValues.dataTerminoPrevisto;
    }
    if (formValues.dataInicioReal) {
      updateDTO.DT_INICIO_REAL = formValues.dataInicioReal;
    }
    if (formValues.dataTerminoReal) {
      updateDTO.DT_TERMINO_REAL = formValues.dataTerminoReal;
    }

    // Validar baseado na coluna de destino
    if (!this.validateDatesForColumn(this.targetColumn, updateDTO)) {
      alert('Por favor, preencha as datas necessárias para esta coluna.');
      return;
    }

    // Atualizar no backend
    this.atividadeService.atualizar(this.movingAtividade.AtividadeId, updateDTO)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.handleCloseDateModal();
          this.loadAtividades(); // Recarregar para atualizar colunas
        },
        error: (err) => {
          console.error('Falha ao atualizar datas da atividade:', err);
          alert('Erro ao atualizar atividade. Verifique as datas informadas.');
        }
      });
  }

  /**
   * Valida se as datas necessárias para a coluna foram preenchidas
   */
  validateDatesForColumn(columnType: KanbanColumnType, dto: any): boolean {
    switch (columnType) {
      case KanbanColumnType.PROXIMO:
        // Próximo: não precisa de nenhuma data (pode limpar tudo)
        return true;

      case KanbanColumnType.A_FAZER:
        // A Fazer: precisa de datas previstas
        return !!dto.DT_INICIO_PREVISTO && !!dto.DT_TERMINO_PREVISTO;

      case KanbanColumnType.EM_ANDAMENTO:
        // Em Andamento: precisa de datas previstas + início real
        return !!dto.DT_INICIO_PREVISTO && !!dto.DT_TERMINO_PREVISTO && !!dto.DT_INICIO_REAL;

      case KanbanColumnType.CONCLUIDO:
        // Concluído: precisa de todas as datas
        return !!dto.DT_INICIO_PREVISTO && !!dto.DT_TERMINO_PREVISTO &&
               !!dto.DT_INICIO_REAL && !!dto.DT_TERMINO_REAL;

      default:
        return false;
    }
  }

  /**
   * Retorna labels e placeholders baseado na coluna de destino
   */
  getDateModalInfo(): { title: string; requiredDates: string[] } {
    switch (this.targetColumn) {
      case KanbanColumnType.PROXIMO:
        return {
          title: 'Mover para Próximo',
          requiredDates: ['Nenhuma data necessária']
        };
      case KanbanColumnType.A_FAZER:
        return {
          title: 'Mover para A Fazer',
          requiredDates: ['Data Início Previsto', 'Data Término Previsto']
        };
      case KanbanColumnType.EM_ANDAMENTO:
        return {
          title: 'Mover para Em Andamento',
          requiredDates: ['Data Início Previsto', 'Data Término Previsto', 'Data Início Real']
        };
      case KanbanColumnType.CONCLUIDO:
        return {
          title: 'Mover para Concluído',
          requiredDates: ['Data Início Previsto', 'Data Término Previsto', 'Data Início Real', 'Data Término Real']
        };
      default:
        return { title: '', requiredDates: [] };
    }
  }

  get ReportStatus() {
    return ReportStatus;
  }

  /**
   * Gera o código hierárquico para uma atividade (ex: 1.2.3)
   * Agrupa atividades por entregável e gera índices
   */
  getCodigoHierarquico(atividade: AtividadeResponseDTO): string {
    // Agrupar atividades por ID do entregável (EtapaProjetoId)
    const atividadesPorEntregavel = new Map<number | null, AtividadeResponseDTO[]>();

    this.atividades.forEach(a => {
      const entregavelId = a.EtapaProjetoId || null;
      if (!atividadesPorEntregavel.has(entregavelId)) {
        atividadesPorEntregavel.set(entregavelId, []);
      }
      atividadesPorEntregavel.get(entregavelId)!.push(a);
    });

    // Ordenar entregáveis por ID (menor para maior)
    const entregaveisOrdenados = Array.from(atividadesPorEntregavel.keys()).sort((a, b) => {
      if (a === null) return 1; // null vai para o final
      if (b === null) return -1;
      return a - b;
    });

    // Encontrar índice do entregável
    const entregavelAtividade = atividade.EtapaProjetoId || null;
    const entregavelIndex = entregaveisOrdenados.indexOf(entregavelAtividade) + 1;

    // Encontrar índice da atividade dentro do entregável (ordenado por Order ou AtividadeId)
    const atividadesDoEntregavel = (atividadesPorEntregavel.get(entregavelAtividade) || [])
      .sort((a, b) => (a.Order || 0) - (b.Order || 0));
    const atividadeIndex = atividadesDoEntregavel.findIndex(a => a.AtividadeId === atividade.AtividadeId) + 1;

    return `1.${entregavelIndex}.${atividadeIndex}`;
  }
}
