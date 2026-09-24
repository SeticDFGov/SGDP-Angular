import { CanDeactivateFn, ResolveFn, Routes } from '@angular/router';
import { inject } from '@angular/core';
import { PeShellComponent } from './trilha/pe-shell.component';
import { PeInicioComponent } from './trilha/pe-inicio.component';
import { PeEmConstrucaoComponent } from './trilha/pe-em-construcao.component';
import { PeTrilhaEstadoService } from './trilha/pe-trilha-estado.service';
import { PREFIXO_PASSO_ORGAO, TELAS_CENTRAIS_EM_CONSTRUCAO, TITULO_PASSO_GENERICO } from './trilha/pe-trilhas';

/**
 * Título da aba num passo do órgão: o título do passo (WCAG 2.4.2), lido da
 * trilha à vista. Na entrada direta pelo endereço a trilha ainda não chegou, e a
 * tela do passo troca o título genérico quando ela chega.
 */
const tituloDoPassoDoOrgao: ResolveFn<string> = rota => {
  const rotaDoPasso = `${PREFIXO_PASSO_ORGAO}${rota.paramMap.get('passo') ?? ''}`;
  const passo = inject(PeTrilhaEstadoService).atual?.passos.find(p => p.rota === rotaDoPasso);
  return passo?.titulo ?? TITULO_PASSO_GENERICO;
};

/** Tela que guarda mudanças antes de gravar: pergunta antes de sair com algo pendente. */
export interface ComMudancasPendentes {
  podeSair(): boolean;
}

const confirmarSaida: CanDeactivateFn<ComMudancasPendentes> = tela => !tela?.podeSair || tela.podeSair();

/**
 * Rotas da Governança Estratégica (lazy, filhas do MainLayout em app.routes.ts,
 * atrás do moduloGuard('planejamento')). Todas as telas ficam dentro da moldura
 * da trilha (PeShellComponent); a raiz /planejamento é a visão geral. As telas
 * também são lazy dentro do módulo (a moldura e a visão geral vão no pacote do
 * módulo; cada tela, no dela).
 *
 * - `pessoas`: pessoas e acessos (administrador do módulo e admin do SGDP).
 * - `modelo/niveis`, `modelo/estrutura`, `modelo/criterios` e `orgaos/niveis`:
 *   o modelo configurável (administrador do módulo e admin do SGDP).
 * - `pdtic/:passo`: os passos do órgão pela chave no modelo (uma rota com
 *   parâmetro), com a prévia dos campos dos passos de dados.
 * - Telas centrais ainda sem tela: uma rota por tela, todas na tela "em
 *   construção"; cada entrega troca o componente da sua rota.
 */
export const planejamento_routes: Routes = [
  {
    path: '',
    component: PeShellComponent,
    data: { prerender: false },
    children: [
      { path: '', pathMatch: 'full', component: PeInicioComponent, title: 'Visão geral' },
      {
        path: 'pessoas',
        loadComponent: () => import('./pessoas/pe-pessoas.component').then(m => m.PePessoasComponent),
        title: 'Pessoas e acessos',
        data: { prerender: false }
      },
      {
        path: 'modelo/niveis',
        loadComponent: () => import('./modelo/pe-niveis.component').then(m => m.PeNiveisComponent),
        title: 'Níveis de maturidade',
        data: { prerender: false }
      },
      {
        path: 'modelo/estrutura',
        loadComponent: () => import('./modelo/pe-modelo-estrutura.component').then(m => m.PeModeloEstruturaComponent),
        title: 'Etapas, passos, seções e campos',
        canDeactivate: [confirmarSaida],
        data: { prerender: false }
      },
      {
        path: 'modelo/criterios',
        loadComponent: () => import('./modelo/pe-criterios.component').then(m => m.PeCriteriosComponent),
        title: 'Critérios de priorização',
        canDeactivate: [confirmarSaida],
        data: { prerender: false }
      },
      {
        path: 'orgaos/niveis',
        loadComponent: () => import('./orgaos/pe-orgaos-niveis.component').then(m => m.PeOrgaosNiveisComponent),
        title: 'Nível de cada órgão',
        canDeactivate: [confirmarSaida],
        data: { prerender: false }
      },
      {
        path: 'pdtic/:passo',
        loadComponent: () => import('./pdtic/pe-passo-orgao.component').then(m => m.PePassoOrgaoComponent),
        title: tituloDoPassoDoOrgao,
        data: { prerender: false }
      },
      ...Object.entries(TELAS_CENTRAIS_EM_CONSTRUCAO).map(([caminho, titulo]) => ({
        path: caminho,
        component: PeEmConstrucaoComponent,
        title: titulo
      })),
      // Endereço desconhecido dentro do módulo: volta para a visão geral
      { path: '**', redirectTo: '' }
    ]
  }
];
