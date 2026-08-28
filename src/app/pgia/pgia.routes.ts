import { Routes } from '@angular/router';
import { PgiaOrgaoEtapa1Component } from './orgao/pgia-orgao-etapa1.component';
import { PgiaSistemasComponent } from './sistemas/pgia-sistemas.component';
import { PgiaIncidentesComponent } from './incidentes/pgia-incidentes.component';
import { PgiaUsoComponent } from './uso/pgia-uso.component';
import { PgiaCapacitacaoComponent } from './capacitacao/pgia-capacitacao.component';
import { PgiaContratacoesComponent } from './contratacoes/pgia-contratacoes.component';
import { PgiaRelatoriosComponent } from './relatorios/pgia-relatorios.component';
import { PgiaSolicitacoesComponent } from './solicitacoes/pgia-solicitacoes.component';
import { PgiaAuditoriaComponent } from './auditoria/pgia-auditoria.component';
import { PgiaSgdiComponent } from './sgdi/pgia-sgdi.component';
import { PgiaCgticComponent } from './cgtic/pgia-cgtic.component';
import { PgiaPrazosComponent } from './prazos/pgia-prazos.component';

/**
 * Rotas do módulo PGIA (lazy, montadas como filhas do MainLayout em app.routes.ts).
 * O acesso é controlado pelo pgiaGuard na rota-mãe.
 */
export const pgia_routes: Routes = [
  { path: '', redirectTo: 'orgao', pathMatch: 'full' },
  { path: 'orgao', component: PgiaOrgaoEtapa1Component },
  { path: 'sistemas', component: PgiaSistemasComponent },
  { path: 'incidentes', component: PgiaIncidentesComponent },
  { path: 'uso', component: PgiaUsoComponent },
  { path: 'capacitacao', component: PgiaCapacitacaoComponent },
  { path: 'contratacoes', component: PgiaContratacoesComponent },
  { path: 'relatorios', component: PgiaRelatoriosComponent },
  { path: 'solicitacoes', component: PgiaSolicitacoesComponent },
  { path: 'auditoria', component: PgiaAuditoriaComponent },
  { path: 'sgdi', component: PgiaSgdiComponent },
  { path: 'cgtic', component: PgiaCgticComponent },
  { path: 'prazos', component: PgiaPrazosComponent },
];
