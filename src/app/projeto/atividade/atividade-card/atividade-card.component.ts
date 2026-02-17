import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Atividade, AtividadeResponseDTO } from '../../../../api/atividade/interface';

@Component({
  selector: 'app-atividade-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atividade-card.component.html',
  styleUrls: ['./atividade-card.component.css']
})
export class AtividadeCardComponent {
  @Input() atividade!: Atividade | AtividadeResponseDTO;
  @Input() codigo?: string; // Código hierárquico (ex: 1.1.1)
  @Output() onEdit = new EventEmitter<Atividade | AtividadeResponseDTO>();
  @Output() onDelete = new EventEmitter<number>();

  constructor() { }

  editAtividade(): void {
    this.onEdit.emit(this.atividade);
  }

  deleteAtividade(): void {
    this.onDelete.emit(this.atividade.AtividadeId);
  }

  // Helper methods para acessar propriedades de ambas as interfaces
  get titulo(): string {
    return (this.atividade as any).titulo || (this.atividade as any).Titulo || '';
  }

  get categoria(): string | undefined {
    return (this.atividade as any).categoria || (this.atividade as any).Categoria;
  }

  get descricao(): string | undefined {
    return (this.atividade as any).descricao || (this.atividade as any).Descricao;
  }
}
