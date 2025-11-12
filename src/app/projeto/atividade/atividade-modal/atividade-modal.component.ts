import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Atividade, AtividadeForm } from '../../../../api/atividade/interface';

@Component({
  selector: 'app-atividade-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './atividade-modal.component.html',
  styleUrls: ['./atividade-modal.component.css']
})
export class AtividadeModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() atividade: Atividade | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<AtividadeForm>();

  atividadeForm: AtividadeForm = {
    categoria: '',
    descricao: '',
    situacao: 2, // Default to 'Próximo'
    reportId: 0 // This will be set by the parent component (KanbanBoardComponent)
  };

  constructor() { }

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['atividade'] || changes['isOpen']) {
      this.initializeForm();
    }
  }

  initializeForm(): void {
    if (this.atividade) {
      this.atividadeForm = {
        categoria: this.atividade.categoria,
        descricao: this.atividade.descricao,
        situacao: this.atividade.situacao,
        reportId: 0 // Will be overwritten by parent
      };
    } else {
      this.atividadeForm = {
        categoria: '',
        descricao: '',
        situacao: 2, // Default to 'Próximo'
        reportId: 0 // Will be overwritten by parent
      };
    }
  }

  handleSave(): void {
    this.onSave.emit(this.atividadeForm);
  }

  handleClose(): void {
    this.onClose.emit();
  }
}
