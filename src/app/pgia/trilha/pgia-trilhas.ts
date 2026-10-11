/**
 * Trilhas do PGIA: o que cada papel faz, em ordem e numerado, amarrado ao
 * Decreto nº 48.901/2026. É só configuração (textos, rotas e a chave do status);
 * as telas continuam as mesmas, uma por formulário; a trilha é o caminho entre elas.
 *
 * Numeração: etapa N, passo N.M (pela posição). Os textos seguem a linguagem
 * simples das telas do módulo: frases curtas, voz ativa, siglas explicadas.
 * A base legal é citada no formato que a diretiva `citaDecreto` transforma em chip.
 */

/** Papel efetivo na trilha (admin escolhe qual quer ver). */
export type PerfilTrilha = 'orgao' | 'sgdi' | 'cgtic' | 'auditoria' | 'agente';

/** Status calculado a partir dos dados (ver PgiaTrilhaStatusService). */
export type ChaveStatus =
  | 'responsavel' | 'encarregado' | 'inventario' | 'aia' | 'capacitacao' | 'legados'
  | 'fila-sgdi' | 'apuracao' | 'guia' | 'anual' | 'casos-cgtic' | 'auditorias' | 'pedidos-acesso';

export interface PassoTrilha {
  /** Ação no imperativo: "Designe o Responsável de IA". */
  titulo: string;
  rota: string;
  /** Uma ou duas frases: o que a pessoa faz nesta tela. */
  oQueFazer: string;
  /** Citação do decreto ("arts. 10 e 35, I"). */
  baseLegal: string;
  /** Chave do status calculado; sem ela o passo é contínuo (sem prazo). */
  status?: ChaveStatus;
}

export interface EtapaTrilha {
  /** Rótulo curto (barra de etapas). */
  rotulo: string;
  /** Título completo, no imperativo. */
  titulo: string;
  resumo: string;
  icone: string;
  passos: PassoTrilha[];
}

export interface AtalhoTrilha {
  rotulo: string;
  rota: string;
  icone: string;
}

export interface TrilhaPgia {
  perfil: PerfilTrilha;
  nome: string;
  descricao: string;
  etapas: EtapaTrilha[];
  atalhos: AtalhoTrilha[];
}

/** Passo com a numeração e a posição na trilha. */
export interface PassoNumerado extends PassoTrilha {
  numero: string;
  etapa: number;
  indice: number;
}

export const ROTULOS_PERFIL_TRILHA: Record<PerfilTrilha, string> = {
  orgao: 'Órgão ou entidade (Responsável de IA e equipe)',
  sgdi: 'SGDI (órgão central)',
  cgtic: 'CGTIC (secretaria do comitê)',
  auditoria: 'Auditoria externa',
  agente: 'Agente público (art. 13)'
};

const PRAZOS: AtalhoTrilha = { rotulo: 'Prazos do decreto', rota: '/pgia/prazos', icone: 'event_available' };

// ── Órgão ou entidade (pgia_orgao) ──────────────────────────────────────────

function trilhaOrgao(admin: boolean): TrilhaPgia {
  // O papel de órgão não edita os dados do órgão (quem preenche é a SGDI): o
  // passo de conferência dos dados só aparece para o admin
  const conferirDados: PassoTrilha[] = admin
    ? [{
        titulo: 'Confira os dados do órgão',
        rota: '/pgia/orgao/dados',
        oQueFazer: 'A SGDI preenche a identificação do órgão. Confira nome, natureza jurídica e unidade antes das designações.',
        baseLegal: 'art. 8º, I'
      }]
    : [];

  return {
    perfil: 'orgao',
    nome: 'Órgão ou entidade',
    descricao: 'Seu órgão responde pelo uso de IA na própria casa: designa os responsáveis, mantém o inventário dos sistemas, '
      + 'capacita as pessoas e presta contas à SGDI (arts. 9º, 10 e 11). Siga as etapas na ordem: as primeiras têm prazo.',
    etapas: [
      {
        rotulo: 'Equipe',
        titulo: 'Monte a equipe de governança',
        resumo: 'Designe quem responde pela IA e pelos dados pessoais no órgão.',
        icone: 'groups',
        passos: [
          ...conferirDados,
          {
            titulo: 'Confira as pessoas do órgão',
            rota: '/pgia/orgao/pessoas',
            oQueFazer: 'Veja quem já tem acesso ao sistema pelo seu órgão. A SGDI cadastra as pessoas; se faltar alguém, peça à SGDI.',
            baseLegal: 'art. 8º, I'
          },
          {
            titulo: 'Designe o Responsável de IA',
            rota: '/pgia/orgao/responsavel-ia',
            oQueFazer: 'Indique quem lidera o uso responsável de IA no órgão e anexe a portaria. Comunique a designação à SGDI pelo SEI.',
            baseLegal: 'arts. 10 e 35, I',
            status: 'responsavel'
          },
          {
            titulo: 'Designe o Encarregado de Dados (DPO)',
            rota: '/pgia/orgao/encarregado-dados',
            oQueFazer: 'Indique quem cuida da proteção de dados pessoais nos sistemas de IA, junto com o Responsável de IA.',
            baseLegal: 'arts. 11 e 35, I',
            status: 'encarregado'
          }
        ]
      },
      {
        rotulo: 'Inventário e riscos',
        titulo: 'Faça o inventário e classifique os riscos',
        resumo: 'Registre cada sistema de IA do órgão e responda ao questionário de riscos.',
        icone: 'inventory_2',
        passos: [
          {
            titulo: 'Cadastre cada sistema de IA',
            rota: '/pgia/sistemas/cadastro',
            oQueFazer: 'Faça um cadastro por sistema em uso, em desenvolvimento ou em compra. O questionário define o nível de risco.',
            baseLegal: 'arts. 10, II, 14 a 18 e 35, II',
            status: 'inventario'
          },
          {
            titulo: 'Acompanhe a homologação',
            rota: '/pgia/sistemas/lista',
            oQueFazer: 'Confira a situação de cada sistema: a SGDI avalia os de risco Baixo e Moderado; o CGTIC delibera sobre os de Alto Risco.',
            baseLegal: 'arts. 7º, IV e 8º, II'
          }
        ]
      },
      {
        rotulo: 'Avaliação de impacto',
        titulo: 'Avalie o impacto dos sistemas de Alto Risco',
        resumo: 'Sistema de Alto Risco só opera com AIA, aprovação do CGTIC e publicação do resultado.',
        icone: 'fact_check',
        passos: [
          {
            titulo: 'Faça a Avaliação de Impacto Algorítmico (AIA)',
            rota: '/pgia/sistemas/lista',
            oQueFazer: 'Na lista, abra "Avaliação de impacto" no sistema de Alto Risco e registre a AIA com o arquivo completo.',
            baseLegal: 'arts. 16, § 1º, 22 e 35, IV',
            status: 'aia'
          }
        ]
      },
      {
        rotulo: 'Capacitação',
        titulo: 'Capacite as pessoas',
        resumo: 'Inclua as trilhas do ProCapIA/DF no plano de capacitação e registre quem concluiu.',
        icone: 'school',
        passos: [
          {
            titulo: 'Registre as capacitações',
            rota: '/pgia/capacitacao',
            oQueFazer: 'Registre uma trilha por pessoa, no nível da função dela: letramento, uso responsável, governança ou desenvolvimento e auditoria.',
            baseLegal: 'arts. 10, III, 28, 29 e 35, III',
            status: 'capacitacao'
          }
        ]
      },
      {
        rotulo: 'Contratações',
        titulo: 'Cuide das contratações de IA',
        resumo: 'Contrato de IA precisa das cláusulas do decreto; os anteriores a ele precisam de revisão.',
        icone: 'gavel',
        passos: [
          {
            titulo: 'Registre os contratos de IA',
            rota: '/pgia/contratacoes/contratos',
            oQueFazer: 'Informe cada contrato e confirme as cláusulas obrigatórias, como a vedação ao uso dos dados do GDF para treinar modelos.',
            baseLegal: 'arts. 21, 25 e 27'
          },
          {
            titulo: 'Revise contratos e atos anteriores ao decreto',
            rota: '/pgia/contratacoes/legados',
            oQueFazer: 'Registre a triagem de cada contrato ou ato assinado antes de 03/07/2026 e o aditivo, quando for preciso.',
            baseLegal: 'art. 37',
            status: 'legados'
          }
        ]
      },
      {
        rotulo: 'Dia a dia',
        titulo: 'Opere no dia a dia',
        resumo: 'Registre o uso de IA, avise sobre problemas e trate os incidentes.',
        icone: 'published_with_changes',
        passos: [
          {
            titulo: 'Registre o uso de IA nos trabalhos',
            rota: '/pgia/uso',
            oQueFazer: 'Todo trabalho feito com apoio de IA é registrado, com a revisão humana feita antes do uso.',
            baseLegal: 'art. 13, IV e V'
          },
          {
            titulo: 'Avise sobre um problema',
            rota: '/pgia/incidentes/aviso',
            oQueFazer: 'Percebeu dano ou risco causado por um sistema de IA? Avise o Responsável de IA.',
            baseLegal: 'art. 13, II'
          },
          {
            titulo: 'Comunique o incidente grave à SGDI',
            rota: '/pgia/incidentes/comunicacao',
            oQueFazer: 'O Responsável de IA formaliza a comunicação do incidente grave pelo SEI.',
            baseLegal: 'arts. 10, IV e 30'
          },
          {
            titulo: 'Acompanhe os incidentes do órgão',
            rota: '/pgia/incidentes/acompanhamento',
            oQueFazer: 'Veja o que a SGDI apurou e registre as medidas adotadas pelo órgão.',
            baseLegal: 'art. 30, parágrafo único'
          },
          {
            titulo: 'Trate as não conformidades',
            rota: '/pgia/incidentes/nao-conformidades',
            oQueFazer: 'Registre os descumprimentos da política no órgão e a correção de cada um.',
            baseLegal: 'art. 9º, II'
          }
        ]
      },
      {
        rotulo: 'Prestação de contas',
        titulo: 'Preste contas e atenda o cidadão',
        resumo: 'Indicadores, relatório semestral à SGDI e resposta aos pedidos dos cidadãos.',
        icone: 'insights',
        passos: [
          {
            titulo: 'Registre os indicadores de desempenho',
            rota: '/pgia/relatorios/indicadores',
            oQueFazer: 'Meça os sistemas de tempos em tempos, principalmente os de Alto Risco. Os indicadores vão para o Registro Público.',
            baseLegal: 'arts. 24, V e 31'
          },
          {
            titulo: 'Envie o relatório semestral',
            rota: '/pgia/relatorios/semestrais',
            oQueFazer: 'Gere o relatório do semestre, confira e envie à SGDI pelo SEI até o fim do mês seguinte.',
            baseLegal: 'art. 32'
          },
          {
            titulo: 'Responda às solicitações do cidadão',
            rota: '/pgia/solicitacoes',
            oQueFazer: 'Responda aos pedidos de informação, explicação, revisão ou impugnação de decisões tomadas com apoio de IA.',
            baseLegal: 'art. 23'
          }
        ]
      }
    ],
    atalhos: [PRAZOS]
  };
}

// ── SGDI, órgão central (pgia_sgdi) ────────────────────────────────────────

const TRILHA_SGDI: TrilhaPgia = {
  perfil: 'sgdi',
  nome: 'SGDI (órgão central)',
  descricao: 'A SGDI formula, normatiza e supervisiona a política em todos os órgãos: entrega cada órgão cadastrado, '
    + 'publica as regras, avalia o inventário, dá transparência e acompanha incidentes, auditorias e relatórios (art. 8º).',
  etapas: [
    {
      rotulo: 'Cadastro inicial',
      titulo: 'Cadastre os órgãos e as pessoas',
      resumo: 'Entregue cada órgão pronto: dados, pessoas e acessos.',
      icone: 'app_registration',
      passos: [
        {
          titulo: 'Complete os dados dos órgãos',
          rota: '/pgia/sgdi/orgaos-dados',
          oQueFazer: 'Cadastre o órgão ou complete os dados do que entrou pelo login, e ligue cada um à unidade dele.',
          baseLegal: 'art. 8º, I'
        },
        {
          titulo: 'Dê acesso às pessoas',
          rota: '/pgia/sgdi/pessoas',
          oQueFazer: 'Responda aos pedidos de acesso ao PGIA e defina o papel de cada pessoa e o órgão dela. Sem papel, a pessoa atua como agente: registra uso de IA e avisa incidentes.',
          baseLegal: 'arts. 3º e 8º, I',
          status: 'pedidos-acesso'
        }
      ]
    },
    {
      rotulo: 'Regras',
      titulo: 'Publique as regras',
      resumo: 'Plataformas homologadas, normas complementares e autorizações excepcionais.',
      icone: 'menu_book',
      passos: [
        {
          titulo: 'Homologue as plataformas de IA generativa',
          rota: '/pgia/sgdi/plataformas',
          oQueFazer: 'Mantenha a lista das plataformas que os agentes podem usar, indicando as aptas a dados pessoais ou sigilosos.',
          baseLegal: 'arts. 8º, IV, 18 e 20'
        },
        {
          titulo: 'Publique as normas complementares',
          rota: '/pgia/sgdi/normas',
          oQueFazer: 'Registre as normas, os guias e as instruções da SGDI, como o Guia de Contratações de IA aprovado pelo CGTIC.',
          baseLegal: 'arts. 8º, III, 26 e 36',
          status: 'guia'
        },
        {
          titulo: 'Registre as autorizações excepcionais',
          rota: '/pgia/sgdi/autorizacoes',
          oQueFazer: 'Quando cabível, autorize o uso de plataforma pública com dados não públicos, com a avaliação de riscos anexada.',
          baseLegal: 'arts. 18, § 2º e 21'
        }
      ]
    },
    {
      rotulo: 'Homologação',
      titulo: 'Avalie o inventário dos órgãos',
      resumo: 'Os sistemas enviados pelos órgãos passam pela SGDI ou pelo CGTIC.',
      icone: 'fact_check',
      passos: [
        {
          titulo: 'Avalie a fila de homologação',
          rota: '/pgia/sgdi/fila',
          oQueFazer: 'Aprove ou vete com parecer os sistemas de risco Baixo e Moderado. Os de Alto Risco e de Risco Excessivo seguem para o CGTIC.',
          baseLegal: 'arts. 8º, V e 25, II, b',
          status: 'fila-sgdi'
        }
      ]
    },
    {
      rotulo: 'Transparência',
      titulo: 'Dê transparência',
      resumo: 'Registro Público de Sistemas de IA e resultados das AIA no Portal da Transparência.',
      icone: 'public',
      passos: [
        {
          titulo: 'Publique no Registro Público',
          rota: '/pgia/sgdi/registro-publico',
          oQueFazer: 'Publique cada sistema com as informações que o decreto exige: finalidade, órgão, risco e efeitos sobre o cidadão.',
          baseLegal: 'art. 24'
        },
        {
          titulo: 'Publique as AIA',
          rota: '/pgia/sgdi/aia',
          oQueFazer: 'Registre a publicação do resultado da AIA de cada sistema de Alto Risco.',
          baseLegal: 'arts. 16, § 1º e 24, IV'
        }
      ]
    },
    {
      rotulo: 'Supervisão',
      titulo: 'Supervisione continuamente',
      resumo: 'Incidentes graves, não conformidades e auditorias técnicas.',
      icone: 'monitoring',
      passos: [
        {
          titulo: 'Apure os incidentes comunicados',
          rota: '/pgia/sgdi/apuracao',
          oQueFazer: 'Avalie a gravidade de cada incidente e recomende medidas ao órgão ou proponha ao CGTIC, inclusive a suspensão.',
          baseLegal: 'arts. 8º, IX e 30, parágrafo único',
          status: 'apuracao'
        },
        {
          titulo: 'Registre as não conformidades',
          rota: '/pgia/sgdi/nao-conformidades',
          oQueFazer: 'Registre os descumprimentos achados na supervisão e comunique ao controle interno quando for o caso.',
          baseLegal: 'arts. 8º, X e 9º, II'
        },
        {
          titulo: 'Designe as auditorias técnicas',
          rota: '/pgia/sgdi/auditorias',
          oQueFazer: 'Designe a entidade auditora externa dos sistemas de Alto Risco e publique o resultado.',
          baseLegal: 'arts. 25, § 2º e 34'
        }
      ]
    },
    {
      rotulo: 'Relatórios',
      titulo: 'Consolide os relatórios',
      resumo: 'Relatórios semestrais dos órgãos e o Relatório Anual de Governança de IA.',
      icone: 'summarize',
      passos: [
        {
          titulo: 'Acompanhe os relatórios semestrais',
          rota: '/pgia/sgdi/semestrais',
          oQueFazer: 'Confira quem enviou no prazo. A inadimplência vai ao painel e é comunicada ao controle interno.',
          baseLegal: 'art. 32'
        },
        {
          titulo: 'Publique o Relatório Anual',
          rota: '/pgia/sgdi/anual',
          oQueFazer: 'Publique até 31 de março o relatório do ano anterior, que o CGTIC aprecia.',
          baseLegal: 'arts. 7º, VII e 33',
          status: 'anual'
        }
      ]
    }
  ],
  atalhos: [PRAZOS]
};

// ── CGTIC, secretaria do comitê (pgia_cgtic) ───────────────────────────────

const TRILHA_CGTIC: TrilhaPgia = {
  perfil: 'cgtic',
  nome: 'CGTIC (secretaria do comitê)',
  descricao: 'O comitê delibera sobre os sistemas de Alto Risco e aprova as diretrizes da política. Nenhum sistema de Alto Risco '
    + 'é contratado ou implantado sem aprovação prévia do comitê (arts. 7º, IV e 16, § 1º).',
  etapas: [
    {
      rotulo: 'Deliberação',
      titulo: 'Delibere sobre os casos',
      resumo: 'Sistemas de Alto Risco e de Risco Excessivo aguardam a decisão do comitê.',
      icone: 'gavel',
      passos: [
        {
          titulo: 'Analise os casos delegados ao comitê',
          rota: '/pgia/cgtic/casos',
          oQueFazer: 'Abra cada caso para ver o questionário, os pesos e a pontuação. "Preparar deliberação" já leva ao formulário do caso.',
          baseLegal: 'arts. 7º, IV e 16, § 1º',
          status: 'casos-cgtic'
        },
        {
          titulo: 'Registre a deliberação e anexe a ata',
          rota: '/pgia/cgtic/deliberacoes',
          oQueFazer: 'Registre a decisão tomada em reunião e anexe a ata.',
          baseLegal: 'art. 7º'
        }
      ]
    },
    {
      rotulo: 'Histórico',
      titulo: 'Preste contas das decisões',
      resumo: 'Histórico das decisões do comitê, na tela e em PDF.',
      icone: 'history',
      passos: [
        {
          titulo: 'Consulte o histórico de decisões',
          rota: '/pgia/cgtic/historico',
          oQueFazer: 'Filtre por situação e gere o PDF para a auditoria.',
          baseLegal: 'art. 7º'
        }
      ]
    }
  ],
  atalhos: []
};

// ── Auditoria externa (pgia_auditoria) ──────────────────────────────────────

const TRILHA_AUDITORIA: TrilhaPgia = {
  perfil: 'auditoria',
  nome: 'Auditoria externa',
  descricao: 'A entidade auditora, externa ao fornecedor, avalia os sistemas de Alto Risco designados pela SGDI, na forma '
    + 'definida pelo CGTIC (arts. 25, § 2º e 34).',
  etapas: [
    {
      rotulo: 'Auditorias',
      titulo: 'Audite os sistemas designados',
      resumo: 'Parecer e datas de cada auditoria designada a você.',
      icone: 'fact_check',
      passos: [
        {
          titulo: 'Entregue o parecer das auditorias',
          rota: '/pgia/auditoria',
          oQueFazer: 'Veja as auditorias designadas a você e registre o parecer e as datas.',
          baseLegal: 'arts. 25, § 2º e 34',
          status: 'auditorias'
        }
      ]
    }
  ],
  atalhos: []
};

// ── Agente público sem papel (art. 13) ──────────────────────────────────────

const TRILHA_AGENTE: TrilhaPgia = {
  perfil: 'agente',
  nome: 'Agente público',
  descricao: 'Todo servidor, estagiário ou prestador de serviço que usa IA no trabalho registra esse uso e avisa sobre '
    + 'problemas com sistemas de IA (arts. 3º e 13).',
  etapas: [
    {
      rotulo: 'Uso responsável',
      titulo: 'Use IA com responsabilidade',
      resumo: 'Registre o uso de IA e avise sobre problemas.',
      icone: 'edit_note',
      passos: [
        {
          titulo: 'Registre o uso de IA em um trabalho',
          rota: '/pgia/uso',
          oQueFazer: 'Informe a ferramenta, o trabalho e a revisão humana que você fez. Leva menos de um minuto.',
          baseLegal: 'art. 13, IV e V'
        },
        {
          titulo: 'Avise sobre um problema',
          rota: '/pgia/incidentes/aviso',
          oQueFazer: 'Percebeu dano ou risco causado por um sistema de IA? Avise o Responsável de IA do seu órgão.',
          baseLegal: 'art. 13, II'
        }
      ]
    }
  ],
  atalhos: []
};

export function trilhaDoPerfil(perfil: PerfilTrilha, admin: boolean): TrilhaPgia {
  switch (perfil) {
    case 'orgao': return trilhaOrgao(admin);
    case 'sgdi': return TRILHA_SGDI;
    case 'cgtic': return TRILHA_CGTIC;
    case 'auditoria': return TRILHA_AUDITORIA;
    default: return TRILHA_AGENTE;
  }
}

/** Papel PGIA (Users.PapelPgia) → trilha. Sem papel = agente público (art. 13). */
export function perfilDoPapel(papelPgia: string | null | undefined): PerfilTrilha {
  switch (papelPgia) {
    case 'pgia_orgao': return 'orgao';
    case 'pgia_sgdi': return 'sgdi';
    case 'pgia_cgtic': return 'cgtic';
    case 'pgia_auditoria': return 'auditoria';
    default: return 'agente';
  }
}

export const PERFIS_TRILHA: PerfilTrilha[] = ['orgao', 'sgdi', 'cgtic', 'auditoria', 'agente'];

/** Todos os passos, numerados, na ordem da trilha. */
export function passosNumerados(trilha: TrilhaPgia): PassoNumerado[] {
  const passos: PassoNumerado[] = [];
  trilha.etapas.forEach((etapa, e) =>
    etapa.passos.forEach((passo, p) =>
      passos.push({ ...passo, numero: `${e + 1}.${p + 1}`, etapa: e, indice: passos.length })));
  return passos;
}
