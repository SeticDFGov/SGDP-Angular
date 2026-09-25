/**
 * Trilhas da Governança Estratégica: o que cada papel faz, em ordem e numerado,
 * amarrado ao Decreto nº 48.900/2026 (PGTIC/DF), ao Decreto nº 48.899/2026
 * (competências da SGDI) e ao Guia de PDTIC do SISP. No molde de
 * `pgia/trilha/pgia-trilhas.ts`.
 *
 * As trilhas centrais (administrador do módulo, SGDI e CGTIC) são configuração
 * fixa, aqui. A do órgão vem do modelo configurado no back-end
 * (GET api/planejamento/modelo/trilha): o nível do órgão e os ajustes dizem
 * quais passos aparecem, e `trilhaDoOrgao` só a traduz para a forma da moldura.
 *
 * Numeração: etapa N, passo N.M (pela posição). Base legal no formato que o
 * `citaPlanejamento` transforma em chip: sem nome, é o Decreto nº 48.900/2026;
 * o outro decreto vem com o nome logo depois ("art. 7º, V, do Decreto nº
 * 48.899/2026").
 */
import { PePassoTrilha, PeTrilhaOrgao } from '../../../api/planejamento/interface';
import { aparenciaEtapa } from '../shared/pe-modelo-rotulos';
import { TIPOS_PASSO_COM_TELA } from '../shared/pe-pdtic-rotulos';

/** Trilha efetiva (o admin do SGDP escolhe qual quer ver; os papéis globais podem ver a de um órgão). */
export type PerfilTrilhaPe = 'admin' | 'sgdi' | 'cgtic' | 'orgao';

/** As trilhas fixas, dos papéis que enxergam todos os órgãos. */
export type PerfilCentralPe = Exclude<PerfilTrilhaPe, 'orgao'>;

/**
 * Status calculado a partir dos dados (ver PeTrilhaStatusService): pedidos de
 * acesso ao módulo, situação do PETIC-DF, deliberações esperando o comitê e (E8)
 * notificações com o prazo de 5 dias úteis vencido, esperando o registro.
 */
export type ChaveStatusPe = 'pedidos-acesso' | 'petic' | 'deliberacoes' | 'inadimplencias';

export interface PassoTrilhaPe {
  /** Ação no imperativo. */
  titulo: string;
  rota: string;
  /** Uma ou duas frases: o que a pessoa faz nesta tela. */
  oQueFazer: string;
  /** Citação da norma; ausente quando o passo não tem base legal própria. */
  baseLegal?: string;
  /** Atividade do Guia de PDTIC do SISP ("1.1", "2.8 a 2.11", "Anexo X, item 19"). */
  guia?: string;
  /** Chave do status calculado; sem ela o passo não mostra situação. */
  status?: ChaveStatusPe;
  /**
   * As telas abaixo da rota também são deste passo (E8: a lista dos órgãos é o
   * passo, e a página de cada órgão, `orgaos/{id}`, continua nele).
   */
  subrotas?: boolean;
  /** Passo da trilha de um órgão, como o back-end resolveu (seções, campos, tipo e numeração). */
  doOrgao?: PePassoTrilha;
}

export interface EtapaTrilhaPe {
  /** Rótulo curto (barra de etapas). */
  rotulo: string;
  /** Título completo, no imperativo. */
  titulo: string;
  resumo: string;
  icone: string;
  passos: PassoTrilhaPe[];
}

export interface TrilhaPe {
  perfil: PerfilTrilhaPe;
  nome: string;
  descricao: string;
  etapas: EtapaTrilhaPe[];
}

/** Passo com a numeração e a posição na trilha. */
export interface PassoNumeradoPe extends PassoTrilhaPe {
  numero: string;
  etapa: number;
  indice: number;
  /**
   * Passo do órgão de um tipo que esta versão do sistema não conhece (todos os
   * tipos do modelo inicial têm tela desde a rodada B da E7, e todas as telas
   * centrais existem desde a E8): a tela do passo explica e manda avisar a equipe
   * que administra o sistema.
   */
  semTela: boolean;
}

export const BASE_PE = '/planejamento';

/** Rota dos passos do órgão: /planejamento/pdtic/{chave do passo no modelo}. */
export const PREFIXO_PASSO_ORGAO = `${BASE_PE}/pdtic/`;

/** Título da aba num passo do órgão enquanto a trilha não chegou (a tela do passo troca pelo título dele). */
export const TITULO_PASSO_GENERICO = 'Passo do PDTIC';

/** Rota da página de um órgão (E8): tudo do órgão num lugar só. */
export function rotaPaginaOrgao(orgaoId: number): string {
  return `${BASE_PE}/orgaos/${orgaoId}`;
}

/**
 * Referenciais do DF e deliberações, para o acesso rápido da visão geral: todo
 * papel lê os três referenciais (a E4 usa na etapa 1 do órgão); as deliberações
 * só os papéis globais e o admin do SGDP (`soGlobais`).
 */
export const ATALHOS_REFERENCIAIS: { rota: string; titulo: string; texto: string; icone: string; soGlobais?: boolean }[] = [
  {
    rota: `${BASE_PE}/referenciais/principios`, titulo: 'Princípios da política', icone: 'looks_one',
    texto: 'Os onze princípios do decreto e os que o administrador do módulo acrescentou.'
  },
  {
    rota: `${BASE_PE}/referenciais/petic`, titulo: 'PETIC-DF', icone: 'looks_two',
    texto: 'A versão vigente do plano estratégico de TIC do DF e as anteriores.'
  },
  {
    rota: `${BASE_PE}/referenciais/diretrizes`, titulo: 'Diretrizes do ciclo', icone: 'event_note',
    texto: 'O que a SGDI propôs para o ciclo de planejamento dos PDTICs.'
  },
  {
    rota: `${BASE_PE}/cgtic/historico`, titulo: 'Deliberações do CGTIC', icone: 'gavel', soGlobais: true,
    texto: 'O que foi enviado ao comitê e o que ele decidiu.'
  }
];

/**
 * Acompanhamento dos órgãos (E8), para o acesso rápido da visão geral dos papéis
 * globais e do admin do SGDP: a Secretaria do CGTIC vê estas telas sem tê-las na
 * trilha dela.
 */
export const ATALHOS_ACOMPANHAMENTO: { rota: string; titulo: string; texto: string; icone: string }[] = [
  {
    rota: `${BASE_PE}/painel`, titulo: 'Painel dos órgãos', icone: 'insights',
    texto: 'Os órgãos por situação do PDTIC, por nível e por etapa, os gráficos e os alertas.'
  },
  {
    rota: `${BASE_PE}/conformidade`, titulo: 'Conformidade', icone: 'fact_check',
    texto: 'Os itens de TIC que cada órgão cumpre, com o grupo de conformidade e a planilha.'
  },
  {
    rota: `${BASE_PE}/arvore-petic`, titulo: 'Árvore do PETIC-DF', icone: 'account_tree',
    texto: 'Os objetivos do PETIC-DF vigente com as necessidades e as metas dos órgãos.'
  },
  {
    rota: `${BASE_PE}/orgaos`, titulo: 'Página de cada órgão', icone: 'domain',
    texto: 'Tudo de um órgão num lugar só: PDTIC, andamento, aprovações, documentos e ciclos.'
  },
  {
    rota: `${BASE_PE}/inadimplencia`, titulo: 'Notificações e inadimplências', icone: 'report',
    texto: 'Os órgãos notificados pela SGDI, o prazo de 5 dias úteis e as inadimplências.'
  }
];

export const ROTULOS_PERFIL_TRILHA_PE: Record<PerfilTrilhaPe, string> = {
  admin: 'Administrador do módulo',
  sgdi: 'Equipe da SGDI',
  cgtic: 'Secretaria do CGTIC',
  orgao: 'Órgão (equipe e consulta)'
};

/** As trilhas centrais que o admin do SGDP escolhe em "Ver a trilha de" (a do órgão pede o órgão). */
export const PERFIS_CENTRAIS_PE: PerfilCentralPe[] = ['admin', 'sgdi', 'cgtic'];

const tela = (caminho: string) => `${BASE_PE}/${caminho}`;

// ── Administrador do módulo (pe_admin) ──────────────────────────────────────

// ── Acompanhamento dos órgãos (E8): passos do administrador e da SGDI ─────────

const PAINEL: PassoTrilhaPe = {
  titulo: 'Veja o painel dos órgãos',
  rota: tela('painel'),
  oQueFazer: 'Veja quantos órgãos estão em cada situação do PDTIC, por nível e por etapa da elaboração, os gráficos das necessidades, '
    + 'das ações e dos riscos, e os alertas: vigência vencida, revisão vencida, ciclo atrasado, inadimplência e deliberação aguardando.',
  baseLegal: 'art. 9º, IV, do Decreto nº 48.899/2026'
};

const CONFORMIDADE: PassoTrilhaPe = {
  titulo: 'Confira a conformidade dos órgãos',
  rota: tela('conformidade'),
  oQueFazer: 'Veja, órgão por órgão, os itens de TIC que o PDTIC cumpre: aprovado pelo CGTIC, comunicado à SGDI, vigente, com os nove '
    + 'conteúdos e com a revisão e o acompanhamento em dia. Os órgãos ficam em alta, média ou baixa conformidade.',
  baseLegal: 'art. 9º, IV, do Decreto nº 48.899/2026'
};

const ARVORE_PETIC: PassoTrilhaPe = {
  titulo: 'Veja a árvore do PETIC-DF',
  rota: tela('arvore-petic'),
  oQueFazer: 'Veja, para cada objetivo do PETIC-DF vigente, os indicadores dele e as necessidades e metas que cada órgão ligou ao objetivo.',
  baseLegal: 'art. 12, § 1º'
};

const INADIMPLENCIA: PassoTrilhaPe = {
  titulo: 'Registre notificações e inadimplências',
  rota: tela('inadimplencia'),
  oQueFazer: 'Registre a notificação do órgão que não comunicou o PDTIC aprovado. Passados 5 dias úteis sem regularização nem justificativa '
    + 'aceita, registre a inadimplência com o motivo e a nota de motivação. Quando o órgão regularizar, registre o saneamento.',
  baseLegal: 'art. 11 do Decreto nº 48.899/2026',
  status: 'inadimplencias'
};

const PAGINA_ORGAO: PassoTrilhaPe = {
  titulo: 'Abra a página do órgão',
  rota: tela('orgaos'),
  oQueFazer: 'Escolha o órgão e veja tudo dele num lugar só: situação e versão do PDTIC, andamento da trilha, nível, conformidade, '
    + 'aprovações, deliberações, documentos, ciclos e inadimplências.',
  baseLegal: 'art. 9º, IV, do Decreto nº 48.899/2026',
  subrotas: true
};

const COMENTARIOS: PassoTrilhaPe = {
  titulo: 'Comente os passos do órgão',
  rota: tela('comentarios'),
  oQueFazer: 'Escolha o órgão, abra a trilha dele e comente um passo do PDTIC. A equipe do órgão responde e marca o comentário como resolvido.',
  baseLegal: 'art. 9º, IX, do Decreto nº 48.899/2026'
};

const CONSOLIDADO: PassoTrilhaPe = {
  titulo: 'Baixe as planilhas consolidadas',
  rota: tela('consolidado'),
  oQueFazer: 'Baixe cada seção do PDTIC com os dados de todos os órgãos. É a base do portfólio estratégico de TIC do GDF.',
  baseLegal: 'art. 9º, V, do Decreto nº 48.899/2026'
};

const TRILHA_ADMIN: TrilhaPe = {
  perfil: 'admin',
  nome: 'Administrador do módulo',
  descricao: 'Você prepara o modelo que os órgãos seguem, cadastra os referenciais (princípios e PETIC-DF), dá acesso às pessoas '
    + 'e acompanha os órgãos. A SGDI coordena o monitoramento dos PDTICs e dá metodologia e modelos aos órgãos '
    + '(art. 9º, IV e IX, do Decreto nº 48.899/2026).',
  etapas: [
    {
      rotulo: 'Modelo',
      titulo: 'Prepare o modelo',
      resumo: 'Defina o que cada nível de maturidade pede e como o PDTIC é montado.',
      icone: 'tune',
      passos: [
        {
          titulo: 'Defina os níveis de maturidade',
          rota: tela('modelo/niveis'),
          oQueFazer: 'Crie, renomeie, descreva e ordene os níveis: Básico, Intermediário e Avançado. O nível do órgão define os passos e os campos que ele preenche.',
          baseLegal: 'art. 9º, X, do Decreto nº 48.899/2026'
        },
        {
          titulo: 'Monte etapas, passos, seções e campos',
          rota: tela('modelo/estrutura'),
          oQueFazer: 'Diga o que cada nível pede: ligue, desligue, renomeie e crie passos, seções e campos da trilha do órgão. Os nove conteúdos mínimos do PDTIC ficam travados: não desligam em nenhum nível.',
          baseLegal: 'art. 12, § 2º'
        },
        {
          titulo: 'Defina os critérios de priorização',
          rota: tela('modelo/criterios'),
          oQueFazer: 'Escolha os critérios que ordenam as necessidades de TIC dos órgãos, a escala de cada um e como a prioridade é calculada. O padrão é a matriz GUT: gravidade, urgência e tendência, com notas de 1 a 5.',
          guia: '3.1'
        },
        {
          titulo: 'Ajuste o modelo do documento',
          rota: tela('modelo/documento'),
          oQueFazer: 'Edite os capítulos, os textos-padrão e os blocos de dados do documento do PDTIC. Cada órgão recebe uma cópia: o texto que ele não editou acompanha o modelo na hora.',
          baseLegal: 'art. 9º, IX, do Decreto nº 48.899/2026'
        },
        {
          titulo: 'Ajuste os fluxos-modelo',
          rota: tela('modelo/fluxos'),
          oQueFazer: 'Revise os fluxos do Guia de PDTIC que os órgãos copiam e adaptam: elaboração, diagnóstico, planejamento e acompanhamento. '
            + 'Arraste os blocos no desenho (ou use o modo em lista) para mudar as raias, os passos, as decisões e os documentos: o desenho se arruma sozinho.',
          baseLegal: 'art. 9º, IX, do Decreto nº 48.899/2026'
        }
      ]
    },
    {
      rotulo: 'Referenciais',
      titulo: 'Cadastre os referenciais',
      resumo: 'Princípios da política, PETIC-DF e diretrizes do ciclo, que os órgãos seguem no PDTIC.',
      icone: 'menu_book',
      passos: [
        {
          titulo: 'Confira os princípios do art. 4º',
          rota: tela('referenciais/principios'),
          oQueFazer: 'Confira os onze princípios da Política de Governança de TIC do DF. Eles são o primeiro nível e aparecem no PDTIC de cada órgão.',
          baseLegal: 'art. 4º'
        },
        {
          titulo: 'Cadastre o PETIC-DF',
          rota: tela('referenciais/petic'),
          oQueFazer: 'Registre num rascunho as diretrizes, os objetivos estratégicos, as prioridades, os indicadores e as iniciativas do Plano Estratégico de TIC do DF (PETIC-DF) e envie ao CGTIC, que aprova.',
          baseLegal: 'art. 11, § 1º',
          status: 'petic'
        },
        {
          titulo: 'Publique as diretrizes do ciclo',
          rota: tela('referenciais/diretrizes'),
          oQueFazer: 'Proponha as diretrizes e as prioridades do próximo ciclo de planejamento, antes de os órgãos começarem a elaborar os PDTICs.',
          baseLegal: 'art. 9º, VIII, do Decreto nº 48.899/2026'
        }
      ]
    },
    {
      rotulo: 'Acessos',
      titulo: 'Dê acesso',
      resumo: 'Responda aos pedidos, defina o papel de cada pessoa e o nível de cada órgão.',
      icone: 'manage_accounts',
      passos: [
        {
          titulo: 'Responda aos pedidos e defina os papéis',
          rota: tela('pessoas'),
          oQueFazer: 'Responda aos pedidos de acesso ao módulo e defina o papel de cada pessoa: administrador do módulo, equipe da SGDI, Secretaria do CGTIC, equipe do órgão ou consulta do órgão.',
          status: 'pedidos-acesso'
        },
        {
          titulo: 'Defina o nível de cada órgão',
          rota: tela('orgaos/niveis'),
          oQueFazer: 'Escolha o nível de maturidade de cada órgão, com a justificativa, e ajuste um item para um órgão quando precisar. O histórico dos níveis ajuda no Relatório de Maturidade.',
          baseLegal: 'art. 9º, X, do Decreto nº 48.899/2026'
        }
      ]
    },
    {
      rotulo: 'Acompanhamento',
      titulo: 'Acompanhe os órgãos',
      resumo: 'Painel, conformidade, árvore do PETIC-DF, notificações e inadimplências, a página de cada órgão e os comentários nos passos.',
      icone: 'insights',
      passos: [PAINEL, CONFORMIDADE, ARVORE_PETIC, INADIMPLENCIA, PAGINA_ORGAO, COMENTARIOS]
    },
    {
      rotulo: 'Consolidação',
      titulo: 'Consolide',
      resumo: 'Planilhas com os dados de todos os órgãos.',
      icone: 'summarize',
      passos: [CONSOLIDADO]
    }
  ]
};

// ── Equipe da SGDI (pe_sgdi) ────────────────────────────────────────────────

const TRILHA_SGDI: TrilhaPe = {
  perfil: 'sgdi',
  nome: 'Equipe da SGDI',
  descricao: 'A equipe da SGDI acompanha os PDTICs de todos os órgãos, comenta os passos, registra notificações e inadimplências '
    + 'e consolida o portfólio de TIC do GDF (arts. 9º e 11 do Decreto nº 48.899/2026).',
  etapas: [
    {
      rotulo: 'Acompanhamento',
      titulo: 'Acompanhe',
      resumo: 'Painel e conformidade dos órgãos, a árvore do PETIC-DF e as deliberações do CGTIC.',
      icone: 'insights',
      passos: [
        PAINEL,
        CONFORMIDADE,
        ARVORE_PETIC,
        {
          titulo: 'Acompanhe as deliberações do CGTIC',
          rota: tela('cgtic/historico'),
          oQueFazer: 'Veja o que foi enviado ao comitê de governança de TIC (CGTIC) e o que ele decidiu: os PDTICs dos órgãos e o PETIC-DF.',
          baseLegal: 'art. 5º'
        }
      ]
    },
    {
      rotulo: 'Análise',
      titulo: 'Analise os PDTICs',
      resumo: 'Página de cada órgão e comentários nos passos do PDTIC.',
      icone: 'fact_check',
      passos: [PAGINA_ORGAO, COMENTARIOS]
    },
    {
      rotulo: 'Inadimplência',
      titulo: 'Registre notificações e inadimplências',
      resumo: 'Notificação, prazo de 5 dias úteis e registro da inadimplência.',
      icone: 'report',
      passos: [INADIMPLENCIA]
    },
    {
      rotulo: 'Consolidação',
      titulo: 'Consolide',
      resumo: 'Planilhas com os dados de todos os órgãos.',
      icone: 'summarize',
      passos: [CONSOLIDADO]
    }
  ]
};

// ── Secretaria do CGTIC (pe_cgtic) ──────────────────────────────────────────

const TRILHA_CGTIC: TrilhaPe = {
  perfil: 'cgtic',
  nome: 'Secretaria do CGTIC',
  descricao: 'A Secretaria Executiva do CGTIC recebe os PDTICs e o PETIC-DF enviados e registra as deliberações do comitê, '
    + 'que aprova o PDTIC de cada órgão (arts. 5º e 9º).',
  etapas: [
    {
      rotulo: 'Recebidos',
      titulo: 'Receba os PDTICs e o PETIC enviados',
      resumo: 'Documentos enviados para a deliberação do comitê.',
      icone: 'inbox',
      passos: [
        {
          titulo: 'Confira o que chegou para o comitê',
          rota: tela('cgtic/recebidos'),
          oQueFazer: 'Veja os PDTICs dos órgãos e o PETIC-DF enviados para o comitê e leia o que foi enviado: o PDF de cada PDTIC e o PETIC-DF.',
          baseLegal: 'art. 5º',
          status: 'deliberacoes'
        }
      ]
    },
    {
      rotulo: 'Deliberação',
      titulo: 'Registre a deliberação',
      resumo: 'Decisão do CGTIC: aprovado ou devolvido, com a resolução ou a ata.',
      icone: 'gavel',
      passos: [
        {
          titulo: 'Registre a deliberação do comitê',
          rota: tela('cgtic/deliberacao'),
          oQueFazer: 'Registre a decisão tomada em reunião: aprovado, com o ato (resolução ou ata) e a data, ou devolvido, com o que precisa ser ajustado.',
          baseLegal: 'art. 10',
          status: 'deliberacoes'
        }
      ]
    },
    {
      rotulo: 'Histórico',
      titulo: 'Consulte o histórico',
      resumo: 'Decisões anteriores do comitê.',
      icone: 'history',
      passos: [
        {
          titulo: 'Consulte o histórico das deliberações',
          rota: tela('cgtic/historico'),
          oQueFazer: 'Veja as decisões anteriores do comitê sobre cada PDTIC e sobre o PETIC-DF.',
          baseLegal: 'art. 10'
        }
      ]
    }
  ]
};

// ── Órgão: equipe (pe_orgao) e consulta (pe_orgao_consulta) ─────────────────

/** O que cabe ao órgão (a trilha dele vem do modelo configurado; este texto não muda com o nível). */
const DESCRICAO_TRILHA_ORGAO = 'Seu órgão elabora e mantém atualizado o Plano Diretor de TIC (PDTIC), alinhado ao PETIC-DF e ao Plano de '
  + 'Contratações Anual, com os nove conteúdos mínimos do decreto. O comitê interno de TIC (SGTIC) aprova, o órgão comunica '
  + 'à SGDI e o CGTIC delibera (arts. 5º, 8º e 12).';

/** Rota de um passo do órgão pela chave dele no modelo. */
export function rotaPassoOrgao(chave: string): string {
  return `${PREFIXO_PASSO_ORGAO}${chave}`;
}

/** Frase terminada em ponto (o resumo da etapa junta a descrição e a atividade do guia). */
function comPonto(texto: string): string {
  const t = texto.trim();
  return !t || /[.!?]$/.test(t) ? t : `${t}.`;
}

/**
 * Trilha do órgão como a moldura usa, a partir da trilha resolvida pelo back-end
 * (só os passos ligados para o órgão, já numerados pela posição). O passo guarda
 * a resposta do back-end em `doOrgao`, com as seções e os campos que ele pede.
 */
export function trilhaDoOrgao(resolvida: PeTrilhaOrgao): TrilhaPe {
  return {
    perfil: 'orgao',
    nome: 'Órgão ou entidade',
    descricao: DESCRICAO_TRILHA_ORGAO,
    etapas: resolvida.Etapas.map(etapa => {
      const aparencia = aparenciaEtapa(etapa.Chave, etapa.Titulo);
      const guia = rotuloGuia(etapa.ReferenciaGuia ?? undefined);
      return {
        rotulo: aparencia.rotulo,
        titulo: etapa.Titulo,
        resumo: [comPonto(etapa.Descricao ?? ''), guia ? comPonto(guia) : ''].filter(Boolean).join(' '),
        icone: aparencia.icone,
        passos: etapa.Passos.map(passo => ({
          titulo: passo.Titulo,
          rota: rotaPassoOrgao(passo.Chave),
          oQueFazer: passo.OQueFazer,
          baseLegal: passo.BaseLegal ?? undefined,
          guia: passo.ReferenciaGuia ?? undefined,
          doOrgao: passo
        }))
      };
    })
  };
}

const TRILHAS: Record<PerfilCentralPe, TrilhaPe> = {
  admin: TRILHA_ADMIN,
  sgdi: TRILHA_SGDI,
  cgtic: TRILHA_CGTIC
};

export function trilhaDoPerfil(perfil: PerfilCentralPe): TrilhaPe {
  return TRILHAS[perfil];
}

/** Papel do módulo (`pe_*`) → trilha. Sem papel conhecido: null (fale com o administrador do módulo). */
export function perfilDoPapel(papel: string | null | undefined): PerfilTrilhaPe | null {
  switch (papel) {
    case 'pe_admin': return 'admin';
    case 'pe_sgdi': return 'sgdi';
    case 'pe_cgtic': return 'cgtic';
    case 'pe_orgao':
    case 'pe_orgao_consulta': return 'orgao';
    default: return null;
  }
}

/**
 * Todos os passos, numerados, na ordem da trilha. No órgão vale o número que o
 * back-end mandou (é o mesmo da posição, contado entre os passos ligados).
 */
export function passosNumerados(trilha: TrilhaPe): PassoNumeradoPe[] {
  const passos: PassoNumeradoPe[] = [];
  trilha.etapas.forEach((etapa, e) =>
    etapa.passos.forEach((passo, p) => {
      const doOrgao = passo.doOrgao;
      passos.push({
        ...passo,
        numero: doOrgao?.Numero || `${e + 1}.${p + 1}`,
        etapa: e,
        indice: passos.length,
        semTela: !!doOrgao && !TIPOS_PASSO_COM_TELA.has(doOrgao.Tipo)
      });
    }));
  return passos;
}

/**
 * Passo da URL. Dois passos podem usar a mesma tela: o `?passo=N.M` que a trilha
 * põe na navegação desempata; sem ele, vale o primeiro. Sem passo com a rota
 * exata, o passo com `subrotas` cuja rota começa o caminho (a página de um órgão
 * fica no passo da lista dos órgãos).
 */
export function passoDaUrl(passos: PassoNumeradoPe[], url: string): PassoNumeradoPe | null {
  const [caminho, query] = url.split('#')[0].split('?');
  const pedido = new URLSearchParams(query ?? '').get('passo');
  let candidatos = passos.filter(p => p.rota === caminho);
  if (!candidatos.length) candidatos = passos.filter(p => p.subrotas && caminho.startsWith(`${p.rota}/`));
  return candidatos.find(p => p.numero === pedido) ?? candidatos[0] ?? null;
}

/** "Guia de PDTIC: atividade 1.1", "atividades 2.8 a 2.11" ou o anexo como está. */
export function rotuloGuia(guia: string | undefined): string {
  if (!guia) return '';
  if (!/^\d/.test(guia)) return `Guia de PDTIC: ${guia}`;
  return / (a|e) /.test(guia) ? `Guia de PDTIC: atividades ${guia}` : `Guia de PDTIC: atividade ${guia}`;
}
