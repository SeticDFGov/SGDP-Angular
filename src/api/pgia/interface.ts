// Tipos do módulo PGIA (Decreto nº 48.901/2026), em PascalCase espelhando os DTOs da API.
// Datas puras (DateOnly no backend) trafegam como string 'AAAA-MM-DD'.

export interface PgiaOrgao {
  Id: number;
  Sigla: string;
  Nome: string;
  NaturezaJuridica: string;
  PrestaServicoCidadao: boolean | null;
  Ativo: boolean;
  UnidadeId: string | null;
  UnidadeNome: string | null;
}

export interface PgiaOrgaoDadosForm {
  Nome: string;
  NaturezaJuridica: string;
  PrestaServicoCidadao: boolean | null;
  // A SGDI pode trocar a unidade do órgão pela edição de dados (backend acrescentou
  // UnidadeId ao DTO). Opcional aqui: a tela do órgão não envia este campo.
  UnidadeId?: string | null;
}

export interface PgiaOrgaoCreateForm extends PgiaOrgaoDadosForm {
  // Na criação via SGDI a unidade é obrigatória.
  UnidadeId: string | null;
}

export interface PgiaOrgaoUpdateForm extends PgiaOrgaoCreateForm {
  Ativo: boolean;
}

export interface PgiaPessoa {
  UserId: string;
  Nome: string;
  Email: string;
  PapelPgia: string | null;
  Matricula: string | null;
  CargoFuncao: string | null;
  Vinculo: string | null;
}

export interface PgiaAgenteInfoForm {
  Matricula: string | null;
  CargoFuncao: string | null;
  Vinculo: string;
}

export interface PgiaDesignacaoForm {
  AgenteId: string;
  AtoTipo: string;
  AtoNumero: string;
  AtoData: string;
  ProcessoSeiComunicacao: string;
  DataComunicacaoSgdi: string;
  InicioVigencia: string;
}

export interface PgiaResponsavelIaForm extends PgiaDesignacaoForm {
  AcumulaFuncaoTic: boolean;
  CapacitacaoAdequada: boolean | null;
}

export interface PgiaDesignacao {
  Id: number;
  OrgaoId: number;
  AgenteId: string;
  AgenteNome: string;
  AgenteEmail: string;
  AtoTipo: string;
  AtoNumero: string;
  AtoData: string;
  ProcessoSeiComunicacao: string;
  DataComunicacaoSgdi: string;
  AcumulaFuncaoTic: boolean | null;
  CapacitacaoAdequada: boolean | null;
  InicioVigencia: string;
  FimVigencia: string | null;
  Ativo: boolean;
}

export interface PgiaMeuOrgao {
  Orgao: PgiaOrgao | null;
  ResponsavelIaVigente: PgiaDesignacao | null;
  EncarregadoDadosVigente: PgiaDesignacao | null;
}

export interface PgiaPrazo {
  Id: number;
  Obrigacao: string;
  BaseLegal: string;
  OrgaoId: number | null;
  DataLimite: string;
  CumpridoEm: string | null;
  Situacao: string;
}

export interface AtribuirPapelPgiaForm {
  Email: string;
  PapelPgia: string | null;
}

// D10 — natureza jurídica (mesma ordem do mock)
export const NATUREZAS_JURIDICAS = [
  'Administração direta',
  'Autarquia',
  'Fundação pública',
  'Empresa pública',
  'Sociedade de economia mista'
] as const;

// D11 — vínculo do agente público
export const VINCULOS = [
  'Servidor efetivo',
  'Comissionado',
  'Estagiário',
  'Prestador de serviço'
] as const;

// Prazo do art. 35, I: designações comunicadas à SGDI até 02/08/2026
export const PRAZO_DESIGNACAO = '2026-08-02';

// ── Fase 1: inventário e classificação de risco (etapa 2) ──────────────────

export interface PgiaChecklist {
  Q15: string[];
  Q16: string[];
  Q17: string[];
}

export interface PgiaClassificacaoForm {
  Checklist: PgiaChecklist;
  Motivo: string;
  DataClassificacao: string;
  Justificativa: string;
}

export interface PgiaSistemaBaseForm {
  Denominacao: string;
  Finalidade: string;
  OrigemRegistro: string;
  OrigemRegistroDescricao: string | null;
  TipoSistema: string;
  Tecnologia: string;
  StatusCicloVida: string;
  DataImplantacao: string | null;
  EscopoDados: string;
  AfetaCidadao: boolean;
  NaturezaDecisoes: string | null;
  EfeitosCidadao: string | null;
  BaseLegalLgpd: string | null;
  CategoriasDadosPessoais: string | null;
  FinalidadeTratamentoDados: string | null;
  MedidasSeguranca: string | null;
  InteroperavelPadroesSgdi: boolean;
  JustificativaNaoRedundancia: string | null;
  DataAnaliseSgtic: string | null;
  ParecerSgtic: string | null;
  SupervisaoHumanaDescricao: string | null;
  AvisoInteracaoIa: boolean | null;
  IdentificadorAutenticidade: boolean | null;
  ProcessoSei: string | null;
  ComunicadoSgdiEm: string | null;
}

export interface PgiaSistemaCreateForm extends PgiaSistemaBaseForm {
  Classificacao: PgiaClassificacaoForm;
}

export interface PgiaSistema extends PgiaSistemaBaseForm {
  Id: number;
  OrgaoId: number;
  OrgaoSigla: string;
  DataDescontinuacao: string | null;
  ClassificacaoRiscoAtual: string | null;
  EnquadramentoLegal: string | null;
  ResponsavelIaId: number;
  ResponsavelNome: string;
  PublicadoRegistroPublico: boolean;
  DataPublicacaoRegistro: string | null;
  // Homologação: 'Aguardando avaliação da SGDI' | 'Aguardando deliberação do CGTIC' | 'Aprovado' | 'Vetado'
  SituacaoHomologacao: string;
  AvaliacaoParecer: string | null;
  AvaliadoPorNome: string | null;
  AvaliadoEm: string | null;
  CriadoEm: string;
}

export interface PgiaClassificacao {
  Id: number;
  SistemaIaId: number;
  DataClassificacao: string;
  Motivo: string;
  Checklist: PgiaChecklist;
  Resultado: string;
  // Só volta preenchida para SGDI, CGTIC e admin; as telas do órgão não exibem.
  Pontuacao?: number | null;
  EnquadramentoLegal: string | null;
  Justificativa: string;
  ClassificadoPorNome: string;
  CriadoEm: string;
}

export interface PgiaPagedResponse<T> {
  Items: T[];
  CurrentPage: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
}

// D06, D07, D08, D05, D09, D27 e D31, na ordem dos selects do mock
export const ORIGENS_REGISTRO = ['Nova iniciativa', 'Instrumento vigente em revisão', 'Outros'] as const;

export const TIPOS_SISTEMA = [
  'Desenvolvido internamente', 'Contratado',
  'Embarcado em solução adquirida', 'Plataforma pública de IA generativa'
] as const;

export const TECNOLOGIAS = [
  'IA preditiva ou aprendizado de máquina', 'IA generativa', 'Visão computacional',
  'Processamento de linguagem natural', 'Biometria', 'Outra'
] as const;

export const FASES_CICLO_VIDA = [
  'Concepção', 'Planejamento', 'Em aquisição', 'Desenvolvimento',
  'Treinamento', 'Testagem', 'Validação', 'Implantado (em uso)',
  'Monitoramento', 'Descontinuado'
] as const;

export const ESCOPOS_DADOS = [
  'Somente dados públicos', 'Dados pessoais', 'Dados pessoais sensíveis', 'Dados sigilosos'
] as const;

export const BASES_LEGAIS_LGPD = [
  'Execução de políticas públicas', 'Cumprimento de obrigação legal ou regulatória',
  'Consentimento do titular', 'Proteção da vida', 'Tutela da saúde',
  'Exercício regular de direitos', 'Outra hipótese dos arts. 7º e 11 da LGPD'
] as const;

export const MOTIVOS_CLASSIFICACAO = [
  'Classificação inicial', 'Nova contratação', 'Revisão de instrumento vigente',
  'Reclassificação por resolução do CGTIC', 'Revisão periódica'
] as const;

// ── Fase 2: governança central (SGDI e CGTIC) ──────────────────────────────

export interface PgiaAiaForm {
  Status: string;
  DataInicio: string;
  DataConclusao: string | null;
  ImpactosDireitosFundamentais: string;
  MedidasPreventivas: string;
  MedidasMitigadoras: string;
  MedidasReversao: string;
  PreviaLicitacao: boolean | null;
  ConjuntaRipd: boolean;
  RipdDocumentoId: number | null;
  DocumentoId: number | null;
  ProximaRevisao: string | null;
}

export interface PgiaAia extends PgiaAiaForm {
  Id: number;
  SistemaIaId: number;
  ElaboradaPorNome: string;
  DeliberacaoCgticId: number | null;
  DeliberacaoResultado: string | null;
  PublicadaPortal: boolean;
  DataPublicacaoPortal: string | null;
  UrlPublicacao: string | null;
  CriadoEm: string;
}

export interface PgiaAiaPublicacaoForm {
  PublicadaPortal: boolean;
  DataPublicacaoPortal: string | null;
  UrlPublicacao: string | null;
}

export interface PgiaDeliberacaoForm {
  Tipo: string;
  SistemaIaId: number | null;
  DataDeliberacao: string;
  Resultado: string;
  NumeroAto: string | null;
  Ementa: string | null;
  // Metadados da ata (anexo binário em fase futura); opcional no envio
  DocumentoId?: number | null;
  // Contrato de IA objeto da deliberação (ex.: aprovação de aquisição) — fase 4
  ContratoId?: number | null;
}

export interface PgiaDeliberacao extends PgiaDeliberacaoForm {
  Id: number;
  SistemaDenominacao: string | null;
  OrgaoSigla: string | null;
  CriadoEm: string;
}

// ── Pessoas e acessos (gestão pela SGDI/admin) ──────────────────────────────
// GET api/pgia/governanca/pessoas (sgdi e admin; ?filtro= nome/e-mail, ?orgaoId=)
// PUT api/pgia/governanca/pessoa/{userId}/vinculo (sgdi e admin)

export interface PgiaPessoaAcesso {
  UserId: string;
  Nome: string;
  Email: string;
  Perfil: string;
  PapelPgia: string | null;
  UnidadeId: string | null;
  UnidadeNome: string | null;
  OrgaoId: number | null;
  OrgaoSigla: string | null;
  // Dados de agente (matrícula/cargo/vínculo) — o backend acrescentou ao retorno
  // para o "Completar dados" abrir já preenchido. Opcional: respostas antigas os omitem.
  Matricula?: string | null;
  CargoFuncao?: string | null;
  Vinculo?: string | null;
}

// null limpa o campo correspondente (papel ou vínculo de unidade)
export interface PgiaPessoaVinculoForm {
  PapelPgia: string | null;
  UnidadeId: string | null;
}

// POST api/pgia/governanca/pessoa (sgdi e admin)
// Vincula a pessoa antes do primeiro login no Keycloak; se o e-mail já existir,
// o backend aplica papel e órgão no cadastro existente em vez de duplicar.
export interface PgiaPessoaPreCadastroForm {
  Email: string;
  Nome: string;
  PapelPgia: string | null;
  UnidadeId: string | null;
}

// ── Histórico de decisões do CGTIC (relatório de auditoria) ─────────────────
// GET api/pgia/governanca/cgtic/historico (cgtic, sgdi e admin)

export interface PgiaCgticHistoricoContagens {
  Pendentes: number;
  Analisadas: number; // casos com ao menos uma deliberação registrada
  Aprovadas: number;
  Negadas: number;
  Total: number;
}

// 'Pendente' | 'Aprovada' | 'Negada' — derivado da SituacaoHomologacao
export interface PgiaCgticCasoHistorico {
  SistemaIaId: number;
  Denominacao: string;
  OrgaoSigla: string;
  OrgaoNome: string;
  ClassificacaoRiscoAtual: string | null;
  SituacaoHomologacao: string;
  Situacao: string;
  // Entrada do caso na pauta do comitê (melhor data disponível no modelo)
  DataEntrada: string | null;
  Deliberacoes: PgiaDeliberacao[];
}

export interface PgiaCgticHistoricoResponse {
  Contagens: PgiaCgticHistoricoContagens;
  Casos: PgiaCgticCasoHistorico[];
  // Demais deliberações do comitê (contratos, autorizações, diretrizes...)
  OutrasDeliberacoes: PgiaDeliberacao[];
}

export interface PgiaPlataformaForm {
  Nome: string;
  Fornecedor: string | null;
  Url: string | null;
  StatusHomologacao: string;
  AptaDadosPessoaisSigilosos: boolean;
  AtoHomologacao: string | null;
  DataAto: string | null;
  PublicadaRelacaoEm: string | null;
  DiretrizesUso: string | null;
}

export interface PgiaPlataforma extends PgiaPlataformaForm {
  Id: number;
  CriadoEm: string;
}

export interface PgiaNormaForm {
  Tipo: string;
  Numero: string | null;
  Ementa: string;
  Emissor: string;
  DataPublicacao: string;
  Url: string | null;
  Vigente: boolean;
  AprovadaCgticEm: string | null;
}

export interface PgiaNorma extends PgiaNormaForm {
  Id: number;
  CriadoEm: string;
}

export interface PgiaAutorizacaoForm {
  Tipo: string;
  OrgaoId: number;
  PlataformaId: number | null;
  // Contrato de IA relacionado (autorização de treinamento) — fase 4
  ContratoId?: number | null;
  Justificativa: string;
  AvaliacaoRiscosDocId: number | null;
  AutorizadaPor: string;
  DeliberacaoCgticId: number | null;
  DataAutorizacao: string;
  VigenciaFim: string | null;
}

export interface PgiaAutorizacao extends PgiaAutorizacaoForm {
  Id: number;
  OrgaoSigla: string;
  PlataformaNome: string | null;
  Ativo: boolean;
  CriadoEm: string;
}

export interface PgiaAvaliacaoHomologacaoForm {
  Aprovado: boolean;
  Parecer: string;
}

export interface PgiaHomologacaoPendente {
  Sistema: PgiaSistema;
  ClassificacaoVigente: PgiaClassificacao | null;
}

export interface PgiaRegistroPublicoForm {
  Publicado: boolean;
  DataPublicacao: string | null;
}

export const SITUACOES_HOMOLOGACAO = [
  'Aguardando avaliação da SGDI', 'Aguardando deliberação do CGTIC', 'Aprovado', 'Vetado'
] as const;

export const STATUS_AIA = ['Não iniciada', 'Em elaboração', 'Concluída', 'Em revisão'] as const;

export const TIPOS_DELIBERACAO = [
  'Classificação de sistema como Alto Risco', 'Aprovação de aquisição de Alto Risco',
  'Critérios e requisitos de aquisição', 'Constituição de grupo de trabalho temático',
  'Apreciação do Relatório Anual', 'Resolução normativa',
  'Autorização de treinamento com dados do GDF', 'Ampliação do rol de Alto Risco',
  'Aprovação do Guia de Contratações', 'Suspensão de sistema'
] as const;

export const RESULTADOS_DELIBERACAO = ['Favorável', 'Desfavorável', 'Em diligência'] as const;

export const STATUS_HOMOLOGACAO_PLATAFORMA = [
  'Em avaliação', 'Homologada', 'Homologada apta a dados pessoais e sigilosos',
  'Não homologada', 'Homologação revogada'
] as const;

export const TIPOS_AUTORIZACAO = [
  'Uso de plataforma pública com dados não públicos',
  'Uso de dados do GDF para treinamento pelo fornecedor'
] as const;

export const AUTORIZADA_POR = ['SGDI', 'Órgão com aprovação do CGTIC'] as const;

export const TIPOS_NORMA = [
  'Resolução do CGTIC', 'Instrução normativa da SGDI', 'Norma técnica ou guia',
  'Guia de Contratações de IA', 'Recomendação técnica'
] as const;

// ── Fase 4: contratações, relatórios e auditorias ──────────────────────────

export interface PgiaContratoForm {
  SistemaIaId: number | null;
  NumeroContrato: string;
  ProcessoSei: string;
  Objeto: string;
  FornecedorNome: string;
  Status: string;
  PrevistoPdtic: boolean | null;
  HomologacaoSgdiDocId: number | null;
  ClausulaVedacaoTreinamento: boolean;
  AutorizacaoTreinamentoId: number | null;
  ReqExplicabilidade: boolean;
  ReqAuditabilidade: boolean;
  ReqPortabilidade: boolean;
  ReqSemAprisionamento: boolean;
  ReqAcessibilidade: boolean;
  ClausulaAuditoriaIndependente: boolean | null;
  SlaDesempenho: number | null;
  SlaAcuracia: number | null;
  SlaEquidade: number | null;
  SlaDisponibilidade: number | null;
  SlaPenalidades: string | null;
  ConformeGuiaContratacoes: boolean | null;
}

export interface PgiaContrato extends PgiaContratoForm {
  Id: number;
  OrgaoId: number;
  OrgaoSigla: string;
  SistemaDenominacao: string | null;
  SistemaClassificacao: string | null;
  CriadoEm: string;
}

export interface PgiaLegadoForm {
  TipoInstrumento: string;
  Descricao: string;
  Numero: string | null;
  EnvolveIa: string;
  DataTriagem: string | null;
  Revisado: boolean;
  DataRevisao: string | null;
  AditivoClausulaTreinamento: boolean | null;
  DataAditivo: string | null;
  ProcessoSei: string | null;
  ComprovacaoDocId: number | null;
  SistemaIaId: number | null;
}

export interface PgiaLegado extends PgiaLegadoForm {
  Id: number;
  OrgaoId: number;
  OrgaoSigla: string;
  TriadoPorNome: string | null;
  SistemaDenominacao: string | null;
  CriadoEm: string;
}

export interface PgiaIndicadorForm {
  Nome: string;
  Categoria: string;
  Valor: number;
  Unidade: string | null;
  PeriodoInicio: string;
  PeriodoFim: string;
  Meta: number | null;
  PublicadoRegistroPublico: boolean;
}

export interface PgiaIndicador extends PgiaIndicadorForm {
  Id: number;
  SistemaIaId: number;
  SistemaDenominacao: string;
  CriadoEm: string;
}

export interface PgiaRelatorioSistemaItem {
  Id: number;
  Denominacao: string;
  StatusCicloVida: string;
  ClassificacaoRiscoAtual: string | null;
  SituacaoHomologacao: string;
}

export interface PgiaRelatorioIncidenteItem {
  Id: number;
  SistemaDenominacao: string;
  Hipotese: string | null;
  DataComunicacaoSgdi: string | null;
  StatusApuracao: string;
  MedidasAdotadas: string | null;
}

export interface PgiaRelatorioConteudo {
  Sistemas: PgiaRelatorioSistemaItem[];
  Incidentes: PgiaRelatorioIncidenteItem[];
  IndicadoresAltoRisco: PgiaIndicador[];
  Capacitacoes: PgiaCapacitacao[];
  AtualizacoesInventario: PgiaRelatorioSistemaItem[];
}

export interface PgiaRelatorioSemestral {
  Id: number;
  OrgaoId: number;
  OrgaoSigla: string;
  Ano: number;
  Semestre: number;
  DataEnvio: string | null;
  ProcessoSei: string | null;
  DocumentoId: number | null;
  Status: string;
  RegistradoPainelEm: string | null;
  ComunicadoControleInternoEm: string | null;
  PrazoEnvio: string;
  Conteudo: PgiaRelatorioConteudo | null;
  CriadoEm: string;
}

export interface PgiaRelatorioEnvioForm {
  DataEnvio: string;
  ProcessoSei: string;
  DocumentoId: number | null;
}

export interface PgiaRelatorioSituacaoForm {
  Status: string;
  RegistradoPainelEm: string | null;
  ComunicadoControleInternoEm: string | null;
}

export interface PgiaRelatorioAnualForm {
  Ano: number;
  DataPublicacao: string | null;
  UrlPublicacao: string | null;
  DocumentoId: number | null;
  ApreciadoCgticEm: string | null;
  Recomendacoes: string | null;
  AgendaInovacao: string | null;
}

export interface PgiaRelatorioAnual extends PgiaRelatorioAnualForm {
  Id: number;
  CriadoEm: string;
}

export interface PgiaAuditoriaForm {
  SistemaIaId: number;
  Tipo: string;
  EntidadeAuditora: string;
  AuditorUserId: string | null;
  ExternaFornecedor: boolean;
  ApoioFapdf: boolean | null;
  DataInicio: string;
}

export interface PgiaAuditoriaParecerForm {
  DataInicio: string;
  DataFim: string | null;
  Parecer: string | null;
}

export interface PgiaAuditoriaPublicacaoForm {
  PublicadoPortal: boolean;
  DataPublicacao: string | null;
  Url: string | null;
}

export interface PgiaAuditoria {
  Id: number;
  SistemaIaId: number;
  SistemaDenominacao: string;
  OrgaoSigla: string;
  Tipo: string;
  EntidadeAuditora: string;
  AuditorUserId: string | null;
  AuditorNome: string | null;
  ExternaFornecedor: boolean;
  ApoioFapdf: boolean | null;
  DataInicio: string;
  DataFim: string | null;
  Parecer: string | null;
  PublicadoPortal: boolean;
  DataPublicacao: string | null;
  Url: string | null;
  CriadoEm: string;
}

export interface PgiaAuditor {
  UserId: string;
  Nome: string;
  Email: string;
}

// ── Fase 5: transparência pública ──────────────────────────────────────────

export interface PgiaRegistroPublicoItem {
  Id: number;
  Denominacao: string;
  Finalidade: string;
  OrgaoSigla: string;
  OrgaoNome: string;
  ClassificacaoRiscoAtual: string | null;
  NaturezaDecisoes: string | null;
  EfeitosCidadao: string | null;
  AiaResultadoUrl: string | null;
  IndicadoresPublicados: number;
  DataPublicacaoRegistro: string | null;
}

export interface PgiaSolicitacaoForm {
  SistemaIaId: number;
  Tipo: string;
  SolicitanteNome: string;
  SolicitanteContato: string;
  ReferenciaDecisao: string | null;
  Descricao: string;
}

export interface PgiaSolicitacaoPublica {
  Protocolo: string;
  SistemaDenominacao: string;
  OrgaoSigla: string;
  Tipo: string;
  DataAbertura: string;
  Status: string;
  Resposta: string | null;
  DataResposta: string | null;
}

export interface PgiaSolicitacaoOrgao extends PgiaSolicitacaoPublica {
  Id: number;
  SistemaIaId: number;
  SolicitanteNome: string;
  SolicitanteContato: string;
  ReferenciaDecisao: string | null;
  Descricao: string;
  RespondidoPorNome: string | null;
  EncaminhadaDpo: boolean;
}

// D21 — com os textos exatos das opções do mock do cidadão
export const TIPOS_SOLICITACAO = [
  { valor: 'Informação sobre uso de IA', destaque: 'Saber se a IA foi usada', resto: ' na decisão que me afetou' },
  { valor: 'Revisão de decisão', destaque: 'Pedir que um servidor revise a decisão', resto: '' },
  { valor: 'Explicação da decisão', destaque: 'Receber uma explicação simples', resto: ' de como a decisão foi tomada' },
  { valor: 'Impugnação por discriminação ou erro', destaque: 'Contestar um erro ou uma discriminação', resto: ' causada pelo sistema' },
  { valor: 'Reclamação de titular de dados', destaque: 'Reclamar sobre o uso dos meus dados pessoais', resto: '' }
] as const;

export const STATUS_SOLICITACAO = [
  'Recebida', 'Em análise', 'Respondida', 'Encaminhada ao Encarregado de Dados'
] as const;

export const STATUS_CONTRATO = ['Vigente', 'Suspenso', 'Encerrado'] as const;

export const TIPOS_INSTRUMENTO_LEGADO = [
  'Contrato', 'Ato normativo', 'Convênio ou instrumento congênere'
] as const;

export const ENVOLVE_IA = ['Sim', 'Não', 'Incerto'] as const;

export const CATEGORIAS_INDICADOR = [
  'Desempenho', 'Adoção', 'Conformidade', 'Impacto', 'Acurácia', 'Equidade', 'Disponibilidade'
] as const;

export const STATUS_RELATORIO_SEMESTRAL = [
  'Pendente', 'Enviado no prazo', 'Enviado em atraso', 'Inadimplente'
] as const;

export const TIPOS_AUDITORIA = ['Periódica', 'Independente contratual'] as const;

// Matriz de quesitos com pesos (visível só às instâncias centrais nas telas da SGDI/CGTIC)
export interface PgiaQuesitoRisco {
  Artigo: 15 | 16 | 17;
  Inciso: string;
  Peso: number;
}

// ── Fase 3: operação contínua ──────────────────────────────────────────────

export interface PgiaIncidenteAvisoForm {
  SistemaIaId: number;
  Descricao: string;
  Hipotese: string | null;
  DataOcorrencia: string | null;
  DataDeteccao: string | null;
}

export interface PgiaIncidenteCreateForm {
  SistemaIaId: number;
  Hipotese: string;
  Descricao: string;
  DataOcorrencia: string;
  DataDeteccao: string;
  NotificadoResponsavelEm: string;
  DataComunicacaoSgdi: string;
  ProcessoSei: string;
  MedidasAdotadas: string | null;
}

export interface PgiaIncidenteComunicarForm {
  Hipotese: string;
  DataComunicacaoSgdi: string;
  ProcessoSei: string;
  MedidasAdotadas: string | null;
  // Corrigem as datas aproximadas gravadas no aviso, quando informadas
  DataOcorrencia: string | null;
  DataDeteccao: string | null;
}

// Fontes do registro de uso e do aviso (art. 13), acessíveis a qualquer
// autenticado com órgão resolvido — sem expor o inventário completo
export interface PgiaUsoFonteSistema {
  Id: number;
  Denominacao: string;
}

export interface PgiaUsoFontePlataforma {
  Id: number;
  Nome: string;
}

export interface PgiaUsoFontes {
  OrgaoId: number | null;
  OrgaoSigla: string | null;
  Sistemas: PgiaUsoFonteSistema[];
  Plataformas: PgiaUsoFontePlataforma[];
}

export interface PgiaIncidenteApuracaoForm {
  StatusApuracao: string;
  RecomendacoesSgdi: string | null;
  PropostaCgtic: boolean | null;
  EncaminhadoOrgaoCompetenteEm: string | null;
  SistemaSuspenso: boolean;
  DataSuspensao: string | null;
}

export interface PgiaIncidente {
  Id: number;
  SistemaIaId: number;
  SistemaDenominacao: string;
  OrgaoId: number;
  OrgaoSigla: string;
  Hipotese: string | null;
  Descricao: string;
  DataOcorrencia: string;
  DataDeteccao: string;
  NotificadoResponsavelEm: string;
  ComunicadoPorNome: string;
  DataComunicacaoSgdi: string | null;
  ProcessoSei: string | null;
  StatusApuracao: string;
  RecomendacoesSgdi: string | null;
  PropostaCgtic: boolean | null;
  EncaminhadoOrgaoCompetenteEm: string | null;
  SistemaSuspenso: boolean;
  DataSuspensao: string | null;
  MedidasAdotadas: string | null;
  CriadoEm: string;
}

export interface PgiaNaoConformidadeForm {
  OrgaoId: number | null;
  Descricao: string;
  Origem: string;
  ReportadaSgdiEm: string | null;
}

export interface PgiaNaoConformidadeUpdateForm {
  Descricao: string;
  Situacao: string;
  ReportadaSgdiEm: string | null;
  ComunicadaControleInternoEm: string | null;
}

export interface PgiaNaoConformidade extends PgiaNaoConformidadeUpdateForm {
  Id: number;
  OrgaoId: number;
  OrgaoSigla: string;
  Origem: string;
  DataRegistro: string;
  CriadoEm: string;
}

export interface PgiaCapacitacaoForm {
  AgenteId: string;
  Trilha: string;
  Status: string;
  DataConclusao: string | null;
  PrevistaPlanoCapacitacao: boolean;
  CertificadoDocId: number | null;
}

export interface PgiaCapacitacao extends PgiaCapacitacaoForm {
  Id: number;
  AgenteNome: string;
  OrgaoId: number;
  CriadoEm: string;
}

export interface PgiaRegistroUsoForm {
  SistemaIaId: number | null;
  PlataformaId: number | null;
  ProdutoRef: string;
  ProcessoSei: string | null;
  DataUso: string;
  RevisaoHumanaConfirmada: boolean;
}

export interface PgiaRegistroUso extends PgiaRegistroUsoForm {
  Id: number;
  AgenteNome: string;
  OrgaoId: number;
  SistemaDenominacao: string | null;
  PlataformaNome: string | null;
  CriadoEm: string;
}

// D15 — hipóteses do art. 30, com os rótulos do mock
export const HIPOTESES_INCIDENTE = [
  { valor: 'I', rotulo: 'I · Risco à vida, à integridade física ou à saúde de pessoas' },
  { valor: 'II', rotulo: 'II · Violação relevante a direitos fundamentais' },
  { valor: 'III', rotulo: 'III · Interrupção de serviço público essencial' },
  { valor: 'IV', rotulo: 'IV · Vazamento ou acesso indevido a dados pessoais' },
  { valor: 'V', rotulo: 'V · Resultados discriminatórios que se repetem' }
] as const;

export const STATUS_APURACAO = [
  'Recebida', 'Em apuração', 'Concluída com recomendações',
  'Concluída sem medidas', 'Encaminhada ao CGTIC'
] as const;

export const ORIGENS_NAO_CONFORMIDADE = ['Acompanhamento do SGTIC', 'Supervisão da SGDI'] as const;

export const SITUACOES_NAO_CONFORMIDADE = [
  'Registrada', 'Reportada à SGDI', 'Em tratamento', 'Sanada', 'Comunicada ao controle interno'
] as const;

export const TRILHAS_CAPACITACAO = [
  'Letramento em IA', 'Uso responsável de IA', 'Governança de IA',
  'Desenvolvimento e auditoria de sistemas de IA'
] as const;

export const STATUS_CAPACITACAO = ['Prevista', 'Em andamento', 'Concluída'] as const;

export const PESOS_QUESITOS: PgiaQuesitoRisco[] = [
  { Artigo: 15, Inciso: 'I', Peso: 5 }, { Artigo: 15, Inciso: 'II', Peso: 5 },
  { Artigo: 15, Inciso: 'III', Peso: 5 }, { Artigo: 15, Inciso: 'IV', Peso: 5 },
  { Artigo: 15, Inciso: 'V', Peso: 5 }, { Artigo: 15, Inciso: 'VI', Peso: 5 },
  { Artigo: 16, Inciso: 'I', Peso: 4 }, { Artigo: 16, Inciso: 'II', Peso: 3 },
  { Artigo: 16, Inciso: 'III', Peso: 3 }, { Artigo: 16, Inciso: 'IV', Peso: 4 },
  { Artigo: 16, Inciso: 'V', Peso: 4 }, { Artigo: 16, Inciso: 'VI', Peso: 3 },
  { Artigo: 16, Inciso: 'VII', Peso: 3 }, { Artigo: 16, Inciso: 'VIII', Peso: 4 },
  { Artigo: 16, Inciso: 'IX', Peso: 4 },
  { Artigo: 17, Inciso: 'I', Peso: 2 }, { Artigo: 17, Inciso: 'II', Peso: 1 },
  { Artigo: 17, Inciso: 'III', Peso: 1 }, { Artigo: 17, Inciso: 'IV', Peso: 2 }
];
