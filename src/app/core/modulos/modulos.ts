import { UserProfile } from '../../../api/auth/interface';

/**
 * Módulos do SGDP. Mesmos identificadores do backend (`app/Auth/ModulosSgdp.cs`):
 * o GET /api/Auth/me devolve em `Modulos` os que o usuário enxerga, e cada módulo
 * tem a sua política na API; a conferência aqui é só usabilidade.
 *
 * Só configuração (rótulos, rotas e cores): nada aqui importa telas dos módulos,
 * que continuam carregando de forma lazy.
 */
export const Modulos = {
  Demandas: 'demandas',
  Pgia: 'pgia',
  Contratacoes: 'contratacoes',
  /** Governança Estratégica: princípios, PETIC-DF e PDTIC de cada órgão (Decreto nº 48.900/2026). */
  Planejamento: 'planejamento',
  Administracao: 'administracao'
} as const;

export type ModuloId = typeof Modulos[keyof typeof Modulos];

/** Aba de navegação dentro de um módulo (nível 1) e as sub-abas dela (nível 2). */
export interface AbaModulo {
  rotulo: string;
  rota: string;
  /** Início das rotas que pertencem à aba (para marcá-la como ativa). */
  prefixos: string[];
  icone?: string;
  filhos?: { rotulo: string; rota: string }[];
  /** Contador ao lado do rótulo (pedidos de acesso esperando decisão). */
  contador?: 'pedidosAcesso';
}

export interface ModuloSgdp {
  id: ModuloId;
  nome: string;
  /** Nome curto para o cabeçalho. */
  nomeCurto: string;
  descricao: string;
  /** O que o usuário encontra dentro do módulo (lista curta no card). */
  itens: string[];
  icone: string;
  /** Para onde o botão "Acessar" leva. */
  rota: string;
  /** Rotas que pertencem ao módulo (o cabeçalho descobre onde o usuário está). */
  prefixos: string[];
  /** Classes do tom ativo (literais, para o Tailwind encontrar). */
  tom: { faixa: string; icone: string; botao: string; chip: string; aba: string };
  /** Abas do módulo no cabeçalho (o PGIA e a Governança Estratégica têm navegação própria, a trilha). */
  abas: AbaModulo[];
}

/** A ordem do array é a ordem dos cards na tela inicial. */
export const MODULOS: ModuloSgdp[] = [
  {
    id: Modulos.Planejamento,
    nome: 'Governança Estratégica',
    nomeCurto: 'Governança Estratégica',
    descricao: 'Governança de TIC do DF (Decreto nº 48.900/2026): os princípios, o PETIC-DF e o PDTIC de cada órgão, passo a passo, da elaboração ao acompanhamento.',
    itens: ['Trilha numerada do seu papel', 'Princípios e PETIC-DF', 'PDTIC do órgão, do começo ao fim'],
    icone: 'flag',
    rota: '/planejamento',
    prefixos: ['/planejamento'],
    tom: {
      faixa: 'bg-purple-600',
      icone: 'bg-purple-50 text-purple-700',
      botao: 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-500',
      chip: 'bg-purple-50 text-purple-800 border-purple-200',
      aba: 'border-purple-600 text-purple-700'
    },
    abas: []
  },
  {
    id: Modulos.Pgia,
    nome: 'Governança de IA (PGIA)',
    nomeCurto: 'Governança de IA',
    descricao: 'Política de Governança de Inteligência Artificial do DF (Decreto nº 48.901/2026), passo a passo para cada papel.',
    itens: ['Trilha numerada do seu papel', 'Inventário e classificação de riscos', 'Incidentes, relatórios e prazos'],
    icone: 'psychology',
    rota: '/pgia',
    prefixos: ['/pgia'],
    tom: {
      faixa: 'bg-indigo-600',
      icone: 'bg-indigo-50 text-indigo-700',
      botao: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500',
      chip: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      aba: 'border-indigo-600 text-indigo-700'
    },
    abas: []
  },
  {
    id: Modulos.Contratacoes,
    nome: 'Supervisão Contínua das Contratações',
    nomeCurto: 'Supervisão das Contratações',
    descricao: 'Análise dos processos de contratação de TIC e manifestações da SGDI ao TCDF (Decreto nº 48.899/2026).',
    itens: ['Processos e trâmite', 'Painel de acompanhamento', 'Manifestações ao TCDF'],
    icone: 'assignment',
    rota: '/analises',
    prefixos: ['/analises'],
    tom: {
      faixa: 'bg-teal-600',
      icone: 'bg-teal-50 text-teal-700',
      botao: 'bg-teal-700 hover:bg-teal-800 focus-visible:ring-teal-500',
      chip: 'bg-teal-50 text-teal-800 border-teal-200',
      aba: 'border-teal-600 text-teal-700'
    },
    abas: [
      {
        rotulo: 'Processos', rota: '/analises/processos/lista', prefixos: ['/analises/processos'], icone: 'folder_open',
        // Duas listas pela origem (2026-09-24): as comunicações do TCDF têm a sua
        filhos: [
          { rotulo: 'Processos de supervisão contínua', rota: '/analises/processos/lista' },
          { rotulo: 'Comunicações do TCDF', rota: '/analises/processos/comunicacoes-tcdf' },
          { rotulo: 'Novo processo', rota: '/analises/processos/novo' }
        ]
      },
      { rotulo: 'Painel', rota: '/analises/painel', prefixos: ['/analises/painel'], icone: 'insights' },
      {
        rotulo: 'Manifestações ao TCDF', rota: '/analises/manifestacoes/lista', prefixos: ['/analises/manifestacoes'], icone: 'gavel',
        filhos: [
          { rotulo: 'Manifestações registradas', rota: '/analises/manifestacoes/lista' },
          { rotulo: 'Nova manifestação', rota: '/analises/manifestacoes/nova' }
        ]
      },
      { rotulo: 'Importar planilha', rota: '/analises/importacao', prefixos: ['/analises/importacao'], icone: 'upload_file' }
    ]
  },
  {
    id: Modulos.Demandas,
    nome: 'Demandas e Projetos',
    nomeCurto: 'Demandas',
    descricao: 'Acompanhamento das demandas de TIC da SUBGD: entregáveis, cronograma e painel de andamento.',
    itens: ['Painel de acompanhamento', 'Demandas e entregáveis', 'Cronograma (Gantt)'],
    icone: 'view_kanban',
    rota: '/demandas',
    prefixos: ['/demandas', '/dashboard'],
    tom: {
      faixa: 'bg-blue-600',
      icone: 'bg-blue-50 text-blue-700',
      botao: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
      chip: 'bg-blue-50 text-blue-800 border-blue-200',
      aba: 'border-blue-600 text-blue-700'
    },
    abas: [
      { rotulo: 'Painel', rota: '/dashboard', prefixos: ['/dashboard'], icone: 'pie_chart' },
      { rotulo: 'Demandas', rota: '/demandas', prefixos: ['/demandas'], icone: 'view_kanban' }
    ]
  },
  {
    id: Modulos.Administracao,
    nome: 'Administração',
    nomeCurto: 'Administração',
    descricao: 'Gestão de acessos aos módulos, pedidos de acesso, unidades e cadastros de apoio do sistema.',
    itens: ['Pedidos e gestão de acessos', 'Unidades e órgãos do PGIA', 'Cadastros das demandas'],
    icone: 'admin_panel_settings',
    rota: '/admin',
    prefixos: ['/admin'],
    tom: {
      faixa: 'bg-slate-700',
      icone: 'bg-slate-100 text-slate-700',
      botao: 'bg-slate-700 hover:bg-slate-800 focus-visible:ring-slate-500',
      chip: 'bg-slate-100 text-slate-800 border-slate-300',
      aba: 'border-slate-700 text-slate-900'
    },
    abas: [
      { rotulo: 'Gestão de acessos', rota: '/admin/acessos', prefixos: ['/admin/acessos'], icone: 'manage_accounts' },
      {
        rotulo: 'Pedidos de acesso', rota: '/admin/pedidos', prefixos: ['/admin/pedidos'], icone: 'how_to_reg',
        contador: 'pedidosAcesso'
      },
      { rotulo: 'Cadastros', rota: '/admin/cadastros', prefixos: ['/admin/cadastros'], icone: 'tune' }
    ]
  }
];

export function moduloPorId(id: string): ModuloSgdp | undefined {
  return MODULOS.find(m => m.id === id);
}

/** Módulo dono da URL (sem query/âncora), ou null fora dos módulos (ex.: /inicio). */
export function moduloDaRota(url: string): ModuloSgdp | null {
  const caminho = url.split('#')[0].split('?')[0];
  return MODULOS.find(m => m.prefixos.some(p => caminho === p || caminho.startsWith(p + '/'))) ?? null;
}

export function temModulo(user: UserProfile | null | undefined, id: ModuloId): boolean {
  return !!user?.Modulos?.includes(id);
}

/** Módulos que se pedem pelo card: a Administração vem só do perfil admin do Keycloak. */
export function podePedirAcesso(id: string): boolean {
  return id !== Modulos.Administracao;
}

/** Mensagem única de quem chega a um módulo sem acesso (guards e tela inicial). */
export function mensagemSemAcesso(modulo: ModuloSgdp | undefined): string {
  if (modulo?.id === Modulos.Administracao) return mensagemAdministracao();
  const nome = modulo ? `ao módulo ${modulo.nome}` : 'a este módulo';
  return `Você ainda não tem acesso ${nome}. Use o botão "Pedir acesso" no card do módulo.`;
}

/** A Administração não se pede pelo sistema. */
export function mensagemAdministracao(): string {
  return 'A Administração é liberada só pelo perfil admin do Keycloak. Fale com a equipe que administra o sistema.';
}
