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
    title: 'Transparência da inteligência artificial no DF',
    loadComponent: () => import('./pgia/publico/pgia-transparencia.component')
      .then(m => m.PgiaTransparenciaComponent)
  },
  {
    // Recursos de acessibilidade (eMAG): aberta, sem login, como a transparência
    path: 'acessibilidade',
    title: 'Acessibilidade',
    loadComponent: () => import('./acessibilidade/acessibilidade.component').then(m => m.AcessibilidadeComponent)
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
        title: 'Início',
        loadComponent: () => import('./inicio/inicio.component').then(m => m.InicioComponent)
      },

      // Demandas e Projetos
      {
        path: 'dashboard',
        title: 'Painel das demandas',
        canActivate: [guardaDemandas],
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'demandas',
        title: 'Demandas e Projetos',
        canActivate: [guardaDemandas],
        loadComponent: () => import('./projeto/projeto').then(m => m.Projeto)
      },
      {
        path: 'demandas/:id/entregaveis',
        title: 'Entregáveis da demanda',
        canActivate: [guardaDemandas],
        loadComponent: () => import('./projeto/etapa/etapa-list/etapa-list.component').then(m => m.EtapaListComponent),
        data: {
          prerender: false
        }
      },

      // Governança Estratégica (PGTIC/DF, Decreto nº 48.900/2026): trilha numerada por papel
      {
        path: 'planejamento',
        title: 'Governança Estratégica',
        canActivate: [moduloGuard(Modulos.Planejamento)],
        loadChildren: () => import('./planejamento/planejamento.routes').then(m => m.planejamento_routes)
      },

      // Governança de IA (PGIA): trilha numerada por papel
      {
        path: 'pgia',
        title: 'Governança de IA (PGIA)',
        canActivate: [moduloGuard(Modulos.Pgia)],
        loadChildren: () => import('./pgia/pgia.routes').then(m => m.pgia_routes)
      },

      // Supervisão Contínua das Contratações: módulo interno da SGDI (lazy).
      // O nome exibido mudou; a rota /analises continua a mesma.
      {
        path: 'analises',
        title: 'Supervisão Contínua das Contratações',
        canActivate: [moduloGuard(Modulos.Contratacoes)],
        loadChildren: () => import('./contratacoes/contratacoes.routes').then(m => m.contratacoes_routes)
      },

      // Administração do SGDP (perfil admin): gestão de acessos, pedidos de acesso e cadastros
      {
        path: 'admin',
        title: 'Administração',
        canActivate: [adminGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'acessos' },
          {
            path: 'acessos',
            title: 'Gestão de acessos',
            loadComponent: () => import('./admin/acessos/admin-acessos.component').then(m => m.AdminAcessosComponent)
          },
          {
            path: 'pedidos',
            title: 'Pedidos de acesso',
            loadComponent: () => import('./admin/pedidos/admin-pedidos.component').then(m => m.AdminPedidosComponent)
          },
          {
            path: 'cadastros',
            title: 'Cadastros',
            loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent)
          }
        ]
      }
    ]
  },
  { path: '**', redirectTo: 'inicio' }
];
