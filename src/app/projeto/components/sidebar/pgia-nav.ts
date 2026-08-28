/**
 * Árvore de navegação do módulo PGIA exibida no menu lateral, sob o item
 * "Governança de IA".
 *
 * É só configuração (rótulos e rotas): nada aqui importa componentes de
 * `src/app/pgia`, para o módulo continuar carregando de forma lazy.
 *
 * Nível 1 = área (um assunto). Nível 2 = formulário, cada um com a sua própria
 * página e a sua própria URL. Clicar no nível 1 abre o primeiro formulário da
 * área.
 */

export interface ItemNavPgia {
  /** Texto exibido no menu. */
  rotulo: string;
  /** Rota que o clique abre (no nível 1 com filhos, o primeiro formulário). */
  rota: string;
  /** Início das rotas da área — marca o item como aberto (só no nível 1). */
  base?: string;
  /** Material Icon do item de nível 1. */
  icone?: string;
  /** Formulários da área, um por página. */
  filhos?: ItemNavPgia[];
}

// ── Áreas do órgão ──────────────────────────────────────────────────────────

const ORGAO: ItemNavPgia = {
  rotulo: 'Informações do Órgão Responsável',
  rota: '/pgia/orgao/dados',
  base: '/pgia/orgao',
  icone: 'apartment',
  filhos: [
    { rotulo: 'Dados do órgão ou entidade', rota: '/pgia/orgao/dados' },
    { rotulo: 'Pessoas que vão usar o sistema', rota: '/pgia/orgao/pessoas' },
    { rotulo: 'Designação do Responsável de IA', rota: '/pgia/orgao/responsavel-ia' },
    { rotulo: 'Designação do Encarregado de Dados (DPO)', rota: '/pgia/orgao/encarregado-dados' }
  ]
};

const SISTEMAS: ItemNavPgia = {
  rotulo: 'Inventário de sistemas de IA',
  rota: '/pgia/sistemas/lista',
  base: '/pgia/sistemas',
  icone: 'inventory_2',
  filhos: [
    { rotulo: 'Sistemas de IA do órgão', rota: '/pgia/sistemas/lista' },
    { rotulo: 'Cadastrar sistema no inventário', rota: '/pgia/sistemas/cadastro' }
  ]
};

const INCIDENTES: ItemNavPgia = {
  rotulo: 'Report de incidentes',
  rota: '/pgia/incidentes/aviso',
  base: '/pgia/incidentes',
  icone: 'report_problem',
  filhos: [
    { rotulo: 'Avisar sobre um problema', rota: '/pgia/incidentes/aviso' },
    { rotulo: 'Comunicação de incidente grave', rota: '/pgia/incidentes/comunicacao' },
    { rotulo: 'Incidentes do órgão', rota: '/pgia/incidentes/acompanhamento' },
    { rotulo: 'Não conformidades', rota: '/pgia/incidentes/nao-conformidades' }
  ]
};

const USO: ItemNavPgia = {
  rotulo: 'Registrar uso de IA',
  rota: '/pgia/uso',
  base: '/pgia/uso',
  icone: 'edit_note'
};

/**
 * Aviso de problema para quem não tem papel no PGIA (art. 13): a página de
 * incidentes mostra só o formulário de aviso do agente para esse usuário.
 */
const AVISAR_INCIDENTE: ItemNavPgia = {
  rotulo: 'Avisar incidente',
  rota: '/pgia/incidentes/aviso',
  base: '/pgia/incidentes',
  icone: 'report_problem'
};

const CAPACITACAO: ItemNavPgia = {
  rotulo: 'Capacitação',
  rota: '/pgia/capacitacao',
  base: '/pgia/capacitacao',
  icone: 'school'
};

const CONTRATACOES: ItemNavPgia = {
  rotulo: 'Contratações de IA',
  rota: '/pgia/contratacoes/contratos',
  base: '/pgia/contratacoes',
  icone: 'gavel',
  filhos: [
    { rotulo: 'Contratos de IA', rota: '/pgia/contratacoes/contratos' },
    { rotulo: 'Contratos e atos anteriores ao decreto', rota: '/pgia/contratacoes/legados' }
  ]
};

const RELATORIOS: ItemNavPgia = {
  rotulo: 'Relatórios e indicadores',
  rota: '/pgia/relatorios/indicadores',
  base: '/pgia/relatorios',
  icone: 'insights',
  filhos: [
    { rotulo: 'Indicadores de desempenho', rota: '/pgia/relatorios/indicadores' },
    { rotulo: 'Relatório semestral', rota: '/pgia/relatorios/semestrais' }
  ]
};

const SOLICITACOES: ItemNavPgia = {
  rotulo: 'Solicitações do cidadão',
  rota: '/pgia/solicitacoes',
  base: '/pgia/solicitacoes',
  icone: 'mark_email_read'
};

const PRAZOS: ItemNavPgia = {
  rotulo: 'Prazos',
  rota: '/pgia/prazos',
  base: '/pgia/prazos',
  icone: 'event_available'
};

// ── Instâncias centrais e auditoria ─────────────────────────────────────────

const SGDI: ItemNavPgia = {
  rotulo: 'Governança (SGDI)',
  rota: '/pgia/sgdi/fila',
  base: '/pgia/sgdi',
  icone: 'account_balance',
  filhos: [
    { rotulo: 'Fila de homologação', rota: '/pgia/sgdi/fila' },
    { rotulo: 'Plataformas de IA generativa', rota: '/pgia/sgdi/plataformas' },
    { rotulo: 'Apuração de incidente', rota: '/pgia/sgdi/apuracao' },
    { rotulo: 'Registro Público', rota: '/pgia/sgdi/registro-publico' },
    { rotulo: 'Publicação de AIA', rota: '/pgia/sgdi/aia' },
    { rotulo: 'Painel de relatórios semestrais', rota: '/pgia/sgdi/semestrais' },
    { rotulo: 'Relatório Anual de Governança de IA', rota: '/pgia/sgdi/anual' },
    { rotulo: 'Auditorias técnicas', rota: '/pgia/sgdi/auditorias' },
    { rotulo: 'Não conformidades', rota: '/pgia/sgdi/nao-conformidades' },
    { rotulo: 'Normas complementares', rota: '/pgia/sgdi/normas' },
    { rotulo: 'Autorizações excepcionais', rota: '/pgia/sgdi/autorizacoes' }
  ]
};

const CGTIC: ItemNavPgia = {
  rotulo: 'CGTIC',
  rota: '/pgia/cgtic/casos',
  base: '/pgia/cgtic',
  icone: 'groups',
  filhos: [
    { rotulo: 'Casos delegados ao comitê', rota: '/pgia/cgtic/casos' },
    { rotulo: 'Registrar deliberação', rota: '/pgia/cgtic/deliberacoes' },
    { rotulo: 'Histórico de decisões', rota: '/pgia/cgtic/historico' }
  ]
};

const AUDITORIA: ItemNavPgia = {
  rotulo: 'Auditorias designadas',
  rota: '/pgia/auditoria',
  base: '/pgia/auditoria',
  icone: 'fact_check'
};

/** Áreas do órgão responsável, na ordem em que o trabalho acontece. */
const ARVORE_ORGAO: ItemNavPgia[] = [
  ORGAO, SISTEMAS, INCIDENTES, USO, CAPACITACAO,
  CONTRATACOES, RELATORIOS, SOLICITACOES, PRAZOS
];

/**
 * Monta a árvore do menu conforme o papel do usuário no PGIA
 * (`UserProfile.PapelPgia`) e o perfil do SGDP. A conferência aqui é de
 * usabilidade — quem autoriza de verdade é o backend.
 */
export function arvorePgia(papel: string | null | undefined, perfil: string | null | undefined): ItemNavPgia[] {
  if (perfil === 'admin') {
    // O admin do SGDP enxerga tudo: as áreas do órgão e as áreas centrais.
    return [...ARVORE_ORGAO, SGDI, CGTIC, AUDITORIA];
  }

  switch (papel) {
    case 'pgia_orgao':
      return ARVORE_ORGAO;
    case 'pgia_sgdi':
      return [PRAZOS, SGDI];
    case 'pgia_cgtic':
      return [CGTIC];
    case 'pgia_auditoria':
      return [AUDITORIA];
    default:
      // Sem papel no PGIA: os dois deveres de todo agente público (art. 13) —
      // registrar o uso de IA e avisar sobre problemas com sistemas de IA.
      return [USO, AVISAR_INCIDENTE];
  }
}
