/**
 * Árvore de navegação do módulo Supervisão Contínua das Contratações, exibida no
 * menu lateral sob o item "Supervisão Contínua das Contratações".
 *
 * Como a do PGIA, é só configuração (rótulos e rotas): nada aqui importa
 * componentes de `src/app/contratacoes`, para o módulo continuar lazy. O tipo
 * do item é o mesmo (`ItemNavPgia`, em `pgia-nav.ts`) — a árvore é a mesma
 * estrutura de nível 1 (área) e nível 2 (uma página por formulário).
 */

import { ItemNavPgia } from './pgia-nav';
import { PapeisContratacoes, Perfis } from '../../../auth/services/auth';

const PROCESSOS: ItemNavPgia = {
  rotulo: 'Processos',
  rota: '/analises/processos/lista',
  base: '/analises/processos',
  icone: 'folder_open',
  filhos: [
    { rotulo: 'Lista de processos', rota: '/analises/processos/lista' },
    { rotulo: 'Novo processo', rota: '/analises/processos/novo' }
  ]
};

const PAINEL: ItemNavPgia = {
  rotulo: 'Painel',
  rota: '/analises/painel',
  base: '/analises/painel',
  icone: 'insights'
};

const MANIFESTACOES: ItemNavPgia = {
  rotulo: 'Manifestações ao TCDF',
  rota: '/analises/manifestacoes/lista',
  base: '/analises/manifestacoes',
  icone: 'gavel',
  filhos: [
    { rotulo: 'Manifestações registradas', rota: '/analises/manifestacoes/lista' },
    { rotulo: 'Nova manifestação', rota: '/analises/manifestacoes/nova' }
  ]
};

const IMPORTACAO: ItemNavPgia = {
  rotulo: 'Importar planilha',
  rota: '/analises/importacao',
  base: '/analises/importacao',
  icone: 'upload_file'
};

/**
 * Monta a árvore do módulo. Quem não tem o papel nem é admin não vê o grupo —
 * a lista vazia esconde o item inteiro do menu. A conferência aqui é de
 * usabilidade; quem autoriza de verdade é o backend.
 */
export function contratacoesNav(
  papel: string | null | undefined,
  perfil: string | null | undefined
): ItemNavPgia[] {
  // centralit e parceiro são levados de volta à página deles pelo authGuard em
  // qualquer outra rota: com o grupo na tela, todo clique ricochetearia.
  if (perfil === Perfis.CentralIT || perfil === Perfis.Parceiro) return [];

  const temAcesso = perfil === Perfis.Admin || papel === PapeisContratacoes.Analise;
  if (!temAcesso) return [];
  return [PROCESSOS, PAINEL, MANIFESTACOES, IMPORTACAO];
}
