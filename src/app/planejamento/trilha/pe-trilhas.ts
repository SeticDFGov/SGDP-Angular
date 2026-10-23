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
  /** Só o que o título não diz, em uma ou duas frases; vazio quando o título basta (a moldura esconde o bloco). */
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
  /**
   * Passo com mais de uma tela (revisão de 2026-10-20: passos do mesmo assunto foram
   * juntados). A primeira é a da `rota`; a moldura liga todas na caixa do passo, e o
   * endereço de qualquer uma acende o passo.
   */
  telas?: TelaDoPassoPe[];
  /** Passo da trilha de um órgão, como o back-end resolveu (seções, campos, tipo e numeração). */
  doOrgao?: PePassoTrilha;
}

export interface TelaDoPassoPe {
  rota: string;
  /** Nome curto da tela (o link na caixa do passo). */
  titulo: string;
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
  orgao: 'Órgão (Equipe do PDTIC e Consulta do PDTIC)'
};

/** As trilhas centrais que o admin do SGDP escolhe em "Ver a trilha de" (a do órgão pede o órgão). */
export const PERFIS_CENTRAIS_PE: PerfilCentralPe[] = ['admin', 'sgdi', 'cgtic'];

const tela = (caminho: string) => `${BASE_PE}/${caminho}`;

// ── Passos que o administrador e a SGDI dividem ─────────────────────────────
// Revisão de 2026-10-20: passos sobre o mesmo assunto foram juntados (o painel com a
// conformidade; a página do órgão com a lista dos PDTICs para comentar). Cada tela
// que era destino de um passo continua no passo, em `telas`.

const PAINEL: PassoTrilhaPe = {
  titulo: 'Acompanhe o painel e a conformidade',
  rota: tela('painel'),
  telas: [
    { rota: tela('painel'), titulo: 'Painel dos órgãos' },
    { rota: tela('conformidade'), titulo: 'Conformidade' }
  ],
  oQueFazer: 'Cada número e cada alerta do painel abre a conformidade já filtrada, com os itens que cada órgão cumpre.',
  baseLegal: 'art. 9º, IV, do Decreto nº 48.899/2026'
};

const ARVORE_PETIC: PassoTrilhaPe = {
  titulo: 'Veja a árvore do PETIC-DF',
  rota: tela('arvore-petic'),
  oQueFazer: 'Para cada objetivo do PETIC-DF vigente, as necessidades e as metas que os órgãos ligaram a ele.',
  baseLegal: 'art. 12, § 1º'
};

const ORGAOS: PassoTrilhaPe = {
  titulo: 'Analise o PDTIC de cada órgão',
  rota: tela('orgaos'),
  telas: [
    { rota: tela('orgaos'), titulo: 'Página de cada órgão' },
    { rota: tela('comentarios'), titulo: 'PDTICs dos órgãos' }
  ],
  oQueFazer: 'A página do órgão reúne PDTIC, andamento, conformidade e documentos. Para comentar um passo, abra o passo a passo do órgão: '
    + 'a equipe do PDTIC responde.',
  baseLegal: 'art. 9º, IV e IX, do Decreto nº 48.899/2026',
  subrotas: true
};

const INADIMPLENCIA: PassoTrilhaPe = {
  titulo: 'Registre notificações e inadimplências',
  rota: tela('inadimplencia'),
  oQueFazer: 'Notifique o órgão que não comunicou o PDTIC aprovado. Sem regularização nem justificativa aceita em 5 dias úteis, '
    + 'registre a inadimplência; quando ele regularizar, o saneamento.',
  baseLegal: 'art. 11 do Decreto nº 48.899/2026',
  status: 'inadimplencias'
};

const CONSOLIDADO: PassoTrilhaPe = {
  titulo: 'Baixe as planilhas consolidadas',
  rota: tela('consolidado'),
  oQueFazer: 'Uma planilha por seção do PDTIC, com todos os órgãos: a base do portfólio estratégico de TIC do GDF.',
  baseLegal: 'art. 9º, V, do Decreto nº 48.899/2026'
};

// ── Administrador do módulo (pe_admin) ──────────────────────────────────────

const TRILHA_ADMIN: TrilhaPe = {
  perfil: 'admin',
  nome: 'Administrador do módulo',
  descricao: 'Você prepara o modelo que os órgãos seguem, cadastra os referenciais, dá acesso às pessoas e acompanha os órgãos. '
    + 'A SGDI coordena o monitoramento dos PDTICs e dá metodologia e modelos aos órgãos (art. 9º, IV e IX, do Decreto nº 48.899/2026).',
  etapas: [
    {
      rotulo: 'Modelo',
      titulo: 'Prepare o modelo',
      resumo: 'O que cada nível pede e como o PDTIC é montado.',
      icone: 'tune',
      passos: [
        {
          titulo: 'Defina os níveis de maturidade',
          rota: tela('modelo/niveis'),
          oQueFazer: 'Escolha também o modo: no livre, o nível sai do que o PDTIC tem; no definido, você escolhe o nível de cada órgão.',
          baseLegal: 'art. 9º, X, do Decreto nº 48.899/2026'
        },
        {
          titulo: 'Monte a estrutura do PDTIC',
          rota: tela('modelo/estrutura'),
          telas: [
            { rota: tela('modelo/estrutura'), titulo: 'Etapas, passos, seções e campos' },
            { rota: tela('modelo/criterios'), titulo: 'Critérios de priorização' }
          ],
          oQueFazer: 'Ligue, desligue e crie passos, seções e campos em cada nível; os nove conteúdos mínimos ficam travados. '
            + 'Os critérios de priorização ordenam as necessidades (o padrão é a matriz GUT).',
          baseLegal: 'art. 12, § 2º',
          guia: '3.1'
        },
        {
          titulo: 'Ajuste o documento e os fluxos-modelo',
          rota: tela('modelo/documento'),
          telas: [
            { rota: tela('modelo/documento'), titulo: 'Modelos dos documentos' },
            { rota: tela('modelo/fluxos'), titulo: 'Fluxos-modelo' }
          ],
          oQueFazer: 'Cada órgão recebe uma cópia: o texto e o fluxo que ele não mudou acompanham o modelo. Nos fluxos, arraste os blocos '
            + 'ou use o modo em lista.',
          baseLegal: 'art. 9º, IX, do Decreto nº 48.899/2026'
        }
      ]
    },
    {
      rotulo: 'Referenciais',
      titulo: 'Cadastre os referenciais',
      resumo: 'Princípios, PETIC-DF e diretrizes do ciclo, que os órgãos seguem no PDTIC.',
      icone: 'menu_book',
      passos: [
        {
          titulo: 'Revise princípios e diretrizes do ciclo',
          rota: tela('referenciais/principios'),
          telas: [
            { rota: tela('referenciais/principios'), titulo: 'Princípios da política' },
            { rota: tela('referenciais/diretrizes'), titulo: 'Diretrizes do ciclo' }
          ],
          oQueFazer: 'Os onze princípios do art. 4º entram no PDTIC de cada órgão. Publique as diretrizes do próximo ciclo antes de os órgãos '
            + 'começarem a elaborar.',
          baseLegal: 'art. 4º; art. 9º, VIII, do Decreto nº 48.899/2026'
        },
        {
          titulo: 'Cadastre o PETIC-DF',
          rota: tela('referenciais/petic'),
          oQueFazer: 'Registre num rascunho diretrizes, objetivos, prioridades, indicadores e iniciativas e envie ao CGTIC, que aprova.',
          baseLegal: 'art. 11, § 1º',
          status: 'petic'
        }
      ]
    },
    {
      rotulo: 'Acessos',
      titulo: 'Dê acesso',
      resumo: 'Pedidos de acesso, papéis e o nível de cada órgão.',
      icone: 'manage_accounts',
      passos: [
        {
          titulo: 'Responda aos pedidos e defina os papéis',
          rota: tela('pessoas'),
          oQueFazer: 'Papéis: administrador do módulo, equipe da SGDI, Secretaria do CGTIC, equipe do PDTIC e Consulta do PDTIC.',
          status: 'pedidos-acesso'
        },
        {
          // F3: neutro quanto ao modo dos níveis (no livre, o nível é calculado; no definido, o administrador escolhe)
          titulo: 'Acompanhe o nível de cada órgão',
          rota: tela('orgaos/niveis'),
          oQueFazer: 'No modo livre, o nível sai do que o PDTIC tem; no definido, você o escolhe, com justificativa. Aqui também se ajusta '
            + 'um passo, uma seção ou um campo para um órgão.',
          baseLegal: 'art. 9º, X, do Decreto nº 48.899/2026'
        }
      ]
    },
    {
      rotulo: 'Acompanhamento',
      titulo: 'Acompanhe os órgãos',
      resumo: 'Painel, conformidade, árvore do PETIC-DF, PDTIC de cada órgão, inadimplências e planilhas consolidadas.',
      icone: 'insights',
      passos: [PAINEL, ARVORE_PETIC, ORGAOS, INADIMPLENCIA, CONSOLIDADO]
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
      titulo: 'Acompanhe os órgãos',
      resumo: 'Painel, conformidade, árvore do PETIC-DF, deliberações do CGTIC e planilhas consolidadas.',
      icone: 'insights',
      passos: [
        PAINEL,
        ARVORE_PETIC,
        {
          titulo: 'Acompanhe as deliberações do CGTIC',
          rota: tela('cgtic/historico'),
          oQueFazer: 'Os PDTICs dos órgãos e o PETIC-DF enviados ao comitê, com o ato de cada decisão.',
          baseLegal: 'art. 5º'
        },
        CONSOLIDADO
      ]
    },
    {
      rotulo: 'Órgãos',
      titulo: 'Analise e cobre os órgãos',
      resumo: 'PDTIC de cada órgão, comentários nos passos, notificações e inadimplências.',
      icone: 'fact_check',
      passos: [ORGAOS, INADIMPLENCIA]
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
      rotulo: 'Deliberação',
      titulo: 'Registre as deliberações',
      resumo: 'PDTICs e PETIC-DF enviados ao comitê e a decisão de cada um.',
      icone: 'gavel',
      passos: [
        {
          titulo: 'Registre as decisões do comitê',
          rota: tela('cgtic/recebidos'),
          telas: [
            { rota: tela('cgtic/recebidos'), titulo: 'O que chegou para o comitê' },
            { rota: tela('cgtic/deliberacao'), titulo: 'Registro da deliberação' }
          ],
          oQueFazer: 'Leia o que chegou (o PDF de cada PDTIC e o PETIC-DF) e registre a decisão da reunião: aprovado, com o ato e a data, '
            + 'ou devolvido, com o que ajustar.',
          baseLegal: 'arts. 5º e 10',
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
          oQueFazer: 'Inclui o que o comitê pediu em cada devolução.',
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
          oQueFazer: (passo.OQueFazer ?? '').trim(),
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
 * exata, o passo que tem a tela entre as `telas` dele e, por fim, o passo com
 * `subrotas` cuja rota começa o caminho (a página de um órgão fica no passo da
 * lista dos órgãos).
 */
export function passoDaUrl(passos: PassoNumeradoPe[], url: string): PassoNumeradoPe | null {
  const [caminho, query] = url.split('#')[0].split('?');
  const pedido = new URLSearchParams(query ?? '').get('passo');
  let candidatos = passos.filter(p => p.rota === caminho);
  if (!candidatos.length) candidatos = passos.filter(p => p.telas?.some(t => t.rota === caminho));
  if (!candidatos.length) candidatos = passos.filter(p => p.subrotas && caminho.startsWith(`${p.rota}/`));
  return candidatos.find(p => p.numero === pedido) ?? candidatos[0] ?? null;
}

/**
 * "Guia de PDTIC: atividade 1.1", "atividades 1.1 e 1.2", "atividades 2.8 a 2.11" ou o
 * anexo como está. Aceita também a lista (o passo do órgão pode cobrir mais de uma
 * atividade): ["1.1", "1.2"] vira "atividades 1.1 e 1.2".
 */
export function rotuloGuia(guia: string | readonly string[] | null | undefined): string {
  const lista = Array.isArray(guia) ? guia.map(g => String(g ?? '').trim()).filter(Boolean) : null;
  const texto = lista ? juntarComE(lista) : String(guia ?? '').trim();
  if (!texto) return '';
  if (!/^\d/.test(texto)) return `Guia de PDTIC: ${texto}`;
  const varias = (lista?.length ?? 0) > 1 || /[,;]| a | e /.test(texto);
  return `Guia de PDTIC: ${varias ? 'atividades' : 'atividade'} ${texto}`;
}

/** "1.1", "1.1 e 1.2", "1.1, 1.2 e 1.3". */
function juntarComE(itens: string[]): string {
  return itens.length <= 1 ? (itens[0] ?? '') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}
