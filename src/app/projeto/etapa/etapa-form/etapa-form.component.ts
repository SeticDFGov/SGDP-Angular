import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EtapaService } from '../etapa.service';
import { Etapa, EtapaForm } from '../etapa.model';
import { Projeto } from '../../projeto';

@Component({
  selector: 'app-etapa-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './etapa-form.component.html',
  styleUrls: ['./etapa-form.component.css']
})
export class EtapaFormComponent {
  @Input() isOpen: boolean = false;
  @Input() projetoId!: number;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<EtapaForm>();

  etapaForm = new FormGroup({
    NM_ETAPA: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5)]
    }),
    DT_INICIO_PREVISTO: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    DT_TERMINO_PREVISTO: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
      ]
    }),
    RESPONSAVEL_ETAPA: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    PERCENT_TOTAL_ETAPA: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required]
    }),
  });
  constructor(private etapaService: EtapaService) { }
  async handleSubmit(): Promise<void> {
    const payload = {
      ...this.etapaForm.getRawValue(),
      NM_PROJETO: this.projetoId
    };

    this.onSubmit.emit(payload);


  }

  closeModal(): void {
    this.isOpen = false;
  }

}
