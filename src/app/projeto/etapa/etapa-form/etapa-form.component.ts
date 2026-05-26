import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EtapaForm } from '../etapa.model';
import { AreaExecutoraService } from '../../../area-executora/area-executora.service';
import { AreaExecutora } from '../../../../api/area-executora/interface';

@Component({
  selector: 'app-etapa-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './etapa-form.component.html',
  styleUrls: ['./etapa-form.component.css']
})
export class EtapaFormComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() demandaId!: number;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<EtapaForm>();

  areasExecutoras: AreaExecutora[] = [];

  etapaForm = new FormGroup({
    NM_ETAPA: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)]
    }),
    AreaExecutoraId: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)]
    }),
    TIPO_ENTREGA: new FormControl<string>('Intermediario', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    DT_INICIO: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    DT_FIM: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    Descricao: new FormControl<string>('', { nonNullable: true })
  });

  constructor(private areaExecutoraService: AreaExecutoraService) { }

  ngOnInit(): void {
    this.areaExecutoraService.getAll().subscribe({
      next: (areas) => this.areasExecutoras = areas,
    });
  }

  async handleSubmit(): Promise<void> {
    if (this.etapaForm.invalid) return;

    const raw = this.etapaForm.getRawValue();
    const payload: EtapaForm = {
      DemandaId: this.demandaId,
      NM_ETAPA: raw.NM_ETAPA,
      AreaExecutoraId: raw.AreaExecutoraId,
      TIPO_ENTREGA: raw.TIPO_ENTREGA,
      DT_INICIO: raw.DT_INICIO + 'T00:00:00Z',
      DT_FIM: raw.DT_FIM + 'T00:00:00Z',
      Descricao: raw.Descricao || undefined
    };

    this.onSubmit.emit(payload);
  }

  closeModal(): void {
    this.onClose.emit();
  }
}
