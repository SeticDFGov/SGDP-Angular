import { Routes } from '@angular/router';
import { Login } from './login/login';
import { SelecionarUnidadeComponent } from './unidade/selecionar-unidade.component';

/**
 * Rotas de autenticação (standalone - sem NgModule)
 */
export const auth_routes: Routes = [
  { path: '', component: Login },
  { path: 'selecionar-unidade', component: SelecionarUnidadeComponent },
];
