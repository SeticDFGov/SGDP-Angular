import { Routes } from '@angular/router';
import { Login } from './login/login';
import { environment } from '../../environments/environment';

/**
 * Rotas de autenticação (standalone - sem NgModule)
 */
export const auth_routes: Routes = [
  { path: '', component: Login, title: 'Entrar' },
  {
    // Volta do login no Keycloak (OIDC); só faz algo no navegador
    path: 'callback',
    title: 'Entrando',
    data: { prerender: false },
    loadComponent: () => import('./callback/callback.component').then(m => m.AuthCallbackComponent)
  },
  {
    // Modo local de testes (sem Keycloak); o backend só responde com Auth:ModoLocal=true
    // e, no build de produção, a rota nem existe (cai no redirect do wildcard)
    path: 'local',
    title: 'Modo local de testes',
    canMatch: [() => !environment.production],
    loadComponent: () => import('../auth/local/login-local.component').then(m => m.LoginLocalComponent)
  },
];
