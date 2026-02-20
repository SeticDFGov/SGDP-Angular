import { Routes } from '@angular/router';
import { Projeto } from './projeto/projeto';
import { authGuard } from './auth/guards/auth-guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout';
import { MainLayout } from './layouts/main-layout/main-layout';
import { EtapaListComponent } from './projeto/etapa/etapa-list/etapa-list.component';
import { SelecionarUnidadeComponent } from './auth/unidade/selecionar-unidade.component';
import { AdminComponent } from './admin/admin.component';
import { adminGuard } from './auth/guards/admin.guard';
import { centralitGuard } from './auth/guards/centralit.guard';
import { parceiroGuard } from './auth/guards/parceiro.guard';
import { CentralITComponent } from './centralit/centralit.component';
import { ParceiroComponent } from './parceiro/parceiro.component';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'centralit',
    component: CentralITComponent,
    canActivate: [centralitGuard]
  },
  {
    path: 'parceiro',
    component: ParceiroComponent,
    canActivate: [parceiroGuard]
  },
  {
    path: 'selecionar-unidade',
    component: SelecionarUnidadeComponent,
    canActivate: [authGuard]
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    loadChildren: () => import('./auth/auth-routing-module').then(m => m.auth_routes)
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
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
      }
    ]
  }
];
