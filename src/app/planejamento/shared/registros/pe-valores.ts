/**
 * Funções puras do motor de registros no front: como cada tipo de campo vira
 * texto na tela, como se lê o que a pessoa digitou (números no jeito brasileiro),
 * a conferência de cada campo antes de salvar (em linguagem simples) e o corpo
 * que vai à API. Servem ao formulário, à tabela e aos campos de ligação, para
 * qualquer dono (catálogo do DF, PETIC-DF e, na E4, o PDTIC do órgão).
 */
import {
  PeArquivoRef,
  PeCampoRegistro,
  PeRegistro,
  PeRegistroForm,
  PeSecaoDoDono,
  PeTipoCampo,
  PeVinculo
} from '../../../../api/planejamento/interface';
import { juntar } from '../pe-modelo-rotulos';
import { MAX_CARACTERES_DOCUMENTO, docParaEnvio, docVazio, normalizarDocumento, textoPlano } from '../texto-rico/pe-texto-rico-doc';

/** Tipos digitados como número (texto na tela, número no envio). */
const NUMERICOS: ReadonlySet<string> = new Set(['numero', 'moeda', 'percentual']);

/** Tipos que viram coluna só quando não há outra opção (texto comprido e anexos). */
const LONGOS: ReadonlySet<string> = new Set(['texto_longo', 'texto_rico', 'arquivo']);

/** Quantas colunas de dados a tabela mostra (as demais ficam no detalhe do registro). */
const MAX_COLUNAS = 5;

/** Tamanho do texto numa célula da tabela e no resumo de uma ligação. */
const MAX_CELULA = 140;

/** Imagens: o servidor aceita até 5 MB (os demais arquivos, até 25 MB). */
export const MAX_MB_IMAGEM = 5;
export const MAX_MB_ARQUIVO = 25;

export function ehNumerico(tipo: PeTipoCampo | string): boolean {
  return NUMERICOS.has(tipo);
}

export function ehLigacao(tipo: PeTipoCampo | string): boolean {
  return tipo === 'ligacao_secao' || tipo === 'ligacao_catalogo';
}

/** Campo que a tela não edita: o calculado (o servidor calcula ao gravar). */
export function ehSomenteLeitura(tipo: PeTipoCampo | string): boolean {
  return tipo === 'calculado';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// ── Números ──────────────────────────────────────────────────────────────────

export interface NumeroLido {
  /** null: vazio. */
  valor: number | null;
  /** O texto não é um número. */
  invalido: boolean;
  /** Casas decimais digitadas. */
  casas: number;
}

/**
 * Lê um número digitado no jeito brasileiro: "1.234,5", "1234,5", "R$ 1.250,00",
 * "12%", "-3". Só pontos no desenho do milhar ("1.500") são milhar; ponto fora
 * dele ("12.5") é o decimal.
 */
export function lerNumero(texto: unknown): NumeroLido {
  if (typeof texto === 'number') {
    if (!Number.isFinite(texto)) return { valor: null, invalido: true, casas: 0 };
    const decimais = String(texto).split('.')[1] ?? '';
    return { valor: texto, invalido: false, casas: decimais.length };
  }
  if (typeof texto !== 'string') return { valor: null, invalido: false, casas: 0 };
  let t = texto.replace(/R\$/gi, '').replace(/%/g, '').replace(/\s+/g, '');
  if (!t) return { valor: null, invalido: false, casas: 0 };
  const negativo = t.startsWith('-');
  if (negativo) t = t.slice(1);
  if (t.startsWith(',') || t.startsWith('.')) t = '0' + t;

  if (t.includes(',')) {
    // Vírgula é o decimal: os pontos, se houver, são de milhar
    if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(t)) return { valor: null, invalido: true, casas: 0 };
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '');
  } else if (!/^\d+(\.\d+)?$/.test(t)) {
    return { valor: null, invalido: true, casas: 0 };
  }
  const numero = Number(t);
  if (!Number.isFinite(numero)) return { valor: null, invalido: true, casas: 0 };
  return { valor: negativo ? -numero : numero, invalido: false, casas: (t.split('.')[1] ?? '').length };
}

/** Número no jeito brasileiro, sem separador de milhar (anos e notas não ganham ponto). */
export function formatarNumero(valor: number, casasMax = 6, casasMin = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casasMin,
    maximumFractionDigits: Math.max(casasMin, casasMax),
    useGrouping: false
  }).format(valor);
}

/** Valor em reais com milhar e centavos, sem o "R$" ("1.250,00"). */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
}

function casasDoCampo(campo: PeCampoRegistro): number {
  const casas = campo.Config?.casas;
  return typeof casas === 'number' && Number.isFinite(casas) && casas >= 0 ? casas : 6;
}

/** O número como fica no campo para editar ("12,5"; moeda "1.250,00"). */
export function numeroParaEdicao(campo: PeCampoRegistro, valor: unknown): string {
  const lido = lerNumero(valor);
  if (lido.valor === null || lido.invalido) return typeof valor === 'string' ? valor : '';
  if (campo.Tipo === 'moeda') return formatarMoeda(lido.valor);
  if (campo.Tipo === 'percentual') return formatarNumero(lido.valor, 2);
  return formatarNumero(lido.valor, casasDoCampo(campo));
}

// ── Datas ────────────────────────────────────────────────────────────────────

/** "aaaa-mm-dd" vira "dd/mm/aaaa" sem passar pelo fuso; instante vira a data local. */
export function textoData(valor: string | null | undefined): string {
  if (!valor) return '-';
  const pura = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (pura) return `${pura[3]}/${pura[2]}/${pura[1]}`;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Instante de auditoria: "24/09/2026 às 14:05". */
export function textoDataHora(valor: string | null | undefined): string {
  if (!valor) return '-';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Quem fez alguma coisa, para a tela: o nome do cadastro (os campos `...PorNome`
 * das respostas, F1), senão o e-mail; vazio sem os dois.
 */
export function nomeDeQuem(nome: string | null | undefined, email: string | null | undefined): string {
  return nome?.trim() || email?.trim() || '';
}

/** Hoje no fuso de quem usa, "aaaa-mm-dd" (limite dos campos de data). */
export function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── Número do processo SEI e endereço de internet (F1, C05 e C33) ────────────

/** O número do processo SEI completo: 00000-00000000/0000-00. */
const FORMATO_SEI = /^\d{5}-\d{8}\/\d{4}-\d{2}$/;

/** Quantos caracteres o número do SEI tem com a máscara. */
export const TAMANHO_SEI = 22;

export function seiValido(texto: string | null | undefined): boolean {
  return FORMATO_SEI.test((texto ?? '').trim());
}

/**
 * A máscara do SEI (00000-00000000/0000-00) sobre os dígitos digitados. O mesmo
 * desenho da Supervisão Contínua (`contratacoes/shared/ctr-rotulos.ts`), copiado
 * para o módulo não depender dela.
 */
export function mascaraSei(valor: string): string {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 19);
  let saida = digitos.slice(0, 5);
  if (digitos.length > 5) saida += '-' + digitos.slice(5, 13);
  if (digitos.length > 13) saida += '/' + digitos.slice(13, 17);
  if (digitos.length > 17) saida += '-' + digitos.slice(17, 19);
  return saida;
}

/**
 * Aplica a máscara do SEI no campo enquanto a pessoa digita e devolve o texto. O
 * cursor volta para depois do mesmo dígito (sem isso, corrigir no meio jogaria o
 * cursor para o fim); o campo só é reescrito quando a máscara muda algo.
 */
export function digitarSei(input: HTMLInputElement): string {
  const bruto = input.value || '';
  const formatado = mascaraSei(bruto);
  if (bruto !== formatado) {
    const cursor = input.selectionStart ?? bruto.length;
    const digitosAntes = bruto.slice(0, cursor).replace(/\D/g, '').length;
    let posicao = formatado.length;
    for (let i = 0, vistos = 0; i < formatado.length && digitosAntes > 0; i++) {
      if (formatado[i] >= '0' && formatado[i] <= '9' && ++vistos === digitosAntes) {
        posicao = i + 1;
        break;
      }
    }
    if (digitosAntes === 0) posicao = 0;
    input.value = formatado;
    input.setSelectionRange(posicao, posicao);
  }
  return formatado;
}

/** Endereço de internet completo (http ou https, com o domínio). */
export function urlValida(texto: string | null | undefined): boolean {
  const t = (texto ?? '').trim();
  if (!/^https?:\/\/[^\s/?#]+\.[^\s/?#]+/i.test(t) || /\s/.test(t)) return false;
  try {
    const url = new URL(t);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname;
  } catch {
    return false;
  }
}

/** Data pura válida ("2026-02-30" não passa). */
export function dataValida(valor: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (ano < 1900 || ano > 2200) return false;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

// ── Texto de um valor ────────────────────────────────────────────────────────

function vazio(valor: unknown): boolean {
  return valor === null || valor === undefined || (typeof valor === 'string' && !valor.trim())
    || (Array.isArray(valor) && valor.length === 0);
}

function rotuloOpcao(campo: PeCampoRegistro, valor: unknown): string {
  const texto = String(valor);
  return campo.Opcoes.find(o => o.Valor === texto)?.Rotulo ?? texto;
}

export function ehArquivoRef(valor: unknown): valor is PeArquivoRef {
  return !!valor && typeof valor === 'object' && typeof (valor as PeArquivoRef).ArquivoId === 'number';
}

/** Um valor de `Dados` como texto, pelo tipo do campo (quando o servidor não mandou o rótulo pronto). */
export function textoBruto(campo: PeCampoRegistro, valor: unknown): string {
  if (vazio(valor)) return '-';
  switch (campo.Tipo) {
    case 'numero':
    case 'calculado': {
      const lido = lerNumero(valor);
      if (lido.valor === null) return String(valor);
      const texto = formatarNumero(lido.valor, campo.Tipo === 'numero' ? casasDoCampo(campo) : 2);
      return campo.Config?.unidade ? `${texto} ${campo.Config.unidade}` : texto;
    }
    case 'moeda': {
      const lido = lerNumero(valor);
      return lido.valor === null ? String(valor) : `R$ ${formatarMoeda(lido.valor)}`;
    }
    case 'percentual': {
      const lido = lerNumero(valor);
      return lido.valor === null ? String(valor) : `${formatarNumero(lido.valor, 2)}%`;
    }
    case 'data': return textoData(String(valor));
    case 'sim_nao': return valor === true ? 'Sim' : valor === false ? 'Não' : String(valor);
    case 'lista': return rotuloOpcao(campo, valor);
    case 'lista_multipla':
      return Array.isArray(valor) ? juntar(valor.map(v => rotuloOpcao(campo, v))) : rotuloOpcao(campo, valor);
    case 'arquivo': return ehArquivoRef(valor) ? valor.Nome : '-';
    case 'texto_rico': return textoPlano(valor) || '-';
    default: return typeof valor === 'string' ? valor : String(valor);
  }
}

/** Os destinos de uma ligação como texto: "OE01 · Ampliar..." (o código, e o resumo quando pedido). */
export function textoVinculo(v: PeVinculo, comResumo = true): string {
  const codigo = v.Codigo?.trim();
  const resumo = v.Resumo?.trim();
  if (codigo && resumo && comResumo) return `${codigo} · ${resumo}`;
  return codigo || resumo || `Registro nº ${v.RegistroId}`;
}

/** O valor de um campo de um registro, pronto para exibir ("-" quando vazio). */
export function textoDoValor(campo: PeCampoRegistro, registro: PeRegistro | null, comResumo = false): string {
  if (!registro) return '-';
  if (ehLigacao(campo.Tipo)) {
    const lista = registro.Vinculos?.[campo.Chave] ?? [];
    return lista.length ? lista.map(v => textoVinculo(v, comResumo)).join(comResumo ? '; ' : ', ') : '-';
  }
  const rotulo = registro.Rotulos?.[campo.Chave];
  if (typeof rotulo === 'string' && rotulo.trim()) return rotulo;
  return textoBruto(campo, registro.Dados?.[campo.Chave]);
}

/** Texto cortado para caber numa célula (o texto inteiro fica no detalhe). */
export function cortar(texto: string, limite = MAX_CELULA): string {
  return texto.length > limite ? `${texto.slice(0, limite - 3).trimEnd()}...` : texto;
}

/** O campo que resume o registro: o principal, senão o primeiro de texto. */
export function campoPrincipal(secao: PeSecaoDoDono): PeCampoRegistro | null {
  return secao.Campos.find(c => c.Principal)
    ?? secao.Campos.find(c => c.Tipo === 'texto_curto' || c.Tipo === 'texto_longo')
    ?? secao.Campos[0] ?? null;
}

/** Resumo de um registro para as listas de ligação ("Ampliar a oferta de..."). */
export function resumoDoRegistro(secao: PeSecaoDoDono, registro: PeRegistro): string {
  const principal = campoPrincipal(secao);
  const texto = principal ? textoDoValor(principal, registro) : '-';
  return cortar(texto === '-' ? '' : texto, 160);
}

/**
 * Colunas da tabela: o campo principal, depois os que têm largura definida no
 * modelo e, se sobrar espaço, os demais campos curtos, na ordem do modelo (até
 * cinco). Texto comprido, texto rico e arquivo ficam no detalhe do registro.
 */
export function colunasDaTabela(secao: PeSecaoDoDono): PeCampoRegistro[] {
  const colunas: PeCampoRegistro[] = [];
  const principal = campoPrincipal(secao);
  if (principal) colunas.push(principal);
  const cabe = (c: PeCampoRegistro) => colunas.length < MAX_COLUNAS && !colunas.includes(c);
  // O valor calculado (a prioridade das necessidades, no 2.9) orienta a leitura da tabela: entra sempre (F1, B18)
  for (const c of secao.Campos) {
    if (cabe(c) && c.Tipo === 'calculado') colunas.push(c);
  }
  for (const c of secao.Campos) {
    if (cabe(c) && c.Largura && c.Tipo !== 'texto_rico' && c.Tipo !== 'arquivo') colunas.push(c);
  }
  for (const c of secao.Campos) {
    if (cabe(c) && !LONGOS.has(c.Tipo)) colunas.push(c);
  }
  // Mantém a ordem do modelo depois do principal
  return [colunas[0], ...colunas.slice(1).sort((a, b) => secao.Campos.indexOf(a) - secao.Campos.indexOf(b))]
    .filter((c): c is PeCampoRegistro => !!c);
}

/** Largura do campo no formulário: estreita (2 de 6 colunas), média (3 de 6) ou larga (a linha inteira). */
export type LarguraNoFormulario = 'estreita' | 'media' | 'larga';

/** Texto curto até este tamanho cabe em meia linha; maior (ou sem limite, que vale 200), na linha inteira. */
const TEXTO_CURTO_MEIA_LINHA = 100;

/**
 * Tipos que ocupam sempre a linha inteira no formulário, qualquer que seja a
 * largura do modelo (F1, C10: várias escolhas e ligações em meia largura deixavam
 * um vão grande ao lado).
 */
const LINHA_INTEIRA_NO_FORMULARIO: ReadonlySet<string> = new Set([
  'texto_longo', 'texto_rico', 'lista_multipla', 'ligacao_secao', 'ligacao_catalogo', 'arquivo'
]);

/**
 * Largura do campo no formulário. Texto longo, texto rico, lista múltipla, ligações
 * e arquivo: sempre a linha inteira. Os demais: a `Largura` do modelo (a mesma das
 * colunas da tabela), senão a do tipo: data, número, valor em reais, percentual, sim
 * ou não e calculado, estreita; lista e texto curto com limite pequeno, média; texto
 * curto com limite grande, a linha inteira.
 */
export function larguraNoFormulario(campo: Pick<PeCampoRegistro, 'Largura' | 'Tipo' | 'Config'>): LarguraNoFormulario {
  if (LINHA_INTEIRA_NO_FORMULARIO.has(campo.Tipo)) return 'larga';
  if (campo.Largura === 'estreita' || campo.Largura === 'media' || campo.Largura === 'larga') return campo.Largura;
  switch (campo.Tipo) {
    case 'data':
    case 'numero':
    case 'moeda':
    case 'percentual':
    case 'sim_nao':
    case 'calculado':
      return 'estreita';
    case 'lista':
      return 'media';
    case 'texto_curto': {
      const max = campo.Config?.max;
      return typeof max === 'number' && max > 0 && max <= TEXTO_CURTO_MEIA_LINHA ? 'media' : 'larga';
    }
    default:
      return 'larga';
  }
}

/** Largura da coluna pela configuração do campo (classes que o projeto já usa). */
export function classeLargura(campo: PeCampoRegistro): string {
  switch (campo.Largura) {
    case 'estreita': return 'w-24';
    case 'media': return 'w-32';
    default: return '';
  }
}

/** O formato do texto curto pela configuração do campo (F1): `sei`, `url` ou null. */
export function formatoDoCampo(campo: Pick<PeCampoRegistro, 'Tipo' | 'Config'>): 'sei' | 'url' | null {
  if (campo.Tipo !== 'texto_curto') return null;
  const formato = (campo.Config?.formato ?? '').trim().toLowerCase();
  return formato === 'sei' || formato === 'url' ? formato : null;
}

/** A data do campo não pode passar de hoje (F1, C05: as datas de decisão). */
export function dataNaoFutura(campo: Pick<PeCampoRegistro, 'Tipo' | 'Config'>): boolean {
  return campo.Tipo === 'data' && campo.Config?.naoFutura === true;
}

// ── Como o campo se responde (dica do campo) ─────────────────────────────────

/** O jeito de responder, em poucas palavras, para a dica do campo. */
export function dicaDoCampo(campo: PeCampoRegistro): string {
  const c = campo.Config;
  const max = typeof c?.max === 'number' ? c.max : null;
  const min = typeof c?.min === 'number' ? c.min : null;
  switch (campo.Tipo) {
    case 'texto_curto':
      if (formatoDoCampo(campo) === 'sei') return 'O número do processo no SEI, como 00000-00000000/2026-00.';
      if (formatoDoCampo(campo) === 'url') return 'O endereço completo, começando por https://.';
      return max ? `Até ${max} caracteres.` : '';
    case 'texto_longo':
      return max ? `Até ${max} caracteres.` : '';
    case 'data':
      return c?.naoFutura ? 'Hoje ou antes: não pode ser uma data futura.' : '';
    case 'numero': {
      const partes: string[] = [];
      if (min !== null && max !== null) partes.push(`Um número de ${formatarNumero(min)} a ${formatarNumero(max)}`);
      else if (min !== null) partes.push(`Um número a partir de ${formatarNumero(min)}`);
      else if (max !== null) partes.push(`Um número até ${formatarNumero(max)}`);
      else partes.push('Um número');
      if (c?.casas === 0) partes.push('sem casas decimais');
      else if (typeof c?.casas === 'number') partes.push(`com até ${c.casas} ${c.casas === 1 ? 'casa decimal' : 'casas decimais'}`);
      const texto = partes.join(', ');
      return c?.unidade ? `${texto} (${c.unidade}).` : `${texto}.`;
    }
    case 'moeda': return 'Valor em reais, com os centavos depois da vírgula. Exemplo: 1.250,00.';
    case 'percentual': return 'Um percentual de 0 a 100. Exemplo: 12,5.';
    case 'lista_multipla': return 'Marque uma ou mais opções.';
    default: return '';
  }
}

// ── Conferência antes de salvar ──────────────────────────────────────────────

/** O valor de um campo está vazio na tela (ligações pela lista de escolhidos). */
export function campoVazio(campo: PeCampoRegistro, valor: unknown, vinculos: PeVinculo[] | undefined): boolean {
  if (ehLigacao(campo.Tipo)) return !(vinculos?.length);
  if (campo.Tipo === 'arquivo') return !ehArquivoRef(valor);
  if (campo.Tipo === 'texto_rico') return docVazio(normalizarDocumento(valor));
  return vazio(valor);
}

function mensagemObrigatorio(campo: PeCampoRegistro): string {
  switch (campo.Tipo) {
    case 'texto_rico': return 'Escreva o texto.';
    case 'lista': return 'Escolha uma opção.';
    case 'lista_multipla': return 'Marque ao menos uma opção.';
    case 'sim_nao': return 'Responda sim ou não.';
    case 'data': return 'Informe a data.';
    case 'arquivo': return 'Envie o arquivo.';
    case 'ligacao_secao':
    case 'ligacao_catalogo':
      return campo.Config?.multipla ? 'Escolha ao menos um item.' : 'Escolha um item.';
    default: return 'Preencha este campo.';
  }
}

/**
 * O problema do valor de um campo, em linguagem simples, ou null. O servidor
 * confere de novo: as mensagens dele chegam no 400 e vão para o mesmo lugar.
 */
export function erroDoCampo(campo: PeCampoRegistro, valor: unknown, vinculos?: PeVinculo[]): string | null {
  if (ehSomenteLeitura(campo.Tipo)) return null;
  if (campoVazio(campo, valor, vinculos)) return campo.Obrigatorio ? mensagemObrigatorio(campo) : null;

  const c = campo.Config;
  switch (campo.Tipo) {
    case 'texto_curto':
    case 'texto_longo': {
      const texto = String(valor).trim();
      if (typeof c?.max === 'number' && texto.length > c.max) return `Escreva até ${c.max} caracteres (agora são ${texto.length}).`;
      const formato = formatoDoCampo(campo);
      if (formato === 'sei' && !seiValido(texto)) return 'Use o número do processo SEI completo, no formato 00000-00000000/0000-00.';
      if (formato === 'url' && !urlValida(texto)) return 'Informe um endereço de internet completo, começando por http:// ou https://.';
      return null;
    }
    case 'numero': {
      const lido = lerNumero(valor);
      const casas = typeof c?.casas === 'number' ? c.casas : null;
      if (lido.invalido || lido.valor === null) {
        return casas === 0 ? 'Use um número inteiro, como 12.' : 'Use só números, como 12 ou 12,5.';
      }
      if (casas !== null && lido.casas > casas) {
        return casas === 0 ? 'Use um número inteiro, sem vírgula.' : `Use no máximo ${casas} ${casas === 1 ? 'casa decimal' : 'casas decimais'}.`;
      }
      const min = typeof c?.min === 'number' ? c.min : null;
      const max = typeof c?.max === 'number' ? c.max : null;
      if ((min !== null && lido.valor < min) || (max !== null && lido.valor > max)) {
        if (min !== null && max !== null) return `Use um número de ${formatarNumero(min)} a ${formatarNumero(max)}.`;
        return min !== null ? `Use um número a partir de ${formatarNumero(min)}.` : `Use um número até ${formatarNumero(max ?? 0)}.`;
      }
      return null;
    }
    case 'moeda': {
      const lido = lerNumero(valor);
      if (lido.invalido || lido.valor === null) return 'Use um valor em reais, como 1.250,00.';
      if (lido.casas > 2) return 'Use no máximo 2 casas depois da vírgula (os centavos).';
      if (lido.valor < 0) return 'O valor não pode ser negativo.';
      return null;
    }
    case 'percentual': {
      const lido = lerNumero(valor);
      if (lido.invalido || lido.valor === null) return 'Use um número de 0 a 100, como 25 ou 12,5.';
      if (lido.valor < 0 || lido.valor > 100) return 'Use um percentual de 0 a 100.';
      if (lido.casas > 2) return 'Use no máximo 2 casas decimais.';
      return null;
    }
    case 'data':
      if (!dataValida(String(valor))) return 'Informe uma data válida (dia, mês e ano).';
      return dataNaoFutura(campo) && String(valor) > hojeIso() ? 'A data não pode ser depois de hoje.' : null;
    case 'texto_rico':
      return JSON.stringify(docParaEnvio(valor)).length > MAX_CARACTERES_DOCUMENTO
        ? 'O texto ficou grande demais para guardar. Tire uma parte dele (ou divida em mais de um registro).'
        : null;
    default:
      return null;
  }
}

// ── Estado da tela e corpo do envio ──────────────────────────────────────────

export interface EstadoRegistro {
  /** Pela chave do campo: texto (os números também, como digitados), bool, lista de valores ou arquivo. */
  valores: Record<string, unknown>;
  /** Escolhidos de cada campo de ligação. */
  vinculos: Record<string, PeVinculo[]>;
}

/** O que a tela mostra ao abrir um registro (ou um registro novo, vazio). */
export function estadoInicial(secao: PeSecaoDoDono, registro: PeRegistro | null): EstadoRegistro {
  const valores: Record<string, unknown> = {};
  const vinculos: Record<string, PeVinculo[]> = {};
  for (const campo of secao.Campos) {
    const bruto = registro?.Dados?.[campo.Chave];
    if (ehLigacao(campo.Tipo)) {
      vinculos[campo.Chave] = [...(registro?.Vinculos?.[campo.Chave] ?? [])];
    } else if (ehNumerico(campo.Tipo)) {
      valores[campo.Chave] = numeroParaEdicao(campo, bruto);
    } else if (campo.Tipo === 'sim_nao') {
      valores[campo.Chave] = typeof bruto === 'boolean' ? bruto : null;
    } else if (campo.Tipo === 'lista_multipla') {
      valores[campo.Chave] = Array.isArray(bruto) ? bruto.map(String) : (vazio(bruto) ? [] : [String(bruto)]);
    } else if (campo.Tipo === 'arquivo') {
      valores[campo.Chave] = ehArquivoRef(bruto) ? { ArquivoId: bruto.ArquivoId, Nome: bruto.Nome } : null;
    } else if (campo.Tipo === 'texto_rico') {
      valores[campo.Chave] = normalizarDocumento(bruto);
    } else if (ehSomenteLeitura(campo.Tipo)) {
      valores[campo.Chave] = bruto ?? null;
    } else {
      valores[campo.Chave] = vazio(bruto) ? '' : String(bruto);
    }
  }
  return { valores, vinculos };
}

function valorParaEnvio(campo: PeCampoRegistro, valor: unknown): unknown {
  if (campoVazio(campo, valor, undefined)) return null;
  switch (campo.Tipo) {
    case 'numero':
    case 'percentual':
      return lerNumero(valor).valor;
    case 'moeda': {
      const lido = lerNumero(valor).valor;
      return lido === null ? null : Math.round(lido * 100) / 100;
    }
    case 'sim_nao':
      return valor === true;
    case 'lista_multipla':
      return Array.isArray(valor) ? [...valor] : [String(valor)];
    case 'arquivo':
      return ehArquivoRef(valor) ? { ArquivoId: valor.ArquivoId, Nome: valor.Nome } : null;
    default:
      return typeof valor === 'string' ? valor.trim() : valor;
  }
}

/**
 * Corpo do POST e do PUT: os campos visíveis da seção, com vazio como null.
 * Calculado não vai (o servidor calcula); ligações vão em `Vinculos` (lista vazia
 * tira as ligações do campo); texto rico vai como o JSON do TipTap, só com a
 * lista fechada de nós e marcas (vazio vira null).
 */
export function montarForm(secao: PeSecaoDoDono, estado: EstadoRegistro, _original: PeRegistro | null): PeRegistroForm {
  const Dados: Record<string, unknown> = {};
  const Vinculos: Record<string, number[]> = {};
  for (const campo of secao.Campos) {
    const chave = campo.Chave;
    if (ehLigacao(campo.Tipo)) {
      Vinculos[chave] = (estado.vinculos[chave] ?? []).map(v => v.RegistroId);
    } else if (campo.Tipo === 'texto_rico') {
      Dados[chave] = docParaEnvio(estado.valores[chave]);
    } else if (campo.Tipo !== 'calculado') {
      Dados[chave] = valorParaEnvio(campo, estado.valores[chave]);
    }
  }
  return { Dados, Vinculos };
}

/** Mensagens de campo do 400 de validação (`Campos`), só das chaves que a seção tem. */
export function errosDoServidor(secao: PeSecaoDoDono, erro: unknown): Record<string, string> {
  const corpo = (erro as { error?: { Campos?: unknown } } | null)?.error;
  const campos = corpo?.Campos;
  const erros: Record<string, string> = {};
  if (!campos || typeof campos !== 'object') return erros;
  for (const [chave, mensagem] of Object.entries(campos as Record<string, unknown>)) {
    const campo = secao.Campos.find(c => c.Chave.toLowerCase() === chave.toLowerCase());
    if (campo && typeof mensagem === 'string' && mensagem.trim()) erros[campo.Chave] = mensagem.trim();
  }
  return erros;
}

/** Tipos de arquivo aceitos por um campo (config.tipos; o padrão é PDF). */
export function tiposDoArquivo(campo: PeCampoRegistro): string[] {
  const tipos = (campo.Config?.tipos ?? []).map(t => t.toLowerCase()).filter(Boolean);
  return tipos.length ? tipos : ['pdf'];
}

/** `accept` do seletor de arquivo (jpg aceita também .jpeg). */
export function aceitaDoArquivo(campo: PeCampoRegistro): string {
  return tiposDoArquivo(campo).flatMap(t => (t === 'jpg' ? ['.jpg', '.jpeg'] : [`.${t}`])).join(',');
}

/** Tamanho em texto curto ("850 KB", "2,4 MB"). */
export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${formatarNumero(bytes / (1024 * 1024), 1)} MB`;
}

/** Confere o arquivo antes de enviar: tipo e tamanho, em linguagem simples. */
export function problemaDoArquivo(campo: PeCampoRegistro, arquivo: File): string | null {
  const tipos = tiposDoArquivo(campo);
  const extensao = (arquivo.name.split('.').pop() ?? '').toLowerCase();
  const tipo = extensao === 'jpeg' ? 'jpg' : extensao;
  if (!tipos.includes(tipo)) return `Este tipo de arquivo não serve aqui. Envie ${juntar(tipos.map(t => t.toUpperCase()))}.`;
  if (arquivo.size === 0) return 'O arquivo está vazio.';
  const imagem = tipo === 'png' || tipo === 'jpg';
  const configurado = typeof campo.Config?.maxMb === 'number' && campo.Config.maxMb > 0 ? campo.Config.maxMb : MAX_MB_ARQUIVO;
  const limite = Math.min(configurado, imagem ? MAX_MB_IMAGEM : MAX_MB_ARQUIVO);
  if (arquivo.size > limite * 1024 * 1024) {
    return `O arquivo tem ${tamanhoLegivel(arquivo.size)} e o limite é ${limite} MB. Envie um arquivo menor.`;
  }
  return null;
}

/** "PDF, até 25 MB" (a dica do campo de arquivo). */
export function dicaDoArquivo(campo: PeCampoRegistro): string {
  const tipos = tiposDoArquivo(campo);
  const configurado = typeof campo.Config?.maxMb === 'number' && campo.Config.maxMb > 0 ? campo.Config.maxMb : MAX_MB_ARQUIVO;
  const limite = Math.min(configurado, MAX_MB_ARQUIVO);
  const imagens = tipos.some(t => t === 'png' || t === 'jpg') && limite > MAX_MB_IMAGEM ? `; imagens até ${MAX_MB_IMAGEM} MB` : '';
  return `${juntar(tipos.map(t => t.toUpperCase()))}, até ${limite} MB${imagens}.`;
}
