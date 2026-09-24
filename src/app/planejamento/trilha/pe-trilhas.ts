/**
 * Trilhas da Governança Estratégica: o que cada papel faz, em ordem e numerado,
 * amarrado ao Decreto nº 48.900/2026 (PGTIC/DF), ao Decreto nº 48.899/2026
 * (competências da SGDI) e ao Guia de PDTIC do SISP. Só configuração (textos,
 * rotas e a chave do status), no molde de `pgia/trilha/pgia-trilhas.ts`.
 *
 * Nesta entrega as trilhas são estáticas. A do órgão passa a vir do modelo
 * configurado no back-end (nível do órgão, ajustes e "não se aplica") na E2; os
 * títulos, o "o que fazer", a base legal e a atividade do guia abaixo são os do
 * nível Avançado da seção 7 do plano.
 *
 * Numeração: etapa N, passo N.M (pela posição). Base legal no formato que o
 * `citaPlanejamento` transforma em chip: sem nome, é o Decreto nº 48.900/2026;
 * o outro decreto vem com o nome logo depois ("art. 7º, V, do Decreto nº
 * 48.899/2026").
 */

/** Trilha efetiva (o admin do SGDP escolhe qual quer ver). */
export type PerfilTrilhaPe = 'admin' | 'sgdi' | 'cgtic' | 'orgao';

/** Status calculado a partir dos dados (ver PeTrilhaStatusService). */
export type ChaveStatusPe = 'pedidos-acesso';

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
  /** A tela do passo ainda não existe: abre a tela "em construção". */
  emConstrucao: boolean;
}

export const BASE_PE = '/planejamento';

/** Telas prontas nesta entrega; os demais passos abrem a tela "em construção". */
export const ROTAS_PRONTAS: ReadonlySet<string> = new Set([`${BASE_PE}/pessoas`]);

/**
 * Telas centrais (administrador, SGDI e CGTIC) que ainda não existem: caminho sob
 * /planejamento e título da aba do navegador. Cada entrega troca o componente da
 * rota pela tela real.
 */
export const TELAS_CENTRAIS_EM_CONSTRUCAO: Readonly<Record<string, string>> = {
  'modelo/niveis': 'Níveis de maturidade',
  'modelo/estrutura': 'Etapas, passos, seções e campos',
  'modelo/documento': 'Modelo do documento',
  'modelo/fluxos': 'Fluxos-modelo',
  'referenciais/principios': 'Princípios da política',
  'referenciais/petic': 'PETIC-DF',
  'referenciais/diretrizes': 'Diretrizes do ciclo',
  'orgaos/niveis': 'Nível de cada órgão',
  'orgaos': 'Página do órgão',
  'comentarios': 'Comentários nos passos',
  'painel': 'Painel e conformidade',
  'inadimplencia': 'Notificações e inadimplências',
  'consolidado': 'Planilhas consolidadas',
  'cgtic/recebidos': 'PDTICs e PETIC enviados ao comitê',
  'cgtic/deliberacao': 'Deliberação do comitê',
  'cgtic/historico': 'Histórico das deliberações'
};

export const ROTULOS_PERFIL_TRILHA_PE: Record<PerfilTrilhaPe, string> = {
  admin: 'Administrador do módulo',
  sgdi: 'Equipe da SGDI',
  cgtic: 'Secretaria do CGTIC',
  orgao: 'Órgão (equipe e consulta)'
};

export const PERFIS_TRILHA_PE: PerfilTrilhaPe[] = ['admin', 'sgdi', 'cgtic', 'orgao'];

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
          oQueFazer: 'Diga o que cada nível pede: Básico, Intermediário e Avançado. O nível do órgão define os passos e os campos que ele preenche.',
          baseLegal: 'art. 9º, X, do Decreto nº 48.899/2026'
        },
        {
          titulo: 'Monte etapas, passos, seções e campos',
          rota: tela('modelo/estrutura'),
          oQueFazer: 'Ligue, desligue, renomeie e crie passos, seções e campos da trilha do órgão. Os nove conteúdos mínimos do PDTIC ficam travados em todos os níveis.',
          baseLegal: 'art. 12, § 2º'
        },
        {
          titulo: 'Ajuste o modelo do documento',
          rota: tela('modelo/documento'),
          oQueFazer: 'Edite os capítulos e os textos-padrão do documento do PDTIC. Cada órgão recebe uma cópia no começo do ciclo.',
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
          oQueFazer: 'Registre as diretrizes, os objetivos estratégicos, as prioridades, os indicadores e as iniciativas do Plano Estratégico de TIC do DF (PETIC-DF).',
          baseLegal: 'art. 11, § 1º'
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
          oQueFazer: 'Escolha o nível de maturidade de cada órgão, com a justificativa. O histórico dos níveis ajuda no Relatório de Maturidade.',
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
      resumo: 'Painel e conformidade dos órgãos.',
      icone: 'insights',
      passos: [PAINEL]
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
          oQueFazer: 'Comente um passo do PDTIC do órgão. A equipe do órgão responde e marca o comentário como resolvido.',
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
          oQueFazer: 'Veja os PDTICs dos órgãos e o PETIC-DF enviados para o comitê, com o documento de cada um.',
          baseLegal: 'art. 5º'
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
          oQueFazer: 'Registre a decisão tomada em reunião, aprovado ou devolvido com ajustes, e anexe a resolução ou a ata.',
          baseLegal: 'art. 10'
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

/** Passo do órgão: a rota é /planejamento/pdtic/{codigo} (a tela genérica do passo chega com o modelo). */
function passoOrgao(codigo: string, titulo: string, oQueFazer: string, guia?: string, baseLegal?: string): PassoTrilhaPe {
  return { titulo, rota: tela(`pdtic/${codigo}`), oQueFazer, guia, baseLegal };
}

const TRILHA_ORGAO: TrilhaPe = {
  perfil: 'orgao',
  nome: 'Órgão ou entidade',
  descricao: 'Seu órgão elabora e mantém atualizado o Plano Diretor de TIC (PDTIC), alinhado ao PETIC-DF e ao Plano de '
    + 'Contratações Anual, com os nove conteúdos mínimos do decreto. O comitê interno de TIC (SGTIC) aprova, o órgão comunica '
    + 'à SGDI e o CGTIC delibera (arts. 5º, 8º e 12).',
  etapas: [
    {
      rotulo: 'Preparação',
      titulo: 'Prepare o PDTIC',
      resumo: 'Abrangência, nomes, comitê, equipe, referências, estratégias, princípios e plano de trabalho. Atividades 1.1 a 1.8 do guia.',
      icone: 'flag',
      passos: [
        passoOrgao('abrangencia', 'Diga o que o PDTIC abrange e por quanto tempo vale',
          'Informe as unidades que o PDTIC alcança, o início e o fim da vigência (o guia sugere de 2 a 4 anos, conforme a maturidade) e de quanto em quanto tempo ele é revisado.',
          '1.1'),
        passoOrgao('nomes', 'Defina os nomes do órgão: comitê, equipes, autoridade máxima, unidade de TIC',
          'Diga como o seu órgão chama o comitê, as equipes de elaboração e de acompanhamento, a autoridade máxima e a unidade de TIC. Esses nomes aparecem no documento e nos fluxos.'),
        passoOrgao('sgtic', 'Registre o SGTIC: ato de criação ou a estrutura que faz esse papel, e os membros',
          'Registre o Subcomitê Gestor de TIC (SGTIC) do órgão, ou a estrutura colegiada que já faz esse papel, com o ato (tipo, número, data e processo SEI) e os membros.',
          undefined, 'art. 8º, §§ 1º e 2º'),
        passoOrgao('equipe', 'Monte a equipe de elaboração',
          'Liste quem elabora o PDTIC: nome, papel (coordenação ou membro), cargo e área. Inclua pessoas das áreas finalísticas, não só da TIC, e informe o ato de designação.',
          '1.2'),
        passoOrgao('metodologia', 'Descreva a metodologia e ajuste o fluxo',
          'Explique como o PDTIC será elaborado e ajuste o fluxo de elaboração do guia ao jeito do seu órgão.',
          '1.3'),
        passoOrgao('documentos-referencia', 'Liste os documentos de referência',
          'Liste os documentos que servem de base: leis do orçamento (PPA, LDO e LOA), Estratégia de Governança Digital (EGD/DF), PETIC-DF, planejamento estratégico do órgão, regimento, normas e o PDTIC anterior.',
          '1.4'),
        passoOrgao('estrategias', 'Mostre as estratégias do órgão: PETIC-DF, EGD/DF, PEI, PPA, competências',
          'Escolha os objetivos do PETIC-DF a que o PDTIC se liga e mostre as outras estratégias: EGD/DF, planejamento estratégico institucional (PEI), Plano Plurianual (PPA) e competências do órgão. Se um instrumento não existe, diga qual documento foi usado no lugar.',
          '1.5', 'art. 9º, § 1º, do Decreto nº 48.899/2026'),
        passoOrgao('principios', 'Escolha princípios e diretrizes',
          'Os princípios do art. 4º já vêm marcados. Inclua os princípios e as diretrizes do órgão e diga quais servem de critério para priorizar as necessidades.',
          '1.6', 'art. 4º'),
        passoOrgao('plano-trabalho', 'Faça o plano de trabalho e o cronograma',
          'Registre o objetivo, a justificativa, as premissas, as restrições e as partes interessadas, e monte o cronograma com as atividades do fluxo de elaboração.',
          '1.7'),
        passoOrgao('aprovacao-plano-trabalho', 'Registre a aprovação do plano de trabalho',
          'Registre quem aprovou o plano de trabalho, a decisão, a data, o ato e o processo SEI, e anexe o documento.',
          '1.8')
      ]
    },
    {
      rotulo: 'Diagnóstico',
      titulo: 'Faça o diagnóstico',
      resumo: 'Onde o órgão está: ambiente de TIC, ativos, análise SWOT e as necessidades de informação e de TIC. Atividades 2.1 a 2.14 do guia.',
      icone: 'search',
      passos: [
        passoOrgao('pdtic-anterior', 'Veja o que o PDTIC anterior entregou',
          'Veja o que o PDTIC anterior entregou: metas alcançadas, ações concluídas e o que ficou pendente.',
          '2.1'),
        passoOrgao('referencial-estrategico', 'Descreva o referencial estratégico da TIC: missão, visão, valores e objetivos',
          'Descreva a missão, a visão, os valores e os objetivos estratégicos da TIC, ligando cada objetivo a um objetivo do PETIC-DF.',
          '2.2'),
        passoOrgao('ambiente-tecnologico', 'Descreva o ambiente tecnológico e a organização da TIC',
          'Descreva como a TIC do órgão está organizada e o quadro de pessoal de TIC: efetivos, comissionados, terceirizados e temporários.',
          '2.3', 'art. 12, § 2º, I'),
        passoOrgao('ativos', 'Liste as soluções e os ativos de TIC',
          'Liste os sistemas, a infraestrutura, os serviços, os contratos e as licenças de TIC, com a situação, a hospedagem (CeTIC-DF, datacenter próprio ou nuvem) e o uso da rede GDFNet.',
          'Anexo X, item 19', 'art. 12, § 2º, II'),
        passoOrgao('swot', 'Faça a análise SWOT da TIC',
          'Liste as forças, as fraquezas, as oportunidades e as ameaças da TIC (análise SWOT). Toda fraqueza deve gerar uma necessidade, e toda ameaça, um risco.',
          '2.4', 'art. 12, § 2º, I'),
        passoOrgao('capacidade', 'Estime a capacidade de execução',
          'Estime quanto a equipe de TIC consegue executar no período: a capacidade total, o esforço já alocado e o que fica disponível.',
          '2.5'),
        passoOrgao('plano-levantamento', 'Planeje o levantamento das necessidades',
          'Planeje como as necessidades serão levantadas: quem será ouvido, de que forma e em que prazo.',
          '2.6'),
        passoOrgao('necessidades-informacao', 'Levante as necessidades de informação',
          'Registre as necessidades de informação das áreas do órgão e a estratégia a que cada uma se liga.',
          '2.7'),
        passoOrgao('necessidades-tic', 'Levante as necessidades de TIC: serviços, infraestrutura, contratação e pessoal',
          'Registre cada necessidade de TIC com o tipo, a origem, as áreas que pedem, o objetivo do PETIC-DF e o valor estimado.',
          '2.8 a 2.11', 'art. 12, § 2º, III'),
        passoOrgao('sistemas-ia', 'Confira os sistemas de IA (vêm do PGIA) e planeje as aquisições',
          'Confira os sistemas de inteligência artificial (IA) do órgão, que vêm do inventário do PGIA com a classificação de risco, e registre as aquisições de IA planejadas.',
          undefined, 'art. 12, § 2º, VIII'),
        passoOrgao('inventario', 'Consolide o inventário e ligue as necessidades às estratégias',
          'Consolide o inventário de necessidades e ligue cada uma às estratégias do órgão e ao PETIC-DF.',
          '2.12 e 2.13', 'art. 9º, § 1º, do Decreto nº 48.899/2026'),
        passoOrgao('aprovacao-inventario', 'Registre a aprovação do inventário',
          'Registre a aprovação do inventário de necessidades: quem aprovou, a decisão, a data e o ato.',
          '2.14')
      ]
    },
    {
      rotulo: 'Planejamento',
      titulo: 'Planeje',
      resumo: 'Prioridades, metas, ações, contratações, pessoas, orçamento e riscos. Depois, a aprovação, a deliberação do CGTIC e a publicação. Atividades 3.1 a 3.10 do guia.',
      icone: 'event_note',
      passos: [
        passoOrgao('criterios-priorizacao', 'Confirme os critérios de priorização',
          'Confirme os critérios que ordenam as necessidades. O padrão é a matriz GUT (gravidade, urgência e tendência), com notas de 1 a 5.',
          '3.1'),
        passoOrgao('priorizacao', 'Priorize as necessidades',
          'Dê as notas de cada critério às necessidades e confira a prioridade calculada. As que não forem priorizadas vão para o anexo do documento.',
          '3.2'),
        passoOrgao('metas-acoes', 'Defina metas, indicadores e ações',
          'Para as necessidades priorizadas, defina as metas, com indicador, valor e prazo, e as ações que levam a cada meta, com responsável, prazo e custo.',
          '3.3', 'art. 12, § 2º, VII'),
        passoOrgao('acoes-tematicas', 'Confira as ações de segurança, transformação digital e dados',
          'Confira as ações marcadas com os temas que o decreto exige: segurança da informação e continuidade, transformação digital e interoperabilidade, e governança de dados.',
          undefined, 'art. 12, § 2º, V, VI e IX'),
        passoOrgao('contratacoes', 'Planeje as contratações de TIC, ligadas ao Plano de Contratações Anual',
          'Liste as contratações de TIC previstas, com o objeto, o valor estimado e a previsão, e diga se cada uma está no Plano de Contratações Anual.',
          '2.10 e 3.5', 'art. 12, § 1º, e § 2º, IV'),
        passoOrgao('pessoas', 'Planeje as pessoas',
          'Planeje o quadro mínimo e o ideal de pessoas de TIC, as capacitações e os serviços a contratar.',
          '3.4'),
        passoOrgao('orcamento', 'Planeje o orçamento',
          'Planeje o investimento e o custeio de cada ação, ano a ano, e compare com o valor de TIC na lei orçamentária do órgão.',
          '3.5'),
        passoOrgao('fatores-criticos', 'Liste os fatores críticos de sucesso',
          'Liste o que precisa dar certo para o PDTIC ser cumprido.',
          '3.6'),
        passoOrgao('riscos', 'Planeje os riscos',
          'Liste os riscos com a probabilidade, o impacto, o nível e a resposta a cada um: mitigar, aceitar, transferir ou evitar.',
          '3.7'),
        passoOrgao('documento', 'Monte o documento e confira a prévia',
          'Monte o documento do PDTIC a partir do que foi preenchido. Ajuste os textos na prévia e confira tudo antes de enviar.',
          '3.8'),
        passoOrgao('aprovacao-sgtic', 'Registre a aprovação do SGTIC e envie à SGDI',
          'Registre a aprovação do PDTIC pelo SGTIC e comunique o plano aprovado à SGDI. O órgão que não comunica fica inadimplente no painel da SGDI.',
          '3.9', 'art. 7º, V, do Decreto nº 48.899/2026'),
        passoOrgao('deliberacao-cgtic', 'Acompanhe a deliberação do CGTIC',
          'Acompanhe a decisão do CGTIC, que aprova o PDTIC ou o devolve com ajustes. Se ele voltar, ajuste e envie de novo.',
          undefined, 'art. 5º'),
        passoOrgao('publicacao', 'Registre a publicação',
          'Registre a publicação do PDTIC aprovado, com a data e o endereço onde ele está publicado.',
          '3.10')
      ]
    },
    {
      rotulo: 'Plano de acompanhamento',
      titulo: 'Planeje o acompanhamento',
      resumo: 'Quem acompanha e como a execução será monitorada e avaliada. Atividades 4.1 a 4.6 do guia.',
      icone: 'assignment_turned_in',
      passos: [
        passoOrgao('quem-acompanha', 'Diga quem acompanha: a mesma equipe ou outra, com o ato',
          'Diga quem acompanha a execução do PDTIC, a mesma equipe da elaboração ou outra, e informe o ato de designação.',
          '4.1'),
        passoOrgao('plano-execucao', 'Planeje a execução: projetos de cada ação e quanto cada um contribui',
          'Defina os projetos de cada ação e quanto cada um contribui para a ação e para a meta.',
          '4.2'),
        passoOrgao('plano-monitoramento', 'Planeje o monitoramento: periodicidade, indicadores e valores de referência',
          'Defina de quanto em quanto tempo o PDTIC é monitorado, os indicadores medidos e o valor de referência de cada período.',
          '4.3'),
        passoOrgao('plano-avaliacao', 'Planeje a avaliação: indicadores de resultado e metas intermediárias',
          'Defina os indicadores de resultado e as metas intermediárias da avaliação no meio da vigência.',
          '4.4'),
        passoOrgao('plano-acompanhamento', 'Feche o plano de acompanhamento: riscos atualizados e comunicação',
          'Atualize os riscos e planeje a comunicação: o que informar, a quem, por qual canal e com que frequência.',
          '4.5'),
        passoOrgao('aprovacao-acompanhamento', 'Registre a aprovação do plano de acompanhamento',
          'Registre a aprovação do plano de acompanhamento: quem aprovou, a decisão, a data e o ato.',
          '4.6')
      ]
    },
    {
      rotulo: 'Monitoramento',
      titulo: 'Monitore',
      resumo: 'A cada ciclo (trimestral por padrão), o andamento das ações e o relatório do período. Atividades 5.1 e 5.2 do guia.',
      icone: 'autorenew',
      passos: [
        passoOrgao('ciclo-monitoramento', 'Atualize a situação das ações e registre as medições e os riscos que ocorreram',
          'A cada ciclo, atualize a situação e a execução de cada ação, registre o valor dos indicadores e os riscos que ocorreram.',
          '5.1'),
        passoOrgao('relatorio-acompanhamento', 'Feche o ciclo no relatório de acompanhamento',
          'Feche o ciclo no relatório de acompanhamento, com o resumo do período.',
          '5.2')
      ]
    },
    {
      rotulo: 'Avaliação intermediária',
      titulo: 'Avalie no meio do caminho',
      resumo: 'No meio da vigência, os resultados comparados com as metas e a decisão de seguir ou revisar. Atividades 6.1 a 6.3 do guia.',
      icone: 'rule',
      passos: [
        passoOrgao('resultados-intermediarios', 'Consolide os resultados intermediários',
          'Reúna os resultados alcançados até o meio da vigência.',
          '6.1'),
        passoOrgao('comparacao-metas', 'Compare com as metas e proponha ajustes',
          'Compare os resultados com as metas e proponha ajustes nas metas, nas ações ou nos prazos.',
          '6.2'),
        passoOrgao('avaliacao-comite', 'Registre a avaliação do comitê: seguir ou revisar o PDTIC',
          'Registre a decisão do comitê: seguir com o PDTIC como está ou revisar. A revisão abre uma versão nova e volta à etapa 2.',
          '6.3')
      ]
    },
    {
      rotulo: 'Fechamento',
      titulo: 'Feche o ciclo',
      resumo: 'No fim da vigência, os resultados, as lições aprendidas e as aprovações finais. Atividades 7.1 a 7.4 do guia.',
      icone: 'task_alt',
      passos: [
        passoOrgao('indicadores-finais', 'Colete os indicadores finais',
          'Colete o valor final de cada indicador.',
          '7.1'),
        passoOrgao('licoes-aprendidas', 'Analise os resultados e registre as lições aprendidas',
          'Diga se cada meta foi alcançada, não alcançada ou cancelada, com o motivo, e registre as lições aprendidas para o próximo PDTIC.',
          '7.2'),
        passoOrgao('aprovacao-comite', 'Registre a aprovação do comitê',
          'Registre a aprovação do relatório de resultados pelo comitê.',
          '7.3'),
        passoOrgao('aprovacao-autoridade', 'Registre a aprovação da autoridade máxima',
          'Registre a aprovação da autoridade máxima do órgão, que encerra o ciclo.',
          '7.4')
      ]
    }
  ]
};

const TRILHAS: Record<PerfilTrilhaPe, TrilhaPe> = {
  admin: TRILHA_ADMIN,
  sgdi: TRILHA_SGDI,
  cgtic: TRILHA_CGTIC,
  orgao: TRILHA_ORGAO
};

export function trilhaDoPerfil(perfil: PerfilTrilhaPe): TrilhaPe {
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

/** Todos os passos, numerados, na ordem da trilha. */
export function passosNumerados(trilha: TrilhaPe): PassoNumeradoPe[] {
  const passos: PassoNumeradoPe[] = [];
  trilha.etapas.forEach((etapa, e) =>
    etapa.passos.forEach((passo, p) =>
      passos.push({
        ...passo,
        numero: `${e + 1}.${p + 1}`,
        etapa: e,
        indice: passos.length,
        emConstrucao: !ROTAS_PRONTAS.has(passo.rota)
      })));
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

/** Passo de qualquer trilha com esta rota (para a tela "em construção" aberta fora da trilha). */
export function passoDeQualquerTrilha(caminho: string): PassoTrilhaPe | null {
  for (const perfil of PERFIS_TRILHA_PE) {
    for (const etapa of TRILHAS[perfil].etapas) {
      const passo = etapa.passos.find(p => p.rota === caminho);
      if (passo) return passo;
    }
  }
  return null;
}

/** Passo do órgão pelo código da rota /planejamento/pdtic/{codigo}. */
export function passoDoOrgao(codigo: string | null): PassoTrilhaPe | null {
  if (!codigo) return null;
  return passoDeQualquerTrilha(tela(`pdtic/${codigo}`));
}

/** "Guia de PDTIC: atividade 1.1", "atividades 2.8 a 2.11" ou o anexo como está. */
export function rotuloGuia(guia: string | undefined): string {
  if (!guia) return '';
  if (!/^\d/.test(guia)) return `Guia de PDTIC: ${guia}`;
  return / (a|e) /.test(guia) ? `Guia de PDTIC: atividades ${guia}` : `Guia de PDTIC: atividade ${guia}`;
}
