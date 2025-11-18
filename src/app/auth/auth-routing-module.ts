import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './login/login';
import { SelecionarUnidadeComponent } from './unidade/selecionar-unidade.component';

export const auth_routes: Routes = [
  { path: '', component: Login },
  { path: 'selecionar-unidade', component: SelecionarUnidadeComponent },
];
@NgModule({
  imports: [RouterModule.forChild(auth_routes)],
  exports: [RouterModule]
})

export class AuthRoutingModule { }
