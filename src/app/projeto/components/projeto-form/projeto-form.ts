import { Input, Component, Output , EventEmitter} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AreaDemandante, Esteira, ProjetoInterfaceForm, Unidade } from '../../../../api/projeto/inteface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-projeto-form',

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './projeto-form.html',
  styleUrl: './projeto-form.css'
})
export class ProjetoForm {
  @Input() demandantes: AreaDemandante[] = [];
  @Input() unidades: Unidade[] = [];
  @Input() esteiras: Esteira[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() formSubmit = new EventEmitter<ProjetoInterfaceForm>();

projetoForm = new FormGroup({
  NM_PROJETO: new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(5)]
  }),
  GERENTE_PROJETO: new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required]
  }),
  NR_PROCESSO_SEI: new FormControl<string>('', {
    nonNullable: true
  }),
  NM_AREA_DEMANDANTE: new FormControl<number>(0, {
    nonNullable: true,
    validators: [Validators.required]
  }),
  ANO: new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{4}$/)]
  }),
  TEMPLATE: new FormControl<string>('', {
    nonNullable: true
  }),
  PROFISCOII: new FormControl<boolean>(false, { nonNullable: true }),
  PDTIC2427: new FormControl<boolean>(false, { nonNullable: true }),
  PTD2427: new FormControl<boolean>(false, { nonNullable: true }),
  valorEstimado: new FormControl<number>(0, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0)]
  }),
  UnidadeId: new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required]
  }),
  EsteiraId: new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required]
  }),
});
  message:string|null = null;


  onSubmit(){
     console.log('onSubmit CALLED!');
     console.log('Is form valid?', this.projetoForm.valid);
    if(this.projetoForm.invalid){
      this.message = "Preencha os campos corretamente";
      return;
    };
    this.formSubmit.emit(this.projetoForm.getRawValue());

  }
  onCancel() {
    this.close.emit();
  }
}
