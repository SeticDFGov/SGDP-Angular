/**
 * Governança Estratégica (módulo `planejamento`, Decreto nº 48.900/2026): espelho
 * PascalCase dos DTOs de `app/api/Planejamento` do SGDP-Service (api/planejamento).
 * Erros de regra voltam como `{ Code, Message }` (400, 403, 404 ou 409), na faixa
 * 1000 a 1159 (a E7 passou a usar 1100 a 1139, e a E8, 1140 a 1159).
 */

/** GET api/planejamento/meu-papel (só quem tem o módulo chama). */
export interface PeMeuPapel {
  /** Código do papel (`PapeisPlanejamento`) ou null (sem papel: fale com o administrador do módulo). */
  Papel: string | null;
  /** Perfil admin do SGDP: tem tudo sem precisar de papel. */
  EhAdminGeral: boolean;
  OrgaoId: number | null;
  OrgaoNome: string | null;
  OrgaoSigla: string | null;
  UnidadeNome: string | null;
}

/**
 * Pessoa e o papel dela no módulo: item de GET api/planejamento/pessoas (ordenado
 * por nome; ali sempre com papel) e resposta do PUT .../papel (sempre 200 com a
 * pessoa completa; ao tirar o papel, `Papel`, `ConcedidoEm` e `ConcedidoPor` vêm nulos).
 */
export interface PePessoa {
  UserId: string;
  Nome: string;
  Email: string;
  UnidadeNome: string | null;
  /** Nulo quando a unidade da pessoa não tem órgão (o papel de órgão grava, mas fica sem efeito). */
  OrgaoId: number | null;
  OrgaoSigla: string | null;
  OrgaoNome: string | null;
  Papel: string | null;
  ConcedidoEm: string | null;
  /** E-mail de quem deu o papel. */
  ConcedidoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  ConcedidoPorNome?: string | null;
  EhAdminGeral: boolean;
}

/** Usuário do SGDP sem papel no módulo (GET api/planejamento/pessoas/candidatas, até 20). */
export interface PeCandidata {
  UserId: string;
  Nome: string;
  Email: string;
  UnidadeNome: string | null;
  OrgaoSigla: string | null;
}

export interface PePessoasConsulta {
  /** Parte do nome ou do e-mail. */
  Filtro?: string | null;
  /** Um código de papel; fora do domínio a lista volta vazia. */
  Papel?: string | null;
  Page: number;
  PageSize: number;
}

export interface PaginaPePessoas {
  Items: PePessoa[];
  CurrentPage: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  HasPreviousPage: boolean;
  HasNextPage: boolean;
}

/** Corpo do PUT api/planejamento/pessoas/{userId}/papel. `null` tira o papel e o acesso. */
export interface PePapelForm {
  Papel: string | null;
}

/**
 * Códigos de erro do módulo (`ErrorCode` do SGDP-Service, faixa 1000 a 1099),
 * sempre com `{ Code, Message }`. Os da E2 (modelo configurável, 1010 a 1029)
 * não têm tratamento próprio na tela: ela mostra a `Message` do servidor.
 */
export const ErrosPlanejamento = {
  /** 404 */
  UsuarioNaoEncontrado: 1000,
  /** 400 */
  PapelInvalido: 1001,
  /** 403 (o interceptor tira a pessoa da tela: só chame pessoas* depois do meu-papel) */
  SemPermissao: 1002,
  /** 409: o administrador do módulo não tira nem troca o próprio papel. */
  AutoRebaixamento: 1003,
  /** F3 (409): a validação da equipe não vale para este passo agora (passo que não aceita, ou que não está feito). */
  ValidacaoRecusada: 1145,
  /** F3 (409): a forma do passo não muda agora (modo definido, ou o passo não pode mudar no PDTIC atual). */
  DetalheRecusado: 1146
} as const;

// ── E2 · Modelo configurável e níveis de maturidade ─────────────────────────
//
// Etapa → passo (o que aparece na trilha) → seção (formulário com um registro
// ou tabela com vários) → campo. Cada passo, seção e campo do PDTIC tem uma
// situação em cada nível de maturidade; as seções fora do PDTIC (escopo petic
// e df) têm uma situação geral. `Niveis` é um dicionário: a chave é o Id do
// nível (string no JSON) e o valor, a situação.

/** Situação de um item num nível (ou a situação geral, fora do PDTIC). */
export type PeSituacao = 'obrigatorio' | 'opcional' | 'desligado';

/** Tipos de passo: dizem qual tela o passo usa (a E2 só tem a prévia dos passos de dados). */
export type PeTipoPasso =
  | 'dados' | 'documento' | 'fluxo' | 'aprovacao' | 'envio' | 'deliberacao'
  | 'publicacao' | 'conferencia_temas' | 'monitoramento';

export type PeTipoSecao = 'formulario' | 'tabela';

/** pdtic: seção de um passo do PDTIC · petic e df: fora do PDTIC (PETIC-DF e referenciais do DF). */
export type PeEscopoSecao = 'pdtic' | 'petic' | 'df';

export type PeTipoCampo =
  | 'texto_curto' | 'texto_longo' | 'texto_rico' | 'numero' | 'moeda' | 'percentual'
  | 'data' | 'sim_nao' | 'lista' | 'lista_multipla' | 'ligacao_secao' | 'ligacao_catalogo'
  | 'arquivo' | 'calculado';

/**
 * Configuração do campo (jsonb), conforme o tipo:
 * texto_curto e texto_longo { max } · numero { min, max, casas, unidade } ·
 * ligacao_secao { secao, multipla } · ligacao_catalogo { catalogo, multipla } ·
 * arquivo { tipos, maxMb } · calculado { calculo, campos, pesos } · os demais {}.
 */
export interface PeConfigCampo {
  max?: number | null;
  min?: number | null;
  casas?: number | null;
  unidade?: string | null;
  /** Chave da seção ligada (ligacao_secao). */
  secao?: string | null;
  multipla?: boolean | null;
  catalogo?: string | null;
  tipos?: string[] | null;
  maxMb?: number | null;
  /** produto, soma_ponderada, nivel_risco ou subtracao (nada de fórmula livre). */
  calculo?: string | null;
  /** Chaves dos campos da mesma seção que entram no cálculo, na ordem. */
  campos?: string[] | null;
  /** Peso de cada campo na soma ponderada (chave do campo → peso). */
  pesos?: Record<string, number> | null;
  /** F1 (C05): campo data que não aceita data depois de hoje (as datas de decisão das aprovações). */
  naoFutura?: boolean | null;
  /**
   * F1 (C05 e C33): formato do texto curto: `sei` (número do processo SEI,
   * 00000-00000000/0000-00, com a máscara ao digitar) ou `url` (endereço de
   * internet, http ou https).
   */
  formato?: string | null;
}

export interface PeNivel {
  Id: number;
  /** Único e estável (ex.: basico). */
  Codigo: string;
  Nome: string;
  Descricao: string | null;
  Ordem: number;
  /** Nível desativado não é oferecido a órgão novo; quem já está nele continua até o administrador trocar. */
  Ativo: boolean;
}

export interface PeOpcaoModelo {
  Id: number;
  /** Estável: é o que fica gravado nos registros. */
  Valor: string;
  Rotulo: string;
  Ordem: number;
  Ativa: boolean;
  Cor: string | null;
  /**
   * Um dos três temas do decreto (art. 12, § 2º, V, VI e IX) no campo tema das
   * ações: não é desativada nem apagada. Opcional para aceitar resposta antiga.
   */
  Travada?: boolean;
  Sistema: boolean;
}

export interface PeCampoModelo {
  Id: number;
  /** Única na seção; é a chave no jsonb dos registros. */
  Chave: string;
  Rotulo: string;
  Ajuda: string | null;
  Tipo: PeTipoCampo;
  Config: PeConfigCampo | null;
  /** Campo principal da seção (a descrição): numa seção travada, não desliga. */
  Principal: boolean;
  /**
   * Não desliga em nenhum nível: o campo tema das ações (temas do art. 12, § 2º,
   * V, VI e IX) e o campo principal de uma seção travada. Opcional para aceitar
   * resposta antiga (aí vale só a regra do principal).
   */
  Travado?: boolean;
  Ordem: number;
  NoDocumento: boolean;
  NaPlanilha: boolean;
  Largura: string | null;
  /** Veio do guia ou do decreto: pode ser renomeado e mudar de situação; não muda de tipo nem é apagado. */
  Sistema: boolean;
  Excluido: boolean;
  /** Só nas seções fora do PDTIC. */
  SituacaoGeral: PeSituacao | null;
  Niveis: Record<string, PeSituacao> | null;
  Opcoes: PeOpcaoModelo[];
}

export interface PeSecaoModelo {
  Id: number;
  Chave: string;
  Escopo: PeEscopoSecao;
  Titulo: string;
  Ajuda: string | null;
  Tipo: PeTipoSecao;
  /** Prefixo do código dos registros de uma tabela (N01, M01, A01...). */
  PrefixoCodigo: string | null;
  Ordem: number;
  NoDocumento: boolean;
  NaPlanilha: boolean;
  /** Um dos nove conteúdos mínimos do art. 12, § 2º: não desliga em nenhum nível. */
  Travada: boolean;
  IncisoDecreto: string | null;
  Sistema: boolean;
  Excluido: boolean;
  SituacaoGeral: PeSituacao | null;
  Niveis: Record<string, PeSituacao> | null;
  Campos: PeCampoModelo[];
  /** E7 rodada B: seção por ciclo (monitoramento ou avaliação); opcional para aceitar a resposta antiga. */
  PorCiclo?: PeTipoCiclo | null;
}

export interface PePassoModelo {
  Id: number;
  Chave: string;
  /** No imperativo. */
  Titulo: string;
  /** Pode vir vazio ou nulo: o título do passo basta (revisão de 2026-10-20). */
  OQueFazer: string | null;
  BaseLegal: string | null;
  /** Atividade do Guia de PDTIC ("1.1", "2.8 a 2.11", "Anexo X, item 19"). */
  ReferenciaGuia: string | null;
  Tipo: PeTipoPasso;
  IncisoDecreto: string | null;
  /** Um dos nove conteúdos mínimos do art. 12, § 2º: não desliga em nenhum nível nem em ajuste de órgão. */
  Travado: boolean;
  AceitaNaoSeAplica: boolean;
  Ordem: number;
  Sistema: boolean;
  Excluido: boolean;
  Niveis: Record<string, PeSituacao>;
  Secoes: PeSecaoModelo[];
}

export interface PeEtapaModelo {
  Id: number;
  Chave: string;
  Titulo: string;
  Descricao: string | null;
  ReferenciaGuia: string | null;
  Ordem: number;
  Sistema: boolean;
  Passos: PePassoModelo[];
}

/** GET api/planejamento/modelo (?incluirExcluidos=true só para o administrador). */
export interface PeModelo {
  Niveis: PeNivel[];
  Etapas: PeEtapaModelo[];
  /** Seções de escopo petic e df: sem `Niveis`, com `SituacaoGeral`. */
  SecoesForaDoPdtic: PeSecaoModelo[];
  /** F3: como os órgãos usam os níveis. Sem o campo (resposta antiga), vale `definido`. */
  ModoNiveis?: PeModoNiveis;
}

// ── Trilha resolvida de um órgão (GET api/planejamento/modelo/trilha?orgaoId=) ─
// Só itens visíveis (situação diferente de desligado), já na ordem, com a
// numeração pela posição.

export interface PeOpcaoTrilha {
  Valor: string;
  Rotulo: string;
  Cor: string | null;
}

export interface PeCampoTrilha {
  Id: number;
  Chave: string;
  Rotulo: string;
  Ajuda: string | null;
  Tipo: PeTipoCampo;
  Config: PeConfigCampo | null;
  Obrigatorio: boolean;
  Principal: boolean;
  Largura: string | null;
  Opcoes: PeOpcaoTrilha[];
}

export interface PeSecaoTrilha {
  Id: number;
  Chave: string;
  Titulo: string;
  Ajuda: string | null;
  Tipo: PeTipoSecao;
  PrefixoCodigo: string | null;
  Situacao: Exclude<PeSituacao, 'desligado'>;
  Travada: boolean;
  Campos: PeCampoTrilha[];
  /**
   * E7 rodada B: a seção guarda um registro por ciclo (monitoramento ou avaliação).
   * Opcional: sem ele, a tela usa as seções por ciclo do modelo inicial.
   */
  PorCiclo?: PeTipoCiclo | null;
  /**
   * F1 (I06): a seção sai nas planilhas (marcada "na planilha" no modelo). Sem o
   * campo (resposta antiga), a tela conta a seção como na planilha.
   */
  NaPlanilha?: boolean;
}

export interface PePassoTrilha {
  /** "1.1", pela posição entre os passos visíveis. */
  Numero: string;
  Id: number;
  Chave: string;
  Titulo: string;
  /** Pode vir vazio ou nulo: o título do passo basta (revisão de 2026-10-20). */
  OQueFazer: string | null;
  BaseLegal: string | null;
  ReferenciaGuia: string | null;
  Tipo: PeTipoPasso;
  IncisoDecreto: string | null;
  Travado: boolean;
  AceitaNaoSeAplica: boolean;
  Situacao: Exclude<PeSituacao, 'desligado'>;
  AjustadoParaOrgao: boolean;
  Secoes: PeSecaoTrilha[];
  /**
   * F3 (modo livre): a forma em uso, o nível cujas seções e campos valem para o
   * passo. Nulo no modo definido (e ausente na resposta antiga).
   */
  Detalhe?: PeDetalhePasso | null;
  /** F3: o órgão escolheu a forma (não é a forma padrão do passo). */
  DetalheEscolhido?: boolean;
  /**
   * F3: as formas que o órgão pode escolher, do nível mais baixo para o mais alto,
   * com as seções e os campos visíveis em cada uma. Vazia sem escolha (uma forma só)
   * e no modo definido.
   */
  OpcoesDetalhe?: PeOpcaoDetalhe[];
}

export interface PeEtapaTrilha {
  Numero: number;
  Chave: string;
  Titulo: string;
  Descricao: string | null;
  ReferenciaGuia: string | null;
  Passos: PePassoTrilha[];
}

/**
 * A trilha resolvida de um órgão (GET modelo/trilha e resposta do PUT da forma de
 * um passo, `PeTrilhaResponse` no servidor). F3: no modo livre, `NivelId` e
 * `NivelNome` são os do nível base (o padrão), com `NivelPadrao` verdadeiro.
 */
export interface PeTrilhaOrgao {
  OrgaoId: number;
  OrgaoSigla: string;
  OrgaoNome: string;
  NivelId: number;
  NivelNome: string;
  /** O administrador ainda não definiu o nível do órgão: vale o nível padrão (o primeiro ativo). */
  NivelPadrao: boolean;
  Etapas: PeEtapaTrilha[];
  /** F3. Sem o campo (resposta antiga), vale `definido`. */
  ModoNiveis?: PeModoNiveis;
  /** F3: o nível está ativo (no modo livre, sempre). */
  NivelAtivo?: boolean;
}

// ── Escrita do modelo (administrador do módulo e admin do SGDP) ───────────────
// Os PUT recebem só os campos editáveis e devolvem o item na forma do GET modelo.

export interface PeNivelForm {
  /** Só na criação: o servidor pode gerar a partir do nome. */
  Codigo?: string | null;
  Nome: string;
  Descricao: string | null;
  Ativo?: boolean;
}

export interface PeEtapaForm {
  Titulo: string;
  Descricao: string | null;
  Ordem: number;
}

export interface PePassoForm {
  Titulo: string;
  /** Pode vir vazio ou nulo: o título do passo basta (revisão de 2026-10-20). */
  OQueFazer: string | null;
  BaseLegal: string | null;
  ReferenciaGuia: string | null;
  AceitaNaoSeAplica: boolean;
}

/** POST modelo/passos: sempre do tipo dados, numa etapa; nasce opcional no nível mais alto. */
export interface PePassoNovoForm {
  EtapaId: number;
  Titulo: string;
  /** Pode vir vazio ou nulo: o título do passo basta (revisão de 2026-10-20). */
  OQueFazer: string | null;
  BaseLegal: string | null;
}

export interface PeSecaoForm {
  Titulo: string;
  Ajuda: string | null;
  Tipo: PeTipoSecao;
  PrefixoCodigo: string | null;
  NoDocumento: boolean;
  NaPlanilha: boolean;
}

/** POST modelo/secoes: `PassoId` (PDTIC) ou `Escopo` (fora do PDTIC); nasce desligada em todos os níveis. */
export interface PeSecaoNovaForm {
  PassoId?: number | null;
  Escopo?: PeEscopoSecao | null;
  Titulo: string;
  Ajuda: string | null;
  Tipo: PeTipoSecao;
  PrefixoCodigo: string | null;
}

export interface PeCampoForm {
  Rotulo: string;
  Ajuda: string | null;
  Tipo: PeTipoCampo;
  Config: PeConfigCampo;
  Largura: string | null;
  NoDocumento: boolean;
  NaPlanilha: boolean;
}

/** POST modelo/campos: sem `Chave`, o servidor gera a partir do rótulo; nasce desligado em todos os níveis. */
export interface PeCampoNovoForm {
  SecaoId: number;
  Chave?: string | null;
  Rotulo: string;
  Ajuda: string | null;
  Tipo: PeTipoCampo;
  Config: PeConfigCampo;
}

/** POST modelo/campos/{id}/opcoes (sem `Valor`, o servidor gera) e PUT modelo/opcoes/{id}. */
export interface PeOpcaoForm {
  Valor?: string | null;
  Rotulo: string;
  Cor: string | null;
  Ativa?: boolean;
}

/** PUT modelo/{passos|secoes|campos}/{id}/niveis: `Niveis` no PDTIC, `SituacaoGeral` fora dele. */
export interface PeSituacoesForm {
  Niveis?: Record<string, PeSituacao>;
  SituacaoGeral?: PeSituacao;
}

/** PUT modelo/{niveis|passos|secoes|campos}/ordem. */
export interface PeOrdemForm {
  Ids: number[];
}

// ── Órgãos: nível e ajustes (api/planejamento/orgaos) ──────────────────────────

/** Item de GET api/planejamento/orgaos?Filtro= (papéis globais e admin) e resposta do PUT .../nivel. */
export interface PeOrgaoNivel {
  OrgaoId: number;
  Sigla: string;
  Nome: string;
  NivelId: number;
  NivelNome: string;
  /** Sem nível definido pelo administrador: vale o nível padrão. */
  NivelPadrao: boolean;
  /** Quantos ajustes o órgão tem por cima do nível. */
  Ajustes: number;
  /**
   * F3: o nível que o PDTIC do órgão alcançou (nos dois modos; a tela usa no modo
   * livre). Nulos sem PDTIC de referência, sem nível alcançado ou no PDTIC
   * registrado fora do sistema.
   */
  NivelAlcancadoId?: number | null;
  NivelAlcancadoNome?: string | null;
}

/**
 * PUT api/planejamento/orgaos/{id}/nivel (justificativa obrigatória). F1 (A21):
 * `NivelId` nulo devolve o órgão ao nível padrão (a resposta volta com `NivelPadrao`).
 */
export interface PeOrgaoNivelForm {
  NivelId: number | null;
  Justificativa: string;
}

/** GET api/planejamento/orgaos/{id}/nivel/historico. */
export interface PeOrgaoNivelHistorico {
  /** Nulo: antes valia o nível padrão (resposta sem o nome dele). */
  NivelAnterior: string | null;
  NivelNovo: string | null;
  Justificativa: string | null;
  DefinidoEm: string;
  DefinidoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  DefinidoPorNome?: string | null;
  /** F1 (A21): o nível anterior era o padrão (o órgão não tinha nível escolhido). */
  NivelAnteriorPadrao?: boolean | null;
  /** F1 (A21): o órgão voltou ao nível padrão nesta mudança. */
  NivelNovoPadrao?: boolean | null;
}

export type PeAlvoAjuste = 'passo' | 'secao' | 'campo';

/**
 * Ajuste de um órgão por cima do nível (GET e PUT api/planejamento/orgaos/{id}/ajustes).
 * O PUT recebe a lista inteira; item com `Situacao` nula remove o ajuste.
 */
export interface PeAjusteOrgao {
  AlvoTipo: PeAlvoAjuste;
  AlvoId: number;
  Situacao: PeSituacao | null;
  Justificativa: string | null;
}

// ── Histórico do modelo (GET api/planejamento/modelo/historico) ────────────────

export interface PeModeloHistorico {
  Entidade: string;
  EntidadeId: number;
  Acao: string;
  /** Retrato do item antes e depois (jsonb); nulo na criação e na exclusão. */
  Antes: unknown;
  Depois: unknown;
  AlteradoEm: string;
  AlteradoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  AlteradoPorNome?: string | null;
}

export interface PeHistoricoConsulta {
  Entidade?: string | null;
  EntidadeId?: number | null;
  Page: number;
}

export interface PaginaPeHistorico {
  Items: PeModeloHistorico[];
  CurrentPage: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  HasPreviousPage: boolean;
  HasNextPage: boolean;
}

// ── E3 · Registros, referenciais do DF, PETIC-DF e deliberações do CGTIC ────
//
// O motor de registros grava os dados descritos pelo modelo. A mesma forma serve
// aos três donos: o catálogo do DF (api/planejamento/df), uma versão do PETIC-DF
// (api/planejamento/petic/{id}) e, a partir da E4, o PDTIC de um órgão
// (api/planejamento/pdtic/{id}). Rotas: {dono}/secoes/{secaoChave}/registros.

/** Campo visível da seção para o dono, com a obrigatoriedade que vale para ele (mesma forma do campo da trilha). */
export type PeCampoRegistro = PeCampoTrilha;

/** Opção ativa de uma lista, na ordem (mesma forma da opção da trilha). */
export type PeOpcaoRegistro = PeOpcaoTrilha;

/** A seção como o motor de registros a descreve para um dono (só os campos visíveis, na ordem). */
export interface PeSecaoDoDono {
  Id: number;
  Chave: string;
  Titulo: string;
  Ajuda: string | null;
  Tipo: PeTipoSecao;
  /** Tabela: os registros ganham código com ele (PR01, OE02...). */
  PrefixoCodigo: string | null;
  Campos: PeCampoRegistro[];
  /**
   * E7 rodada B: seção por ciclo (as rotas de registros pedem `?cicloId=`; sem ele,
   * 400). Nulo nas demais. Opcional para aceitar a resposta antiga.
   */
  PorCiclo?: PeTipoCiclo | null;
}

/** Destino de uma ligação (campo `ligacao_secao` ou `ligacao_catalogo`). */
export interface PeVinculo {
  RegistroId: number;
  Codigo: string | null;
  /** O texto principal do registro ligado, pronto para exibir. */
  Resumo: string | null;
}

/** Valor de um campo `arquivo` nos dados do registro (o arquivo fica em pe_arquivo). */
export interface PeArquivoRef {
  ArquivoId: number;
  Nome: string;
}

/**
 * Um registro de uma seção (a linha de uma tabela ou o formulário).
 *
 * `Dados`, pela chave do campo: texto (string), número, moeda (2 casas) e
 * percentual (0 a 100) como número, data "aaaa-mm-dd", sim ou não (bool), lista
 * (o `Valor` da opção), lista múltipla (array de valores), arquivo
 * (`PeArquivoRef`), calculado (número calculado no servidor; o front não manda)
 * e texto rico (JSON do editor, a partir da E4). Ligações não vão em `Dados`: vão
 * em `Vinculos`. `Rotulos` traz o texto pronto para exibir de cada campo.
 */
export interface PeRegistro {
  Id: number;
  /** Código na tabela (OE01); nulo no formulário. Nunca se reaproveita código apagado. */
  Codigo: string | null;
  Ordem: number;
  /** Registro do sistema (os 11 princípios do art. 4º): não se edita nem se apaga. */
  Sistema: boolean;
  Dados: Record<string, unknown>;
  Rotulos: Record<string, string>;
  Vinculos: Record<string, PeVinculo[]>;
  CriadoEm: string;
  CriadoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  CriadoPorNome?: string | null;
  AlteradoEm: string | null;
  AlteradoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  AlteradoPorNome?: string | null;
}

/** GET {dono}/secoes/{secaoChave}/registros. */
export interface PeRegistrosDaSecao {
  Secao: PeSecaoDoDono;
  Registros: PeRegistro[];
  /** Quem está logado pode incluir, editar, apagar e reordenar nesta seção deste dono. */
  PodeEditar: boolean;
}

/**
 * Corpo do POST e do PUT de um registro. `Vinculos`: para cada campo de ligação,
 * os ids dos registros ligados (lista vazia tira todas as ligações do campo).
 */
export interface PeRegistroForm {
  Dados: Record<string, unknown>;
  Vinculos: Record<string, number[]>;
}

/** Corpo do 400 de validação de um registro: a mensagem de cada campo em linguagem simples. */
export interface PeErroValidacao {
  Code?: number;
  Message?: string;
  Campos?: Record<string, string> | null;
}

/** Formatos das planilhas (Content-Disposition com o nome do arquivo). */
export type PeFormatoPlanilha = 'csv' | 'xlsx';

/** Item de GET api/planejamento/catalogos/{catalogo} (`Id` é o id do registro). */
export interface PeItemCatalogo {
  Id: number;
  Codigo: string | null;
  Rotulo: string;
}

/** POST api/planejamento/arquivos (multipart, campo `arquivo`). */
export interface PeArquivo {
  Id: number;
  Nome: string;
  TipoMime: string;
  Tamanho: number;
}

export type PeSituacaoPetic = 'rascunho' | 'em_deliberacao' | 'aprovado' | 'substituido';

export type PeSituacaoDeliberacao = 'aguardando' | 'aprovado' | 'devolvido';

/** petic (E3) ou pdtic (E7: o PDTIC enviado por um órgão). */
export type PeObjetoDeliberacao = 'petic' | 'pdtic';

/** O PDF enviado ao CGTIC junto com o PDTIC (E7): a versão do documento daquele PDTIC. */
export interface PeDocumentoDeliberacao {
  PdticId: number;
  /** Número da versão do documento (GET pdtic/{PdticId}/documento/versoes/{Numero}/arquivo). */
  Numero: number;
}

/** Uma deliberação do CGTIC sobre uma versão do PETIC-DF ou de um PDTIC (E7). */
export interface PeDeliberacao {
  Id: number;
  ObjetoTipo: PeObjetoDeliberacao;
  ObjetoId: number;
  VersaoObjeto: string;
  /** "PETIC-DF 1.0" (na E7, "PDTIC SES 1.0"). */
  Titulo: string;
  OrgaoSigla: string | null;
  EnviadoEm: string;
  EnviadoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  EnviadoPorNome?: string | null;
  Situacao: PeSituacaoDeliberacao;
  DecididoEm: string | null;
  DecididoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  DecididoPorNome?: string | null;
  AtoTipo: string | null;
  AtoNumero: string | null;
  /** Data pura ("aaaa-mm-dd"). */
  AtoData: string | null;
  Sei: string | null;
  Observacao: string | null;
  /** E7: o PDF enviado (só nas deliberações de PDTIC; nulo no PETIC-DF e em resposta antiga). */
  Documento?: PeDocumentoDeliberacao | null;
  /**
   * F1 (C40): a deliberação foi criada pelo registro de um PDTIC aprovado fora do
   * sistema (não houve envio pelo sistema; a data da decisão é a do ato).
   */
  RegistradaForaDoSistema?: boolean;
}

/** Uma versão do PETIC-DF (GET api/planejamento/petic, da mais nova para a mais antiga). */
export interface PePetic {
  Id: number;
  /** "1.0", "1.1"... */
  Versao: string;
  Titulo: string;
  /** Datas puras ("aaaa-mm-dd"). */
  VigenciaInicio: string | null;
  VigenciaFim: string | null;
  Situacao: PeSituacaoPetic;
  AprovadoEm: string | null;
  AnteriorId: number | null;
  /** A deliberação mais recente desta versão (nula enquanto nunca foi enviada). */
  Deliberacao: PeDeliberacao | null;
}

/** PUT api/planejamento/petic/{id} (só rascunho). */
export interface PePeticForm {
  Titulo: string;
  VigenciaInicio: string | null;
  VigenciaFim: string | null;
}

/** POST api/planejamento/petic: rascunho novo, copiando a vigente (registros e códigos) ou vazio. */
export interface PePeticNovoForm extends PePeticForm {
  CopiarDaVigente: boolean;
}

/**
 * F1 (A06): uma pendência do envio do PETIC-DF ao CGTIC, com a seção e o que falta
 * nela. Na vigência (que não é seção), `SecaoChave` vem nula e `SecaoTitulo` é
 * "Título e vigência".
 */
export interface PePendenciaEnvioPetic {
  SecaoChave: string | null;
  SecaoTitulo: string;
  Motivo: string;
}

/**
 * F1 (A06): GET api/planejamento/petic/{id}/envio, a prévia do envio (a mesma lista
 * do 400 do POST petic/{id}/enviar, que vem com `{ Code, Message, Pendencias }`).
 * `Motivo`: por que não pode enviar agora, quando não pode.
 */
export interface PePreviaEnvioPetic {
  PodeEnviar: boolean;
  Pendencias: PePendenciaEnvioPetic[];
  Motivo?: string | null;
}

/**
 * POST api/planejamento/deliberacoes/{id}/decidir: aprovado exige `AtoNumero` e
 * `AtoData`; devolvido exige `Observacao`. Deliberação já decidida não muda (409).
 */
export interface PeDecisaoForm {
  Decisao: Exclude<PeSituacaoDeliberacao, 'aguardando'>;
  AtoTipo: string | null;
  AtoNumero: string | null;
  AtoData: string | null;
  Sei: string | null;
  Observacao: string | null;
}

/** GET api/planejamento/deliberacoes: aguardando primeiro (a mais antiga antes), depois as decididas (a mais nova antes). */
export interface PeDeliberacoesConsulta {
  Situacao?: PeSituacaoDeliberacao | null;
  ObjetoTipo?: PeObjetoDeliberacao | null;
  Page: number;
  PageSize: number;
}

export interface PaginaPeDeliberacoes {
  Items: PeDeliberacao[];
  CurrentPage: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  HasPreviousPage: boolean;
  HasNextPage: boolean;
}

// ── E4 · Trilha do PDTIC (etapas 1 a 3) e planilhas ─────────────────────────
//
// O PDTIC de um órgão é o terceiro dono do motor de registros
// (api/planejamento/pdtic/{id}/secoes/{secaoChave}/registros), com a
// visibilidade e a obrigatoriedade do nível do órgão e dos ajustes. Só a equipe
// do órgão edita, e só em elaboração ou devolvido; a consulta do órgão e os
// papéis globais leem. Erros desta entrega na faixa 1050 a 1069 (a tela mostra a
// `Message` do servidor).

/**
 * Ciclo do PDTIC (decisão 18): em elaboração ou devolvido (a equipe edita) →
 * enviado ao CGTIC (em aprovação) → aprovado → publicado → em acompanhamento →
 * encerrado. Substituído: a versão anterior, quando a revisão é aprovada pelo CGTIC.
 */
export type PeSituacaoPdtic =
  | 'em_elaboracao' | 'em_aprovacao' | 'devolvido' | 'aprovado' | 'publicado'
  | 'em_acompanhamento' | 'encerrado' | 'substituido';

/** A versão de que a revisão partiu (E7). */
export interface PeRevisaoPdtic {
  AnteriorId: number;
  /** "1.0". */
  AnteriorVersao: string;
}

/**
 * O PDTIC de um órgão: GET pdtic/atual?orgaoId= (204 sem PDTIC atual; desde a E7,
 * a versão em elaboração, se houver, senão a vigente), GET pdtic/{id}, GET
 * pdtic/versoes, resposta do POST pdtic e das ações da E7 (enviar, publicar,
 * encerrar, revisão, registro externo) e item da lista dos papéis globais.
 */
export interface PePdtic {
  Id: number;
  OrgaoId: number;
  OrgaoSigla: string;
  OrgaoNome: string;
  /** "1.0", "1.1"... */
  Versao: string;
  Situacao: PeSituacaoPdtic;
  /** Datas puras ("aaaa-mm-dd"), copiadas do passo 1.1 ao gravar. */
  VigenciaInicio: string | null;
  VigenciaFim: string | null;
  /** PDTIC aprovado fora do sistema (E7). */
  RegistradoExternamente: boolean;
  AnteriorId: number | null;
  NivelId: number | null;
  NivelNome: string | null;
  /**
   * F3 (correções): o nível que o PDTIC alcançou, nos itens da lista dos PDTICs (GET pdtic).
   * Nulos sem nível alcançado e no PDTIC registrado fora do sistema. Sem os campos (a
   * resposta anterior), a lista mostra o nível do órgão, como antes.
   */
  NivelAlcancadoId?: number | null;
  NivelAlcancadoNome?: string | null;
  /** Quem está logado preenche este PDTIC (equipe do órgão, em elaboração ou devolvido). */
  PodeEditar: boolean;
  CriadoEm: string;
  CriadoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  CriadoPorNome?: string | null;
  // E7 (opcionais para aceitar a resposta antiga): as datas do caminho da aprovação
  /** Envio ao CGTIC (vale como a comunicação à SGDI, art. 7º, V, do Decreto nº 48.899/2026). */
  EnviadoEm?: string | null;
  /** Aprovação do CGTIC. */
  AprovadoEm?: string | null;
  PublicadoEm?: string | null;
  EncerradoEm?: string | null;
  /** Motivo do encerramento pelo administrador (vigência terminada); nulo quando a equipe encerrou pelo passo 7.4. */
  EncerramentoMotivo?: string | null;
  /** A deliberação mais recente do CGTIC sobre esta versão, com o PDF enviado (`Documento`). */
  Deliberacao?: PeDeliberacao | null;
  /** Esta versão é a revisão de outra (a anterior segue valendo até o CGTIC aprovar esta). */
  Revisao?: PeRevisaoPdtic | null;
}

/** POST api/planejamento/pdtic: o órgão abre o próprio (`OrgaoId` nulo); o admin do SGDP informa o órgão. 409 se já há um atual. */
export interface PePdticNovoForm {
  OrgaoId: number | null;
}

/** GET api/planejamento/pdtic (papéis globais e admin do SGDP): os PDTICs atuais de todos os órgãos. */
export interface PePdticsConsulta {
  Situacao?: PeSituacaoPdtic | null;
  /** Parte da sigla ou do nome do órgão. */
  Filtro?: string | null;
  Page: number;
  PageSize: number;
}

export interface PaginaPePdtics {
  Items: PePdtic[];
  CurrentPage: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  HasPreviousPage: boolean;
  HasNextPage: boolean;
}

/**
 * Situação de um passo do PDTIC: feito (as seções obrigatórias com os
 * obrigatórios preenchidos; tabela obrigatória com ao menos um registro) ·
 * pendente · atencao (comentário aberto no passo, ou o PDTIC devolvido) ·
 * nao_se_aplica · continuo (passo de um tipo que ganha tela nas próximas
 * entregas: sem situação por enquanto) · E7: aguardando (depende de outra coisa
 * antes: a deliberação, a aprovação, a publicação) · atrasado (prazo vencido) ·
 * externo (feito fora do sistema, no PDTIC registrado já aprovado). Os três novos
 * vêm com o `Motivo`.
 */
export type PeSituacaoPasso =
  | 'feito' | 'pendente' | 'atencao' | 'nao_se_aplica' | 'continuo'
  | 'aguardando' | 'atrasado' | 'externo'
  /**
   * F3 (nos dois modos): passo opcional para o órgão ainda sem conteúdo no PDTIC.
   * Não é cobrança (onde antes ficaria pendente ou atrasado); vem sem `Motivo`.
   */
  | 'opcional';

/** "Não se aplica" marcado num passo (só em passo opcional no nível do órgão que aceita). */
export interface PeNaoSeAplica {
  Justificativa: string;
  MarcadoEm: string;
  /** E-mail de quem marcou. */
  MarcadoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  MarcadoPorNome?: string | null;
}

export interface PeSituacaoPassoPdtic {
  PassoId: number;
  Chave: string;
  /** "2.3", pela posição na trilha do órgão. */
  Numero: string;
  Situacao: PeSituacaoPasso;
  NaoSeAplica: PeNaoSeAplica | null;
  ComentariosAbertos: number;
  /** Avisos do guia em linguagem simples (não impedem de seguir). */
  Avisos: string[];
  /**
   * E7: o porquê de aguardando, atrasado e externo ("Disponível depois da publicação do PDTIC").
   * F1: também em "não se aplica" calculado pelo servidor, sem o `NaoSeAplica` (monitoramento
   * com a vigência terminada antes do acompanhamento, PDTIC encerrado ou substituído).
   */
  Motivo?: string | null;
  /**
   * E7: quem está logado grava neste passo agora (a equipe do órgão, conforme a
   * situação do PDTIC e a etapa do passo). Sem ele (resposta antiga), vale o
   * `PodeEditar` do PDTIC.
   */
  PodeEditar?: boolean;
  /**
   * F3: a situação do passo no passo a passo do órgão é `obrigatorio`. Sem o campo
   * (resposta antiga), vale a situação do passo na trilha.
   */
  Obrigatorio?: boolean;
  /**
   * F3 (B): o passo recebe a marca "validado pela equipe" (os passos da elaboração
   * dos tipos dados, conferência dos temas, documento e fluxo). Sem o campo
   * (resposta antiga), o passo não tem validação.
   */
  AceitaValidacao?: boolean;
  /** F3 (B): a marca da equipe, ou nula (sem marca). */
  Validacao?: PeValidacaoPasso | null;
}

/**
 * F3 (B): a resposta do PUT e do DELETE de
 * api/planejamento/pdtic/{id}/passos/{passoId}/validacao (`PePassoSituacaoResponse`
 * no servidor): a situação do passo, na forma dos passos de GET pdtic/{id}/situacao.
 */
export type PePassoSituacao = PeSituacaoPassoPdtic;

/** GET api/planejamento/pdtic/{id}/situacao: a moldura usa para as bolinhas e o próximo passo. */
export interface PeAndamentoPdtic {
  /** Número do passo recomendado ("2.3"): o atrasado, depois o que pede atenção, depois o primeiro pendente; nulo quando nada espera. */
  ProximoPasso: string | null;
  /**
   * F1 (B12): por que o próximo passo é esse, quando não é o óbvio (na revisão recém-aberta:
   * "Revise o PDTIC a partir do diagnóstico (etapa 2): ...").
   */
  ProximoPassoMotivo?: string | null;
  Passos: PeSituacaoPassoPdtic[];
  /** F3 (C5): o nível que o PDTIC alcançou e o que falta para o próximo (a tela usa no modo livre). */
  Nivel?: PeNivelAlcancado | null;
}

// ── E7 · Caminho da aprovação do PDTIC (rodada A) ───────────────────────────
//
// Envio ao CGTIC (que vale como a comunicação à SGDI), deliberação pela
// Secretaria do CGTIC (a fila da E3, que passa a receber o PDTIC), publicação,
// encerramento, revisão (versão nova) e o PDTIC aprovado fora do sistema. Erros
// desta rodada na faixa 1100 a 1119 (a tela mostra a `Message` do servidor).

/** Um passo que ainda impede o envio ao CGTIC. */
export interface PePendenciaEnvio {
  PassoId: number;
  /** "2.3", pela posição na trilha do órgão. */
  PassoNumero: string;
  PassoTitulo: string;
  /** O que falta, em linguagem simples. */
  Motivo: string;
}

/** GET api/planejamento/pdtic/{id}/envio: a prévia do que falta para enviar. */
export interface PePreviaEnvio {
  PodeEnviar: boolean;
  Pendencias: PePendenciaEnvio[];
}

/** 400 do POST pdtic/{id}/enviar: a mesma lista da prévia. */
export interface PeErroEnvio {
  Code?: number;
  Message?: string;
  Pendencias?: PePendenciaEnvio[] | null;
}

/** POST api/planejamento/pdtic/{id}/encerrar: `Motivo` obrigatório só para o administrador (vigência terminada). */
export interface PeEncerrarForm {
  Motivo: string | null;
}

/** POST api/planejamento/pdtic/{id}/revisao: `Justificativa` obrigatória quando o passo da avaliação do comitê (6.3) não está ligado. */
export interface PeRevisaoForm {
  Justificativa: string | null;
}

/** Quem aprovou o PDTIC registrado fora do sistema. */
export type PeInstanciaAprovacaoExterna = 'cgtic' | 'outra';

/**
 * POST api/planejamento/pdtic/registrar-externo: o PDTIC já aprovado e publicado
 * fora do sistema (decisão 20). `OrgaoId` nulo é o órgão de quem registra (equipe
 * do órgão); o admin do SGDP informa o órgão. O PDF sobe antes por POST arquivos.
 * Datas puras ("aaaa-mm-dd").
 */
export interface PeRegistroExternoForm {
  OrgaoId: number | null;
  Versao: string;
  VigenciaInicio: string;
  VigenciaFim: string;
  ArquivoId: number;
  AprovacaoInstancia: PeInstanciaAprovacaoExterna;
  AprovacaoData: string;
  AprovacaoAtoTipo: string | null;
  AprovacaoAtoNumero: string | null;
  AprovacaoSei: string | null;
  PublicacaoData: string;
  PublicacaoEndereco: string;
}

/** PUT api/planejamento/pdtic/{id}/passos/{passoId}/nao-se-aplica (DELETE do mesmo desfaz). */
export interface PeNaoSeAplicaForm {
  Justificativa: string;
}

/** Uma ação do plano (seção `acoes`) marcada com o tema. */
export interface PeAcaoDoTema {
  RegistroId: number;
  Codigo: string | null;
  Descricao: string | null;
  /** Rótulo da situação da ação, pronto para exibir. */
  Situacao: string | null;
}

/** Um dos três temas do decreto (art. 12, § 2º, V, VI e IX) no passo de conferência. */
export interface PeTemaDoPdtic {
  /** Valor da opção no campo tema das ações (seguranca, transformacao_digital, governanca_dados). */
  Valor: string;
  Rotulo: string;
  Inciso: 'V' | 'VI' | 'IX';
  Acoes: PeAcaoDoTema[];
  /** Justificativa do tema sem ação (gravada pela seção formulário `temas_sem_acao`). */
  Justificativa: string | null;
}

/** GET api/planejamento/pdtic/{id}/temas. */
export interface PeTemasDoPdtic {
  Temas: PeTemaDoPdtic[];
}

/** Item de GET api/planejamento/pdtic/{id}/ia/pgia: o inventário do órgão no PGIA (só leitura). */
export interface PeSistemaIaPgia {
  Id: number;
  Nome: string;
  Finalidade: string | null;
  /** Classificação de risco do Decreto nº 48.901/2026 (Risco Excessivo, Alto Risco, Risco Moderado, Baixo Risco). */
  Classificacao: string | null;
  Base: string | null;
  Situacao: string | null;
}

/** Resposta a um comentário (segundo nível). */
export interface PeRespostaComentario {
  Id: number;
  Texto: string;
  AutorNome: string | null;
  AutorEmail: string | null;
  CriadoEm: string;
}

/** Comentário de um passo (GET pdtic/{id}/comentarios?passoId=: só os de primeiro nível no topo). */
export interface PeComentario {
  Id: number;
  PassoId: number;
  Texto: string;
  AutorNome: string | null;
  AutorEmail: string | null;
  CriadoEm: string;
  ResolvidoEm: string | null;
  ResolvidoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  ResolvidoPorNome?: string | null;
  Respostas: PeRespostaComentario[];
}

/** POST api/planejamento/pdtic/{id}/comentarios: `PaiId` nulo é comentário novo; com ele, resposta. Texto até 2000. */
export interface PeComentarioForm {
  PassoId: number;
  PaiId: number | null;
  Texto: string;
}

/**
 * Texto rico: o valor de um campo `texto_rico` em `Dados` é o JSON do TipTap
 * (`{ "type": "doc", "content": [...] }`). O back-end valida contra uma lista
 * fechada: nós doc, paragraph, heading (level 3 ou 4), bulletList, orderedList,
 * listItem, table, tableRow, tableHeader, tableCell, image (src
 * `api/planejamento/arquivos/{id}`), hardBreak e text; marcas bold, italic,
 * underline e link (href http ou https).
 */
export interface PeNoTextoRico {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PeNoTextoRico[];
  text?: string;
  marks?: PeMarcaTextoRico[];
}

export interface PeMarcaTextoRico {
  type: string;
  attrs?: Record<string, unknown>;
}

/** O documento de um campo de texto rico. */
export interface PeDocTextoRico extends PeNoTextoRico {
  type: 'doc';
  content: PeNoTextoRico[];
}

// ── E5 · Documento do PDTIC (prévia editável, PDF e versões) ────────────────
//
// O documento sai do modelo da SGDI (capítulos e blocos, que o administrador
// edita) com os textos que o órgão editou na prévia e as tabelas vindas dos
// dados. Texto que o órgão não editou segue o modelo na hora (decisão 14); o
// editado fica e ganha o aviso "o modelo mudou". Erros desta entrega na faixa
// 1070 a 1089 (a tela mostra a `Message` do servidor).

/**
 * Tipos de bloco de um capítulo. E7 rodada B, nos relatórios do acompanhamento:
 * as ações do ciclo por situação, as metas por resultado, os riscos que ocorreram e
 * as medições dos indicadores.
 */
export type PeTipoBlocoDoc =
  | 'texto' | 'tabela_secao' | 'lista_tema' | 'matriz_swot' | 'fluxo' | 'quebra_pagina'
  | 'acoes_por_situacao' | 'metas_por_resultado' | 'riscos_ocorridos' | 'medicoes';

/**
 * O documento que o motor da E5 monta: o PDTIC, o relatório de acompanhamento de
 * um ciclo (RA, Anexo XIV do guia) ou o relatório de resultados (RR, Anexo XV).
 */
export type PeTipoDocumento = 'pdtic' | 'ra' | 'rr';

/** Situação de uma versão em PDF (a E7 usa as três últimas). */
export type PeSituacaoVersaoDoc = 'minuta' | 'enviada' | 'aprovada' | 'publicada';

export interface PeDocColuna {
  Chave: string;
  Rotulo: string;
}

export interface PeDocLinha {
  Codigo: string | null;
  /** Texto pronto de cada coluna, pela chave do campo ("-" quando vazio). */
  Celulas: Record<string, string>;
  /** A mais que o contrato: nas colunas de texto formatado, o JSON do TipTap. */
  Ricos?: Record<string, PeDocTextoRico | null> | null;
}

/** Tabela de uma seção (só leitura: os dados se editam no passo da seção). */
export interface PeDocTabela {
  SecaoChave: string;
  SecaoTitulo: string;
  /** A mais que o contrato: `formulario` (um registro, mostrado como rótulo e valor) ou `tabela`. */
  SecaoTipo?: string | null;
  /** A mais que o contrato: o número do passo da seção na trilha do órgão ("2.4"). */
  PassoNumero?: string | null;
  Colunas: PeDocColuna[];
  Linhas: PeDocLinha[];
  Vazia: boolean;
}

export interface PeDocItemLista {
  Codigo: string | null;
  Texto: string;
  Situacao: string | null;
}

/** As ações do plano marcadas com um tema (incisos V, VI e IX e os temas criados). */
export interface PeDocLista {
  /** O rótulo do tema. */
  Tema: string;
  Itens: PeDocItemLista[];
  /** A mais que o contrato: sem ação no tema, a justificativa do órgão (passo da conferência dos temas). */
  Justificativa?: string | null;
}

export interface PeDocSwot {
  Forcas: string[];
  Fraquezas: string[];
  Oportunidades: string[];
  Ameacas: string[];
}

/**
 * E7 rodada B: um grupo de linhas de um bloco de dados do acompanhamento ("Ações
 * em dia", "Ações atrasadas", "Metas alcançadas"...). O contrato não fixa a forma
 * dos dados dos blocos novos: a prévia aceita o grupo com a tabela (`Tabela`),
 * com as colunas e as linhas soltas (`Colunas` e `Linhas`) ou com uma lista
 * (`Itens`); o bloco sem grupos usa a `Tabela` do bloco.
 */
export interface PeDocGrupo {
  Chave?: string | null;
  Titulo: string;
  Tabela?: PeDocTabela | null;
  Colunas?: PeDocColuna[] | null;
  Linhas?: PeDocLinha[] | null;
  Itens?: PeDocItemLista[] | null;
  /** Texto do grupo (a justificativa das atrasadas, por exemplo). */
  Texto?: string | null;
}

/**
 * Fluxo do documento: o desenho (SVG) da cópia do órgão, ou do modelo se o órgão
 * ainda não tem cópia (E6). Nulo quando o servidor não conseguiu desenhar.
 */
export interface PeDocFluxo {
  Chave: string;
  Nome: string;
  Svg: string | null;
}

/**
 * Um bloco do documento resolvido para o órgão. Texto: `TextoBruto` é o JSON do
 * TipTap com os marcadores escritos como texto ("{orgao.nome}"), o que o editor
 * mostra; `TextoResolvido`, o mesmo com os marcadores trocados pelos valores, o
 * que a prévia mostra. Os demais tipos trazem os dados prontos.
 */
export interface PeDocBloco {
  Id: number;
  Tipo: PeTipoBlocoDoc;
  Ordem: number;
  PaginaDeitada: boolean;
  TextoBruto: PeDocTextoRico | null;
  TextoResolvido: PeDocTextoRico | null;
  /** O órgão tem a própria cópia deste texto (sem ela, o texto segue o modelo na hora). */
  EditadoPeloOrgao: boolean;
  /** O modelo mudou depois que o órgão editou: `TextoModeloAtual` traz o texto novo do modelo. */
  ModeloMudou: boolean;
  TextoModeloAtual: PeDocTextoRico | null;
  EditadoEm: string | null;
  /** E-mail de quem editou. */
  EditadoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  EditadoPorNome?: string | null;
  /** Chaves dos marcadores do texto que ainda não têm valor ("nomes.comite"): saem em branco no PDF. */
  MarcadoresSemValor: string[];
  Tabela: PeDocTabela | null;
  Lista: PeDocLista | null;
  Swot: PeDocSwot | null;
  Fluxo: PeDocFluxo | null;
  /** E7 rodada B: os grupos dos blocos do acompanhamento (ver `PeDocGrupo`). */
  Grupos?: PeDocGrupo[] | null;
}

/**
 * Um capítulo do documento, na ordem (subcapítulo com `Nivel` 2). Capítulo
 * oculto vem sem blocos (só o título), para a prévia oferecer "Mostrar de
 * novo"; capítulo cujo passo está desligado para o órgão não vem.
 */
export interface PeDocCapitulo {
  Id: number;
  Chave: string;
  /** "6" ou "6.1"; nulo nos capítulos sem número (capa, sumário, apresentação...). */
  Numero: string | null;
  Nivel: 1 | 2;
  /** O título que vale: o próprio do órgão ou o do modelo. */
  Titulo: string;
  TituloModelo: string;
  TituloProprio: string | null;
  Oculto: boolean;
  Obrigatorio: boolean;
  /** Um dos nove conteúdos mínimos (art. 12, § 2º): não se esconde. */
  Travado: boolean;
  IncisoDecreto: string | null;
  /** O passo que alimenta o capítulo (chave e número na trilha do órgão). */
  PassoChave: string | null;
  PassoNumero: string | null;
  Blocos: PeDocBloco[];
}

/** Uma versão do documento em PDF (item de `Versoes`, de GET .../versoes e resposta do POST .../pdf). */
export interface PeDocVersao {
  /** Sequencial no PDTIC. */
  Numero: number;
  Situacao: PeSituacaoVersaoDoc;
  GeradoEm: string;
  /** E-mail de quem gerou. */
  GeradoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  GeradoPorNome?: string | null;
  /** Tamanho do arquivo em bytes. */
  Tamanho: number | null;
  Paginas: number | null;
}

/**
 * GET api/planejamento/pdtic/{id}/documento: a estrutura resolvida para o órgão.
 * E7 rodada B: a mesma forma nos relatórios (GET pdtic/{id}/ciclos/{cicloId}/relatorio
 * e GET pdtic/{id}/relatorio-resultados), com as mesmas sub-rotas.
 */
export interface PeDocumento {
  PdticId: number;
  Versao: string;
  OrgaoSigla: string;
  OrgaoNome: string;
  /** "Plano Diretor de Tecnologia da Informação e Comunicação". */
  Titulo: string;
  /** Quem está logado edita os textos e os capítulos (equipe do órgão, em elaboração ou devolvido). */
  PodeEditar: boolean;
  /** A mais que o contrato: o logotipo do órgão ("api/planejamento/arquivos/{id}", do dicionário de nomes) ou null. */
  Logotipo?: string | null;
  Capitulos: PeDocCapitulo[];
  Versoes: PeDocVersao[];
  /**
   * F2: os marcadores deste documento (os do modelo do tipo), cada um com onde o
   * valor se preenche e o `PassoNumero` na trilha do órgão: o link "preencha no passo
   * N.M" dos marcadores sem valor, também para quem só lê. Opcional para a resposta antiga.
   */
  Marcadores?: PeDocMarcador[];
}

/** PUT api/planejamento/pdtic/{id}/documento/blocos/{blocoId}: o texto do órgão, com os marcadores como texto. */
export interface PeDocBlocoForm {
  Texto: PeDocTextoRico;
}

/** PUT api/planejamento/pdtic/{id}/documento/capitulos/{capituloId} (capítulo travado não se oculta: 409). */
export interface PeDocCapituloForm {
  Oculto: boolean;
  /** null volta ao título do modelo. */
  TituloProprio: string | null;
}

// ── Modelo do documento (administrador do módulo e admin do SGDP) ─────────────

/** Um marcador que o texto pode usar ("{orgao.nome}"). */
export interface PeDocMarcador {
  /** Sem as chaves: "orgao.nome". */
  Chave: string;
  Descricao: string;
  Exemplo: string | null;
  /**
   * F2: onde o valor se preenche, indicado pelo servidor (o passo, pela chave, ou a
   * seção). Sem eles, vale o que a tela sabe (`ondeSePreencheMarcador`).
   */
  PassoChave?: string | null;
  SecaoChave?: string | null;
  /**
   * F2: o número do passo na trilha do órgão ("3.11"), só na lista `Marcadores` do
   * documento; null quando o órgão não vê o passo (sem link). No modelo, sempre null.
   */
  PassoNumero?: string | null;
}

/**
 * Configuração de um bloco do modelo (jsonb), conforme o tipo: texto
 * `{ Texto }` · tabela `{ Secao, Colunas, Filtro }` (Colunas null = os campos
 * marcados "no documento"; Secao `pgia_sistemas` = o inventário de IA do PGIA) ·
 * lista de tema `{ Tema }` · fluxo `{ Fluxo }`; `PaginaDeitada` em qualquer
 * bloco. O servidor recusa (400) chave que o tipo não aceita; as que a tela não
 * mexe (o `Filtro`) vão de volta como vieram.
 */
export interface PeDocConfigBloco {
  Texto?: PeDocTextoRico | null;
  Secao?: string | null;
  Colunas?: string[] | null;
  /** Só as linhas cujo campo tem o valor (com `Excluir`, as outras): separa as necessidades priorizadas das não priorizadas. */
  Filtro?: PeDocFiltroTabela | null;
  Tema?: string | null;
  Fluxo?: string | null;
  PaginaDeitada?: boolean | null;
  [chave: string]: unknown;
}

export interface PeDocFiltroTabela {
  Campo: string;
  Valor: unknown;
  Excluir?: boolean | null;
}

export interface PeDocModeloBloco {
  Id: number;
  Ordem: number;
  Tipo: PeTipoBlocoDoc;
  Config: PeDocConfigBloco | null;
}

export interface PeDocModeloCapitulo {
  Id: number;
  /** Capítulo de cima, no subcapítulo; null no capítulo. */
  PaiId: number | null;
  Chave: string;
  Titulo: string;
  Numerado: boolean;
  Ordem: number;
  Obrigatorio: boolean;
  /** Um dos nove conteúdos mínimos (art. 12, § 2º): não se apaga nem fica opcional. */
  Travado: boolean;
  IncisoDecreto: string | null;
  /** O passo que alimenta o capítulo: desligado para o órgão, o capítulo some do documento dele. */
  PassoChave: string | null;
  /** Veio do modelo da SGDI (carregador): não se apaga. */
  Sistema: boolean;
  Blocos: PeDocModeloBloco[];
}

/** GET api/planejamento/modelo/documento?tipo=pdtic (E7 rodada B: também ra e rr). */
export interface PeDocModelo {
  Id: number;
  /** pdtic, ra ou rr. */
  Tipo: string;
  Nome: string;
  /** Todos os capítulos (os subcapítulos com `PaiId`), cada um com os blocos. */
  Capitulos: PeDocModeloCapitulo[];
  Marcadores: PeDocMarcador[];
}

/** PUT api/planejamento/modelo/documento/capitulos/{id}. */
export interface PeDocCapituloModeloForm {
  Titulo: string;
  Numerado: boolean;
  Obrigatorio: boolean;
  PassoChave: string | null;
}

/** POST api/planejamento/modelo/documento/capitulos: nasce no fim dos irmãos. */
export interface PeDocCapituloModeloNovoForm extends PeDocCapituloModeloForm {
  /** O tipo do modelo (pdtic). */
  Tipo: string;
  PaiId: number | null;
  /** Gerada do título (sem ela, o servidor gera). */
  Chave: string;
}

/** PUT api/planejamento/modelo/documento/blocos/{id}: só a configuração (o tipo não muda). */
export interface PeDocBlocoModeloForm {
  Config: PeDocConfigBloco;
}

/** POST api/planejamento/modelo/documento/blocos: nasce no fim do capítulo. */
export interface PeDocBlocoModeloNovoForm extends PeDocBlocoModeloForm {
  CapituloId: number;
  Tipo: PeTipoBlocoDoc;
}

// ── E6 · Fluxos (editor guiado com desenho automático) ──────────────────────
//
// Os fluxos do Guia de PDTIC vêm prontos (modelos do administrador); o órgão
// adapta a cópia dele em listas (raias, passos, decisões, paralelos,
// artefatos), e o desenho sai sozinho no servidor, em SVG, igual na prévia e no
// PDF. O fluxo não muda a trilha (decisão 35). Erros de validação na faixa 1090
// a 1099, com a lista `Erros` em linguagem simples.

/** Tipos de elemento de um fluxo (BPMN simplificado do guia). */
export type PeTipoElementoFluxo = 'inicio' | 'fim' | 'ligacao' | 'tarefa' | 'subprocesso' | 'decisao' | 'paralelo';

/** Uma raia (quem faz): texto ou marcador do dicionário de nomes ("{nomes.comite}"). */
export interface PeFluxoRaia {
  /** Texto curto gerado pelo front, único no fluxo. */
  Id: string;
  Nome: string;
  Ordem: number;
}

export interface PeFluxoElemento {
  /** Texto curto gerado pelo front, único no fluxo. */
  Id: string;
  Tipo: PeTipoElementoFluxo;
  RaiaId: string;
  Nome: string;
  /** Calculado no servidor (tarefas e subprocessos, pela ordem do fluxo, com o prefixo); o que o front manda é ignorado. */
  Numero: string | null;
  /** Documentos ligados à tarefa (nomes). */
  Artefatos: string[];
}

export interface PeFluxoLigacao {
  Id: string;
  De: string;
  Para: string;
  /** Rótulo da saída ("Sim", "Não"); obrigatório nas saídas de uma decisão. */
  Rotulo: string | null;
}

/** Definição de um fluxo: a mesma forma no modelo e na cópia do órgão. */
export interface PeFluxoDefinicao {
  /** "1" numera 1.1, 1.2...; vazio ou nulo, sem número (o servidor não numera, e o documento sai sem número). */
  PrefixoNumeracao: string | null;
  Raias: PeFluxoRaia[];
  Elementos: PeFluxoElemento[];
  Ligacoes: PeFluxoLigacao[];
}

/** Item de GET api/planejamento/modelo/fluxos (todos os papéis leem) e resposta do PUT modelo/fluxos/{chave}. */
export interface PeFluxoModelo {
  Chave: string;
  Nome: string;
  /** "Figura 6". */
  FiguraGuia: string | null;
  Ordem: number;
  Definicao: PeFluxoDefinicao;
  /** F1 (C19): a última mudança do administrador (nulos se nunca mudou). */
  AlteradoEm?: string | null;
  AlteradoPor?: string | null;
  AlteradoPorNome?: string | null;
}

/** Item de GET api/planejamento/pdtic/{id}/fluxos (a cópia do órgão, ou o modelo enquanto não há cópia). */
export interface PeFluxoResumo {
  Chave: string;
  Nome: string;
  FiguraGuia: string | null;
  /** O órgão adaptou o fluxo (tem cópia diferente do modelo). */
  Personalizado: boolean;
  /** O modelo mudou depois que o órgão adaptou o fluxo. */
  ModeloMudou: boolean;
  AlteradoEm: string | null;
  /** E-mail de quem alterou. */
  AlteradoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  AlteradoPorNome?: string | null;
}

/**
 * GET, PUT e POST .../restaurar em api/planejamento/pdtic/{id}/fluxos/{chave}:
 * sem cópia ainda, a do modelo com `Personalizado` falso.
 */
export interface PeFluxoDoOrgao {
  Chave: string;
  Nome: string;
  FiguraGuia: string | null;
  Definicao: PeFluxoDefinicao;
  Personalizado: boolean;
  ModeloMudou: boolean;
  /** Quem está logado edita (equipe do órgão, em elaboração ou devolvido). */
  PodeEditar: boolean;
  /** F1 (C19): da cópia do órgão (nulos sem cópia). */
  AlteradoEm?: string | null;
  AlteradoPor?: string | null;
  AlteradoPorNome?: string | null;
}

/** Corpo do PUT de um fluxo (modelo ou cópia do órgão). */
export interface PeFluxoForm {
  Nome: string;
  Definicao: PeFluxoDefinicao;
}

/** POST api/planejamento/fluxos/desenho: o SVG de uma definição ainda não salva (valida antes). */
export interface PeFluxoDesenhoForm {
  Definicao: PeFluxoDefinicao;
  PdticId: number | null;
}

/** 400 de validação de um fluxo: a lista dos problemas em linguagem simples. */
export interface PeErroFluxo {
  Code?: number;
  Message?: string;
  Erros?: string[] | null;
}

// ── E9 · Geometria do desenho automático (editor visual) ────────────────────
//
// O servidor devolve as medidas do mesmo layout que desenha o SVG da E6 (px do
// sistema do SVG, origem no canto de cima à esquerda). O editor visual desenha
// com elas um SVG interativo, igual ao da prévia e do PDF. A geometria não
// recusa definição incompleta: os problemas vêm em `Erros` (os textos da
// validação da E6), sem 400; o 400 fica para a definição ilegível.

/**
 * POST api/planejamento/fluxos/geometria: a geometria de uma definição ainda não
 * salva. Com o `Nome` do fluxo e duas raias ou mais, o desenho tem a faixa do
 * fluxo à esquerda (`FaixaTitulo`), como no PDF.
 */
export interface PeFluxoGeometriaForm {
  Definicao: PeFluxoDefinicao;
  PdticId: number | null;
  Nome?: string | null;
}

export interface PeFluxoGeometriaPonto {
  X: number;
  Y: number;
}

/** Um retângulo (canto de cima à esquerda, largura e altura). A mais que o contrato. */
export interface PeFluxoGeometriaArea {
  X: number;
  Y: number;
  Largura: number;
  Altura: number;
}

/** Uma raia: a faixa horizontal, com o cabeçalho (o nome na vertical) à esquerda. */
export interface PeFluxoGeometriaRaia {
  Id: string;
  /** O nome como aparece no desenho (marcador do dicionário trocado pelo nome). */
  Nome: string;
  /** O nome como está na definição ("{nomes.comite}"). */
  NomeOriginal: string;
  Y: number;
  Altura: number;
  LarguraCabecalho: number;
  /** A mais que o contrato (opcional): onde a raia começa e a largura dela. */
  X?: number;
  Largura?: number;
  /** A mais que o contrato (opcional): o nome quebrado nas linhas do cabeçalho. */
  Linhas?: string[];
}

/** Um elemento: a caixa que a forma ocupa. */
export interface PeFluxoGeometriaElemento {
  Id: string;
  Tipo: PeTipoElementoFluxo;
  RaiaId: string;
  /** A coluna, da esquerda para a direita, a partir de 0. */
  Camada: number;
  X: number;
  Y: number;
  Largura: number;
  Altura: number;
  Numero: string | null;
  /** O nome como aparece no desenho (marcadores trocados). */
  Nome: string;
  /** O nome quebrado em linhas como no SVG (sem o número). */
  Linhas: string[];
  /** Sem nenhuma ligação: desenhado no fim da raia dele. */
  Solto: boolean;
  /** A mais que o contrato (opcional): "dentro", "acima", "direita" ou "abaixo". */
  PosicaoNome?: string | null;
}

/** Uma ligação desenhada: a linha ortogonal, com a seta no último ponto. */
export interface PeFluxoGeometriaLigacao {
  Id: string;
  De: string;
  Para: string;
  Rotulo: string | null;
  /** Volta para um passo anterior. */
  Retorno: boolean;
  Pontos: PeFluxoGeometriaPonto[];
  /** O começo do rótulo (à esquerda) e a linha de base, como no SVG; nulos sem rótulo. */
  RotuloX: number | null;
  RotuloY: number | null;
  /** A mais que o contrato (opcional): o fundo branco atrás do rótulo. */
  RotuloArea?: PeFluxoGeometriaArea | null;
}

/** Um documento que a tarefa gera: o ícone embaixo dela. */
export interface PeFluxoGeometriaArtefato {
  ElementoId: string;
  Indice: number;
  Nome: string;
  X: number;
  Y: number;
  Largura: number;
  Altura: number;
  /** A mais que o contrato (opcional): o nome em linhas e a linha pontilhada até a tarefa. */
  Linhas?: string[];
  Conector?: PeFluxoGeometriaPonto[];
}

/**
 * A mais que o contrato (opcional): cada linha de texto que o SVG escreve, com a
 * posição exata (X é o começo da linha e Y a linha de base; na vertical, X é a
 * linha de base e Y o pé do texto). `Dono`: o id do elemento, "raia:ID",
 * "pool", "artefato:ID:n" ou "ligacao:ID".
 */
export interface PeFluxoGeometriaTexto {
  Texto: string;
  X: number;
  Y: number;
  Tamanho: number;
  Negrito: boolean;
  Vertical: boolean;
  Cor: string;
  Largura?: number;
  Dono: string;
}

/**
 * Resposta de POST api/planejamento/fluxos/validacao (a mais que o contrato da E6): a
 * conferência de uma definição sem gravar, com os problemas em linguagem simples e,
 * sem problemas, a definição com os números.
 */
export interface PeFluxoValidacao {
  Valida: boolean;
  Erros: string[];
  Definicao: PeFluxoDefinicao | null;
}

/**
 * Resposta de POST api/planejamento/fluxos/geometria e dos GET
 * `pdtic/{id}/fluxos/{chave}/geometria` e `modelo/fluxos/{chave}/geometria`.
 */
export interface PeFluxoGeometria {
  Largura: number;
  Altura: number;
  Raias: PeFluxoGeometriaRaia[];
  Elementos: PeFluxoGeometriaElemento[];
  Ligacoes: PeFluxoGeometriaLigacao[];
  Artefatos: PeFluxoGeometriaArtefato[];
  /** Os problemas da definição, em linguagem simples (vazio quando está tudo certo). */
  Erros: string[];
  /** Id do elemento: número calculado ("1.3"). */
  Numeros: Record<string, string>;
  /** A mais que o contrato (opcionais). */
  Titulo?: string;
  FaixaTitulo?: (PeFluxoGeometriaArea & { Linhas?: string[] }) | null;
  Cor?: { Fundo: string; Borda: string } | null;
  Textos?: PeFluxoGeometriaTexto[];
}

// ── E7 · Acompanhamento do PDTIC (rodada B) ─────────────────────────────────
//
// Depois da publicação, o PDTIC é acompanhado em ciclos: os de monitoramento
// saem da periodicidade do plano de monitoramento (trimestral por padrão), e os
// de avaliação intermediária a equipe abre quando o comitê pede. As seções "por
// ciclo" guardam um registro por ciclo (`?cicloId=` nas rotas de registros). A
// situação das ações e as medições se gravam em grade; o painel (AC-PDTIC)
// consolida metas, ações e riscos; os relatórios RA e RR saem do motor de
// documento da E5. Erros desta rodada na faixa 1120 a 1139.

/** Monitoramento (pela periodicidade) ou avaliação intermediária (aberta pela equipe). */
export type PeTipoCiclo = 'monitoramento' | 'avaliacao';

/**
 * Situação exibida do ciclo: futuro (ainda não começou; não aceita dados) ·
 * aberto · atrasado (o prazo para fechar venceu sem fechar; ainda aceita dados) ·
 * fechado.
 */
export type PeSituacaoCiclo = 'futuro' | 'aberto' | 'atrasado' | 'fechado';

/** O que o ciclo já tem registrado. */
export interface PeResumoCiclo {
  AcoesComSituacao: number;
  TotalAcoes: number;
  Medicoes: number;
  RiscosOcorridos: number;
  /**
   * F1 (I04 e C23), só na avaliação intermediária (zero e nulos no monitoramento):
   * os resultados das metas registrados, se a análise foi registrada e a decisão do
   * comitê (o valor, `seguir` ou `revisar`, e o rótulo).
   */
  ResultadosMetas?: number;
  AnaliseRegistrada?: boolean;
  DecisaoComite?: string | null;
  DecisaoComiteRotulo?: string | null;
}

/** O relatório de acompanhamento (RA) do ciclo: a versão mais recente do PDF. */
export interface PeRelatorioCiclo {
  Numero: number;
  Situacao: PeSituacaoVersaoDoc;
  GeradoEm: string;
}

/** Um ciclo (GET api/planejamento/pdtic/{id}/ciclos?tipo=, resposta do POST, do fechar e do reabrir). */
export interface PeCiclo {
  Id: number;
  Tipo: PeTipoCiclo;
  /** Sequencial no PDTIC e no tipo. */
  Numero: number;
  /** "2027 · 1º trimestre", "Avaliação intermediária 1". */
  Rotulo: string;
  /** Datas puras ("aaaa-mm-dd"). */
  Inicio: string | null;
  Fim: string | null;
  /** O fim do período mais os dias de prazo para fechar. */
  Prazo: string | null;
  Situacao: PeSituacaoCiclo;
  FechadoEm: string | null;
  /** E-mail de quem fechou. */
  FechadoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  FechadoPorNome?: string | null;
  Resumo: PeResumoCiclo | null;
  Relatorio: PeRelatorioCiclo | null;
  /** A mais que o contrato: a última reabertura. */
  ReabertoEm?: string | null;
  ReabertoPor?: string | null;
  ReabertoPorNome?: string | null;
}

/** POST api/planejamento/pdtic/{id}/ciclos: a equipe abre uma avaliação intermediária (uma aberta por vez). */
export interface PeCicloNovoForm {
  Tipo: PeTipoCiclo;
  Rotulo: string | null;
}

/**
 * Uma pendência que impede fechar o ciclo (400 do POST ciclos/{cicloId}/fechar).
 * A mesma forma das pendências do envio; os campos do passo podem faltar.
 */
export interface PePendenciaCiclo {
  PassoId?: number | null;
  PassoNumero?: string | null;
  PassoTitulo?: string | null;
  Motivo: string;
}

export interface PeErroCiclo {
  Code?: number;
  Message?: string;
  Pendencias?: (PePendenciaCiclo | string)[] | null;
}

/** Os valores de uma ação no ciclo anterior (ao lado da grade). */
export interface PeAnteriorAcaoCiclo {
  Situacao: string | null;
  ExecucaoFisica: number | null;
  ExecucaoOrcamentaria: number | null;
}

/**
 * Uma linha da grade das ações (GET api/planejamento/ciclos/{cicloId}/acoes): todas
 * as ações do PDTIC, com o registro do ciclo (se houver) e os valores do ciclo anterior.
 */
export interface PeAcaoCiclo {
  AcaoId: number;
  Codigo: string | null;
  Descricao: string | null;
  /** Códigos das metas ligadas ("M01"). */
  Metas: string[];
  InicioPrevisto: string | null;
  ConclusaoPrevista: string | null;
  /** O registro da seção `monitoramento_acoes` neste ciclo; nulo enquanto a ação não tem. */
  RegistroId: number | null;
  /** O valor da opção (nao_iniciada, em_andamento, concluida, cancelada). */
  Situacao: string | null;
  /** Percentuais de 0 a 100. */
  ExecucaoFisica: number | null;
  ExecucaoOrcamentaria: number | null;
  Observacao: string | null;
  Anterior: PeAnteriorAcaoCiclo | null;
}

/** Um item do PUT api/planejamento/ciclos/{cicloId}/acoes. */
export interface PeAcaoCicloForm {
  AcaoId: number;
  Situacao: string | null;
  ExecucaoFisica: number | null;
  ExecucaoOrcamentaria: number | null;
  Observacao: string | null;
}

/**
 * PUT api/planejamento/ciclos/{cicloId}/acoes: grava pelo motor (seção
 * `monitoramento_acoes`, com a validação do nível) e devolve a lista; 400 com
 * `Campos` no formato "<AcaoId>.<campo>".
 */
export interface PeAcoesCicloForm {
  Itens: PeAcaoCicloForm[];
}

export interface PeAnteriorMedicaoCiclo {
  ValorApurado: number | null;
  Data: string | null;
}

/** Uma linha da grade das medições (GET api/planejamento/ciclos/{cicloId}/medicoes): os indicadores de monitoramento. */
export interface PeMedicaoCiclo {
  IndicadorId: number;
  Codigo: string | null;
  Indicador: string | null;
  /** O valor de referência de cada período, como o órgão escreveu no plano de monitoramento. */
  ValoresReferencia: string | null;
  RegistroId: number | null;
  ValorApurado: number | null;
  /** Data pura ("aaaa-mm-dd"). */
  Data: string | null;
  Observacao: string | null;
  Anterior: PeAnteriorMedicaoCiclo | null;
}

export interface PeMedicaoCicloForm {
  IndicadorId: number;
  ValorApurado: number | null;
  Data: string | null;
  Observacao: string | null;
}

/** PUT api/planejamento/ciclos/{cicloId}/medicoes (400 com `Campos` "<IndicadorId>.<campo>"). */
export interface PeMedicoesCicloForm {
  Itens: PeMedicaoCicloForm[];
}

/** Situação física de uma ação no painel (Anexo XIII): atrasada pelas datas previstas; sem registro no ciclo. */
export type PeSituacaoFisicaAcao = 'em_dia' | 'atrasada' | 'concluida' | 'cancelada' | 'sem_registro';

export interface PePainelAcao {
  AcaoId: number;
  Codigo: string | null;
  Descricao: string | null;
  /** Execução física no último ciclo com dado (0 a 100). */
  PercentualExecucao: number | null;
  SituacaoFisica: PeSituacaoFisicaAcao;
  ExecucaoOrcamentaria: number | null;
  /** A ação não tem investimento nem custeio. */
  OrcamentoNaoSeAplica: boolean;
}

export interface PePainelMeta {
  MetaId: number;
  Codigo: string | null;
  Descricao: string | null;
  Indicador: string | null;
  Valor: string | null;
  /** Data pura ("aaaa-mm-dd"). */
  Prazo: string | null;
  /** Códigos das necessidades atendidas ("N01"). */
  Necessidades: string[];
  /** Média das ações ligadas (ponderada pelo peso da ação na meta, quando houver). */
  PercentualExecucao: number | null;
  Acoes: PePainelAcao[];
}

/** Contagens dos riscos (dicionários com as chaves em minúsculas, como no contrato). */
export interface PePainelRiscos {
  /** aberto, fechado, excluido (a última ocorrência de cada risco) e sem_ocorrencia. */
  PorSituacao: Record<string, number>;
  /** alto, medio e baixo. */
  PorNivel: Record<string, number>;
  /** A matriz situação por nível. */
  Matriz: { Situacao: string; Nivel: string; Quantidade: number }[];
}

/** GET api/planejamento/pdtic/{id}/painel-acompanhamento?cicloId= (sem ciclo, o último com dado). */
export interface PePainelAcompanhamento {
  Ciclo: { Id: number; Rotulo: string } | null;
  Metas: PePainelMeta[];
  /**
   * F1 (C02): as ações que não estão ligadas a nenhuma meta (no nível Básico a
   * ligação com a meta não aparece, e todas as ações vêm aqui).
   */
  AcoesSemMeta?: PePainelAcao[];
  Riscos: PePainelRiscos;
}

// ── E8 · Painéis da SGDI, conformidade, inadimplência e página do órgão ─────
//
// Leitura de todos os órgãos pelo administrador do módulo, pela equipe da SGDI,
// pela Secretaria do CGTIC e pelo admin do SGDP: o painel com os números, a
// conformidade (só itens de TIC), a árvore do PETIC-DF e a página de cada órgão.
// A inadimplência do art. 11 do Decreto nº 48.899/2026 se registra pelo
// administrador do módulo, pela SGDI e pelo admin do SGDP; a equipe e a consulta
// do órgão só leem a página e as inadimplências do próprio órgão. Erros desta
// entrega na faixa 1140 a 1159 (a tela mostra a `Message` do servidor).

/** Chave da situação do órgão no painel (a do PDTIC atual; `sem_pdtic` quando ele ainda não tem). */
export type PeChaveSituacaoPainel =
  | 'sem_pdtic' | 'em_elaboracao' | 'em_aprovacao' | 'devolvido' | 'aprovado' | 'publicado'
  | 'em_acompanhamento' | 'encerrado';

export interface PePainelSituacao {
  Chave: PeChaveSituacaoPainel;
  Rotulo: string;
  Quantidade: number;
}

/** PDTICs em elaboração pela etapa do próximo passo. */
export interface PePainelEtapa {
  Etapa: number;
  Titulo: string;
  Quantidade: number;
}

/**
 * Órgãos por nível. F3: no modo livre, pelo nível alcançado, com o item
 * `{ NivelId: 0, Nome: "Sem nível alcançado" }` (sem PDTIC, sem nível ou registrado
 * fora do sistema); no modo definido, pelo nível do órgão, como antes.
 */
export interface PePainelNivel {
  NivelId: number;
  Nome: string;
  Quantidade: number;
}

/** Necessidades e metas dos órgãos ligadas a um objetivo do PETIC-DF vigente. */
export interface PePainelObjetivo {
  RegistroId: number;
  Codigo: string | null;
  Texto: string | null;
  Necessidades: number;
  Metas: number;
}

/** Ações do plano por tema (as opções do campo tema das ações). */
export interface PePainelTema {
  Valor: string;
  Rotulo: string;
  Quantidade: number;
}

export interface PePainelRiscoNivel {
  Nivel: 'alto' | 'medio' | 'baixo' | 'sem_nivel';
  Rotulo: string;
  Quantidade: number;
}

/** Situação das ações no último ciclo de monitoramento com dado de cada órgão. */
export interface PePainelExecucao {
  Situacao: 'nao_iniciada' | 'em_andamento' | 'concluida' | 'cancelada' | 'sem_registro';
  Rotulo: string;
  Quantidade: number;
}

export interface PePainelAlertas {
  VigenciaVencida: number;
  RevisaoVencida: number;
  CicloAtrasado: number;
  Inadimplentes: number;
  DeliberacoesAguardando: number;
}

export interface PePainelFiltros {
  Niveis: { Id: number; Nome: string }[];
  Situacoes: { Chave: PeChaveSituacaoPainel; Rotulo: string }[];
}

/** GET api/planejamento/painel?NivelId=&Situacao= (papéis globais e admin do SGDP). */
export interface PePainel {
  GeradoEm: string;
  TotalOrgaos: number;
  PorSituacao: PePainelSituacao[];
  EmElaboracaoPorEtapa: PePainelEtapa[];
  PorNivel: PePainelNivel[];
  PorObjetivoPetic: PePainelObjetivo[];
  AcoesPorTema: PePainelTema[];
  RiscosPorNivel: PePainelRiscoNivel[];
  ExecucaoUltimoCiclo: PePainelExecucao[];
  Alertas: PePainelAlertas;
  Filtros: PePainelFiltros;
}

export interface PePainelConsulta {
  NivelId?: number | null;
  Situacao?: PeChaveSituacaoPainel | null;
}

/** Chaves dos itens de conformidade (só itens de TIC). */
export type PeChaveConformidade =
  | 'aprovado_cgtic' | 'comunicado_sgdi' | 'vigente' | 'nove_conteudos' | 'revisao_em_dia' | 'acompanhamento_em_dia';

/** Um item de conformidade: o rótulo e a base legal (com a citação que a dica reconhece). */
export interface PeItemConformidade {
  Chave: PeChaveConformidade | string;
  Rotulo: string;
  Base: string;
  /** A mais que o contrato: o que o item pede, numa frase (sem ele, vale o texto do front para a chave). */
  AtendeQuando?: string | null;
}

/** Grupo pelo percentual: alta a partir de 70%, média de 25% a 69%, baixa abaixo de 25% (sem PDTIC: baixa, 0%). */
export type PeGrupoConformidade = 'alta' | 'media' | 'baixa';

export interface PeResumoConformidade {
  Alta: number;
  Media: number;
  Baixa: number;
}

/** Um item na linha do órgão: `Atende` null é "não se aplica" (sai da conta). */
export interface PeAtendimentoConformidade {
  Atende: boolean | null;
  Detalhe: string | null;
}

/** A inadimplência vigente do órgão (notificado ou inadimplente), na linha da conformidade. */
export interface PeInadimplenciaVigente {
  Id: number;
  Situacao: PeSituacaoInadimplencia;
  /** Data pura ("aaaa-mm-dd"): o fim dos 5 dias úteis. */
  Prazo: string | null;
}

/**
 * As marcas dos alertas do painel numa linha da conformidade (F2): o painel conta
 * exatamente as linhas marcadas, e o filtro `alerta` da tela usa as mesmas marcas.
 */
export interface PeConformidadeAlertas {
  /** O PDTIC está publicado (ou em acompanhamento) e a vigência já terminou. */
  VigenciaVencida: boolean;
  /** A última aprovação mais a periodicidade de revisão já passou (sem aprovação ainda, não há revisão vencida). */
  RevisaoVencida: boolean;
  /** Um ciclo de monitoramento começado passou do prazo de fechamento sem ser fechado. */
  CicloAtrasado: boolean;
}

/**
 * A linha de um órgão na conformidade. A versão e a situação são as do PDTIC de
 * referência, as mesmas do painel (F2): a vigente; sem ela, a da elaboração; sem as
 * duas, a mais recente, encerrada. Os itens avaliam só a vigente ou a da elaboração.
 */
export interface PeConformidadeOrgao {
  OrgaoId: number;
  Sigla: string;
  Nome: string;
  NivelNome: string | null;
  PdticId: number | null;
  PdticVersao: string | null;
  /** A chave do painel (a substituída vem como `encerrado`); null só quando o órgão nunca abriu um PDTIC. */
  PdticSituacao: PeSituacaoPdtic | null;
  /** Pela chave do item (`PeItemConformidade.Chave`). */
  Itens: Record<string, PeAtendimentoConformidade>;
  /** F2: as marcas dos alertas do painel (opcional para aceitar a resposta antiga). */
  Alertas?: PeConformidadeAlertas;
  Atendidos: number;
  Aplicaveis: number;
  /** De 0 a 100. */
  Percentual: number;
  Grupo: PeGrupoConformidade;
  Inadimplencia: PeInadimplenciaVigente | null;
  /**
   * F3: o nível que o PDTIC de referência alcançou (nos dois modos; a tela usa no
   * modo livre). Nulos sem PDTIC de referência, sem nível ou no registrado fora do sistema.
   */
  NivelAlcancadoId?: number | null;
  NivelAlcancadoNome?: string | null;
}

/** GET api/planejamento/conformidade?Grupo=&NivelId=&Filtro=&Situacao=&Alerta=. */
export interface PeConformidade {
  Itens: PeItemConformidade[];
  Resumo: PeResumoConformidade;
  Orgaos: PeConformidadeOrgao[];
}

/** Os filtros de GET conformidade e da planilha, aplicados do mesmo jeito nas duas rotas. */
export interface PeConformidadeConsulta {
  Grupo?: PeGrupoConformidade | null;
  NivelId?: number | null;
  /** Parte da sigla ou do nome do órgão. */
  Filtro?: string | null;
  /** F2: as chaves de situação do painel, separadas por vírgula ("sem_pdtic,encerrado"). */
  Situacao?: string | null;
  /** F2: vigencia, revisao, ciclo (as marcas de `Alertas`) ou inadimplencia (a linha tem `Inadimplencia`). */
  Alerta?: string | null;
}

/**
 * Inadimplência (arts. 7º, § 3º, e 11 do Decreto nº 48.899/2026): notificado (o
 * prazo de 5 dias úteis correndo ou vencido) · justificado (justificativa aceita,
 * encerra) · inadimplente (registrada depois do prazo, com o motivo e a nota de
 * motivação) · saneado (a comunicação foi regularizada; sai do painel).
 */
export type PeSituacaoInadimplencia = 'notificado' | 'justificado' | 'inadimplente' | 'saneado';

/** Motivo do registro (art. 11, III, do Decreto nº 48.899/2026). */
export type PeMotivoInadimplencia = 'descumprimento_prazo' | 'omissao_reiterada' | 'recusa_injustificada';

/** Uma notificação e o que aconteceu com ela (a resposta de todas as rotas da inadimplência). */
export interface PeInadimplencia {
  Id: number;
  OrgaoId: number;
  OrgaoSigla: string;
  OrgaoNome: string;
  /** A comunicação pendente ("Comunicar à SGDI o PDTIC aprovado pelo comitê interno (art. 7º, V)"). */
  Obrigacao: string;
  PrazoDescumprido: string | null;
  /** Datas puras ("aaaa-mm-dd"). */
  NotificadoEm: string;
  Documento: string | null;
  Sei: string | null;
  /** 5 dias úteis depois da notificação. */
  Prazo: string | null;
  /** Dias úteis até o fim do prazo (0 no último dia; o servidor conta). */
  DiasUteisRestantes: number | null;
  /** O prazo terminou: a inadimplência já pode ser registrada. */
  Vencido: boolean;
  Situacao: PeSituacaoInadimplencia;
  SituacaoRotulo: string | null;
  Justificativa: string | null;
  Motivo: PeMotivoInadimplencia | null;
  MotivoRotulo: string | null;
  NotaMotivacao: string | null;
  ComunicadoControleEm: string | null;
  RegistradoEm: string | null;
  /** E-mail de quem registrou a inadimplência. */
  RegistradoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  RegistradoPorNome?: string | null;
  SaneadoEm: string | null;
  Observacao: string | null;
  CriadoEm: string;
  CriadoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  CriadoPorNome?: string | null;
}

/** GET api/planejamento/inadimplencias (vigentes primeiro). */
export interface PeInadimplenciasConsulta {
  Situacao?: PeSituacaoInadimplencia | null;
  OrgaoId?: number | null;
  Page: number;
  PageSize: number;
}

export interface PaginaPeInadimplencias {
  Items: PeInadimplencia[];
  CurrentPage: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  HasPreviousPage: boolean;
  HasNextPage: boolean;
}

/** POST api/planejamento/orgaos/{id}/inadimplencias: a notificação (art. 11, I). */
export interface PeNotificacaoForm {
  Obrigacao: string;
  PrazoDescumprido: string | null;
  NotificadoEm: string;
  Documento: string;
  Sei: string | null;
}

/** POST api/planejamento/inadimplencias/{id}/justificar: a justificativa aceita (encerra). */
export interface PeJustificativaForm {
  Justificativa: string;
}

/** POST api/planejamento/inadimplencias/{id}/registrar: só depois do prazo (senão 409). */
export interface PeRegistroInadimplenciaForm {
  Motivo: PeMotivoInadimplencia;
  NotaMotivacao: string;
  ComunicadoControleEm: string | null;
}

/** POST api/planejamento/inadimplencias/{id}/sanear (art. 11, § 2º). */
export interface PeSaneamentoForm {
  SaneadoEm: string;
  Observacao: string | null;
}

export interface PeArvoreIndicador {
  Codigo: string | null;
  Nome: string | null;
  Meta: string | null;
}

export interface PeArvoreNecessidade {
  Codigo: string | null;
  Descricao: string | null;
  Priorizada: boolean | null;
}

export interface PeArvoreMeta {
  Codigo: string | null;
  Descricao: string | null;
  Indicador: string | null;
  Valor: string | null;
  /** Data pura ("aaaa-mm-dd"). */
  Prazo: string | null;
  Situacao: string | null;
}

/** As necessidades e as metas de um órgão ligadas ao objetivo (ligação `objetivo_petic`). */
export interface PeArvoreOrgao {
  OrgaoId: number;
  Sigla: string;
  PdticId: number | null;
  Necessidades: PeArvoreNecessidade[];
  Metas: PeArvoreMeta[];
}

export interface PeArvoreObjetivo {
  RegistroId: number;
  Codigo: string | null;
  Texto: string | null;
  Indicadores: PeArvoreIndicador[];
  TotalNecessidades: number;
  TotalMetas: number;
  Orgaos: PeArvoreOrgao[];
}

/** GET api/planejamento/petic/arvore?orgaoId= (sem PETIC-DF vigente, `Petic` nulo). */
export interface PeArvorePetic {
  Petic: { Id: number; Versao: string; Titulo: string } | null;
  Objetivos: PeArvoreObjetivo[];
}

export interface PeHistoricoNivelResumo {
  NivelNome: string | null;
  /** F1 (A21): o nível desta troca é o padrão (o órgão voltou ao padrão). */
  Padrao?: boolean;
  /** F1 (A21): o nível de antes da troca e se ele era o padrão. */
  NivelAnterior?: string | null;
  NivelAnteriorPadrao?: boolean;
  Justificativa: string | null;
  AlteradoEm: string | null;
  AlteradoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  AlteradoPorNome?: string | null;
}

/**
 * Andamento da trilha do órgão numa etapa. F3 (correções): com `OpcionaisFeitos`, `Feitos`
 * e `Total` contam só os passos obrigatórios; sem ele (a resposta anterior), todos.
 */
export interface PeAndamentoEtapa {
  Etapa: number;
  Titulo: string;
  Feitos: number;
  Total: number;
  Atrasados: number;
  Aguardando: number;
  /** F3 (B): quantos passos da etapa estão validados pela equipe (sem o campo, a resposta antiga). */
  Validados?: number;
  /** F3 (correções): quantos passos opcionais da etapa o órgão já fez (os opcionais não entram em `Feitos` nem em `Total`). */
  OpcionaisFeitos?: number;
}

export interface PeNaoSeAplicaResumo {
  PassoNumero: string | null;
  PassoTitulo: string | null;
  Justificativa: string | null;
  MarcadoEm: string | null;
  MarcadoPor: string | null;
  /** F1 (C19): o nome de quem (o e-mail quando o cadastro não tem nome); sem ele, vale o e-mail. */
  MarcadoPorNome?: string | null;
}

export interface PeComentarioAberto {
  Id: number;
  PassoId: number;
  PassoNumero: string | null;
  Texto: string;
  AutorNome: string | null;
  CriadoEm: string;
}

/** Uma decisão registrada nos passos de aprovação (SGTIC, comitê, autoridade). */
export interface PeAprovacaoResumo {
  PassoNumero: string | null;
  Rotulo: string | null;
  Decisao: string | null;
  /** Data pura ("aaaa-mm-dd"). */
  Data: string | null;
  Ato: string | null;
  Sei: string | null;
}

/** Um PDF gerado do órgão: o documento do PDTIC, um RA ou o RR. `Url` é o caminho da API para baixar. */
export interface PeDocumentoResumo {
  Tipo: PeTipoDocumento;
  Rotulo: string | null;
  Numero: number;
  Situacao: string | null;
  GeradoEm: string | null;
  Paginas: number | null;
  Url: string | null;
}

/**
 * O bloco do nível no resumo do órgão. `Padrao`, a mais que o contrato: o órgão não
 * tem nível escolhido e vale o padrão. F3: o modo, o nível alcançado e o que falta
 * para o próximo (os campos de `PeNivelAlcancado`, opcionais para a resposta antiga).
 */
export interface PeNivelDoResumo {
  Id: number | null;
  Nome: string | null;
  Padrao?: boolean;
  Historico: PeHistoricoNivelResumo[];
  Modo?: PeModoNiveis;
  AlcancadoId?: number | null;
  AlcancadoNome?: string | null;
  ProximoId?: number | null;
  ProximoNome?: string | null;
  Faltam?: PeFaltaNivel[] | null;
  /** F3: por que o nível não é calculado (o PDTIC registrado fora do sistema), quando o servidor manda. */
  Motivo?: string | null;
}

/** GET api/planejamento/orgaos/{id}/resumo: tudo do órgão num lugar só (a página do órgão). */
export interface PeResumoOrgao {
  Orgao: { Id: number; Sigla: string; Nome: string };
  Nivel: PeNivelDoResumo;
  Pdtic: PePdtic | null;
  Versoes: PePdtic[];
  Andamento: PeAndamentoEtapa[];
  /** "2.3", ou nulo quando nada espera. */
  ProximoPasso: string | null;
  /** A linha do órgão na conformidade. */
  Conformidade: PeConformidadeOrgao | null;
  NaoSeAplica: PeNaoSeAplicaResumo[];
  ComentariosAbertos: PeComentarioAberto[];
  Aprovacoes: PeAprovacaoResumo[];
  Deliberacoes: PeDeliberacao[];
  Documentos: PeDocumentoResumo[];
  Ciclos: PeCiclo[];
  Inadimplencias: PeInadimplencia[];
}

// ── F3 · Retorno do dono do produto: níveis no modo livre e validação ────────
//
// Modo dos níveis: `livre` (todo órgão começa pelo nível base, o mínimo do decreto;
// os outros passos do Guia aparecem como opcionais; cada passo pode ser detalhado
// na forma de um nível mais alto; o nível sai do que o PDTIC tem) ou `definido`
// (o administrador escolhe o nível de cada órgão, como antes). Tudo o que é novo é
// opcional nas respostas: sem os campos (a API anterior), vale o modo definido,
// sem validação. Erros novos: 1145 (validação recusada) e 1146 (forma recusada).

export type PeModoNiveis = 'livre' | 'definido';

/** PUT api/planejamento/modelo/modo-niveis (o administrador do módulo e o admin do SGDP). */
export interface PeModoNiveisForm {
  Modo: PeModoNiveis;
}

/** Resposta do PUT modelo/modo-niveis. */
export interface PeModoNiveisResposta {
  ModoNiveis: PeModoNiveis;
}

/** A forma em uso de um passo: o nível cujas seções e campos valem para ele. */
export interface PeDetalhePasso {
  NivelId: number;
  NivelNome: string;
}

/** Uma forma que o órgão pode escolher para o passo, com o que ela mostra. */
export interface PeOpcaoDetalhe {
  NivelId: number;
  NivelNome: string;
  /** Seções visíveis do passo nesta forma. */
  Secoes: number;
  /** Campos visíveis do passo nesta forma. */
  Campos: number;
}

/**
 * PUT api/planejamento/orgaos/{orgaoId}/passos/{passoId}/detalhe: `NivelId` nulo
 * volta à forma padrão. Devolve o passo a passo do órgão (`PeTrilhaOrgao`).
 */
export interface PeDetalheForm {
  NivelId: number | null;
}

/**
 * B: a marca "validado pela equipe" de um passo. Instantes (exibidos sem `:'UTC'`).
 * `AlteradoDepoisEm`: a data da primeira mudança nos dados do passo depois da
 * validação (a marca fica, com o aviso); nula sem mudança.
 */
export interface PeValidacaoPasso {
  ValidadoEm: string;
  /** E-mail de quem validou. */
  ValidadoPor: string | null;
  /** O nome de quem validou (sem ele, vale o e-mail). */
  ValidadoPorNome?: string | null;
  AlteradoDepoisEm: string | null;
}

/** C5: um passo que falta para o PDTIC chegar ao próximo nível. */
export interface PeFaltaNivel {
  PassoId: number;
  /** O número no passo a passo do órgão; nulo quando o órgão não vê o passo. */
  PassoNumero: string | null;
  PassoTitulo: string;
  /** O que falta, em linguagem simples (o mesmo texto do "o que falta" do envio). */
  Motivo: string;
}

/**
 * C5: o nível que o PDTIC alcançou (GET pdtic/{id}/situacao, `Nivel`). O mais alto
 * nível que o PDTIC atende junto com todos os anteriores; nulo quando não atende nem
 * ao primeiro. O próximo é o seguinte ao alcançado (sem alcançado, o primeiro), com
 * o que falta; sem próximo (alcançou o último), `Faltam` vazia. No PDTIC registrado
 * fora do sistema o nível não é calculado, e `Motivo` diz por quê.
 */
export interface PeNivelAlcancado {
  Modo: PeModoNiveis;
  AlcancadoId: number | null;
  AlcancadoNome: string | null;
  ProximoId: number | null;
  ProximoNome: string | null;
  Faltam: PeFaltaNivel[];
  Motivo: string | null;
}
