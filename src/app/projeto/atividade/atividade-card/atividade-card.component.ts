import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Atividade } from '../../../../api/atividade/interface';

@Component({
  selector: 'app-atividade-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atividade-card.component.html',
  styleUrls: ['./atividade-card.component.css']
})
export class AtividadeCardComponent {
  @Input() atividade!: Atividade;
  @Output() onEdit = new EventEmitter<Atividade>();
  @Output() onDelete = new EventEmitter<number>();

  constructor() { }

  editAtividade(): void {
    this.onEdit.emit(this.atividade);
  }

  deleteAtividade(): void {
    this.onDelete.emit(this.atividade.AtividadeId);
  }
}
