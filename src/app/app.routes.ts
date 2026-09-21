import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth-guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout';
import { MainLayout } from './layouts/main-layout/main-layout';
import { adminGuard } from './auth/guards/admin.guard';
import { moduloGuard } from './auth/guards/modulo.guard';
import { Modulos } from './core/modulos/modulos';

/**
 * Isolamento entre módulos: depois do login, todo mundo cai na tela inicial
 * (/inicio) com os cards dos módulos; cada módulo tem o seu guard, que espelha a
 * política do backend. Os módulos carregam sob demanda: quem não tem acesso a
 * um módulo não baixa nem o código dele.
 */
const guardaDemandas = moduloGuard(Modulos.Demandas);

export const routes: Routes = [
  {
    // Transparência pública (arts. 23 e 24): fora do MainLayout e sem guard.
    path: 'transparencia-ia',
    loadComponent: () => import('./pgia/publico/pgia-transparencia.component')
      .then(m => m.PgiaTransparenciaComponent)
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    loadChildren: () => import('./auth/auth-routing-module').then(m => m.auth_routes)
  },
  // Endereço antigo do "aguardando liberação": a tela inicial faz esse papel agora
  { path: 'pending-approval', redirectTo: 'inicio' },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () => import('./inicio/inicio.component').then(m => m.InicioComponent)
      },

      // Demandas e Projetos
      {
        path: 'dashboard',
        canActivate: [guardaDemandas],
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'demandas',
        canActivate: [guardaDemandas],
        loadComponent: () => import('./projeto/projeto').then(m => m.Projeto)
      },
      {
        path: 'demandas/:id/entregaveis',
        canActivate: [guardaDemandas],
        loadComponent: () => import('./projeto/etapa/etapa-list/etapa-list.component').then(m => m.EtapaListComponent),
        data: {
          prerender: false
        }
      },

      // Governança de IA (PGIA): trilha numerada por papel
      {
        path: 'pgia',
        canActivate: [moduloGuard(Modulos.Pgia)],
        loadChildren: () => import('./pgia/pgia.routes').then(m => m.pgia_routes)
      },

      // Supervisão Contínua das Contratações: módulo interno da SGDI (lazy).
      // O nome exibido mudou; a rota /analises continua a mesma.
      {
        path: 'analises',
        canActivate: [moduloGuard(Modulos.Contratacoes)],
        loadChildren: () => import('./contratacoes/contratacoes.routes').then(m => m.contratacoes_routes)
      },

      // Administração do SGDP (perfil admin): gestão de acessos, pedidos de acesso e cadastros
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'acessos' },
          {
            path: 'acessos',
            loadComponent: () => import('./admin/acessos/admin-acessos.component').then(m => m.AdminAcessosComponent)
          },
          {
            path: 'pedidos',
            loadComponent: () => import('./admin/pedidos/admin-pedidos.component').then(m => m.AdminPedidosComponent)
          },
          {
            path: 'cadastros',
            loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent)
          }
        ]
      }
    ]
  },
  { path: '**', redirectTo: 'inicio' }
];
