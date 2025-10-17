import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ProjetoInterfaceForm } from '../../../../api/projeto/inteface';

@Component({
  selector: 'app-projeto-form',
  imports: [],
  templateUrl: './projeto-form.html',
  styleUrl: './projeto-form.css'
})
export class ProjetoForm {
projetoForm = new FormGroup<ProjetoInterfaceForm>({
  NM_PROJETO: new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(5)]
  }),
  GERENTE_PROJETO: new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required]
  }),
  SITUACAO: new FormControl<string>('', {
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
    nonNullable: true,
    validators: [Validators.required]
  }),
  PROFISCOII: new FormControl<boolean>(false, { nonNullable: true }),
  PDTIC2427: new FormControl<boolean>(false, { nonNullable: true }),
  PTD2427: new FormControl<boolean>(false, { nonNullable: true }),
  valorEstimado: new FormControl<number>(0, { // Ou 'null' se não for nonNullable
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
}
