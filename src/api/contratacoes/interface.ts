// Tipos do módulo Análises de Contratações (Decreto nº 48.899/2026 + IN SGDI nº 1/2026),
// em PascalCase espelhando os DTOs da API (a API serializa PascalCase).
// Datas puras (DateOnly no backend) trafegam como string 'AAAA-MM-DD' — exibir
// sempre com `| date:'dd/MM/yyyy':'UTC'` para não deslocar um dia no fuso.

/** Papel do módulo (coluna Users.PapelContratacoes, paralela ao Perfil). */
export const PAPEL_CTR_ANALISE = 'ctr_analise';

// ── Domínios (espelham CtrDominios.cs; valores fixos pelo contrato) ─────────

/** Categoria do objeto contratado — os 12 valores observados na planilha. */
export const CATEGORIAS_OBJETO = [
  'Infraestrutura de Rede',
  'Desenvolvimento / Fábrica de Software',
  'Outsourcing de Impressão',
  'Licenciamento de Software',
  'Inteligência Artificial',
  'Segurança Cibernética',
  'Sistemas de Gestão',
  'Certificação Digital',
  'Captação Audiovisual',
  'Telefonia / VoIP',
  'Sem objeto / Indefinido',
  'Outros'
] as const;

/** Padrão da importação quando a célula da categoria vem vazia. */
export const CATEGORIA_SEM_OBJETO = 'Sem objeto / Indefinido';

/**
 * Situação derivada do processo (nunca gravada: o backend calcula a partir dos
 * checkpoints e da restituição). A ordem é a da precedência do cálculo.
 */
export const SITUACOES = [
  'Restituído',
  'Concluído',
  'Retornado ao Gab SGDI',
  'Em análise na UGTIC',
  'Em análise na SUBGD',
  'Em análise na SGDI',
  'Sem movimentação'
] as const;

/** Etapas do trâmite, na ordem cronológica — chave do PUT de checkpoint. */
export const ETAPAS = [
  { valor: 'ChegadaSgdi', rotulo: 'Chegada da análise · SGDI' },
  { valor: 'ChegadaSubgd', rotulo: 'Chegada da análise · SUBGD' },
  { valor: 'ChegadaUgtic', rotulo: 'Chegada da análise · UGTIC' },
  { valor: 'RetornoGabSgdi', rotulo: 'Retorno ao Gab SGDI' },
  { valor: 'RetornoOrgao', rotulo: 'Retorno ao órgão comunicante' }
] as const;

/** Situação da contratação no Portfólio Estratégico (incisos I e II do despacho). */
export const SITUACOES_PORTFOLIO = [
  'Comunicada previamente',
  'Não comunicada previamente'
] as const;

/** Criticidade da contratação (art. 11 da IN SGDI nº 1/2026). */
export const CRITICIDADES = ['Alta', 'Média', 'Baixa'] as const;

/** Resultado da análise e providência adotada (inciso I do despacho). */
export const RESULTADOS_ANALISE = [
  'Alinhada',
  'Informações complementares',
  'Riscos significativos'
] as const;

/** Desfecho exclusivo quando o resultado é "Riscos significativos". */
export const DESFECHOS_RISCO = [
  'Aguardando resposta',
  'Risco resolvido',
  'Não pode prosseguir'
] as const;

/** Estágio derivado da manifestação (CtrManifestacaoService.CalcularEstagio). */
export const ESTAGIOS_TCDF = [
  'Notificação para regularizar',
  'Alinhada',
  'Informações solicitadas',
  'Aguardando resposta',
  'Risco resolvido',
  'Não pode prosseguir'
] as const;

/** Formato do número SEI: 00000-00000000/AAAA-DD. */
export const REGEX_NUMERO_SEI = /^\d{5}-\d{8}\/\d{4}-\d{2}$/;

// ── Processos ───────────────────────────────────────────────────────────────

/** Corpo de POST e PUT do processo (CtrProcessoCreateDTO/CtrProcessoUpdateDTO). */
export interface CtrProcessoForm {
  NumeroProcesso: string;
  OrgaoNome: string;
  OrgaoSigla: string;
  ComplementoArea?: string | null;
  Objeto: string;
  CategoriaObjeto: string;
  ChegadaSgdi?: string | null;
  ChegadaSubgd?: string | null;
  ChegadaUgtic?: string | null;
  UgticNaoSeAplica: boolean;
  RetornoGabSgdi?: string | null;
  RetornoOrgao?: string | null;
  Restituido: boolean;
  RestituidoEm?: string | null;
  RestituidoMotivo?: string | null;
  Observacao?: string | null;
}

/** Resposta do processo (CtrProcessoResponse): o form + os campos derivados. */
export interface CtrProcesso extends CtrProcessoForm {
  Id: number;
  /** Derivada no backend, nunca gravada. */
  Situacao: string;
  UltimaMovimentacao?: string | null;
  DiasSemMovimento: number;
  TotalManifestacoes: number;
  UltimoEstagioTcdf?: string | null;
  CriadoEm: string;
  CriadoPor: string;
  AlteradoEm?: string | null;
  AlteradoPor?: string | null;
}

/** Edição rápida de um checkpoint (PUT processo/{id}/checkpoint). */
export interface CtrCheckpointForm {
  /** Um dos valores de ETAPAS. */
  Etapa: string;
  /** Nula limpa o checkpoint. */
  Data?: string | null;
  /** Só vale para ChegadaUgtic: true limpa a data e marca "não se aplica". */
  NaoSeAplica?: boolean;
}

/** Filtros da listagem (query string de GET processo e GET processo/exportar). */
export interface CtrProcessoFiltro {
  Page?: number;
  PageSize?: number;
  Filtro?: string | null;
  Categoria?: string | null;
  Situacao?: string | null;
  Sigla?: string | null;
  Restituidos?: boolean | null;
  De?: string | null;
  Ate?: string | null;
  OrderBy?: string | null;
}

// ── Manifestações ao TCDF ───────────────────────────────────────────────────

/** Corpo de POST e PUT da manifestação (CtrManifestacaoCreateDTO/UpdateDTO). */
export interface CtrManifestacaoForm {
  OficioTcdf: string;
  DataOficio: string;
  SituacaoPortfolio: string;
  ComunicadaDesde?: string | null;
  Criticidade?: string | null;
  ResultadoAnalise?: string | null;
  RecomendouSuspensao: boolean;
  ComunicouControleInterno: boolean;
  DesfechoRisco?: string | null;
  PrazoRegularizacaoDias?: number | null;
  Observacao?: string | null;
}

/** Resposta da manifestação (CtrManifestacaoResponse). */
export interface CtrManifestacao extends CtrManifestacaoForm {
  Id: number;
  ProcessoId: number;
  NumeroProcesso: string;
  OrgaoSigla: string;
  OrgaoNome: string;
  Objeto: string;
  /** Derivado no backend a partir do inciso, do resultado e do desfecho. */
  Estagio: string;
  CriadoEm: string;
  CriadoPor: string;
  AlteradoEm?: string | null;
  AlteradoPor?: string | null;
}

/** Dados do fecho do despacho — informados na hora da geração, não persistem. */
export interface CtrDespachoParams {
  Local: string;
  Nome: string;
  Cargo: string;
}

// ── Painel ──────────────────────────────────────────────────────────────────

export interface CtrContagem {
  Chave: string;
  Quantidade: number;
}

export interface CtrTemposMedios {
  SgdiParaSubgd?: number | null;
  SubgdParaUgtic?: number | null;
  UgticParaRetornoGab?: number | null;
  RetornoGabParaOrgao?: number | null;
  ChegadaParaConclusao?: number | null;
}

export interface CtrPainel {
  TotalAtivos: number;
  LimiteDias: number;
  PorSituacao: CtrContagem[];
  PorCategoria: CtrContagem[];
  PorOrgao: CtrContagem[];
  TemposMedios: CtrTemposMedios;
  /** Ativos fora de Concluído/Restituído parados há LimiteDias ou mais. */
  Gargalos: CtrProcesso[];
}

// ── Importação da planilha ──────────────────────────────────────────────────

export type CtrAcaoImportacao = 'Criar' | 'Atualizar' | 'Rejeitar';

export interface CtrImportacaoLinha {
  Linha: number;
  NumeroProcesso: string;
  OrgaoSigla: string;
  CategoriaObjeto: string;
  Situacao: string;
  Acao: CtrAcaoImportacao;
  Motivo?: string | null;
  Dados?: CtrProcessoForm | null;
}

export interface CtrImportacaoPrevia {
  TotalLinhas: number;
  Linhas: CtrImportacaoLinha[];
}

export interface CtrImportacaoRelatorio {
  Criados: number;
  Atualizados: number;
  Rejeitados: number;
  Linhas: CtrImportacaoLinha[];
}

// ── Administração do papel ──────────────────────────────────────────────────

export interface AtribuirPapelContratacoesForm {
  Email: string;
  /** Nulo remove o papel. */
  PapelContratacoes?: string | null;
}

// ── Paginação (espelha o PagedResponse<T> compartilhado da API) ─────────────

export interface CtrPagedResponse<T> {
  Items: T[];
  CurrentPage: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
}
