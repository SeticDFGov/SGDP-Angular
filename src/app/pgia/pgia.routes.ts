import { Type } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
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
import { PgiaShellComponent } from './trilha/pgia-shell.component';
import { PgiaInicioComponent } from './trilha/pgia-inicio.component';

/**
 * Cada formulário/seção de uma área tem a sua própria URL e a sua própria
 * página: o usuário vê uma tela por vez, sem nada das outras seções.
 *
 * É **uma rota com parâmetro** (`area/:secao`), não N rotas irmãs: rotas
 * diferentes apontando para o mesmo componente fariam o Angular destruir e
 * recriar a instância a cada troca de seção, e o `ngOnInit` refaria todas as
 * chamadas da área (na SGDI são 13 GETs por clique). Com o parâmetro, o
 * componente é reaproveitado e só o campo `secao` muda (ver `acompanharSecao`).
 *
 * A raiz da área redireciona para a primeira seção. O título da aba do
 * navegador (acessibilidade, WCAG 2.4.2) vem do nome da seção.
 */
function secoes(base: string, componente: Type<unknown>, titulos: Readonly<Record<string, string>>): Routes {
  const nomes = Object.keys(titulos);
  return [
    { path: base, pathMatch: 'full', redirectTo: `${base}/${nomes[0]}` },
    {
      path: `${base}/:secao`,
      component: componente,
      title: tituloDaSecao(titulos),
      data: { secoes: nomes, base: `/pgia/${base}` }
    }
  ];
}

function tituloDaSecao(titulos: Readonly<Record<string, string>>): ResolveFn<string> {
  return rota => titulos[rota.paramMap.get('secao') ?? ''] ?? '';
}

/**
 * Rotas do módulo PGIA (lazy, montadas como filhas do MainLayout em app.routes.ts).
 * A entrada é controlada pelo moduloGuard('pgia') na rota-mãe (isolamento entre
 * módulos). Todas as telas ficam dentro da moldura da trilha (PgiaShellComponent),
 * que mostra as etapas e os passos numerados do papel do usuário; a raiz /pgia é a
 * visão geral da trilha.
 */
export const pgia_routes: Routes = [
  {
    path: '',
    component: PgiaShellComponent,
    children: [
      { path: '', pathMatch: 'full', component: PgiaInicioComponent, title: 'Visão geral' },

      // Áreas com um formulário por página
      ...secoes('orgao', PgiaOrgaoEtapa1Component, {
        'dados': 'Dados do órgão',
        'pessoas': 'Pessoas do órgão',
        'responsavel-ia': 'Responsável de IA',
        'encarregado-dados': 'Encarregado de Dados',
        'curador-dados': 'Curador de Dados de Negócio'
      }),
      ...secoes('sistemas', PgiaSistemasComponent, {
        'lista': 'Sistemas de IA do órgão',
        'cadastro': 'Cadastro de sistema de IA'
      }),
      ...secoes('incidentes', PgiaIncidentesComponent, {
        'aviso': 'Aviso de incidente',
        'comunicacao': 'Comunicação de incidente à SGDI',
        'acompanhamento': 'Acompanhamento dos incidentes',
        'nao-conformidades': 'Não conformidades'
      }),
      ...secoes('contratacoes', PgiaContratacoesComponent, {
        'contratos': 'Contratos de IA',
        'legados': 'Contratos e atos anteriores ao decreto'
      }),
      ...secoes('relatorios', PgiaRelatoriosComponent, {
        'indicadores': 'Indicadores de desempenho',
        'semestrais': 'Relatórios semestrais'
      }),
      ...secoes('sgdi', PgiaSgdiComponent, {
        'fila': 'Fila de homologação (SGDI)',
        'orgaos-dados': 'Dados dos órgãos (SGDI)',
        'pessoas': 'Pessoas e acessos (SGDI)',
        'plataformas': 'Plataformas de IA generativa (SGDI)',
        'apuracao': 'Apuração de incidentes (SGDI)',
        'registro-publico': 'Registro Público (SGDI)',
        'aia': 'Avaliações de Impacto Algorítmico (SGDI)',
        'semestrais': 'Relatórios semestrais (SGDI)',
        'anual': 'Relatório Anual (SGDI)',
        'auditorias': 'Auditorias técnicas (SGDI)',
        'nao-conformidades': 'Não conformidades (SGDI)',
        'normas': 'Normas complementares (SGDI)',
        'autorizacoes': 'Autorizações excepcionais (SGDI)'
      }),
      ...secoes('cgtic', PgiaCgticComponent, {
        'casos': 'Casos do comitê (CGTIC)',
        'deliberacoes': 'Deliberações do comitê (CGTIC)',
        'historico': 'Histórico de decisões do comitê (CGTIC)'
      }),

      // Áreas de tela única
      { path: 'uso', component: PgiaUsoComponent, title: 'Registro de uso de IA' },
      { path: 'capacitacao', component: PgiaCapacitacaoComponent, title: 'Capacitações' },
      { path: 'solicitacoes', component: PgiaSolicitacoesComponent, title: 'Solicitações do cidadão' },
      { path: 'auditoria', component: PgiaAuditoriaComponent, title: 'Auditorias designadas' },
      { path: 'prazos', component: PgiaPrazosComponent, title: 'Prazos do decreto' },
    ]
  }
];
