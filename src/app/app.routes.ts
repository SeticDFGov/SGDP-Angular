import { Routes } from '@angular/router';
import { Projeto } from './projeto/projeto';
import { authGuard } from './auth/guards/auth-guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout';
import { MainLayout } from './layouts/main-layout/main-layout';
import { EtapaListComponent } from './projeto/etapa/etapa-list/etapa-list.component';
import { AdminComponent } from './admin/admin.component';
import { adminGuard } from './auth/guards/admin.guard';
import { userConfiguredGuard } from './auth/guards/user-configured.guard';
import { PendingApprovalComponent } from './auth/pending-approval/pending-approval.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { pgiaGuard } from './pgia/guards/pgia.guard';
import { contratacoesGuard } from './contratacoes/guards/contratacoes.guard';

export const routes: Routes = [
  {
    // Transparência pública (arts. 23 e 24): fora do MainLayout e sem guard.
    path: 'transparencia-ia',
    loadComponent: () => import('./pgia/publico/pgia-transparencia.component')
      .then(m => m.PgiaTransparenciaComponent)
  },
  {
    path: 'pending-approval',
    component: PendingApprovalComponent,
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [authGuard, userConfiguredGuard, adminGuard]
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    loadChildren: () => import('./auth/auth-routing-module').then(m => m.auth_routes)
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard, userConfiguredGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'demandas',
        component: Projeto
      },
      {
        path: 'demandas/:id/entregaveis',
        component: EtapaListComponent,
        data: {
          prerender: false
        }
      },
      {
        path: 'pgia',
        canActivate: [pgiaGuard],
        loadChildren: () => import('./pgia/pgia.routes').then(m => m.pgia_routes)
      },
      {
        // Análises de Contratações: módulo interno da SGDI (lazy)
        path: 'analises',
        canActivate: [contratacoesGuard],
        loadChildren: () => import('./contratacoes/contratacoes.routes').then(m => m.contratacoes_routes)
      }
    ]
  }
];
