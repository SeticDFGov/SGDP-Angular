import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EtapaService } from '../etapa.service';
import { Etapa } from '../etapa.model';

@Component({
  selector: 'app-etapa-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './etapa-form.component.html',
  styleUrls: ['./etapa-form.component.css']
})
export class EtapaFormComponent {
  @Input() isOpen: boolean = false;
  @Input() projetoId!: number;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<Etapa>();

  formData = {
    NM_ETAPA: '',
    DT_INICIO_PREVISTO: '',
    DT_TERMINO_PREVISTO: '',
    PERCENT_TOTAL_ETAPA: null,
    RESPONSAVEL_ETAPA: '',
  };

  constructor(private etapaService: EtapaService) { }

  handleInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.formData = {
      ...this.formData,
      [input.name]: input.value
    };
  }

  async handleSubmit(): Promise<void> {
    const novaEtapa = {
      ...this.formData,
      NM_PROJETO: this.projetoId, // Adiciona o ID do projeto ao objeto
      PERCENT_PLANEJADO: this.formData.PERCENT_TOTAL_ETAPA, // Assumindo que PERCENT_PLANEJADO é o mesmo que PERCENT_TOTAL_ETAPA no cadastro inicial
    };

    this.etapaService.cadastrarEtapa(novaEtapa).subscribe({
      next: (etapaCadastrada) => {
        alert('Etapa cadastrada com sucesso!');
        this.onSubmit.emit(etapaCadastrada);
        this.closeModal();
      },
      error: (error) => {
        console.error('Erro ao cadastrar etapa:', error);
        alert('Erro ao cadastrar etapa.');
      }
    });
  }

  closeModal(): void {
    this.onClose.emit();
    this.resetForm();
  }

  resetForm(): void {
    this.formData = {
      NM_ETAPA: '',
      DT_INICIO_PREVISTO: '',
      DT_TERMINO_PREVISTO: '',
      PERCENT_TOTAL_ETAPA: null,
      RESPONSAVEL_ETAPA: '',
    };
  }
}
