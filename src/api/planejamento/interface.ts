/**
 * Governança Estratégica (módulo `planejamento`, Decreto nº 48.900/2026): espelho
 * PascalCase dos DTOs de `app/api/Planejamento` do SGDP-Service (api/planejamento).
 * Erros de regra voltam como `{ Code, Message }` (400, 403, 404 ou 409), na faixa
 * 1000 a 1159 (a E7 passou a usar 1100 a 1139).
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
  AutoRebaixamento: 1003
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
  OQueFazer: string;
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
}

export interface PePassoTrilha {
  /** "1.1", pela posição entre os passos visíveis. */
  Numero: string;
  Id: number;
  Chave: string;
  Titulo: string;
  OQueFazer: string;
  BaseLegal: string | null;
  ReferenciaGuia: string | null;
  Tipo: PeTipoPasso;
  IncisoDecreto: string | null;
  Travado: boolean;
  AceitaNaoSeAplica: boolean;
  Situacao: Exclude<PeSituacao, 'desligado'>;
  AjustadoParaOrgao: boolean;
  Secoes: PeSecaoTrilha[];
}

export interface PeEtapaTrilha {
  Numero: number;
  Chave: string;
  Titulo: string;
  Descricao: string | null;
  ReferenciaGuia: string | null;
  Passos: PePassoTrilha[];
}

export interface PeTrilhaOrgao {
  OrgaoId: number;
  OrgaoSigla: string;
  OrgaoNome: string;
  NivelId: number;
  NivelNome: string;
  /** O administrador ainda não definiu o nível do órgão: vale o nível padrão (o primeiro ativo). */
  NivelPadrao: boolean;
  Etapas: PeEtapaTrilha[];
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
  OQueFazer: string;
  BaseLegal: string | null;
  ReferenciaGuia: string | null;
  AceitaNaoSeAplica: boolean;
}

/** POST modelo/passos: sempre do tipo dados, numa etapa; nasce opcional no nível mais alto. */
export interface PePassoNovoForm {
  EtapaId: number;
  Titulo: string;
  OQueFazer: string;
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
}

/** PUT api/planejamento/orgaos/{id}/nivel (justificativa obrigatória). */
export interface PeOrgaoNivelForm {
  NivelId: number;
  Justificativa: string;
}

/** GET api/planejamento/orgaos/{id}/nivel/historico. */
export interface PeOrgaoNivelHistorico {
  NivelAnterior: string | null;
  NivelNovo: string;
  Justificativa: string | null;
  DefinidoEm: string;
  DefinidoPor: string | null;
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
  AlteradoEm: string | null;
  AlteradoPor: string | null;
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
  Situacao: PeSituacaoDeliberacao;
  DecididoEm: string | null;
  DecididoPor: string | null;
  AtoTipo: string | null;
  AtoNumero: string | null;
  /** Data pura ("aaaa-mm-dd"). */
  AtoData: string | null;
  Sei: string | null;
  Observacao: string | null;
  /** E7: o PDF enviado (só nas deliberações de PDTIC; nulo no PETIC-DF e em resposta antiga). */
  Documento?: PeDocumentoDeliberacao | null;
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
  /** Quem está logado preenche este PDTIC (equipe do órgão, em elaboração ou devolvido). */
  PodeEditar: boolean;
  CriadoEm: string;
  CriadoPor: string | null;
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
  | 'aguardando' | 'atrasado' | 'externo';

/** "Não se aplica" marcado num passo (só em passo opcional no nível do órgão que aceita). */
export interface PeNaoSeAplica {
  Justificativa: string;
  MarcadoEm: string;
  /** E-mail de quem marcou. */
  MarcadoPor: string | null;
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
  /** E7: o porquê de aguardando, atrasado e externo ("Disponível depois da publicação do PDTIC"). */
  Motivo?: string | null;
  /**
   * E7: quem está logado grava neste passo agora (a equipe do órgão, conforme a
   * situação do PDTIC e a etapa do passo). Sem ele (resposta antiga), vale o
   * `PodeEditar` do PDTIC.
   */
  PodeEditar?: boolean;
}

/** GET api/planejamento/pdtic/{id}/situacao: a moldura usa para as bolinhas e o próximo passo. */
export interface PeAndamentoPdtic {
  /** Número do passo recomendado ("2.3"): o atrasado, depois o que pede atenção, depois o primeiro pendente; nulo quando nada espera. */
  ProximoPasso: string | null;
  Passos: PeSituacaoPassoPdtic[];
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
  /** "1" numera 1.1, 1.2...; vazio ou nulo, 1, 2, 3... */
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
  Resumo: PeResumoCiclo | null;
  Relatorio: PeRelatorioCiclo | null;
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
  Riscos: PePainelRiscos;
}
