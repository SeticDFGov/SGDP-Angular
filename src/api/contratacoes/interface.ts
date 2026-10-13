// Tipos do módulo Supervisão Contínua das Contratações (Decreto nº 48.899/2026 + IN SGDI
// nº 1/2026), em PascalCase espelhando os DTOs da API (a API serializa PascalCase).
// Datas puras (DateOnly no backend) trafegam como string 'AAAA-MM-DD'; exibir
// sempre com `| date:'dd/MM/yyyy':'UTC'` para não deslocar um dia no fuso.

/** Papel do módulo (coluna Users.PapelContratacoes, paralela ao Perfil). */
export const PAPEL_CTR_ANALISE = 'ctr_analise';

// ── Domínios (espelham CtrDominios.cs; valores fixos pelo contrato) ─────────

/** Categoria do objeto contratado: os 12 valores observados na planilha mais "Serviços de TIC", "Nuvem" e "Tokens de IA". */
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
  'Nuvem',
  'Tokens de IA',
  'Sem objeto / Indefinido',
  'Outros'
] as const;

/** Padrão da importação quando a célula da categoria vem vazia. */
export const CATEGORIA_SEM_OBJETO = 'Sem objeto / Indefinido';

/**
 * Onde a solução será hospedada (espelha CtrDominios.HospedagemCetic). "Não aplicável"
 * é a solução contratada como serviço (SaaS), que roda no fornecedor. Nulo = não informado.
 */
export const HOSPEDAGENS_CETIC = ['Sim', 'Não', 'Parcialmente', 'Não aplicável (SaaS)'] as const;

/**
 * Se o processo é de uma contratação nova ou de alteração de uma contratação vigente
 * (espelha CtrDominios.TipoContratacao). Nulo = não informado. Estatística só do painel
 * interno: o painel público não recebe o tipo.
 */
export const TIPOS_CONTRATACAO = ['Nova contratação', 'Alteração de contratação vigente'] as const;

/** Chave da contagem do painel para os processos sem o tipo (não é valor gravável). */
export const TIPO_CONTRATACAO_NAO_INFORMADO = 'Não informado';

/**
 * Situação derivada do processo (nunca gravada: o servidor calcula a partir das datas).
 * A ordem é a da prioridade do cálculo (a primeira que se aplica vale): a assinatura do
 * contrato vence tudo; a nota informativa encerra a análise da SGDI; o retorno ao órgão é
 * "Análise concluída"; o pedido de esclarecimento sem resposta e o encaminhamento técnico
 * sem retorno vêm antes das chegadas. O processo traz também a data do fato que define a
 * situação (`SituacaoDesde`).
 */
export const SITUACOES = [
  'Contrato assinado',
  'Restituído ao órgão',
  'Nota informativa enviada',
  'Análise concluída',
  'Esclarecimentos solicitados',
  'Aguardando análise técnica',
  'Retornado ao Gab SGDI',
  'Em análise na UGTIC',
  'Em análise na SUBGD',
  'Em análise na SGDI',
  'Sem movimentação'
] as const;

/** A situação dos processos com contrato assinado (fora da lista por padrão). */
export const SITUACAO_CONTRATO_ASSINADO = 'Contrato assinado';

/**
 * Situações em que a SGDI não age mais: ficam fora dos gargalos do painel, e a
 * "Última movimentação" delas não tem cor de alerta (os dias passam esperando o órgão).
 */
export const SITUACOES_TERMINAIS: readonly string[] = [
  'Contrato assinado',
  'Restituído ao órgão',
  'Nota informativa enviada',
  'Análise concluída'
];

/**
 * Etapas do trâmite, na ordem cronológica; chave do PUT de checkpoint. As duas últimas
 * ficam fora da cronologia das cinco primeiras: a nota informativa (aviso ao órgão de que
 * o processo entrou no portfólio; encerra a análise da SGDI e só não pode ser anterior à
 * chegada na SGDI) e a assinatura do contrato (o TCDF também analisa contrato já
 * assinado), que é a data que conclui o processo.
 */
export const ETAPAS = [
  { valor: 'ChegadaSgdi', rotulo: 'Chegada da análise · SGDI' },
  { valor: 'ChegadaSubgd', rotulo: 'Chegada da análise · SUBGD' },
  { valor: 'ChegadaUgtic', rotulo: 'Chegada da análise · UGTIC' },
  { valor: 'RetornoGabSgdi', rotulo: 'Retorno ao Gab SGDI' },
  { valor: 'RetornoOrgao', rotulo: 'Retorno ao órgão comunicante' },
  { valor: 'NotaInformativa', rotulo: 'Nota informativa enviada' },
  { valor: 'AssinaturaContrato', rotulo: 'Assinatura do Contrato' }
] as const;

/** A etapa que conclui o processo (não aceita "não se aplica"). */
export const ETAPA_ASSINATURA = 'AssinaturaContrato';

/** A etapa da nota informativa: no checkpoint aceita também o nº do documento SEI. */
export const ETAPA_NOTA_INFORMATIVA = 'NotaInformativa';

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
 * Ato do TCDF que originou a comunicação à SGDI, gravado com o número dele
 * (espelha CtrDominios.AtoTcdf).
 */
export const ATOS_TCDF = ['Despacho Singular', 'Decisão'] as const;

/**
 * Prazo do inciso II do despacho: 5 dias úteis para regularizar a pendência,
 * contados do recebimento da notificação (art. 40, parágrafo único, da IN).
 * É o valor sugerido; a pessoa pode mudar.
 */
export const PRAZO_REGULARIZACAO_PADRAO = 5;

/**
 * Status do processo no TCDF: fato do Tribunal, vale em qualquer inciso e com
 * qualquer resultado. Nulo = sem status especial.
 */
export const STATUS_TCDF = [
  'Suspenso por irregularidades',
  'Edital revogado'
] as const;

/**
 * Como a contratação chegou à SGDI. "Anterior ao regime" são os registros históricos:
 * contratações que chegaram quando ainda era autorização e já têm contrato assinado.
 */
export const ORIGENS = ['Órgão comunicante', 'TCDF', 'Anterior ao regime'] as const;

/** Origem assumida quando o campo vem vazio (default da coluna). */
export const ORIGEM_PADRAO = 'Órgão comunicante';

/** Origem dos processos que nascem de análise interna do próprio Tribunal. */
export const ORIGEM_TCDF = 'TCDF';

/**
 * Origem dos registros históricos (contratações anteriores ao regime de supervisão
 * contínua): sub-aba própria, formulário curto, fora das estatísticas da supervisão.
 */
export const ORIGEM_ANTERIOR_REGIME = 'Anterior ao regime';

/**
 * Área técnica para onde a SGDI encaminha o processo para análise técnica (espelha
 * CtrDominios.AreaTecnica): Subsecretaria de Sistemas ou de Infraestrutura.
 */
export const AREAS_TECNICAS = [
  { valor: 'SUBSIS', rotulo: 'SUBSIS (Subsecretaria de Sistemas)' },
  { valor: 'SUBINFRA', rotulo: 'SUBINFRA (Subsecretaria de Infraestrutura)' }
] as const;

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
  /** Nº SEI do Formulário: opcional, texto livre até 25 caracteres (o número do documento no SEI). No PUT, nulo limpa. */
  NumeroSeiFormulario?: string | null;
  OrgaoNome: string;
  OrgaoSigla: string;
  ComplementoArea?: string | null;
  Objeto: string;
  CategoriaObjeto: string;
  /** Valor estimado da contratação, em reais (numeric(18,2)); nulo = não informado. */
  ValorEstimado?: number | null;
  /** Um dos HOSPEDAGENS_CETIC; nulo = não informado. */
  HospedagemCetic?: string | null;
  /** Um dos TIPOS_CONTRATACAO; nulo = não informado. No PUT, nulo limpa. */
  TipoContratacao?: string | null;
  /** A solução usará a rede GDFNet; nulo = não informado. */
  UsaGdfnet?: boolean | null;
  ChegadaSgdi?: string | null;
  ChegadaSubgd?: string | null;
  ChegadaUgtic?: string | null;
  UgticNaoSeAplica: boolean;
  RetornoGabSgdi?: string | null;
  RetornoOrgao?: string | null;
  /** Nem todo processo é devolvido ao órgão: com a data preenchida é recusado. */
  RetornoOrgaoNaoSeAplica: boolean;
  /**
   * Envio da nota informativa ao órgão (o processo entrou no portfólio e a SGDI só vai
   * acompanhar): encerra a análise da SGDI. Não pode ser futura nem anterior à chegada na
   * SGDI. Conta como movimentação.
   */
  NotaInformativaEnviadaEm?: string | null;
  /** Nº do documento SEI da nota (texto livre, até 25); só existe com a data. */
  NotaInformativaDocumentoSei?: string | null;
  /** Nº do contrato (até 60). Obrigatório nos registros anteriores ao regime. */
  NumeroContrato?: string | null;
  /** Nº do documento SEI da autorização dada pela SGDI no regime anterior (até 25). */
  AutorizacaoDocumentoSei?: string | null;
  /**
   * Análise técnica (desde 2026-09-24), fora da cronologia do trâmite: a data do
   * encaminhamento exige a área; o retorno exige o encaminhamento e não pode ser
   * anterior a ele; nada no futuro. No PUT os quatro seguem o corpo (nulo limpa).
   */
  AnaliseTecnicaEncaminhadaEm?: string | null;
  /** Um dos AREAS_TECNICAS (SUBSIS ou SUBINFRA); sem a data do encaminhamento é anulada. */
  AnaliseTecnicaArea?: string | null;
  AnaliseTecnicaRetornoEm?: string | null;
  /** Resumo curto do que a área técnica respondeu (até 1000); sem a data do retorno é anulado. */
  AnaliseTecnicaRetornoResumo?: string | null;
  /** Sigla de ETAPAS_PLANEJAMENTO; continua registrada depois da assinatura. */
  EtapaPlanejamento?: string | null;
  /**
   * A data final do trâmite: preenchida, a situação é "Contrato assinado" (o processo
   * sai da lista e vai para a relação do painel). Não pode ser futura.
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
   * respostas gravadas e a criticidade calculada delas. No II pode estar a resposta
   * à pergunta anterior (Nenhum a Alto): ela volta como veio até alguém responder à
   * pergunta nova.
   */
  CriteriosCriticidade?: Record<string, string> | null;
  /**
   * Opcional no DTO: vazia = "Órgão comunicante". "Anterior ao regime" é o registro
   * histórico, criado pelo formulário curto ou marcado pela rota própria.
   */
  Origem?: string | null;
  /** Pedido de esclarecimento ao órgão: a data exige a descrição. */
  EsclarecimentoSolicitadoEm?: string | null;
  EsclarecimentoDescricao?: string | null;
  /**
   * Nº do documento SEI pelo qual a SGDI pediu os esclarecimentos ou as informações
   * complementares (até 60, opcional). Faz parte do pedido: sem a data dele, é anulado.
   */
  EsclarecimentoDocumentoSei?: string | null;
  /** Resposta do órgão: exige o pedido e não pode ser anterior a ele. */
  EsclarecimentoRespondidoEm?: string | null;
  /**
   * Restituição ao órgão. Desde 2026-09-24 as telas não a pedem nem a mostram (a
   * tramitação tem a data do retorno ao órgão): o formulário devolve o que veio do
   * servidor, para não apagar o que está gravado.
   */
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
  /** Derivada no backend, nunca gravada: uma das SITUACOES. */
  Situacao: string;
  /** Data pura do fato que define a situação ("desde 03/10/2026"); nula sem data. */
  SituacaoDesde?: string | null;
  /** Derivado: soma dos pontos das respostas aos critérios (nunca negativa); nulo sem respostas. */
  PontosCriticidade?: number | null;
  /**
   * Derivado: a composição da soma, os pontos de cada critério de I a VII (o VII
   * vem com 0: não soma, decide Alta sozinho). Nulo sem respostas.
   */
  PontosPorCriterio?: Record<string, number> | null;
  /** Derivado: a resposta à pergunta anterior do II, enquanto ninguém responde à nova. */
  RespostaPerguntaAnteriorII?: string | null;
  /**
   * Há pedido de esclarecimento sem resposta (desde 2026-10-13 é também a situação
   * "Esclarecimentos solicitados", quando nenhuma de prioridade maior se aplica).
   * Derivados no servidor; os dias de espera aparecem na ficha.
   */
  EsclarecimentoPendente?: boolean;
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
  /** Só na etapa NotaInformativa: o nº do documento SEI da nota (até 25). */
  DocumentoSei?: string | null;
  /**
   * Vale para ChegadaUgtic **e** RetornoOrgao: true limpa a data e marca "não
   * se aplica"; informar a data desmarca o flag. Nas demais etapas é recusado.
   */
  NaoSeAplica?: boolean;
}

/**
 * Marcar ou desmarcar um processo como registro histórico
 * (PUT processo/{id}/anterior-ao-regime). Marcar exige o contrato assinado e o nº do
 * contrato (o que vier aqui completa o que falta); desmarcar devolve à supervisão.
 */
export interface CtrAnteriorRegimeForm {
  Anterior: boolean;
  NumeroContrato?: string | null;
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
   * true traz também os de contrato assinado, que por padrão ficam fora da lista e do
   * CSV. O filtro pela situação "Contrato assinado" também os traz.
   */
  IncluirConcluidos?: boolean | null;
  EtapaPlanejamento?: string | null;
  Criticidade?: string | null;
  /**
   * Um de ORIGENS. É a sub-aba que escolhe: "Processos de supervisão contínua" manda o
   * órgão comunicante, "Comunicações do TCDF" manda TCDF e "Contratações anteriores ao
   * regime" manda "Anterior ao regime".
   */
  Origem?: string | null;
  /** Um de TIPOS_CONTRATACAO ou TIPO_CONTRATACAO_NAO_INFORMADO (os sem o tipo). */
  TipoContratacao?: string | null;
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
  /**
   * Dados da comunicação do TCDF (desde 2026-09-23): o processo SEI em que o
   * Tribunal comunicou a SGDI (é o "Processo SEI nº" do despacho), a data em que
   * ele chegou à SGDI (não antes do ofício) e o ato, Despacho Singular ou Decisão,
   * com o número. Os quatro são obrigatórios na manifestação nova; nas registradas
   * antes deles vêm os quatro ou nenhum.
   */
  ProcessoComunicacaoTcdf?: string | null;
  DataRecebimento?: string | null;
  /** Um dos ATOS_TCDF. */
  AtoTcdf?: string | null;
  /** Até 60 caracteres. */
  NumeroAtoTcdf?: string | null;
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

/** A contratação auditada de uma comunicação do TCDF que o módulo ainda não tem. */
export interface CtrContratacaoTcdfForm {
  /** Até 200. */
  OrgaoNome: string;
  /** Até 20; gravada em caixa alta. */
  OrgaoSigla: string;
  Objeto: string;
  /** Um de CATEGORIAS_OBJETO. */
  CategoriaObjeto: string;
  /** Em reais; nulo = não informado. */
  ValorEstimado?: number | null;
}

/**
 * Corpo de POST manifestacao (CtrComunicacaoTcdfCreateDTO): a manifestação e,
 * exatamente um dos dois, o processo já cadastrado da contratação (`ProcessoId`,
 * obrigatório no inciso I) ou a contratação nova (`Contratacao`), que vira
 * processo de origem TCDF com o número do processo de comunicação.
 */
export interface CtrComunicacaoTcdfForm extends CtrManifestacaoForm {
  ProcessoId?: number | null;
  Contratacao?: CtrContratacaoTcdfForm | null;
}

/** Resposta da manifestação (CtrManifestacaoResponse). */
export interface CtrManifestacao extends CtrManifestacaoForm {
  Id: number;
  ProcessoId: number;
  NumeroProcesso: string;
  OrgaoSigla: string;
  OrgaoNome: string;
  Objeto: string;
  /** Espelhos do processo, para o resumo da contratação. */
  CategoriaObjeto: string;
  ValorEstimado?: number | null;
  /** Origem do processo: um de ORIGENS. */
  Origem: string;
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

/** Bloco dos registros históricos (contratações anteriores ao regime) no painel interno. */
export interface CtrPainelHistoricos {
  Total: number;
  PorCategoria: CtrContagem[];
  PorOrgao: CtrContagem[];
}

/**
 * Painel interno. Desde 2026-10-13 as estatísticas são só da supervisão contínua
 * (órgão comunicante e TCDF): os registros anteriores ao regime têm o bloco próprio.
 */
export interface CtrPainel {
  TotalAtivos: number;
  LimiteDias: number;
  /** As onze situações sempre presentes, mesmo com zero. */
  PorSituacao: CtrContagem[];
  /** Ativos com contrato assinado. */
  TotalConcluidos: number;
  /** Relação dos de contrato assinado: assinatura mais recente primeiro, no máximo 50. */
  Concluidos: CtrProcesso[];
  /** O servidor ainda pode mandar; a tela não mostra mais (a situação nova cobre). */
  TotalEsclarecimentoPendente?: number;
  /**
   * Os 4 NIVEIS_RISCO (pelo nível máximo de cada processo) + SEM_RISCOS_DECLARADOS,
   * sempre presentes (quantidade desc, empate pela ordem do domínio).
   */
  PorNivelRiscoDeclarado: CtrContagem[];
  PorCategoria: CtrContagem[];
  /** Os dois TIPOS_CONTRATACAO + TIPO_CONTRATACAO_NAO_INFORMADO, sempre presentes. */
  PorTipoContratacao: CtrContagem[];
  PorOrgao: CtrContagem[];
  TemposMedios: CtrTemposMedios;
  /** Ativos fora das SITUACOES_TERMINAIS parados há LimiteDias ou mais. */
  Gargalos: CtrProcesso[];
  /** Os registros históricos (ausente na resposta anterior a 2026-10-13). */
  Historicos?: CtrPainelHistoricos | null;
}

// ── Painel público (GET api/contratacoes/publico/painel, anônimo) ───────────

/**
 * Um processo de supervisão contínua, em análise ou com contrato assinado, só com os campos
 * abertos: o valor estimado não é publicado (pedido de 2026-10-02). O "tipo da contratação"
 * do painel é a categoria do objeto.
 */
export interface CtrContratacaoPublica {
  OrgaoSigla: string;
  OrgaoNome: string;
  Objeto: string;
  CategoriaObjeto: string;
  /** yyyy-MM-dd; nulo quando o processo não tem a data de chegada. */
  ChegadaSgdi: string | null;
  /** yyyy-MM-dd; nulo enquanto o contrato não foi assinado (processo em análise). */
  DataAssinaturaContrato: string | null;
}

export interface CtrPainelPublico {
  /** Da chegada à SGDI mais recente para a mais antiga (sem a data, no fim). */
  Contratacoes: CtrContratacaoPublica[];
  /** Última alteração entre as contratações publicadas. */
  AtualizadoEm: string | null;
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
