import { Routes } from '@angular/router';
import { Login } from './login/login';
import { environment } from '../../environments/environment';

/**
 * Rotas de autenticação (standalone - sem NgModule)
 */
export const auth_routes: Routes = [
  { path: '', component: Login, title: 'Entrar' },
  {
    // Modo local de testes (sem Keycloak); o backend só responde com Auth:ModoLocal=true
    // e, no build de produção, a rota nem existe (cai no redirect do wildcard)
    path: 'local',
    title: 'Modo local de testes',
    canMatch: [() => !environment.production],
    loadComponent: () => import('../auth/local/login-local.component').then(m => m.LoginLocalComponent)
  },
];
