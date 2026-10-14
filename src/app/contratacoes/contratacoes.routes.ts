import { Type } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { CtrProcessosComponent } from './processos/ctr-processos.component';
import { CtrProcessoEditarComponent } from './processos/ctr-processo-editar.component';
import { CtrPainelComponent } from './painel/ctr-painel.component';
import { CtrManifestacoesComponent } from './manifestacoes/ctr-manifestacoes.component';
import { CtrManifestacaoEditarComponent } from './manifestacoes/ctr-manifestacao-editar.component';
import { CtrImportacaoComponent } from './importacao/ctr-importacao.component';

/**
 * Mesmo desenho canônico do PGIA: **uma rota com parâmetro** (`area/:secao`),
 * não N rotas irmãs apontando para o mesmo componente: com rotas irmãs o
 * Angular destrói e recria a instância a cada clique e o `ngOnInit` refaz todas
 * as chamadas da área. Com o parâmetro, o componente é reaproveitado e só o
 * campo `secao` muda (ver `acompanharSecao`, reaproveitado de `pgia/shared`).
 *
 * A raiz de cada área redireciona para a primeira seção. O título da aba do
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
      data: { secoes: nomes, base: `/analises/${base}` }
    }
  ];
}

function tituloDaSecao(titulos: Readonly<Record<string, string>>): ResolveFn<string> {
  return rota => titulos[rota.paramMap.get('secao') ?? ''] ?? '';
}

/**
 * Rotas do módulo Supervisão Contínua das Contratações (lazy, montadas como
 * filhas do MainLayout em app.routes.ts). O acesso é controlado pelo
 * `moduloGuard('contratacoes')` na rota-mãe (isolamento entre módulos). O nome exibido do módulo mudou, mas a rota
 * `/analises`, a pasta e os identificadores `Ctr*` continuam os mesmos.
 */
export const contratacoes_routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'processos/lista' },

  // Três listas separadas pela origem: a dos processos de supervisão contínua, a das
  // comunicações do TCDF (2026-09-24) e a das contratações anteriores ao regime (2026-10-13,
  // com o formulário curto próprio); a primeira segue em `lista` (links antigos continuam valendo)
  ...secoes('processos', CtrProcessosComponent, {
    'lista': 'Processos de supervisão contínua',
    'comunicacoes-tcdf': 'Comunicações do TCDF',
    'anteriores-ao-regime': 'Contratações anteriores ao regime',
    'novo': 'Novo processo',
    'registrar-anterior': 'Registrar contratação anterior ao regime'
  }),
  { path: 'processos/editar/:id', component: CtrProcessoEditarComponent, title: 'Processo', data: { prerender: false } },

  { path: 'painel', component: CtrPainelComponent, title: 'Painel' },

  ...secoes('manifestacoes', CtrManifestacoesComponent, {
    'lista': 'Manifestações registradas',
    'nova': 'Nova manifestação ao TCDF'
  }),
  {
    path: 'manifestacoes/editar/:id', component: CtrManifestacaoEditarComponent,
    title: 'Manifestação ao TCDF', data: { prerender: false }
  },

  { path: 'importacao', component: CtrImportacaoComponent, title: 'Importar planilha' }
];
