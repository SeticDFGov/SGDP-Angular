import { Type } from '@angular/core';
import { Routes } from '@angular/router';
import { CtrProcessosComponent } from './processos/ctr-processos.component';
import { CtrProcessoEditarComponent } from './processos/ctr-processo-editar.component';
import { CtrPainelComponent } from './painel/ctr-painel.component';
import { CtrManifestacoesComponent } from './manifestacoes/ctr-manifestacoes.component';
import { CtrManifestacaoEditarComponent } from './manifestacoes/ctr-manifestacao-editar.component';
import { CtrImportacaoComponent } from './importacao/ctr-importacao.component';

/**
 * Mesmo desenho canônico do PGIA: **uma rota com parâmetro** (`area/:secao`),
 * não N rotas irmãs apontando para o mesmo componente — com rotas irmãs o
 * Angular destrói e recria a instância a cada clique e o `ngOnInit` refaz todas
 * as chamadas da área. Com o parâmetro, o componente é reaproveitado e só o
 * campo `secao` muda (ver `acompanharSecao`, reaproveitado de `pgia/shared`).
 *
 * A raiz de cada área redireciona para a primeira seção.
 */
function secoes(base: string, componente: Type<unknown>, nomes: readonly string[]): Routes {
  return [
    { path: base, pathMatch: 'full', redirectTo: `${base}/${nomes[0]}` },
    {
      path: `${base}/:secao`,
      component: componente,
      data: { secoes: nomes, base: `/analises/${base}` }
    }
  ];
}

/**
 * Rotas do módulo Supervisão Contínua das Contratações (lazy, montadas como
 * filhas do MainLayout em app.routes.ts). O acesso é controlado pelo
 * `contratacoesGuard` na rota-mãe. O nome exibido do módulo mudou, mas a rota
 * `/analises`, a pasta e os identificadores `Ctr*` continuam os mesmos.
 */
export const contratacoes_routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'processos/lista' },

  ...secoes('processos', CtrProcessosComponent, ['lista', 'novo']),
  { path: 'processos/editar/:id', component: CtrProcessoEditarComponent, data: { prerender: false } },

  { path: 'painel', component: CtrPainelComponent },

  ...secoes('manifestacoes', CtrManifestacoesComponent, ['lista', 'nova']),
  { path: 'manifestacoes/editar/:id', component: CtrManifestacaoEditarComponent, data: { prerender: false } },

  { path: 'importacao', component: CtrImportacaoComponent }
];
