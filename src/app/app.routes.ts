import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Projeto } from './projeto/projeto';
import { App } from './app';
import { authGuard } from './auth/guards/auth-guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout';
import path from 'path';
import { Component } from '@angular/core';
import { MainLayout } from './layouts/main-layout/main-layout';
import { EtapaListComponent } from './projeto/etapa/etapa-list/etapa-list.component';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayoutComponent,
    loadChildren: () => import('./auth/auth-routing-module').then(m => m.auth_routes)
  },
  { path: '',
    component:MainLayout,
    canActivate:[authGuard],
    children:[
      {
        path:'projetos',
        component:Projeto
      },
      {
        path: 'projetos/:id/etapas',
        component: EtapaListComponent
      }
    ]

  }
];
