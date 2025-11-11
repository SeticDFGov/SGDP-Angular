import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EtapaService } from '../etapa.service';
import { Etapa } from '../etapa.model';

@Component({
  selector: 'app-etapa-desempenho-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './etapa-desempenho-form.component.html',
  styleUrls: ['./etapa-desempenho-form.component.css']
})
export class EtapaDesempenhoFormComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() etapa: Etapa | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onEtapaAtualizada = new EventEmitter<void>();

  formData = {
    DT_INICIO_REAL: '',
    DT_TERMINO_REAL: '',
    PERCENT_EXEC_ETAPA: 0.0,
    ANALISE: '',
  };

  constructor(private etapaService: EtapaService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.etapa) {
      this.loadEtapaData();
    }
  }

  loadEtapaData(): void {
    if (this.etapa?.EtapaProjetoId) {
      this.etapaService.getItemById(this.etapa.EtapaProjetoId).subscribe({
        next: (data) => {
          this.formData = {
            DT_INICIO_REAL: data.DT_INICIO_REAL ? new Date(data.DT_INICIO_REAL).toISOString().split('T')[0] : '',
            DT_TERMINO_REAL: data.DT_TERMINO_REAL ? new Date(data.DT_TERMINO_REAL).toISOString().split('T')[0] : '',
            PERCENT_EXEC_ETAPA: data.PERCENT_EXEC_ETAPA || 0.0,
            ANALISE: data.ANALISE || '',
          };
        },
        error: (error) => {
          console.error('Erro ao carregar dados da etapa:', error);
        }
      });
    }
  }

  handleSubmit(): void {
  if (this.etapa?.EtapaProjetoId) {
      const itemData = {
        DT_INICIO_REAL: this.emptyToNull(this.formData.DT_INICIO_REAL),
        DT_TERMINO_REAL: this.emptyToNull(this.formData.DT_TERMINO_REAL),
        PERCENT_EXEC_ETAPA: this.formData.PERCENT_EXEC_ETAPA,
        ANALISE: this.formData.ANALISE,
      };

      this.etapaService.updateItem(this.etapa.EtapaProjetoId, itemData).subscribe({
        next: () => {
          alert('Etapa analisada com sucesso!');
          this.onEtapaAtualizada.emit();
          this.closeModal();
        },
        error: (error) => {
          console.error('Erro ao atualizar etapa:', error);
          alert('Erro ao atualizar etapa.');
        }
      });
    }
  }

  emptyToNull(value: string | null): string | null {
    return value === '' ? null : value;
  }

  closeModal(): void {
    this.onClose.emit();
    this.resetForm();
  }

  resetForm(): void {
    this.formData = {
      DT_INICIO_REAL: '',
      DT_TERMINO_REAL: '',
      PERCENT_EXEC_ETAPA: 0,
      ANALISE: '',
    };
  }
}
