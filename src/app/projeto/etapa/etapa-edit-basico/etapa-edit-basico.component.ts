import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Entregavel, EntregavelUpdateBasicoForm } from '../../../../api/demanda/interface';
import { DialogoDirective } from '../../../core/acessibilidade/dialogo.directive';

@Component({
  selector: 'app-etapa-edit-basico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogoDirective],
  templateUrl: './etapa-edit-basico.component.html',
  styleUrls: ['./etapa-edit-basico.component.css']
})
export class EtapaEditBasicoComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() entregavel!: Entregavel;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<EntregavelUpdateBasicoForm>();

  etapaForm = new FormGroup({
    NM_ETAPA: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)]
    }),
    TIPO_ENTREGA: new FormControl<string>('Intermediario', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  ngOnChanges(): void {
    if (this.entregavel && this.isOpen) {
      this.etapaForm.patchValue({
        NM_ETAPA: this.entregavel.NM_ETAPA,
        TIPO_ENTREGA: this.entregavel.TIPO_ENTREGA
      });
    }
  }

  handleSubmit(): void {
    if (this.etapaForm.invalid) return;

    const payload: EntregavelUpdateBasicoForm = this.etapaForm.getRawValue();
    this.onSubmit.emit(payload);
  }

  closeModal(): void {
    this.onClose.emit();
  }
}
