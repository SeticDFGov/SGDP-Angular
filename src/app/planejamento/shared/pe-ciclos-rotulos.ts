/**
 * Acompanhamento do PDTIC (E7 rodada B), sem Angular: as seções por ciclo, os
 * ciclos de monitoramento e de avaliação (situação, período, qual mostrar
 * primeiro), as grades da situação das ações e das medições (o que a tela mostra,
 * o que mudou, a conferência antes de salvar, o corpo do PUT e os erros do 400),
 * as pendências do fechamento e os rótulos do painel do PDTIC (AC-PDTIC). As
 * classes dos selos são as que o projeto já usa.
 */
import {
  PeAcaoCiclo, PeAcaoCicloForm, PeCampoTrilha, PeCiclo, PeMedicaoCiclo, PeMedicaoCicloForm, PePassoTrilha,
  PePendenciaCiclo, PeSecaoTrilha, PeTipoCiclo
} from '../../../api/planejamento/interface';
import { erroDoCampo, formatarNumero, lerNumero, numeroParaEdicao, textoData } from './registros/pe-valores';

// ── Seções por ciclo ─────────────────────────────────────────────────────────

/** A situação das ações no ciclo (a grade das ações, no passo 5.1). */
export const SECAO_MONITORAMENTO_ACOES = 'monitoramento_acoes';
/** As medições dos indicadores no ciclo (a grade das medições). */
export const SECAO_MEDICOES = 'medicoes_indicadores';
/** O resumo do ciclo (passo 5.2, "Feche o ciclo no relatório de acompanhamento"). */
export const SECAO_RELATORIO_CICLO = 'relatorio_ciclo';
/** Os riscos que ocorreram no ciclo (fora do nível Básico). */
export const SECAO_RISCOS_OCORRIDOS = 'riscos_ocorridos';

/** A análise dos resultados da avaliação intermediária (6.2): o relatório da avaliação fica neste passo e no da avaliação do comitê. */
export const SECAO_ANALISE_INTERMEDIARIA = 'analise_intermediaria';
/** Os resultados intermediários das metas (6.1) e a avaliação do comitê (6.3), por avaliação. */
export const SECAO_RESULTADOS_INTERMEDIARIOS = 'resultados_intermediarios';
export const SECAO_AVALIACAO_DO_COMITE = 'avaliacao_comite';
/** O relatório de resultados (RR) fica no passo das lições aprendidas (7.2), achado por uma destas seções. */
export const SECOES_DO_RR: readonly string[] = ['avaliacao_final', 'resultados_metas'];
/** Onde as ações e os indicadores de monitoramento se cadastram (link das grades vazias). */
export const SECAO_ACOES = 'acoes';
export const SECAO_INDICADORES_MONITORAMENTO = 'indicadores_monitoramento';

/**
 * As seções por ciclo do modelo inicial (seed da E7): a reserva quando o servidor
 * não diz `PorCiclo` na seção da trilha.
 */
export const SECOES_POR_CICLO: Readonly<Record<string, PeTipoCiclo>> = {
  monitoramento_acoes: 'monitoramento',
  medicoes_indicadores: 'monitoramento',
  riscos_ocorridos: 'monitoramento',
  relatorio_ciclo: 'monitoramento',
  resultados_intermediarios: 'avaliacao',
  analise_intermediaria: 'avaliacao',
  avaliacao_comite: 'avaliacao'
};

/** A seção guarda um registro por ciclo de qual tipo (null: não é por ciclo). */
export function porCicloDaSecao(secao: Pick<PeSecaoTrilha, 'Chave' | 'PorCiclo'> | null | undefined): PeTipoCiclo | null {
  if (!secao) return null;
  if (secao.PorCiclo === 'monitoramento' || secao.PorCiclo === 'avaliacao') return secao.PorCiclo;
  return SECOES_POR_CICLO[secao.Chave] ?? null;
}

/**
 * Os ciclos que o passo usa: o monitoramento (passos do tipo monitoramento ou com
 * seção por ciclo de monitoramento) ou a avaliação intermediária (passos com
 * seção por ciclo de avaliação). Null nos demais passos.
 */
export function tipoCicloDoPasso(passo: Pick<PePassoTrilha, 'Tipo' | 'Secoes'> | null | undefined): PeTipoCiclo | null {
  if (!passo) return null;
  const tipos = passo.Secoes.map(s => porCicloDaSecao(s));
  if (tipos.includes('monitoramento')) return 'monitoramento';
  if (tipos.includes('avaliacao')) return 'avaliacao';
  return passo.Tipo === 'monitoramento' ? 'monitoramento' : null;
}

// ── Ciclos ───────────────────────────────────────────────────────────────────

/** "ciclo de monitoramento" ou "avaliação intermediária" (no meio da frase). */
export function nomeDoTipoCiclo(tipo: PeTipoCiclo): string {
  return tipo === 'avaliacao' ? 'avaliação intermediária' : 'ciclo de monitoramento';
}

/** "o ciclo" ou "a avaliação" (com o artigo certo). */
export function oCiclo(tipo: PeTipoCiclo): string {
  return tipo === 'avaliacao' ? 'a avaliação' : 'o ciclo';
}

export function rotuloSituacaoCiclo(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'futuro': return 'Ainda não começou';
    case 'aberto': return 'Aberto';
    case 'atrasado': return 'Atrasado: passou do prazo para fechar';
    case 'fechado': return 'Fechado';
    default: return situacao || '-';
  }
}

/** Selo da situação do ciclo (o texto sempre vai junto). */
export function classeSituacaoCiclo(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'aberto': return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'atrasado': return 'bg-red-50 text-red-800 border-red-200';
    case 'fechado': return 'bg-green-50 text-green-800 border-green-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

export function iconeSituacaoCiclo(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'aberto': return 'edit_calendar';
    case 'atrasado': return 'error';
    case 'fechado': return 'lock';
    default: return 'schedule';
  }
}

/** O ciclo aceita dados: aberto, mesmo com o prazo vencido (o futuro ainda não, o fechado não mais). */
export function cicloAceitaDados(ciclo: Pick<PeCiclo, 'Situacao'> | null | undefined): boolean {
  return ciclo?.Situacao === 'aberto' || ciclo?.Situacao === 'atrasado';
}

/** "01/01/2027 a 31/03/2027" (ou só o início, ou o fim). */
export function periodoCiclo(ciclo: Pick<PeCiclo, 'Inicio' | 'Fim'> | null | undefined): string {
  if (!ciclo) return '-';
  if (ciclo.Inicio && ciclo.Fim) return `${textoData(ciclo.Inicio)} a ${textoData(ciclo.Fim)}`;
  if (ciclo.Inicio) return `a partir de ${textoData(ciclo.Inicio)}`;
  if (ciclo.Fim) return `até ${textoData(ciclo.Fim)}`;
  return '-';
}

/** Os ciclos na ordem do número (o servidor já manda assim; a tela não depende disso). */
export function ciclosEmOrdem(ciclos: readonly PeCiclo[] | null | undefined): PeCiclo[] {
  return [...(ciclos ?? [])].sort((a, b) => a.Numero - b.Numero || a.Id - b.Id);
}

/**
 * O ciclo que a tela mostra quando nenhum foi escolhido: o atrasado mais antigo
 * (pede atenção), senão o aberto mais recente (o período de agora), senão o
 * fechado mais recente, senão o primeiro que ainda vai começar.
 */
export function cicloPadrao(ciclos: readonly PeCiclo[] | null | undefined): PeCiclo | null {
  const lista = ciclosEmOrdem(ciclos);
  const atrasado = lista.find(c => c.Situacao === 'atrasado');
  if (atrasado) return atrasado;
  const abertos = lista.filter(c => c.Situacao === 'aberto');
  if (abertos.length) return abertos[abertos.length - 1];
  const fechados = lista.filter(c => c.Situacao === 'fechado');
  if (fechados.length) return fechados[fechados.length - 1];
  return lista[0] ?? null;
}

/** O ciclo de antes deste, do mesmo tipo (o "ciclo anterior" das grades). */
export function cicloAnterior(ciclos: readonly PeCiclo[] | null | undefined, ciclo: PeCiclo | null | undefined): PeCiclo | null {
  if (!ciclo) return null;
  const antes = ciclosEmOrdem(ciclos).filter(c => c.Numero < ciclo.Numero);
  return antes[antes.length - 1] ?? null;
}

/** O mais recente (maior número): a revisão do PDTIC vale pela avaliação mais recente. */
export function cicloMaisRecente(ciclos: readonly PeCiclo[] | null | undefined): PeCiclo | null {
  const lista = ciclosEmOrdem(ciclos);
  return lista[lista.length - 1] ?? null;
}

/** "12 de 15 ações com situação · 4 medições · 1 risco que ocorreu" (sem o resumo, vazio). */
export function resumoDoCiclo(ciclo: Pick<PeCiclo, 'Resumo'> | null | undefined): string {
  const r = ciclo?.Resumo;
  if (!r) return '';
  const partes = [`${r.AcoesComSituacao} de ${r.TotalAcoes} ${r.TotalAcoes === 1 ? 'ação' : 'ações'} com situação`];
  if (r.Medicoes > 0) partes.push(r.Medicoes === 1 ? '1 medição' : `${r.Medicoes} medições`);
  if (r.RiscosOcorridos > 0) partes.push(r.RiscosOcorridos === 1 ? '1 risco que ocorreu' : `${r.RiscosOcorridos} riscos que ocorreram`);
  return partes.join(' · ');
}

/**
 * F1 (I04 e C23): o que uma avaliação intermediária já tem. Cada parte fica nula
 * quando a seção não aparece no nível do órgão (a tela não fala dela).
 */
export interface ResumoAvaliacao {
  /** Quantos resultados das metas foram registrados na avaliação. */
  resultados: number | null;
  /** A análise dos resultados está preenchida. */
  analise: boolean | null;
  /** A decisão do comitê (o rótulo, como "Seguir com o PDTIC"); vazio sem decisão registrada. */
  decisao: string | null;
}

/** As partes do que a avaliação tem, em texto ("2 resultados das metas", "análise preenchida", ...). */
export function partesDaAvaliacao(r: ResumoAvaliacao | null | undefined): { resultados: string | null; analise: string | null; decisao: string | null } {
  if (!r) return { resultados: null, analise: null, decisao: null };
  const resultados = r.resultados === null ? null
    : r.resultados === 0 ? 'Nenhum resultado das metas registrado'
      : r.resultados === 1 ? '1 resultado das metas registrado' : `${r.resultados} resultados das metas registrados`;
  const analise = r.analise === null ? null : r.analise ? 'Análise preenchida' : 'Análise ainda não preenchida';
  const decisao = r.decisao === null ? null : r.decisao ? `Decisão do comitê: ${r.decisao}` : 'Decisão do comitê ainda não registrada';
  return { resultados, analise, decisao };
}

/** "2 resultados das metas registrados · Análise preenchida · Decisão do comitê: Seguir com o PDTIC" (vazio sem o resumo). */
export function resumoDaAvaliacao(r: ResumoAvaliacao | null | undefined): string {
  const p = partesDaAvaliacao(r);
  return [p.resultados, p.analise, p.decisao].filter((t): t is string => !!t).join(' · ');
}

/** Quantas ações ainda estão sem situação no ciclo (o fechamento as exige). */
export function acoesSemSituacao(ciclo: Pick<PeCiclo, 'Resumo'> | null | undefined): number {
  const r = ciclo?.Resumo;
  return r ? Math.max(0, r.TotalAcoes - r.AcoesComSituacao) : 0;
}

/** O rótulo sugerido para a avaliação nova ("Avaliação intermediária 2"). */
export function rotuloAvaliacaoNova(avaliacoes: readonly PeCiclo[] | null | undefined): string {
  const maior = ciclosEmOrdem(avaliacoes).reduce((n, c) => Math.max(n, c.Numero), 0);
  return `Avaliação intermediária ${maior + 1}`;
}

/** Um número de ciclo do endereço (`?ciclo=12`), ou null. */
export function cicloDoEndereco(url: string): number | null {
  const query = url.split('#')[0].split('?')[1] ?? '';
  const id = Number(new URLSearchParams(query).get('ciclo'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * As pendências do 400 do fechamento: a lista `Pendencias` (objetos na forma das
 * do envio, ou só textos). Sem lista, vazia (a tela mostra a `Message`).
 */
export function pendenciasDoErro(erro: unknown): PePendenciaCiclo[] {
  const corpo = (erro as { error?: { Pendencias?: unknown } } | null)?.error;
  const lista = corpo?.Pendencias;
  if (!Array.isArray(lista)) return [];
  const pendencias: PePendenciaCiclo[] = [];
  for (const item of lista) {
    if (typeof item === 'string') {
      if (item.trim()) pendencias.push({ Motivo: item.trim() });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    const motivo = [p['Motivo'], p['Mensagem'], p['Message'], p['Descricao']].find(v => typeof v === 'string' && v.trim()) as string | undefined;
    if (!motivo) continue;
    pendencias.push({
      PassoId: typeof p['PassoId'] === 'number' ? p['PassoId'] : null,
      PassoNumero: typeof p['PassoNumero'] === 'string' ? p['PassoNumero'] : null,
      PassoTitulo: typeof p['PassoTitulo'] === 'string' ? p['PassoTitulo'] : null,
      Motivo: motivo.trim()
    });
  }
  return pendencias;
}

// ── Grades (situação das ações e medições) ───────────────────────────────────

export type TipoGrade = 'acoes' | 'medicoes';

/** O passo onde as ações (ou os indicadores de monitoramento) se cadastram: o link da grade vazia. */
export interface PassoDaGrade {
  rota: string;
  numero: string;
}

/**
 * Os campos da seção que cada grade grava, pela chave do campo na seção, com a
 * propriedade do item no contrato (situacao vira Situacao; valor_apurado, ValorApurado).
 */
const PROPRIEDADES_DA_GRADE: Readonly<Record<TipoGrade, Readonly<Record<string, string>>>> = {
  acoes: {
    situacao: 'Situacao',
    execucao_fisica: 'ExecucaoFisica',
    execucao_orcamentaria: 'ExecucaoOrcamentaria',
    observacao: 'Observacao'
  },
  medicoes: {
    valor_apurado: 'ValorApurado',
    data: 'Data',
    observacao: 'Observacao'
  }
};

/** Os campos que cada grade mostra quando a seção não veio na trilha (a reserva). */
const CAMPOS_RESERVA: Readonly<Record<TipoGrade, readonly PeCampoTrilha[]>> = {
  acoes: [
    campoReserva(-1, 'situacao', 'Situação', 'lista', true, [
      { Valor: 'nao_iniciada', Rotulo: 'Não iniciada', Cor: 'cinza' },
      { Valor: 'em_andamento', Rotulo: 'Em andamento', Cor: 'azul' },
      { Valor: 'concluida', Rotulo: 'Concluída', Cor: 'verde' },
      { Valor: 'cancelada', Rotulo: 'Cancelada', Cor: 'vermelho' }
    ])
  ],
  medicoes: [
    campoReserva(-2, 'valor_apurado', 'Valor apurado', 'numero', true),
    campoReserva(-3, 'data', 'Data da medição', 'data', true)
  ]
};

function campoReserva(
  id: number, chave: string, rotulo: string, tipo: PeCampoTrilha['Tipo'], obrigatorio: boolean, opcoes: PeCampoTrilha['Opcoes'] = []
): PeCampoTrilha {
  return { Id: id, Chave: chave, Rotulo: rotulo, Ajuda: null, Tipo: tipo, Config: null, Obrigatorio: obrigatorio, Principal: false, Largura: null, Opcoes: opcoes };
}

/** Uma coluna da grade: o campo da seção (rótulo, tipo, obrigatório no nível) e a propriedade do item. */
export interface ColunaGrade {
  chave: string;
  prop: string;
  campo: PeCampoTrilha;
}

/**
 * As colunas da grade: os campos da seção que o nível do órgão mostra (os
 * desligados não vêm na trilha), na ordem do modelo, só os que a grade sabe
 * gravar. No nível Básico, a grade das ações fica só com a situação (e o que mais
 * o nível ligar).
 */
export function colunasDaGrade(tipo: TipoGrade, secao: Pick<PeSecaoTrilha, 'Campos'> | null | undefined): ColunaGrade[] {
  const props = PROPRIEDADES_DA_GRADE[tipo];
  const campos = secao ? secao.Campos : CAMPOS_RESERVA[tipo];
  return campos.filter(c => !!props[c.Chave]).map(c => ({ chave: c.Chave, prop: props[c.Chave], campo: c }));
}

/** Uma linha da grade como a tela usa: os valores como se digitam (os números em texto). */
export interface LinhaGrade {
  /** AcaoId ou IndicadorId. */
  id: number;
  codigo: string;
  titulo: string;
  /** "Metas: M01 e M02 · Prevista de 01/01/2027 a 31/12/2027". */
  detalhe: string;
  /** Medições: o valor de referência de cada período. */
  referencia: string | null;
  registroId: number | null;
  /** Pela chave do campo. */
  valores: Record<string, string>;
  /** O que veio do servidor, na mesma forma (para saber o que mudou). */
  originais: Record<string, string>;
  /** O valor do ciclo anterior em texto, pela chave do campo (sem valor, a chave não vem). */
  anterior: Record<string, string>;
  /** O item como veio: os campos que o nível esconde voltam como estavam. */
  item: PeAcaoCiclo | PeMedicaoCiclo;
  erros: Record<string, string>;
}

function juntarCodigos(codigos: readonly string[]): string {
  const lista = codigos.filter(Boolean);
  if (lista.length <= 1) return lista[0] ?? '';
  return `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}`;
}

/** O valor de um campo como fica no controle ("" quando vazio; números no jeito brasileiro). */
export function valorParaTela(campo: PeCampoTrilha, bruto: unknown): string {
  if (bruto === null || bruto === undefined) return '';
  if (campo.Tipo === 'numero' || campo.Tipo === 'percentual' || campo.Tipo === 'moeda') return numeroParaEdicao(campo, bruto);
  if (campo.Tipo === 'data') return typeof bruto === 'string' ? bruto.slice(0, 10) : '';
  return typeof bruto === 'string' ? bruto : String(bruto);
}

/** O valor de um campo como vai no PUT (vazio vira null; números viram número). */
export function valorParaEnvio(campo: PeCampoTrilha, texto: string): string | number | null {
  const t = (texto ?? '').trim();
  if (!t) return null;
  if (campo.Tipo === 'numero' || campo.Tipo === 'percentual' || campo.Tipo === 'moeda') return lerNumero(t).valor;
  return t;
}

/** O valor em texto para ler (a opção pelo rótulo, percentual com o sinal, data sem fuso). */
export function textoDoValorGrade(campo: PeCampoTrilha, bruto: unknown): string {
  if (bruto === null || bruto === undefined || bruto === '') return '-';
  switch (campo.Tipo) {
    case 'lista': return campo.Opcoes.find(o => o.Valor === String(bruto))?.Rotulo ?? String(bruto);
    case 'percentual': {
      const lido = lerNumero(bruto);
      return lido.valor === null ? String(bruto) : `${formatarNumero(lido.valor, 2)}%`;
    }
    case 'numero': {
      const lido = lerNumero(bruto);
      if (lido.valor === null) return String(bruto);
      const unidade = campo.Config?.unidade;
      return unidade ? `${formatarNumero(lido.valor)} ${unidade}` : formatarNumero(lido.valor);
    }
    case 'data': return textoData(String(bruto));
    default: return String(bruto);
  }
}

/** As linhas da grade, a partir da resposta do GET (ou do PUT). */
export function linhasDaGrade(tipo: TipoGrade, itens: readonly (PeAcaoCiclo | PeMedicaoCiclo)[] | null | undefined,
  colunas: readonly ColunaGrade[]): LinhaGrade[] {
  return (itens ?? []).map(item => {
    const valores: Record<string, string> = {};
    const anterior: Record<string, string> = {};
    const bruto = item as unknown as Record<string, unknown>;
    const antes = (item.Anterior ?? null) as Record<string, unknown> | null;
    for (const c of colunas) {
      valores[c.chave] = valorParaTela(c.campo, bruto[c.prop]);
      const valorAntes = antes ? antes[c.prop] : undefined;
      if (valorAntes !== null && valorAntes !== undefined && valorAntes !== '') anterior[c.chave] = textoDoValorGrade(c.campo, valorAntes);
    }
    if (tipo === 'acoes') {
      const a = item as PeAcaoCiclo;
      const partes: string[] = [];
      const metas = juntarCodigos(a.Metas ?? []);
      if (metas) partes.push(`${(a.Metas ?? []).length === 1 ? 'Meta' : 'Metas'}: ${metas}`);
      if (a.InicioPrevisto || a.ConclusaoPrevista) {
        partes.push(a.InicioPrevisto && a.ConclusaoPrevista
          ? `Prevista de ${textoData(a.InicioPrevisto)} a ${textoData(a.ConclusaoPrevista)}`
          : a.ConclusaoPrevista ? `Conclusão prevista em ${textoData(a.ConclusaoPrevista)}` : `Início previsto em ${textoData(a.InicioPrevisto)}`);
      }
      return {
        id: a.AcaoId, codigo: a.Codigo?.trim() || `Ação ${a.AcaoId}`, titulo: a.Descricao?.trim() || '-', detalhe: partes.join(' · '),
        referencia: null, registroId: a.RegistroId ?? null, valores, originais: { ...valores }, anterior, item, erros: {}
      };
    }
    const m = item as PeMedicaoCiclo;
    return {
      id: m.IndicadorId, codigo: m.Codigo?.trim() || `Indicador ${m.IndicadorId}`, titulo: m.Indicador?.trim() || '-', detalhe: '',
      referencia: m.ValoresReferencia?.trim() || null, registroId: m.RegistroId ?? null, valores, originais: { ...valores }, anterior,
      item, erros: {}
    };
  });
}

/** A linha tem mudança na tela (comparada ao que veio do servidor). */
export function linhaMudou(linha: LinhaGrade, colunas: readonly ColunaGrade[]): boolean {
  return colunas.some(c => (linha.valores[c.chave] ?? '').trim() !== (linha.originais[c.chave] ?? '').trim());
}

/** Nenhum campo da linha tem valor na tela. */
export function linhaVazia(linha: LinhaGrade, colunas: readonly ColunaGrade[]): boolean {
  return colunas.every(c => !(linha.valores[c.chave] ?? '').trim());
}

/**
 * O problema de cada campo da linha, em linguagem simples (a mesma conferência
 * dos formulários do motor: obrigatório no nível, percentual de 0 a 100, número,
 * data válida, tamanho do texto).
 */
export function errosDaLinha(linha: LinhaGrade, colunas: readonly ColunaGrade[]): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const c of colunas) {
    const erro = erroDoCampo(c.campo, (linha.valores[c.chave] ?? '').trim());
    if (erro) erros[c.chave] = erro;
  }
  return erros;
}

/**
 * O item do PUT: os campos da grade como estão na tela; os que o nível esconde
 * voltam como vieram (nada se apaga por estar desligado).
 */
export function itemDaLinha(tipo: TipoGrade, linha: LinhaGrade, colunas: readonly ColunaGrade[]): PeAcaoCicloForm | PeMedicaoCicloForm {
  const bruto = linha.item as unknown as Record<string, unknown>;
  const valor = (prop: string): unknown => {
    const coluna = colunas.find(c => c.prop === prop);
    if (coluna) return valorParaEnvio(coluna.campo, linha.valores[coluna.chave] ?? '');
    const original = bruto[prop];
    return original === undefined ? null : original;
  };
  if (tipo === 'acoes') {
    return {
      AcaoId: linha.id,
      Situacao: valor('Situacao') as string | null,
      ExecucaoFisica: valor('ExecucaoFisica') as number | null,
      ExecucaoOrcamentaria: valor('ExecucaoOrcamentaria') as number | null,
      Observacao: valor('Observacao') as string | null
    };
  }
  return {
    IndicadorId: linha.id,
    ValorApurado: valor('ValorApurado') as number | null,
    Data: valor('Data') as string | null,
    Observacao: valor('Observacao') as string | null
  };
}

/**
 * "Copiar do ciclo anterior": nas linhas ainda vazias (sem registro no ciclo e sem
 * nada digitado), os valores do ciclo anterior entram na tela. Devolve quantas
 * linhas mudaram (o que já foi digitado nunca é trocado).
 */
export function copiarDoAnterior(linhas: LinhaGrade[], colunas: readonly ColunaGrade[]): number {
  let copiadas = 0;
  for (const linha of linhas) {
    const antes = (linha.item.Anterior ?? null) as Record<string, unknown> | null;
    if (!antes || linha.registroId !== null || !linhaVazia(linha, colunas)) continue;
    let mudou = false;
    for (const c of colunas) {
      const valor = antes[c.prop];
      if (valor === null || valor === undefined || valor === '') continue;
      linha.valores[c.chave] = valorParaTela(c.campo, valor);
      mudou = true;
    }
    if (mudou) copiadas++;
  }
  return copiadas;
}

/** Quantas linhas vazias têm valor no ciclo anterior (o botão "Copiar do ciclo anterior" só aparece com alguma). */
export function linhasParaCopiar(linhas: readonly LinhaGrade[], colunas: readonly ColunaGrade[]): number {
  return linhas.filter(l => {
    const antes = (l.item.Anterior ?? null) as Record<string, unknown> | null;
    return !!antes && l.registroId === null && linhaVazia(l, colunas)
      && colunas.some(c => antes[c.prop] !== null && antes[c.prop] !== undefined && antes[c.prop] !== '');
  }).length;
}

/** Os erros do 400 da grade, por linha e por campo, e as mensagens que não acharam lugar. */
export interface ErrosDaGrade {
  porLinha: Record<number, Record<string, string>>;
  soltos: string[];
}

function normalizarChave(texto: string): string {
  return texto.toLowerCase().replace(/[_\s-]/g, '');
}

/**
 * Lê o `Campos` do 400 da grade: "12.situacao" (o id da linha e o campo; o campo
 * pela chave da seção ou pela propriedade do contrato, sem caixa) ou
 * "Itens[0].Situacao" (a posição no corpo enviado). A mensagem que não cabe numa
 * célula vai para `soltos`, com o código da linha quando dá para saber.
 */
export function errosDoServidorNaGrade(erro: unknown, linhas: readonly LinhaGrade[], colunas: readonly ColunaGrade[],
  enviados: readonly number[]): ErrosDaGrade {
  const resultado: ErrosDaGrade = { porLinha: {}, soltos: [] };
  const campos = (erro as { error?: { Campos?: unknown } } | null)?.error?.Campos;
  if (!campos || typeof campos !== 'object') return resultado;
  for (const [chave, mensagemBruta] of Object.entries(campos as Record<string, unknown>)) {
    if (typeof mensagemBruta !== 'string' || !mensagemBruta.trim()) continue;
    const mensagem = mensagemBruta.trim();
    let id: number | null = null;
    let campo = '';
    const porPosicao = /^itens\[(\d+)\]\.?(.*)$/i.exec(chave.trim());
    if (porPosicao) {
      id = enviados[Number(porPosicao[1])] ?? null;
      campo = porPosicao[2] ?? '';
    } else {
      const ponto = chave.indexOf('.');
      const inicio = ponto >= 0 ? chave.slice(0, ponto) : chave;
      campo = ponto >= 0 ? chave.slice(ponto + 1) : '';
      const numero = Number(inicio);
      id = Number.isInteger(numero) ? numero : null;
    }
    const linha = id !== null ? linhas.find(l => l.id === id) ?? null : null;
    const alvo = normalizarChave(campo);
    const coluna = alvo ? colunas.find(c => normalizarChave(c.chave) === alvo || normalizarChave(c.prop) === alvo) ?? null : null;
    if (linha && coluna) {
      resultado.porLinha[linha.id] = { ...(resultado.porLinha[linha.id] ?? {}), [coluna.chave]: mensagem };
    } else {
      resultado.soltos.push(linha ? `${linha.codigo}: ${mensagem}` : mensagem);
    }
  }
  return resultado;
}

// ── Painel do PDTIC (AC-PDTIC) ────────────────────────────────────────────────

export function rotuloSituacaoFisica(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'em_dia': return 'Em dia';
    case 'atrasada': return 'Atrasada';
    case 'concluida': return 'Concluída';
    case 'cancelada': return 'Cancelada';
    case 'sem_registro': return 'Sem registro';
    default: return situacao || '-';
  }
}

/** Selo da situação física (a cor do Anexo XIII: em dia verde, atrasada vermelha; o texto sempre vai junto). */
export function classeSituacaoFisica(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'em_dia': return 'bg-green-50 text-green-800 border-green-200';
    case 'atrasada': return 'bg-red-50 text-red-800 border-red-200';
    case 'concluida': return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'cancelada': return 'bg-amber-50 text-amber-900 border-amber-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

export function iconeSituacaoFisica(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'em_dia': return 'schedule';
    case 'atrasada': return 'error';
    case 'concluida': return 'task_alt';
    case 'cancelada': return 'block';
    default: return 'help_outline';
  }
}

/** "40%" (com até 1 casa) ou "-". */
export function textoPercentual(valor: number | null | undefined): string {
  return typeof valor === 'number' && Number.isFinite(valor) ? `${formatarNumero(valor, 1)}%` : '-';
}

/** O percentual limitado a 0 a 100, para a barra (null sem valor). */
export function percentualDaBarra(valor: number | null | undefined): number | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  return Math.min(100, Math.max(0, valor));
}

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Chave de contagem sem caixa, acento nem separador ("Sem ocorrência", "sem_ocorrencia" e "SemOcorrencia" são a mesma). */
export function chaveContagem(texto: string | null | undefined): string {
  return semAcento(texto ?? '').toLowerCase().replace(/[_\s-]/g, '');
}

/** Uma contagem de um dicionário do painel, sem depender da caixa da chave (0 quando não vem). */
export function contagemDe(dicionario: Record<string, number> | null | undefined, chave: string): number {
  if (!dicionario) return 0;
  const alvo = chaveContagem(chave);
  for (const [k, v] of Object.entries(dicionario)) {
    if (chaveContagem(k) === alvo && typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return 0;
}

/** Situações e níveis do painel dos riscos, na ordem dos quadros do Anexo XIII. */
export const SITUACOES_RISCO: readonly { chave: string; rotulo: string }[] = [
  { chave: 'aberto', rotulo: 'Aberto' },
  { chave: 'fechado', rotulo: 'Fechado' },
  { chave: 'excluido', rotulo: 'Excluído' },
  { chave: 'sem_ocorrencia', rotulo: 'Sem ocorrência' }
];

export const NIVEIS_RISCO: readonly { chave: string; rotulo: string; cor: string }[] = [
  { chave: 'alto', rotulo: 'Alto', cor: 'bg-red-500' },
  { chave: 'medio', rotulo: 'Médio', cor: 'bg-amber-500' },
  { chave: 'baixo', rotulo: 'Baixo', cor: 'bg-green-500' }
];

/** A quantidade de uma célula da matriz situação por nível (0 quando não vem). */
export function quantidadeNaMatriz(matriz: readonly { Situacao: string; Nivel: string; Quantidade: number }[] | null | undefined,
  situacao: string, nivel: string): number {
  const s = chaveContagem(situacao);
  const n = chaveContagem(nivel);
  return (matriz ?? [])
    .filter(c => chaveContagem(c.Situacao) === s && chaveContagem(c.Nivel) === n)
    .reduce((total, c) => total + (typeof c.Quantidade === 'number' ? c.Quantidade : 0), 0);
}
