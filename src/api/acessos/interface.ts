/**
 * Gestão de acessos por módulo (isolamento entre módulos): espelho PascalCase
 * dos DTOs de `app/api/Acesso/AcessoDTO.cs` (GET/PUT api/acessos).
 */

/** Um acesso a módulo: concedido no sistema ou visto no Keycloak (último login). */
export interface AcessoModuloInfo {
  Modulo: string;
  ConcedidoEm: string;
  ConcedidoPor: string;
}

export interface UsuarioAcesso {
  Id: string;
  Nome: string;
  Email: string;
  UnidadeId: string | null;
  UnidadeNome: string | null;
  PapelPgia: string | null;
  PapelContratacoes: string | null;
  /** Concedidos na tela de gestão (editáveis). */
  Concedidos: AcessoModuloInfo[];
  /** Retrato das roles do Keycloak no último login (só leitura). */
  Keycloak: AcessoModuloInfo[];
  /** Resultado efetivo, somando Keycloak, concessões e papéis. */
  Modulos: string[];
}

export interface AcessoUsuarioForm {
  Demandas: boolean;
  Pgia: boolean;
  PapelPgia: string | null;
  Contratacoes: boolean;
}

export interface AcessosConsulta {
  Filtro?: string | null;
  /** ModulosSgdp ou "nenhum" (sem acesso a módulo algum). */
  Modulo?: string | null;
  Page: number;
  PageSize: number;
}

export interface PaginaUsuariosAcesso {
  Items: UsuarioAcesso[];
  CurrentPage: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  HasPreviousPage: boolean;
  HasNextPage: boolean;
}

/** Filtro da listagem para quem não tem acesso a módulo algum. */
export const FILTRO_SEM_ACESSO = 'nenhum';

// ── Pedidos de acesso (api/pedidos-acesso, `app/api/Acesso/PedidoAcessoDTO.cs`) ──

/** Situação de um pedido de acesso (SituacaoPedidoAcesso no backend). */
export const SituacoesPedidoAcesso = {
  Pendente: 'pendente',
  Aprovado: 'aprovado',
  Recusado: 'recusado'
} as const;

export type SituacaoPedidoAcesso = typeof SituacoesPedidoAcesso[keyof typeof SituacoesPedidoAcesso];

/** Pedido visto por quem pediu: o card do módulo mostra o último de cada módulo. */
export interface MeuPedidoAcesso {
  Id: number;
  Modulo: string;
  Situacao: SituacaoPedidoAcesso;
  CriadoEm: string;
  DecididoEm: string | null;
  /** Só na recusa. */
  MotivoRecusa: string | null;
}

/** Pedido visto por quem decide (Administração e SGDI). */
export interface PedidoAcesso {
  Id: number;
  UserId: string;
  Nome: string;
  Email: string;
  UnidadeNome: string | null;
  Modulo: string;
  Justificativa: string | null;
  Situacao: SituacaoPedidoAcesso;
  CriadoEm: string;
  DecididoEm: string | null;
  /** E-mail de quem decidiu. Nulo num aprovado: o acesso chegou por outro caminho (Keycloak, papel). */
  DecididoPor: string | null;
  /** Papel no PGIA dado na aprovação. */
  PapelPgia: string | null;
  MotivoRecusa: string | null;
}

export interface PedidosAcessoConsulta {
  /** SituacoesPedidoAcesso; vazio = todas. */
  Situacao?: string | null;
  /** Um dos módulos que quem consulta decide; vazio = todos eles. */
  Modulo?: string | null;
  /** Parte do nome ou do e-mail de quem pediu. */
  Filtro?: string | null;
  Page: number;
  PageSize: number;
}

export interface PaginaPedidosAcesso {
  Items: PedidoAcesso[];
  CurrentPage: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  HasPreviousPage: boolean;
  HasNextPage: boolean;
}
