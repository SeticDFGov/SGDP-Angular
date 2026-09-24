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
 * sempre com `{ Code, Message }`.
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
