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
 * acesso ao módulo, situação do PETIC-DF e deliberações esperando o comitê.
 */
export type ChaveStatusPe = 'pedidos-acesso' | 'petic' | 'deliberacoes';

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
   * A tela do passo ainda não existe: tela central na "em construção"; passo do
   * órgão de um tipo que ganha tela nas próximas entregas (documento, fluxo,
   * aprovação, envio, deliberação, publicação e monitoramento).
   */
  emConstrucao: boolean;
}

export const BASE_PE = '/planejamento';

/** Rota dos passos do órgão: /planejamento/pdtic/{chave do passo no modelo}. */
export const PREFIXO_PASSO_ORGAO = `${BASE_PE}/pdtic/`;

/** Título da aba num passo do órgão enquanto a trilha não chegou (a tela do passo troca pelo título dele). */
export const TITULO_PASSO_GENERICO = 'Passo do PDTIC';

/** Telas centrais prontas; os demais passos centrais abrem a tela "em construção". */
export const ROTAS_PRONTAS: ReadonlySet<string> = new Set([
  `${BASE_PE}/pessoas`,
  `${BASE_PE}/modelo/niveis`,
  `${BASE_PE}/modelo/estrutura`,
  `${BASE_PE}/modelo/criterios`,
  `${BASE_PE}/modelo/documento`,
  `${BASE_PE}/orgaos/niveis`,
  `${BASE_PE}/referenciais/principios`,
  `${BASE_PE}/referenciais/petic`,
  `${BASE_PE}/referenciais/diretrizes`,
  `${BASE_PE}/cgtic/recebidos`,
  `${BASE_PE}/cgtic/deliberacao`,
  `${BASE_PE}/cgtic/historico`,
  `${BASE_PE}/comentarios`,
  `${BASE_PE}/consolidado`
]);

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
 * Telas centrais (administrador, SGDI e CGTIC) que ainda não existem: caminho sob
 * /planejamento e título da aba do navegador. Cada entrega troca o componente da
 * rota pela tela real.
 */
export const TELAS_CENTRAIS_EM_CONSTRUCAO: Readonly<Record<string, string>> = {
  'modelo/fluxos': 'Fluxos-modelo',
  'orgaos': 'Página do órgão',
  'painel': 'Painel e conformidade',
  'inadimplencia': 'Notificações e inadimplências'
};

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

const PAINEL: PassoTrilhaPe = {
  titulo: 'Veja o painel e a conformidade',
  rota: tela('painel'),
  oQueFazer: 'Acompanhe a situação do PDTIC de cada órgão (em elaboração, enviado, aprovado, publicado ou vencido) e veja quem cumpre cada item de conformidade.',
  baseLegal: 'art. 9º, IV, do Decreto nº 48.899/2026'
};

const INADIMPLENCIA: PassoTrilhaPe = {
  titulo: 'Registre notificações e inadimplências',
  rota: tela('inadimplencia'),
  oQueFazer: 'Registre a notificação do órgão que não comunicou o PDTIC aprovado. Passados 5 dias úteis sem regularização nem justificativa aceita, registre a inadimplência com o motivo.',
  baseLegal: 'art. 11 do Decreto nº 48.899/2026'
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
          oQueFazer: 'Revise os fluxos do Guia de PDTIC que os órgãos copiam e adaptam: elaboração, diagnóstico, planejamento e acompanhamento.',
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
      resumo: 'Painel, conformidade, notificações e inadimplência.',
      icone: 'insights',
      passos: [PAINEL, INADIMPLENCIA]
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
      resumo: 'Painel e conformidade dos órgãos e as deliberações do CGTIC.',
      icone: 'insights',
      passos: [
        PAINEL,
        {
          titulo: 'Acompanhe as deliberações do CGTIC',
          rota: tela('cgtic/historico'),
          oQueFazer: 'Veja o que foi enviado ao comitê de governança de TIC (CGTIC) e o que ele decidiu: o PETIC-DF agora e, numa próxima etapa, os PDTICs dos órgãos.',
          baseLegal: 'art. 5º'
        }
      ]
    },
    {
      rotulo: 'Análise',
      titulo: 'Analise os PDTICs',
      resumo: 'Página de cada órgão e comentários nos passos do PDTIC.',
      icone: 'fact_check',
      passos: [
        {
          titulo: 'Abra a página do órgão',
          rota: tela('orgaos'),
          oQueFazer: 'Veja tudo do órgão num lugar só: situação e versão do PDTIC, andamento da trilha, nível, aprovações, documentos e planilhas.',
          baseLegal: 'art. 9º, IV, do Decreto nº 48.899/2026'
        },
        {
          titulo: 'Comente os passos do órgão',
          rota: tela('comentarios'),
          oQueFazer: 'Escolha o órgão, abra a trilha dele e comente um passo do PDTIC. A equipe do órgão responde e marca o comentário como resolvido.',
          baseLegal: 'art. 9º, IX, do Decreto nº 48.899/2026'
        }
      ]
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
          oQueFazer: 'Veja o PETIC-DF e, numa próxima etapa, os PDTICs dos órgãos enviados para o comitê, e leia o que foi enviado.',
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
        emConstrucao: doOrgao ? !TIPOS_PASSO_COM_TELA.has(doOrgao.Tipo) : !ROTAS_PRONTAS.has(passo.rota)
      });
    }));
  return passos;
}

/**
 * Passo da URL. Dois passos podem usar a mesma tela (painel, inadimplência): o
 * `?passo=N.M` que a trilha põe na navegação desempata; sem ele, vale o primeiro.
 */
export function passoDaUrl(passos: PassoNumeradoPe[], url: string): PassoNumeradoPe | null {
  const [caminho, query] = url.split('#')[0].split('?');
  const pedido = new URLSearchParams(query ?? '').get('passo');
  const candidatos = passos.filter(p => p.rota === caminho);
  return candidatos.find(p => p.numero === pedido) ?? candidatos[0] ?? null;
}

/** Passo de qualquer trilha central com esta rota (para a tela "em construção" aberta fora da trilha). */
export function passoDeQualquerTrilha(caminho: string): PassoTrilhaPe | null {
  for (const perfil of PERFIS_CENTRAIS_PE) {
    for (const etapa of TRILHAS[perfil].etapas) {
      const passo = etapa.passos.find(p => p.rota === caminho);
      if (passo) return passo;
    }
  }
  return null;
}

/** "Guia de PDTIC: atividade 1.1", "atividades 2.8 a 2.11" ou o anexo como está. */
export function rotuloGuia(guia: string | undefined): string {
  if (!guia) return '';
  if (!/^\d/.test(guia)) return `Guia de PDTIC: ${guia}`;
  return / (a|e) /.test(guia) ? `Guia de PDTIC: atividades ${guia}` : `Guia de PDTIC: atividade ${guia}`;
}
