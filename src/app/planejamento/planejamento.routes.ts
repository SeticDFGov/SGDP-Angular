import { CanDeactivateFn, ResolveFn, Router, Routes } from '@angular/router';
import { inject } from '@angular/core';
import { PeConfirmacaoService } from './shared/pe-confirmacao.service';
import { PeShellComponent } from './trilha/pe-shell.component';
import { PeInicioComponent } from './trilha/pe-inicio.component';
import { PeTrilhaEstadoService } from './trilha/pe-trilha-estado.service';
import { PREFIXO_PASSO_ORGAO, TITULO_PASSO_GENERICO } from './trilha/pe-trilhas';

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
  /** Nada pendente: pode sair sem perguntar (a pergunta é da guarda). */
  podeSair(): boolean;
  /** O que se perde, para a pergunta; sem ele, o texto padrão. */
  textoSaida?(): string;
  /**
   * Recarregar ou fechar a aba agora perderia alguma coisa (a moldura pede ao
   * navegador para perguntar; F1, D07). Sem ele, vale o contrário do `podeSair`.
   */
  perdeAoRecarregar?(): boolean;
}

const TEXTO_SAIDA = 'Há mudanças nesta tela que ainda não foram salvas. Se sair agora, elas se perdem.';

/**
 * Guarda de saída (F1, A04 e B03): com mudança pendente, cancela a navegação e
 * pergunta na janela do módulo; se a pessoa confirmar, navega de novo para o mesmo
 * endereço, liberado uma vez. Cancelar logo, em vez de segurar a navegação até a
 * resposta, evita que a espera conte como carregamento (barra e aviso falado).
 */
const confirmarSaida: CanDeactivateFn<ComMudancasPendentes> = (tela, _rota, _estado, proximo) => {
  const confirmacao = inject(PeConfirmacaoService);
  if (confirmacao.saidaLiberada(proximo.url) || !tela?.podeSair || tela.podeSair()) return true;
  const router = inject(Router);
  confirmacao.registrarSaida(confirmacao.perguntarDescarte(tela.textoSaida?.() ?? TEXTO_SAIDA).then(sim => {
    if (!sim) return false;
    confirmacao.liberarSaida(proximo.url);
    return router.navigateByUrl(proximo.url);
  }));
  return false;
};

/**
 * Rotas da Governança Estratégica (lazy, filhas do MainLayout em app.routes.ts,
 * atrás do moduloGuard('planejamento')). Todas as telas ficam dentro da moldura
 * da trilha (PeShellComponent); a raiz /planejamento é a visão geral. As telas
 * também são lazy dentro do módulo (a moldura e a visão geral vão no pacote do
 * módulo; cada tela, no dela).
 *
 * - `pessoas`: pessoas e acessos (administrador do módulo e admin do SGDP).
 * - `modelo/niveis`, `modelo/estrutura`, `modelo/criterios`, `modelo/documento`
 *   (E5), `modelo/fluxos` (E6) e `orgaos/niveis`: o modelo configurável
 *   (administrador do módulo e admin do SGDP).
 * - `pdtic/:passo`: os passos do órgão pela chave no modelo (uma rota com
 *   parâmetro): as seções do PDTIC com os componentes genéricos de registros, o
 *   "não se aplica", os avisos e os comentários (E4); no passo do documento, a
 *   prévia editável, o PDF e as versões (E5); no passo da metodologia (ou num
 *   passo do tipo fluxo), o editor dos fluxos, e no do plano de trabalho, a
 *   sugestão do cronograma pelos fluxos (E6).
 * - `consolidado` e `comentarios`: as planilhas consolidadas de todos os órgãos e
 *   a lista dos PDTICs para abrir a trilha de um órgão e comentar (E4; papéis
 *   globais e admin do SGDP).
 * - `referenciais/principios`, `referenciais/diretrizes` (mesma tela, pela
 *   `data.referencial`) e `referenciais/petic`: os referenciais do DF (E3), para
 *   editar (administrador do módulo e admin do SGDP) ou ler (os demais papéis).
 * - `cgtic/recebidos`, `cgtic/deliberacao` e `cgtic/historico` (mesma tela, pela
 *   `data.modo`): as deliberações do CGTIC (E3).
 * - `painel`, `conformidade`, `arvore-petic`, `inadimplencia`, `orgaos` e
 *   `orgaos/:id` (E8): o acompanhamento de todos os órgãos pelos papéis globais e
 *   pelo admin do SGDP (a página e as inadimplências do próprio órgão também para
 *   a equipe e a consulta do órgão, só para ler). Desde a E8 nenhuma tela do
 *   módulo fica "em construção".
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
        path: 'modelo/documento',
        loadComponent: () => import('./modelo/pe-modelo-documento.component').then(m => m.PeModeloDocumentoComponent),
        title: 'Modelos dos documentos',
        canDeactivate: [confirmarSaida],
        data: { prerender: false }
      },
      {
        path: 'modelo/fluxos',
        loadComponent: () => import('./modelo/pe-modelo-fluxos.component').then(m => m.PeModeloFluxosComponent),
        title: 'Fluxos-modelo',
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
        canDeactivate: [confirmarSaida],
        data: { prerender: false }
      },
      // E4: planilhas consolidadas e a lista dos PDTICs dos órgãos (papéis globais e admin do SGDP)
      {
        path: 'consolidado',
        loadComponent: () => import('./consolidado/pe-consolidado.component').then(m => m.PeConsolidadoComponent),
        title: 'Planilhas consolidadas',
        data: { prerender: false }
      },
      {
        path: 'comentarios',
        loadComponent: () => import('./pdtic/pe-pdtics-orgaos.component').then(m => m.PePdticsOrgaosComponent),
        title: 'PDTICs dos órgãos',
        data: { prerender: false }
      },
      // E3: referenciais do DF (catálogo do DF e PETIC-DF), com os componentes genéricos de registros
      {
        path: 'referenciais/principios',
        loadComponent: () => import('./referenciais/pe-referencial-df.component').then(m => m.PeReferencialDfComponent),
        title: 'Princípios da política',
        canDeactivate: [confirmarSaida],
        data: { prerender: false, referencial: 'principios' }
      },
      {
        path: 'referenciais/diretrizes',
        loadComponent: () => import('./referenciais/pe-referencial-df.component').then(m => m.PeReferencialDfComponent),
        title: 'Diretrizes do ciclo',
        canDeactivate: [confirmarSaida],
        data: { prerender: false, referencial: 'diretrizes' }
      },
      {
        path: 'referenciais/petic',
        loadComponent: () => import('./referenciais/pe-petic.component').then(m => m.PePeticComponent),
        title: 'PETIC-DF',
        canDeactivate: [confirmarSaida],
        data: { prerender: false }
      },
      // E3: deliberações do CGTIC (fila, registro da decisão e histórico), uma tela por passo da Secretaria
      {
        path: 'cgtic/recebidos',
        loadComponent: () => import('./cgtic/pe-deliberacoes.component').then(m => m.PeDeliberacoesComponent),
        title: 'O que chegou para o comitê',
        data: { prerender: false, modo: 'fila' }
      },
      {
        path: 'cgtic/deliberacao',
        loadComponent: () => import('./cgtic/pe-deliberacoes.component').then(m => m.PeDeliberacoesComponent),
        title: 'Registre a deliberação do comitê',
        data: { prerender: false, modo: 'decisao' }
      },
      {
        path: 'cgtic/historico',
        loadComponent: () => import('./cgtic/pe-deliberacoes.component').then(m => m.PeDeliberacoesComponent),
        title: 'Histórico das deliberações',
        data: { prerender: false, modo: 'historico' }
      },
      // E8: painel, conformidade, árvore do PETIC-DF, inadimplência e a página de cada órgão
      {
        path: 'painel',
        loadComponent: () => import('./paineis/pe-painel.component').then(m => m.PePainelComponent),
        title: 'Painel dos órgãos',
        data: { prerender: false }
      },
      {
        path: 'conformidade',
        loadComponent: () => import('./paineis/pe-conformidade.component').then(m => m.PeConformidadeComponent),
        title: 'Conformidade dos órgãos',
        data: { prerender: false }
      },
      {
        path: 'arvore-petic',
        loadComponent: () => import('./paineis/pe-arvore-petic.component').then(m => m.PeArvorePeticComponent),
        title: 'Árvore do PETIC-DF',
        data: { prerender: false }
      },
      {
        path: 'inadimplencia',
        loadComponent: () => import('./inadimplencia/pe-inadimplencias.component').then(m => m.PeInadimplenciasComponent),
        title: 'Notificações e inadimplências',
        data: { prerender: false }
      },
      {
        path: 'orgaos',
        pathMatch: 'full',
        loadComponent: () => import('./orgaos/pe-orgaos-lista.component').then(m => m.PeOrgaosListaComponent),
        title: 'Página de cada órgão',
        data: { prerender: false }
      },
      {
        path: 'orgaos/:id',
        loadComponent: () => import('./orgaos/pe-orgao-pagina.component').then(m => m.PeOrgaoPaginaComponent),
        title: 'Página do órgão',
        data: { prerender: false }
      },
      // Endereço desconhecido dentro do módulo: volta para a visão geral
      { path: '**', redirectTo: '' }
    ]
  }
];
