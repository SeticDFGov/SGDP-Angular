/**
 * Rótulos do PDTIC do órgão (E4 e E7), em linguagem simples: situação do PDTIC e
 * de cada passo, o que cada seção chama de item, a classificação de risco dos
 * sistemas de IA do PGIA, o andamento da trilha e, na E7, o caminho da aprovação
 * (por que um passo só se lê, a versão seguinte, a vigência terminada). Só funções
 * puras e constantes (as classes dos selos são as que o projeto já usa).
 */
import { PeAndamentoPdtic, PePassoTrilha, PePdtic, PeSituacaoPassoPdtic } from '../../../api/planejamento/interface';
import { textoData, textoDataHora } from './registros/pe-valores';

export function rotuloSituacaoPdtic(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'em_elaboracao': return 'Em elaboração';
    case 'em_aprovacao': return 'Em aprovação';
    case 'devolvido': return 'Devolvido pelo CGTIC';
    case 'aprovado': return 'Aprovado';
    case 'publicado': return 'Publicado';
    case 'em_acompanhamento': return 'Em acompanhamento';
    case 'encerrado': return 'Encerrado';
    case 'substituido': return 'Substituído';
    default: return situacao || '-';
  }
}

/**
 * A situação de uma versão no meio da frase, com o verbo e no feminino ("a
 * revisão (versão 1.2) foi devolvida pelo CGTIC"): o rótulo da situação é
 * masculino ("Devolvido", "Aprovado"), e montar "está" com ele não concorda (F2, C-N1).
 */
export function situacaoDaVersaoNaFrase(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'em_elaboracao': return 'está em elaboração';
    case 'em_aprovacao': return 'está com o CGTIC, aguardando a deliberação';
    case 'devolvido': return 'foi devolvida pelo CGTIC para ajustes';
    case 'aprovado': return 'foi aprovada pelo CGTIC e aguarda a publicação';
    case 'publicado': return 'foi publicada';
    case 'em_acompanhamento': return 'está em acompanhamento';
    case 'encerrado': return 'foi encerrada';
    case 'substituido': return 'foi substituída';
    default: return `está na situação "${situacao || '-'}"`;
  }
}

export function classeSituacaoPdtic(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'em_elaboracao': return 'bg-blue-100 text-blue-800';
    case 'em_aprovacao': return 'bg-amber-100 text-amber-900';
    case 'devolvido': return 'bg-red-100 text-red-800';
    case 'aprovado':
    case 'publicado':
    case 'em_acompanhamento': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

/** Situações em que a equipe do órgão preenche as etapas 1 a 3 (as demais: só leitura nelas). */
export function pdticEmEdicao(situacao: string | null | undefined): boolean {
  return situacao === 'em_elaboracao' || situacao === 'devolvido';
}

/** A versão que vale hoje: publicada ou em acompanhamento. */
export function pdticVigente(situacao: string | null | undefined): boolean {
  return situacao === 'publicado' || situacao === 'em_acompanhamento';
}

/**
 * E7 rodada B: o PDTIC já foi publicado (tem ciclos de acompanhamento e o painel):
 * publicado, em acompanhamento, encerrado ou substituído.
 */
export function pdticDepoisDaPublicacao(situacao: string | null | undefined): boolean {
  return situacao === 'publicado' || situacao === 'em_acompanhamento' || situacao === 'encerrado' || situacao === 'substituido';
}

/**
 * A versão ainda a caminho de valer (em elaboração, com o CGTIC, devolvida ou
 * aprovada sem publicar): pode existir junto com uma vigente, na revisão.
 */
export function pdticAntesDaPublicacao(situacao: string | null | undefined): boolean {
  return situacao === 'em_elaboracao' || situacao === 'em_aprovacao' || situacao === 'devolvido' || situacao === 'aprovado';
}

/** "1 comentário" ou "3 comentários". */
export function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`;
}

/** F3: `opcional` é o passo opcional ainda sem conteúdo (não é cobrança; selo neutro). */
export type EstadoPassoPdtic = 'feito' | 'pendente' | 'atencao' | 'nao_se_aplica' | 'aguardando' | 'atrasado' | 'externo' | 'opcional';

/** B: a marca da equipe no passo: validado, validado com mudança depois, ou nenhuma. */
export type ValidacaoDoPasso = 'validado' | 'mudou' | null;

/** O motivo que o servidor manda para o feito fora do sistema: o selo já diz isso. */
const MOTIVO_EXTERNO = 'feito fora do sistema';

/** A situação de um passo como a trilha usa (selo, bolinha, próximo passo, o sinal da validação). */
export interface StatusDoPassoPdtic {
  estado: EstadoPassoPdtic;
  texto: string;
  motivo: string | null;
  /** F3: a situação do passo no passo a passo do órgão é obrigatório (nulo: a resposta não disse). */
  obrigatorio: boolean | null;
  /** F3 (B): a marca "validado pela equipe". */
  validacao: ValidacaoDoPasso;
}

/**
 * Situação de um passo para a trilha (bolinha, selo e próximo passo). O passo
 * `continuo` (tipo que ganha tela nas próximas entregas) fica sem situação.
 * Os avisos do guia não mudam a situação: entram no texto. O `motivo` (E7) é o
 * porquê de aguardando, atrasado e externo, sempre mostrado em texto ao lado do selo.
 * F3: `opcional` (o passo opcional sem conteúdo, sem cobrança), se o passo é
 * obrigatório e a marca da validação.
 */
export function statusDoPassoPdtic(s: PeSituacaoPassoPdtic): StatusDoPassoPdtic | null {
  const avisos = s.Avisos?.length ? ` · ${plural(s.Avisos.length, 'aviso', 'avisos')}` : '';
  const motivo = s.Motivo?.trim() || null;
  const extra = {
    obrigatorio: typeof s.Obrigatorio === 'boolean' ? s.Obrigatorio : null,
    validacao: validacaoDoPasso(s)
  };
  switch (s.Situacao) {
    case 'feito': return { estado: 'feito', texto: `Feito${avisos}`, motivo, ...extra };
    case 'pendente': return { estado: 'pendente', texto: `Pendente${avisos}`, motivo, ...extra };
    case 'atencao': return {
      estado: 'atencao',
      texto: s.ComentariosAbertos > 0 ? plural(s.ComentariosAbertos, 'comentário aberto', 'comentários abertos') : `Pede atenção${avisos}`,
      motivo,
      ...extra
    };
    // Marcado pelo órgão: a justificativa aparece no bloco do passo. Calculado pelo servidor (sem a marcação),
    // o porquê vem no motivo (F1)
    case 'nao_se_aplica': return { estado: 'nao_se_aplica', texto: 'Não se aplica', motivo: s.NaoSeAplica ? null : motivo, ...extra };
    case 'aguardando': return { estado: 'aguardando', texto: 'Aguardando', motivo, ...extra };
    case 'atrasado': return { estado: 'atrasado', texto: `Atrasado${avisos}`, motivo, ...extra };
    case 'externo': return {
      estado: 'externo',
      texto: 'Feito fora do sistema',
      motivo: motivo && motivo.toLowerCase().replace(/\.$/, '') !== MOTIVO_EXTERNO ? motivo : null,
      ...extra
    };
    // F3: o passo opcional sem conteúdo não cobra (selo neutro, sem motivo)
    case 'opcional': return { estado: 'opcional', texto: `Opcional${avisos}`, motivo: null, ...extra };
    default: return null;
  }
}

/** B: a marca da equipe no passo (nenhuma quando a resposta não traz a validação). */
export function validacaoDoPasso(s: Pick<PeSituacaoPassoPdtic, 'Validacao'> | null | undefined): ValidacaoDoPasso {
  const v = s?.Validacao;
  if (!v) return null;
  return v.AlteradoDepoisEm ? 'mudou' : 'validado';
}

/** B: a marca em palavras, para o leitor de tela e a dica ("validado pela equipe, com mudança depois"). */
export function textoValidacaoDoPasso(v: ValidacaoDoPasso): string {
  if (v === 'mudou') return 'validado pela equipe, com mudança depois';
  return v === 'validado' ? 'validado pela equipe' : '';
}

/** B: o ícone da marca (a cor só acompanha: o texto vai junto, na dica e para o leitor de tela). */
export function iconeValidacaoDoPasso(v: ValidacaoDoPasso): string {
  return v === 'mudou' ? 'change_circle' : 'how_to_reg';
}

/** B: a cor do ícone da marca sobre fundo branco. */
export function corValidacaoDoPasso(v: ValidacaoDoPasso): string {
  return v === 'mudou' ? 'text-amber-600' : 'text-green-600';
}

/** Primeira letra minúscula, a não ser que o texto comece por uma sigla ("PDTIC..."). */
export function minusculaInicial(texto: string): string {
  return texto.length > 1 && texto[1] === texto[1].toLowerCase() ? texto[0].toLowerCase() + texto.slice(1) : texto;
}

/**
 * O selo e o motivo numa frase só, para o leitor de tela e as listas:
 * "Aguardando: disponível depois da publicação do PDTIC". Motivo que já começa
 * pela situação ("Aguardando a deliberação do CGTIC desde 24/09/2026") vale sozinho.
 */
export function textoDoStatus(s: { texto: string; motivo?: string | null } | null | undefined): string {
  if (!s) return '';
  const motivo = s.motivo?.trim();
  if (!motivo) return s.texto;
  const primeira = s.texto.split(/\s/)[0].toLowerCase();
  if (motivo.toLowerCase().startsWith(primeira)) return motivo;
  return motivo.includes(':') ? `${s.texto}. ${motivo}` : `${s.texto}: ${minusculaInicial(motivo)}`;
}

/** Selo da situação de um passo (classes que o projeto já usa). */
export function classeEstadoPasso(estado: string | null | undefined): string {
  switch (estado) {
    case 'feito': return 'bg-green-50 text-green-800 border-green-200';
    case 'atrasado': return 'bg-red-50 text-red-800 border-red-200';
    case 'atencao': return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'pendente': return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'externo': return 'bg-purple-50 text-purple-800 border-purple-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

/** Ícone da situação de um passo (o texto sempre vai junto). */
export function iconeEstadoPasso(estado: string | null | undefined): string {
  switch (estado) {
    case 'feito': return 'check_circle';
    case 'atrasado': return 'error';
    case 'atencao': return 'notifications_active';
    case 'nao_se_aplica': return 'do_not_disturb_on';
    case 'aguardando': return 'hourglass_empty';
    case 'externo': return 'task';
    // F3: o passo opcional sem conteúdo (dá para acrescentar ao plano, se o órgão quiser)
    case 'opcional': return 'add_circle_outline';
    default: return 'schedule';
  }
}

/** Cor do ícone da situação sobre fundo branco. */
export function corIconeEstadoPasso(estado: string | null | undefined): string {
  switch (estado) {
    case 'feito': return 'text-green-600';
    case 'atrasado': return 'text-red-600';
    case 'atencao': return 'text-amber-600';
    case 'nao_se_aplica':
    case 'aguardando':
    case 'opcional': return 'text-gray-500';
    case 'externo': return 'text-purple-600';
    default: return 'text-blue-600';
  }
}

/** Passo resolvido: feito, marcado como "não se aplica" ou feito fora do sistema. */
function resolvido(situacao: string): boolean {
  return situacao === 'feito' || situacao === 'nao_se_aplica' || situacao === 'externo';
}

/**
 * O andamento dos passos, para a visão geral. F3: `porObrigatorio` quando o servidor
 * diz, em cada passo, se ele é obrigatório para o órgão (a API nova): aí os números
 * contam os obrigatórios resolvidos e, à parte, os opcionais feitos (os opcionais não
 * cobram); sem isso (a API anterior), valem os de sempre (`feitos` de `total`). B:
 * quantos passos a equipe validou, entre os que aceitam a validação.
 */
export interface ResumoAndamento {
  feitos: number;
  total: number;
  aguardando: number;
  porObrigatorio: boolean;
  obrigatoriosResolvidos: number;
  obrigatorios: number;
  opcionaisFeitos: number;
  validados: number;
  aceitamValidacao: number;
}

/**
 * Andamento dos passos com situação (os `continuo` não contam): resolvidos são os
 * feitos, os marcados como "não se aplica" e os feitos fora do sistema;
 * `aguardando` conta os que dependem de outra coisa antes (a publicação, por exemplo).
 */
export function resumoAndamento(andamento: PeAndamentoPdtic | null | undefined): ResumoAndamento {
  const comSituacao = (andamento?.Passos ?? []).filter(p => p.Situacao !== 'continuo');
  const porObrigatorio = comSituacao.some(p => typeof p.Obrigatorio === 'boolean');
  const obrigatorios = porObrigatorio ? comSituacao.filter(p => p.Obrigatorio === true) : [];
  const opcionais = porObrigatorio ? comSituacao.filter(p => p.Obrigatorio !== true) : [];
  const aceitam = comSituacao.filter(p => p.AceitaValidacao === true);
  return {
    feitos: comSituacao.filter(p => resolvido(p.Situacao)).length,
    total: comSituacao.length,
    aguardando: comSituacao.filter(p => p.Situacao === 'aguardando').length,
    porObrigatorio,
    obrigatoriosResolvidos: obrigatorios.filter(p => resolvido(p.Situacao)).length,
    obrigatorios: obrigatorios.length,
    opcionaisFeitos: opcionais.filter(p => p.Situacao === 'feito' || p.Situacao === 'externo').length,
    validados: aceitam.filter(p => !!p.Validacao).length,
    aceitamValidacao: aceitam.length
  };
}

// ── E7 · Caminho da aprovação ─────────────────────────────────────────────────

/** Seções semeadas que a tela do passo lê (a decisão da aprovação, o envio e a publicação). */
export const SECAO_APROVACAO_SGTIC = 'aprovacao_sgtic';
export const SECAO_PUBLICACAO = 'publicacao';
/** Avaliação do comitê (6.3 no Avançado): a decisão "revisar" abre a revisão. */
export const SECAO_AVALIACAO_COMITE = 'avaliacao_comite';
/** Aprovação da autoridade máxima (7.4): a decisão "aprovado" deixa a equipe encerrar o PDTIC. */
export const SECAO_APROVACAO_AUTORIDADE = 'aprovacao_resultados_autoridade';

/** Etapas da elaboração (1 a 3) e do acompanhamento (4 a 7), pela chave do modelo inicial. */
const ETAPAS_ELABORACAO: ReadonlySet<string> = new Set(['preparacao', 'diagnostico', 'planejamento']);
const ETAPAS_ACOMPANHAMENTO: ReadonlySet<string> = new Set(['plano-acompanhamento', 'monitoramento', 'avaliacao-intermediaria', 'fechamento']);

/**
 * Onde o passo fica no caminho do PDTIC, para explicar por que ele só se lê:
 * elaboração (etapas 1 a 3), deliberação (3.12), publicação (3.13) ou
 * acompanhamento (etapas 4 a 7). Etapa de chave desconhecida vai pela posição.
 */
export type GrupoPassoPdtic = 'elaboracao' | 'deliberacao' | 'publicacao' | 'acompanhamento';

export function grupoDoPasso(tipo: string | null | undefined, etapaChave: string | null | undefined, etapaIndice: number): GrupoPassoPdtic {
  if (tipo === 'publicacao') return 'publicacao';
  if (tipo === 'deliberacao') return 'deliberacao';
  if (etapaChave && ETAPAS_ELABORACAO.has(etapaChave)) return 'elaboracao';
  if (etapaChave && ETAPAS_ACOMPANHAMENTO.has(etapaChave)) return 'acompanhamento';
  return etapaIndice < 3 ? 'elaboracao' : 'acompanhamento';
}

/**
 * Por que a equipe do órgão só lê este passo agora, pela situação do PDTIC e pelo
 * lugar do passo (a tabela "quem edita o quê" da E7). Null quando a situação não
 * explica (a tela usa o texto geral).
 */
export function motivoLeituraDoPasso(grupo: GrupoPassoPdtic, situacao: string | null | undefined): string | null {
  switch (situacao) {
    case 'em_aprovacao': return 'O PDTIC está com o CGTIC, aguardando a deliberação: nada muda até o comitê decidir.';
    case 'encerrado': return 'O PDTIC foi encerrado: fica só para consulta.';
    case 'substituido': return 'Esta versão do PDTIC foi substituída por uma mais nova: fica só para consulta.';
  }
  const antesDaPublicacao = pdticAntesDaPublicacao(situacao);
  switch (grupo) {
    case 'elaboracao':
      return situacao === 'aprovado' || pdticVigente(situacao)
        ? 'Os passos da elaboração não mudam depois da aprovação do CGTIC. Para mudar o PDTIC, abra uma revisão depois da publicação.'
        : null;
    case 'publicacao':
      if (situacao === 'em_acompanhamento') return 'A publicação já foi registrada, e o PDTIC está em acompanhamento: ela não muda mais.';
      return antesDaPublicacao && situacao !== 'aprovado' ? 'A publicação se registra depois que o CGTIC aprovar o PDTIC.' : null;
    case 'acompanhamento':
      return antesDaPublicacao ? 'Este passo é do acompanhamento: fica disponível depois da publicação do PDTIC.' : null;
    default:
      return null;
  }
}

/** Data pura ("aaaa-mm-dd") como data; instante como data e hora. */
export function quandoPdtic(valor: string | null | undefined): string {
  if (!valor) return '-';
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? textoData(valor) : textoDataHora(valor);
}

/**
 * A data da aprovação ou da publicação do PDTIC. No registrado fora do sistema,
 * só o dia: o registro tem só a data, e o servidor a guarda ao meio-dia (o "às
 * 12:00" que aparecia não existia; F2, C-O2).
 */
export function quandoMarcoPdtic(pdtic: Pick<PePdtic, 'RegistradoExternamente'> | null | undefined, valor: string | null | undefined): string {
  return pdtic?.RegistradoExternamente ? textoData(valor) : quandoPdtic(valor);
}

/** A versão que a revisão cria: "1.0" vira "1.1" (o servidor decide; é só para o texto da confirmação). */
export function proximaVersao(versao: string | null | undefined): string {
  const partes = (versao ?? '').trim().split('.');
  const menor = Number(partes[1]);
  if (partes.length < 2 || !partes[0] || !Number.isInteger(menor)) return 'seguinte';
  return `${partes[0]}.${menor + 1}`;
}

/** A vigência do PDTIC terminou (o fim é anterior a hoje, "aaaa-mm-dd"). */
export function vigenciaTerminou(pdtic: Pick<PePdtic, 'VigenciaFim'> | null | undefined, hoje: string): boolean {
  const fim = pdtic?.VigenciaFim;
  return !!fim && fim < hoje;
}

/** Incisos do art. 12, § 2º, do passo ("V,VI,IX" vira três). */
export function incisosDoPasso(passo: Pick<PePassoTrilha, 'IncisoDecreto'> | null | undefined): string[] {
  return (passo?.IncisoDecreto ?? '').split(',').map(i => i.trim()).filter(Boolean);
}

/** O passo dos sistemas de IA (inciso VIII): mostra o inventário do PGIA antes das seções. */
export function ehPassoSistemasIa(passo: Pick<PePassoTrilha, 'IncisoDecreto'> | null | undefined): boolean {
  return incisosDoPasso(passo).includes('VIII');
}

/** O passo pode ser marcado como "não se aplica": opcional no nível do órgão, aceita e não é travado. */
export function aceitaNaoSeAplica(passo: Pick<PePassoTrilha, 'Situacao' | 'AceitaNaoSeAplica' | 'Travado'> | null | undefined): boolean {
  return !!passo && passo.Situacao === 'opcional' && passo.AceitaNaoSeAplica && !passo.Travado;
}

/**
 * Tipos de passo do órgão que têm tela (um tipo fora da lista diz que não tem tela nesta versão); o documento
 * entrou na E5, o fluxo na E6, o caminho da aprovação (aprovação, envio,
 * deliberação e publicação) na rodada A da E7 e o monitoramento (os ciclos, as
 * grades e o fechamento) na rodada B.
 */
export const TIPOS_PASSO_COM_TELA: ReadonlySet<string> = new Set([
  'dados', 'conferencia_temas', 'documento', 'fluxo', 'aprovacao', 'envio', 'deliberacao', 'publicacao', 'monitoramento'
]);

/**
 * Tipos de passo cujas seções a tela mostra com os componentes genéricos de
 * registros (no monitoramento, a situação das ações e as medições vão em grade).
 */
export const TIPOS_PASSO_COM_SECOES: ReadonlySet<string> = new Set(['dados', 'conferencia_temas', 'aprovacao', 'envio', 'publicacao', 'monitoramento']);

/**
 * Passos de dados que também mostram os fluxos do órgão (E6): o da metodologia
 * ("Descreva a metodologia e ajuste o fluxo", 1.5 no Avançado), pela chave no modelo.
 */
const PASSOS_DE_DADOS_COM_FLUXOS: ReadonlySet<string> = new Set(['preparacao.metodologia']);

/** O passo mostra o editor dos fluxos: o do tipo fluxo ou o da metodologia. */
export function passoTemFluxos(passo: Pick<PePassoTrilha, 'Tipo' | 'Chave'> | null | undefined): boolean {
  return !!passo && (passo.Tipo === 'fluxo' || PASSOS_DE_DADOS_COM_FLUXOS.has(passo.Chave));
}

/** Seção do cronograma do plano de trabalho (1.9 no Avançado): com ela vazia, o passo sugere as linhas pelos fluxos. */
export const SECAO_CRONOGRAMA = 'cronograma_elaboracao';

/**
 * Seção dos princípios e diretrizes (1.8 no Avançado). O PDTIC aberto no sistema já
 * nasce com os princípios do art. 4º nela, como itens comuns do órgão (PD01 a PD11,
 * de origem `art4`, marcados como critério de priorização), e o passo nasce feito
 * (F2). Os PDTICs abertos antes disso e o registrado fora do sistema não os têm.
 */
export const SECAO_PRINCIPIOS = 'principios_diretrizes';
/** A origem dos princípios que vieram do art. 4º do Decreto nº 48.900/2026. */
export const ORIGEM_ART4 = 'art4';

/**
 * O texto de preenchimento do passo dos princípios quando a tabela tem os do art. 4º
 * (F2): o órgão confere, ajusta, apaga e inclui os dele. `comCriterio`: o nível mostra
 * o campo do critério de priorização (no Básico, não).
 */
export function textoPrincipiosDoArt4(comCriterio: boolean): string {
  const criterio = comCriterio
    ? ' Eles vêm marcados como critério de priorização: mude para "Não" os que o órgão não for usar para priorizar as necessidades.'
    : '';
  return 'Os princípios do art. 4º já vêm na tabela, como itens do órgão: confira cada um, ajuste o texto ou apague o que não servir '
    + `e inclua os princípios e as diretrizes do próprio órgão, salvando cada um.${criterio} O passo fica feito quando as seções `
    + 'obrigatórias estão preenchidas; os campos com asterisco são obrigatórios.';
}

/** Selo da classificação de risco do PGIA (Decreto nº 48.901/2026), nas cores do PGIA. */
export function classeRiscoPgia(classificacao: string | null | undefined): string {
  switch (classificacao) {
    case 'Risco Excessivo': return 'bg-red-100 text-red-800';
    case 'Alto Risco': return 'bg-orange-100 text-orange-800';
    case 'Risco Moderado': return 'bg-yellow-100 text-yellow-800';
    case 'Baixo Risco': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

/** Nome de um item de cada seção semeada do PDTIC ("Incluir necessidade"). */
const ITEM_DA_SECAO_PDTIC: Record<string, string> = {
  sgtic_membros: 'membro',
  equipe_elaboracao: 'pessoa',
  documentos_referencia: 'documento',
  estrategias: 'estratégia',
  instrumentos_ausentes: 'instrumento',
  principios_diretrizes: 'princípio ou diretriz',
  partes_interessadas: 'parte interessada',
  cronograma_elaboracao: 'atividade',
  objetivos_tic: 'objetivo',
  ativos: 'solução ou ativo',
  swot_forcas: 'força',
  swot_fraquezas: 'fraqueza',
  swot_oportunidades: 'oportunidade',
  swot_ameacas: 'ameaça',
  necessidades_informacao: 'necessidade de informação',
  necessidades: 'necessidade',
  aquisicoes_ia: 'aquisição',
  metas: 'meta',
  acoes: 'ação',
  contratacoes: 'contratação',
  capacitacoes: 'capacitação',
  orcamento_acoes: 'linha do orçamento',
  fatores_criticos: 'fator crítico',
  riscos: 'risco',
  // F1 (C16): as seções do acompanhamento e do fechamento também têm o nome do item ("Incluir resultado")
  projetos: 'projeto',
  indicadores_monitoramento: 'indicador',
  indicadores_avaliacao: 'indicador',
  comunicacao: 'ação de comunicação',
  riscos_ocorridos: 'risco que ocorreu',
  resultados_intermediarios: 'resultado',
  indicadores_finais: 'valor final',
  resultados_metas: 'resultado'
};

export function itemDaSecaoPdtic(chave: string): string {
  return ITEM_DA_SECAO_PDTIC[chave] ?? 'registro';
}
