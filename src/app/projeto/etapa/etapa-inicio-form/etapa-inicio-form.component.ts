import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EtapaService } from '../etapa.service';
import { Etapa } from '../etapa.model';

@Component({
  selector: 'app-etapa-inicio-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './etapa-inicio-form.component.html',
  styleUrls: ['./etapa-inicio-form.component.css']
})
export class EtapaInicioFormComponent {
  @Input() isOpen: boolean = false;
  @Input() etapa: Etapa | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onEtapaIniciada = new EventEmitter<void>();

  dtInicioPrevisto: string = '';

  constructor(private etapaService: EtapaService) { }

  handleSubmit(): void {
    if (!this.dtInicioPrevisto) {
      alert('Informe a data de início prevista.');
      return;
    }

    if (this.etapa) {
      this.etapaService.iniciarEtapa(this.etapa.EtapaProjetoId).subscribe({
        next: () => {
          alert('Etapa iniciada com sucesso!');
          this.onEtapaIniciada.emit();
          this.closeModal();
        },
        error: (error) => {
          console.error('Erro ao iniciar etapa:', error);
          alert('Erro ao iniciar etapa.');
        }
      });
    }
  }

  closeModal(): void {
    this.onClose.emit();
    this.dtInicioPrevisto = ''; // Resetar o campo ao fechar
  }
}
