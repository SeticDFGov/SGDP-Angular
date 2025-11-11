import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { EtapaService } from '../etapa.service';
import { Etapa } from '../etapa.model';

interface KanbanColumn {
  id: string;
  name: string;
  etapas: Etapa[];
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.css']
})
export class KanbanBoardComponent implements OnInit {
  @Input() projetoId!: number;

  columns: KanbanColumn[] = [
    { id: 'Não Iniciado', name: 'Não Iniciado', etapas: [] },
    { id: 'Em Andamento', name: 'Em Andamento', etapas: [] },
    { id: 'Concluído', name: 'Concluído', etapas: [] }
  ];

  constructor(private etapaService: EtapaService) { }

  ngOnInit(): void {
    this.loadEtapas();
  }

  loadEtapas(): void {
    this.etapaService.getAllEtapas(this.projetoId).subscribe(etapas => {
      this.columns.forEach(col => col.etapas = []); // Limpa as colunas
      etapas.forEach(etapa => {
        const column = this.columns.find(c => c.id === etapa.SITUACAO);
        if (column) {
          column.etapas.push(etapa);
        }
      });
    });
  }

  drop(event: CdkDragDrop<Etapa[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const etapa = event.previousContainer.data[event.previousIndex];
      const newStatus = event.container.id;

      this.etapaService.updateStatus(etapa.EtapaProjetoId, newStatus).subscribe({
        next: () => {
          transferArrayItem(
            event.previousContainer.data,
            event.container.data,
            event.previousIndex,
            event.currentIndex
          );
        },
        error: (err) => {
          console.error('Falha ao atualizar status', err);
          // Opcional: reverter a mudança na UI se a API falhar
        }
      });
    }
  }
}
