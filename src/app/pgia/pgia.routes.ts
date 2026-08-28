import { Type } from '@angular/core';
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
import { pgiaRaizGuard } from './guards/pgia-raiz.guard';

/**
 * Cada formulário/seção de uma área tem a sua própria URL e a sua própria
 * página: o usuário vê uma tela por vez, sem nada das outras seções.
 *
 * É **uma rota com parâmetro** (`area/:secao`), não N rotas irmãs: rotas
 * diferentes apontando para o mesmo componente fariam o Angular destruir e
 * recriar a instância a cada troca de seção, e o `ngOnInit` refaria todas as
 * chamadas da área (na SGDI são 13 GETs por clique). Com o parâmetro, o
 * componente é reaproveitado e só o campo `secao` muda — ver `acompanharSecao`.
 *
 * A raiz da área redireciona para a primeira seção.
 */
function secoes(base: string, componente: Type<unknown>, nomes: readonly string[]): Routes {
  return [
    { path: base, pathMatch: 'full', redirectTo: `${base}/${nomes[0]}` },
    {
      path: `${base}/:secao`,
      component: componente,
      data: { secoes: nomes, base: `/pgia/${base}` }
    }
  ];
}

/**
 * Rotas do módulo PGIA (lazy, montadas como filhas do MainLayout em app.routes.ts).
 * O acesso é controlado pelo pgiaGuard na rota-mãe.
 */
export const pgia_routes: Routes = [
  // /pgia abre a primeira tela do papel do usuário (o pgiaRaizGuard sempre
  // devolve um UrlTree; o componente aqui é só o destino histórico de fallback).
  {
    path: '',
    pathMatch: 'full',
    canActivate: [pgiaRaizGuard],
    component: PgiaOrgaoEtapa1Component
  },

  // Áreas com um formulário por página
  ...secoes('orgao', PgiaOrgaoEtapa1Component,
    ['dados', 'pessoas', 'responsavel-ia', 'encarregado-dados']),
  ...secoes('sistemas', PgiaSistemasComponent,
    ['lista', 'cadastro']),
  ...secoes('incidentes', PgiaIncidentesComponent,
    ['aviso', 'comunicacao', 'acompanhamento', 'nao-conformidades']),
  ...secoes('contratacoes', PgiaContratacoesComponent,
    ['contratos', 'legados']),
  ...secoes('relatorios', PgiaRelatoriosComponent,
    ['indicadores', 'semestrais']),
  ...secoes('sgdi', PgiaSgdiComponent,
    ['fila', 'plataformas', 'apuracao', 'registro-publico', 'aia', 'semestrais',
     'anual', 'auditorias', 'nao-conformidades', 'normas', 'autorizacoes']),
  ...secoes('cgtic', PgiaCgticComponent,
    ['casos', 'deliberacoes']),

  // Áreas de tela única
  { path: 'uso', component: PgiaUsoComponent },
  { path: 'capacitacao', component: PgiaCapacitacaoComponent },
  { path: 'solicitacoes', component: PgiaSolicitacoesComponent },
  { path: 'auditoria', component: PgiaAuditoriaComponent },
  { path: 'prazos', component: PgiaPrazosComponent },
];
