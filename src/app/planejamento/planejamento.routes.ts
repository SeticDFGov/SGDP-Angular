import { ResolveFn, Routes } from '@angular/router';
import { PeShellComponent } from './trilha/pe-shell.component';
import { PeInicioComponent } from './trilha/pe-inicio.component';
import { PeEmConstrucaoComponent } from './trilha/pe-em-construcao.component';
import { PePessoasComponent } from './pessoas/pe-pessoas.component';
import { TELAS_CENTRAIS_EM_CONSTRUCAO, passoDoOrgao } from './trilha/pe-trilhas';

/** Título da aba num passo do órgão: o título do passo (WCAG 2.4.2). */
const tituloDoPassoDoOrgao: ResolveFn<string> = rota =>
  passoDoOrgao(rota.paramMap.get('passo'))?.titulo ?? 'Passo do PDTIC';

/**
 * Rotas da Governança Estratégica (lazy, filhas do MainLayout em app.routes.ts,
 * atrás do moduloGuard('planejamento')). Todas as telas ficam dentro da moldura
 * da trilha (PeShellComponent); a raiz /planejamento é a visão geral.
 *
 * - `pessoas`: a tela real desta entrega (administrador do módulo e admin do SGDP).
 * - `pdtic/:passo`: os passos do órgão, uma rota com parâmetro (a tela genérica do
 *   passo, que lê o modelo configurado, ocupa esta rota nas próximas entregas).
 * - Telas centrais ainda sem tela: uma rota por tela, todas na tela "em construção";
 *   cada entrega troca o componente da sua rota.
 */
export const planejamento_routes: Routes = [
  {
    path: '',
    component: PeShellComponent,
    data: { prerender: false },
    children: [
      { path: '', pathMatch: 'full', component: PeInicioComponent, title: 'Visão geral' },
      { path: 'pessoas', component: PePessoasComponent, title: 'Pessoas e acessos', data: { prerender: false } },
      {
        path: 'pdtic/:passo',
        component: PeEmConstrucaoComponent,
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
