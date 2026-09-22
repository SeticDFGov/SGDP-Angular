// Tipos do módulo Supervisão Contínua das Contratações (Decreto nº 48.899/2026 + IN SGDI
// nº 1/2026), em PascalCase espelhando os DTOs da API (a API serializa PascalCase).
// Datas puras (DateOnly no backend) trafegam como string 'AAAA-MM-DD'; exibir
// sempre com `| date:'dd/MM/yyyy':'UTC'` para não deslocar um dia no fuso.

/** Papel do módulo (coluna Users.PapelContratacoes, paralela ao Perfil). */
export const PAPEL_CTR_ANALISE = 'ctr_analise';

// ── Domínios (espelham CtrDominios.cs; valores fixos pelo contrato) ─────────

/** Categoria do objeto contratado: os 12 valores observados na planilha mais "Serviços de TIC". */
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
  'Serviços de TIC',
  'Sem objeto / Indefinido',
  'Outros'
] as const;

/** Padrão da importação quando a célula da categoria vem vazia. */
export const CATEGORIA_SEM_OBJETO = 'Sem objeto / Indefinido';

/**
 * Situação derivada do processo (nunca gravada: o backend calcula a partir das
 * datas do trâmite e da restituição). A ordem é a da precedência do cálculo:
 * a assinatura do contrato vence tudo (`Concluído`, o processo sai da lista e
 * vai para a relação de concluídos do painel); a devolução ao órgão é
 * `Análise concluída`.
 */
export const SITUACOES = [
  'Concluído',
  'Restituído',
  'Análise concluída',
  'Retornado ao Gab SGDI',
  'Em análise na UGTIC',
  'Em análise na SUBGD',
  'Em análise na SGDI',
  'Sem movimentação'
] as const;

/**
 * Etapas do trâmite, na ordem cronológica; chave do PUT de checkpoint. A última é
 * a assinatura do contrato: fora da cronologia das outras cinco (o TCDF também
 * analisa contrato já assinado), mas é a data que conclui o processo.
 */
export const ETAPAS = [
  { valor: 'ChegadaSgdi', rotulo: 'Chegada da análise · SGDI' },
  { valor: 'ChegadaSubgd', rotulo: 'Chegada da análise · SUBGD' },
  { valor: 'ChegadaUgtic', rotulo: 'Chegada da análise · UGTIC' },
  { valor: 'RetornoGabSgdi', rotulo: 'Retorno ao Gab SGDI' },
  { valor: 'RetornoOrgao', rotulo: 'Retorno ao órgão comunicante' },
  { valor: 'AssinaturaContrato', rotulo: 'Assinatura do Contrato' }
] as const;

/** A etapa que conclui o processo (não aceita "não se aplica"). */
export const ETAPA_ASSINATURA = 'AssinaturaContrato';

/** Situação da contratação no Portfólio Estratégico (incisos I e II do despacho). */
export const SITUACOES_PORTFOLIO = [
  'Comunicada previamente',
  'Não comunicada previamente'
] as const;

/**
 * Criticidade da contratação (art. 11 da IN SGDI nº 1/2026), da mais alta para a
 * mais baixa (é a ordem padrão da lista).
 *
 * É atributo da **contratação**, não da resposta ao TCDF: mora no processo e a
 * manifestação apenas a reporta (o despacho do inciso I imprime o valor). Desde
 * 2026-09-22 é DERIVADA no servidor das respostas aos critérios do § 3º
 * (`criticidade.ts` tem o espelho da regra para a prévia ao vivo).
 */
export const CRITICIDADES = ['Alta', 'Média', 'Baixa'] as const;

/**
 * Etapa em que o planejamento da contratação está. O valor gravado é a sigla
 * (jargão da área); o nome por extenso é só exibição.
 */
export const ETAPAS_PLANEJAMENTO = [
  { valor: 'DFD', rotulo: 'Documento de Formalização da Demanda' },
  { valor: 'ETP', rotulo: 'Estudo Técnico Preliminar' },
  { valor: 'TR', rotulo: 'Termo de Referência' }
] as const;

/**
 * Status do processo no TCDF: fato do Tribunal, vale em qualquer inciso e com
 * qualquer resultado. Nulo = sem status especial.
 */
export const STATUS_TCDF = [
  'Suspenso por irregularidades',
  'Edital revogado'
] as const;

/** Como a contratação chegou à SGDI. */
export const ORIGENS = ['Órgão comunicante', 'TCDF'] as const;

/** Origem assumida quando o campo vem vazio (default da coluna). */
export const ORIGEM_PADRAO = 'Órgão comunicante';

/** Origem dos processos que nascem de análise interna do próprio Tribunal. */
export const ORIGEM_TCDF = 'TCDF';

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

/**
 * Estágio derivado da manifestação (CtrManifestacaoService.CalcularEstagio).
 *
 * O status no TCDF tem **precedência**: preenchido, é ele o estágio. Por isso
 * os dois valores de STATUS_TCDF entram aqui, no fim da lista.
 */
export const ESTAGIOS_TCDF = [
  'Notificação para regularizar',
  'Alinhada',
  'Informações solicitadas',
  'Aguardando resposta',
  'Risco resolvido',
  'Não pode prosseguir',
  'Suspenso por irregularidades',
  'Edital revogado'
] as const;

/** Formato do número SEI: 00000-00000000/AAAA-DD. */
export const REGEX_NUMERO_SEI = /^\d{5}-\d{8}\/\d{4}-\d{2}$/;

// ── Riscos da contratação ───────────────────────────────────────────────────
// A classificação de riscos do processo é a lista de riscos da contratação, cada
// um na escala 5×5 da CGDF (lida das fontes estáticas do PGIA pela seção
// `shared/ctr-classificacao-risco.component.ts`). O questionário dos arts. 15 a
// 17 do Decreto nº 48.901/2026 saiu do módulo em 2026-09-21. Aqui ficam os
// domínios próprios do módulo e os tipos do contrato.

/**
 * Nível de um risco declarado (`CtrDominios.NivelRisco`), em ordem crescente;
 * é a cor da célula do mapa da CGDF: v Baixo, a Médio, l Alto, r Extremo.
 */
export const NIVEIS_RISCO = ['Baixo', 'Médio', 'Alto', 'Extremo'] as const;

/** Filtro e painel: processo sem nenhum risco declarado. */
export const SEM_RISCOS_DECLARADOS = 'Sem riscos declarados';

/** Limite de riscos declarados por processo (`[MaxLength(20)]` no DTO). */
export const MAX_RISCOS_DECLARADOS = 20;

/** Um risco da contratação no corpo do POST/PUT. */
export interface CtrRiscoDeclaradoForm {
  /** Até 4000. */
  DescricaoRisco: string;
  /** Até 4000. */
  AcaoMitigacao: string;
  ResponsavelNome: string;
  /** Mesma validação de e-mail do PGIA. */
  ResponsavelEmail: string;
  /** Escala completa da CGDF: Improvável, Raro, Possível, Provável, Quase certo. */
  Probabilidade: string;
  /** Escala completa da CGDF: Desprezível, Menor, Moderada, Maior, Catastrófica. */
  Consequencia: string;
}

/**
 * Riscos da contratação enviados no POST/PUT do processo: a lista completa,
 * até 20, cada risco completo. Vazia = o processo fica sem riscos.
 */
export interface CtrClassificacaoRiscoForm {
  RiscosDeclarados: CtrRiscoDeclaradoForm[];
}

/** Risco declarado na resposta, com o nível derivado da célula (nunca gravado). */
export interface CtrRiscoDeclarado extends CtrRiscoDeclaradoForm {
  Id: number;
  /** Um dos NIVEIS_RISCO. */
  Nivel: string;
}

/** Riscos aninhados na resposta, só em GET {id}, POST e PUT; nulo sem nenhum risco. */
export interface CtrClassificacaoRisco {
  /** Quando a lista atual foi gravada; exibir sem `:'UTC'`. */
  ClassificadoEm: string;
  /** E-mail de quem gravou a lista atual. */
  ClassificadoPor: string;
  RiscosDeclarados: CtrRiscoDeclarado[];
}

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
  /** Nem todo processo é devolvido ao órgão: com a data preenchida é recusado. */
  RetornoOrgaoNaoSeAplica: boolean;
  /** Sigla de ETAPAS_PLANEJAMENTO; continua registrada depois da assinatura. */
  EtapaPlanejamento?: string | null;
  /**
   * A data final do trâmite: preenchida, o processo fica `Concluído` (sai da
   * lista e vai para a relação de concluídos do painel). Não pode ser futura.
   */
  DataAssinaturaContrato?: string | null;
  /**
   * Criticidade da contratação (art. 11 da IN). Com `CriteriosCriticidade` no
   * corpo o servidor a calcula e ignora este valor; sem respostas vale o que for
   * enviado (processo classificado antes da regra automática).
   */
  Criticidade?: string | null;
  /**
   * Respostas aos critérios do art. 11, § 3º, da IN (chave = código do critério,
   * valor = resposta; ver `criticidade.ts`). No PUT, nula **preserva** as
   * respostas gravadas e a criticidade calculada delas.
   */
  CriteriosCriticidade?: Record<string, string> | null;
  /** Opcional no DTO: vazia = "Órgão comunicante". */
  Origem?: string | null;
  /** Pedido de esclarecimento ao órgão: a data exige a descrição. */
  EsclarecimentoSolicitadoEm?: string | null;
  EsclarecimentoDescricao?: string | null;
  /** Resposta do órgão: exige o pedido e não pode ser anterior a ele. */
  EsclarecimentoRespondidoEm?: string | null;
  Restituido: boolean;
  RestituidoEm?: string | null;
  RestituidoMotivo?: string | null;
  Observacao?: string | null;
  /**
   * Riscos da contratação. POST: nula (ou vazia) = sem riscos. PUT: nula
   * **preserva** os gravados; enviada, a lista substitui a anterior (vazia tira
   * todos) e registra quem gravou e quando.
   */
  ClassificacaoRisco?: CtrClassificacaoRiscoForm | null;
}

/**
 * Resposta do processo (CtrProcessoResponse): o form + os campos derivados.
 * A classificação de riscos da resposta tem forma própria (resultado,
 * auditoria e nível de cada risco), por isso sai do `extends`.
 */
export interface CtrProcesso extends Omit<CtrProcessoForm, 'ClassificacaoRisco'> {
  Id: number;
  /** Derivada no backend, nunca gravada. `Concluído` = contrato assinado. */
  Situacao: string;
  /** Derivado: soma dos pontos das respostas aos critérios; nulo sem respostas. */
  PontosCriticidade?: number | null;
  /**
   * Sinal paralelo ao trâmite (não muda a situação): há pedido de
   * esclarecimento sem resposta. Derivados no backend, nunca gravados.
   */
  EsclarecimentoPendente: boolean;
  DiasEsclarecimentoPendente?: number | null;
  UltimaMovimentacao?: string | null;
  DiasSemMovimento: number;
  TotalManifestacoes: number;
  UltimoEstagioTcdf?: string | null;
  /** Plano, em todas as leituras: maior nível entre os riscos da contratação; nulo sem nenhum. */
  NivelMaximoRiscoDeclarado?: string | null;
  /** Aninhado: só em GET {id}, POST e PUT (nulo quando o processo não tem riscos). */
  ClassificacaoRisco?: CtrClassificacaoRisco | null;
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
  /**
   * Vale para ChegadaUgtic **e** RetornoOrgao: true limpa a data e marca "não
   * se aplica"; informar a data desmarca o flag. Nas demais etapas é recusado.
   */
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
  /**
   * true traz também os `Concluído` (contrato assinado), que por padrão ficam
   * fora da lista e do CSV. O filtro por situação `Concluído` também os traz.
   */
  IncluirConcluidos?: boolean | null;
  EtapaPlanejamento?: string | null;
  Criticidade?: string | null;
  Origem?: string | null;
  /** true = só os que aguardam esclarecimento; false = só os sem pendência. */
  EsclarecimentoPendente?: boolean | null;
  /**
   * Nível MÁXIMO dos riscos da contratação: um dos NIVEIS_RISCO ou
   * SEM_RISCOS_DECLARADOS. Fora do domínio = lista vazia.
   */
  NivelRiscoDeclarado?: string | null;
  OrderBy?: string | null;
}

// ── Manifestações ao TCDF ───────────────────────────────────────────────────

/**
 * Corpo de POST e PUT da manifestação (CtrManifestacaoCreateDTO/UpdateDTO).
 *
 * A criticidade **não entra aqui**: ela é do processo (a resposta a devolve
 * como espelho somente leitura).
 */
export interface CtrManifestacaoForm {
  OficioTcdf: string;
  DataOficio: string;
  SituacaoPortfolio: string;
  ComunicadaDesde?: string | null;
  ResultadoAnalise?: string | null;
  RecomendouSuspensao: boolean;
  ComunicouControleInterno: boolean;
  DesfechoRisco?: string | null;
  PrazoRegularizacaoDias?: number | null;
  /**
   * "Esclarecimentos Adicionais" (até 4000; era `PendenciasTcdf`). Registro de
   * acompanhamento: vale em qualquer inciso, vazio vira nulo e não entra no
   * despacho. Não confundir com `Esclarecimento*` do processo (o pedido ao órgão).
   */
  EsclarecimentosAdicionais?: string | null;
  /** Um dos STATUS_TCDF; vale em qualquer inciso. Não entra no despacho. */
  StatusTcdf?: string | null;
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
  /** Espelho somente leitura da criticidade do processo (o PDF imprime). */
  Criticidade?: string | null;
  /** Derivado no backend; o status no TCDF tem precedência sobre o resto. */
  Estagio: string;
  CriadoEm: string;
  CriadoPor: string;
  AlteradoEm?: string | null;
  AlteradoPor?: string | null;
}

/** Dados do fecho do despacho, informados na hora da geração, não persistem. */
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
  /** Chegada à SGDI até o retorno ao órgão (análise concluída). */
  ChegadaParaConclusao?: number | null;
  /** Chegada à SGDI até a assinatura do contrato (processo concluído). */
  ChegadaParaAssinatura?: number | null;
}

export interface CtrPainel {
  TotalAtivos: number;
  LimiteDias: number;
  /** As oito situações sempre presentes, mesmo com zero. */
  PorSituacao: CtrContagem[];
  /** Ativos com contrato assinado (situação `Concluído`). */
  TotalConcluidos: number;
  /** Relação de concluídos: assinatura mais recente primeiro, no máximo 50. */
  Concluidos: CtrProcesso[];
  /** Ativos com pedido de esclarecimento ainda sem resposta. */
  TotalEsclarecimentoPendente: number;
  /**
   * Os 4 NIVEIS_RISCO (pelo nível máximo de cada processo) + SEM_RISCOS_DECLARADOS,
   * sempre presentes (quantidade desc, empate pela ordem do domínio).
   */
  PorNivelRiscoDeclarado: CtrContagem[];
  PorCategoria: CtrContagem[];
  PorOrgao: CtrContagem[];
  TemposMedios: CtrTemposMedios;
  /** Ativos fora de Concluído, Análise concluída e Restituído parados há LimiteDias ou mais. */
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
