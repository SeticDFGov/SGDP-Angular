import { Routes } from '@angular/router';
import { Login } from './login/login';
import { SelecionarUnidadeComponent } from './unidade/selecionar-unidade.component';
import { environment } from '../../environments/environment';

/**
 * Rotas de autenticação (standalone - sem NgModule)
 */
export const auth_routes: Routes = [
  { path: '', component: Login },
  { path: 'selecionar-unidade', component: SelecionarUnidadeComponent },
  {
    // Modo local de testes (sem Keycloak); o backend só responde com Auth:ModoLocal=true
    // e, no build de produção, a rota nem existe (cai no redirect do wildcard)
    path: 'local',
    canMatch: [() => !environment.production],
    loadComponent: () => import('../auth/local/login-local.component').then(m => m.LoginLocalComponent)
  },
];
