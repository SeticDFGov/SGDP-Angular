/**
 * Governança Estratégica (módulo `planejamento`, Decreto nº 48.900/2026): espelho
 * PascalCase dos DTOs de `app/api/Planejamento` do SGDP-Service (api/planejamento).
 * Erros de regra voltam como `{ Code, Message }` (400, 403, 404 ou 409), na faixa
 * 1000 a 1099.
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
