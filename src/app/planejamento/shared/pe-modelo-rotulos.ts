/**
 * Rótulos e descrições do modelo configurável da Governança Estratégica, em
 * linguagem simples: situações, tipos de passo, seção e campo, a descrição de
 * como cada campo se responde (usada na prévia do passo e no editor) e o texto
 * das mudanças do histórico. Só funções puras e constantes.
 */
import {
  PeConfigCampo,
  PeEscopoSecao,
  PeNivel,
  PeSituacao,
  PeTipoCampo,
  PeTipoPasso,
  PeTipoSecao
} from '../../../api/planejamento/interface';

export interface OpcaoRotulo<T extends string = string> {
  valor: T;
  rotulo: string;
}

export const SITUACOES: OpcaoRotulo<PeSituacao>[] = [
  { valor: 'obrigatorio', rotulo: 'Obrigatório' },
  { valor: 'opcional', rotulo: 'Opcional' },
  { valor: 'desligado', rotulo: 'Desligado' }
];

export function rotuloSituacao(situacao: string | null | undefined): string {
  return SITUACOES.find(s => s.valor === situacao)?.rotulo ?? (situacao || '-');
}

/** Cores do texto da situação (matriz de níveis e resumos). */
export function corSituacao(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'obrigatorio': return 'text-blue-800';
    case 'opcional': return 'text-gray-700';
    default: return 'text-gray-500';
  }
}

export const TIPOS_PASSO: OpcaoRotulo<PeTipoPasso>[] = [
  { valor: 'dados', rotulo: 'Dados: formulários e tabelas' },
  { valor: 'documento', rotulo: 'Documento do PDTIC' },
  { valor: 'fluxo', rotulo: 'Fluxo de trabalho' },
  { valor: 'aprovacao', rotulo: 'Registro de aprovação' },
  { valor: 'envio', rotulo: 'Envio à SGDI e ao CGTIC' },
  { valor: 'deliberacao', rotulo: 'Deliberação do CGTIC' },
  { valor: 'publicacao', rotulo: 'Publicação' },
  { valor: 'conferencia_temas', rotulo: 'Conferência das ações por tema' },
  { valor: 'monitoramento', rotulo: 'Monitoramento' }
];

export function rotuloTipoPasso(tipo: string | null | undefined): string {
  return TIPOS_PASSO.find(t => t.valor === tipo)?.rotulo ?? (tipo || '-');
}

export const TIPOS_SECAO: OpcaoRotulo<PeTipoSecao>[] = [
  { valor: 'formulario', rotulo: 'Formulário: um registro só' },
  { valor: 'tabela', rotulo: 'Tabela: vários registros, cada um com código' }
];

export function rotuloTipoSecao(tipo: string | null | undefined): string {
  return tipo === 'tabela' ? 'Tabela' : tipo === 'formulario' ? 'Formulário' : (tipo || '-');
}

export const ESCOPOS_FORA_DO_PDTIC: OpcaoRotulo<PeEscopoSecao>[] = [
  { valor: 'petic', rotulo: 'PETIC-DF' },
  { valor: 'df', rotulo: 'Referenciais do DF (princípios e diretrizes do ciclo)' }
];

export function rotuloEscopo(escopo: string | null | undefined): string {
  if (escopo === 'pdtic') return 'PDTIC do órgão';
  return ESCOPOS_FORA_DO_PDTIC.find(e => e.valor === escopo)?.rotulo ?? (escopo || '-');
}

export const TIPOS_CAMPO: OpcaoRotulo<PeTipoCampo>[] = [
  { valor: 'texto_curto', rotulo: 'Texto curto' },
  { valor: 'texto_longo', rotulo: 'Texto longo' },
  { valor: 'texto_rico', rotulo: 'Texto com formatação (títulos, listas, tabelas e imagens)' },
  { valor: 'numero', rotulo: 'Número' },
  { valor: 'moeda', rotulo: 'Valor em reais' },
  { valor: 'percentual', rotulo: 'Percentual' },
  { valor: 'data', rotulo: 'Data' },
  { valor: 'sim_nao', rotulo: 'Sim ou não' },
  { valor: 'lista', rotulo: 'Lista: escolhe uma opção' },
  { valor: 'lista_multipla', rotulo: 'Lista: escolhe uma ou mais opções' },
  { valor: 'ligacao_secao', rotulo: 'Ligação com registros de outra seção' },
  { valor: 'ligacao_catalogo', rotulo: 'Ligação com um catálogo' },
  { valor: 'arquivo', rotulo: 'Arquivo anexado' },
  { valor: 'calculado', rotulo: 'Calculado pelo sistema' }
];

export function rotuloTipoCampo(tipo: string | null | undefined): string {
  return TIPOS_CAMPO.find(t => t.valor === tipo)?.rotulo ?? (tipo || '-');
}

/** Tipos com opções em `pe_opcao`. */
export function tipoComOpcoes(tipo: string | null | undefined): boolean {
  return tipo === 'lista' || tipo === 'lista_multipla';
}

export const CALCULOS: OpcaoRotulo[] = [
  { valor: 'produto', rotulo: 'Produto: multiplica os valores' },
  { valor: 'soma_ponderada', rotulo: 'Soma ponderada: cada valor vezes o peso, tudo somado' },
  { valor: 'nivel_risco', rotulo: 'Nível de risco: matriz de probabilidade e impacto' },
  { valor: 'subtracao', rotulo: 'Subtração: o primeiro valor menos o segundo' }
];

export const CATALOGOS: OpcaoRotulo[] = [
  { valor: 'petic_objetivo', rotulo: 'Objetivos estratégicos do PETIC-DF' },
  { valor: 'petic_eixo', rotulo: 'Eixos do PETIC-DF' },
  { valor: 'principio', rotulo: 'Princípios e diretrizes' },
  { valor: 'pgia_sistema', rotulo: 'Sistemas de IA do órgão no PGIA' }
];

export function rotuloCatalogo(catalogo: string | null | undefined): string {
  return CATALOGOS.find(c => c.valor === catalogo)?.rotulo ?? (catalogo || 'catálogo não definido');
}

export const TIPOS_ARQUIVO: OpcaoRotulo[] = [
  { valor: 'pdf', rotulo: 'PDF' },
  { valor: 'png', rotulo: 'PNG' },
  { valor: 'jpg', rotulo: 'JPG' }
];

/** Largura da coluna do campo nas tabelas (nulo: a tabela decide). */
export const LARGURAS: OpcaoRotulo[] = [
  { valor: 'estreita', rotulo: 'Estreita' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'larga', rotulo: 'Larga' }
];

/** Cor da opção de lista, usada no selo da opção. */
export const CORES_OPCAO: OpcaoRotulo[] = [
  { valor: 'cinza', rotulo: 'Cinza' },
  { valor: 'azul', rotulo: 'Azul' },
  { valor: 'verde', rotulo: 'Verde' },
  { valor: 'amarelo', rotulo: 'Amarelo' },
  { valor: 'laranja', rotulo: 'Laranja' },
  { valor: 'vermelho', rotulo: 'Vermelho' },
  { valor: 'roxo', rotulo: 'Roxo' }
];

/** Selo da opção pela cor (classes que o projeto já usa). */
export function classeCorOpcao(cor: string | null | undefined): string {
  switch (cor) {
    case 'azul': return 'bg-blue-100 text-blue-800';
    case 'verde': return 'bg-green-100 text-green-800';
    case 'amarelo': return 'bg-yellow-100 text-yellow-800';
    case 'laranja': return 'bg-orange-100 text-orange-800';
    case 'vermelho': return 'bg-red-100 text-red-800';
    case 'roxo': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

/** "A", "A e B", "A, B e C". */
export function juntar(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? '';
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/**
 * Citação do conteúdo mínimo de um item travado, no formato das dicas: "art. 12,
 * § 2º, II"; com vários incisos ("V,VI,IX", como o servidor guarda), "art. 12,
 * § 2º, V, VI e IX".
 */
export function citacaoTravado(inciso: string | null | undefined): string {
  const incisos = (inciso ?? '').split(',').map(i => i.trim()).filter(Boolean);
  return incisos.length ? `art. 12, § 2º, ${juntar(incisos)}` : 'art. 12, § 2º';
}

/** Por que o campo tema das ações (travado por si) não desliga, com a citação que vira dica. */
export const EXPLICACAO_CAMPO_TRAVADO =
  'Travado: é por ele que as ações mostram os conteúdos mínimos de segurança da informação, de transformação digital e de '
  + 'governança de dados (art. 12, § 2º, V, VI e IX). Não desliga em nenhum nível.';

/** Por que uma opção travada (um dos três temas do decreto) não sai da lista. */
export const EXPLICACAO_OPCAO_TRAVADA =
  'Tema do decreto (art. 12, § 2º, V, VI e IX): não pode ser desativado nem apagado. Dá para mudar o rótulo e a cor.';

// ── Como o campo se responde ─────────────────────────────────────────────────

/** O que a descrição precisa do campo (serve ao campo do modelo e ao da trilha). */
export interface CampoDescritivel {
  Tipo: PeTipoCampo | string;
  Config: PeConfigCampo | null;
  Opcoes: { Rotulo: string; Ativa?: boolean }[];
}

/** Nomes que a descrição procura em outras partes do modelo (seção ligada, campos do cálculo). */
export interface NomesDoModelo {
  secao(chave: string): string | null;
  campo(chave: string): string | null;
}

const SEM_NOMES: NomesDoModelo = { secao: () => null, campo: () => null };

function numeroOuNulo(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/** Faixa de um número: "de 1 a 5", "a partir de 0", "até 100" ou vazio. */
export function faixaNumero(config: PeConfigCampo | null): string {
  const min = numeroOuNulo(config?.min);
  const max = numeroOuNulo(config?.max);
  if (min !== null && max !== null) return `de ${min} a ${max}`;
  if (min !== null) return `a partir de ${min}`;
  if (max !== null) return `até ${max}`;
  return '';
}

/** O cálculo em palavras: "Gravidade × Urgência × Tendência". */
export function descricaoCalculo(config: PeConfigCampo | null, nomes: NomesDoModelo = SEM_NOMES): string {
  const chaves = config?.campos ?? [];
  const nome = (chave: string) => nomes.campo(chave) ?? chave;
  const nomesCampos = chaves.map(nome);
  switch (config?.calculo) {
    case 'produto':
      return nomesCampos.length ? nomesCampos.join(' × ') : 'produto (campos ainda não escolhidos)';
    case 'soma_ponderada': {
      if (!chaves.length) return 'soma ponderada (campos ainda não escolhidos)';
      const pesos = config?.pesos ?? {};
      return 'soma ponderada: ' + chaves.map(c => `${nome(c)} × ${pesos[c] ?? 1}`).join(' + ');
    }
    case 'nivel_risco':
      return nomesCampos.length >= 2
        ? `nível de risco pela matriz de ${nomesCampos[0]} e ${nomesCampos[1]}`
        : 'nível de risco pela matriz de probabilidade e impacto';
    case 'subtracao':
      return nomesCampos.length >= 2 ? `${nomesCampos[0]} menos ${nomesCampos[1]}` : 'subtração (campos ainda não escolhidos)';
    default:
      return 'cálculo não definido';
  }
}

/** Como o campo se responde, em linguagem simples ("Uma opção da lista: Sim, Não"). */
export function descricaoCampo(campo: CampoDescritivel, nomes: NomesDoModelo = SEM_NOMES): string {
  const config = campo.Config;
  const opcoes = campo.Opcoes.filter(o => o.Ativa !== false).map(o => o.Rotulo);
  const listaOpcoes = opcoes.length ? `: ${juntar(opcoes)}` : ' (ainda sem opções)';
  const max = numeroOuNulo(config?.max);
  switch (campo.Tipo) {
    case 'texto_curto': return max ? `Texto curto, até ${max} caracteres` : 'Texto curto';
    case 'texto_longo': return max ? `Texto longo, até ${max} caracteres` : 'Texto longo';
    case 'texto_rico': return 'Texto com formatação: títulos, listas, tabelas e imagens';
    case 'numero': {
      const partes = ['Número'];
      const faixa = faixaNumero(config);
      if (faixa) partes.push(faixa);
      const casas = numeroOuNulo(config?.casas);
      if (casas) partes.push(casas === 1 ? 'com 1 casa decimal' : `com ${casas} casas decimais`);
      const texto = partes.join(', ');
      return config?.unidade ? `${texto} (${config.unidade})` : texto;
    }
    case 'moeda': return 'Valor em reais';
    case 'percentual': return 'Percentual, de 0 a 100';
    case 'data': return 'Data';
    case 'sim_nao': return 'Sim ou não';
    case 'lista': return `Uma opção da lista${listaOpcoes}`;
    case 'lista_multipla': return `Uma ou mais opções da lista${listaOpcoes}`;
    case 'ligacao_secao': {
      const chave = config?.secao ?? '';
      const secao = chave ? (nomes.secao(chave) ?? chave) : 'seção não definida';
      return config?.multipla ? `Ligação com um ou mais registros de "${secao}"` : `Ligação com um registro de "${secao}"`;
    }
    case 'ligacao_catalogo':
      return config?.multipla
        ? `Um ou mais itens do catálogo: ${rotuloCatalogo(config?.catalogo)}`
        : `Um item do catálogo: ${rotuloCatalogo(config?.catalogo)}`;
    case 'arquivo': {
      const tipos = (config?.tipos ?? []).map(t => t.toUpperCase());
      const limite = numeroOuNulo(config?.maxMb);
      const detalhes = [tipos.length ? juntar(tipos) : '', limite ? `até ${limite} MB` : ''].filter(Boolean).join(', ');
      return detalhes ? `Arquivo anexado (${detalhes})` : 'Arquivo anexado';
    }
    case 'calculado': return `Calculado pelo sistema: ${descricaoCalculo(config, nomes)}`;
    default: return rotuloTipoCampo(campo.Tipo);
  }
}

/** Configuração inicial de um campo novo de cada tipo. */
export function configPadrao(tipo: PeTipoCampo): PeConfigCampo {
  switch (tipo) {
    case 'texto_curto': return { max: 200 };
    case 'texto_longo': return { max: 4000 };
    case 'numero': return { min: null, max: null, casas: 0, unidade: null };
    case 'ligacao_secao': return { secao: null, multipla: false };
    case 'ligacao_catalogo': return { catalogo: 'petic_objetivo', multipla: false };
    case 'arquivo': return { tipos: ['pdf'], maxMb: 25 };
    case 'calculado': return { calculo: 'produto', campos: [], pesos: {} };
    default: return {};
  }
}

/**
 * A configuração que vai ao servidor: as chaves que a tela edita, conforme o
 * tipo, arrumadas (número de verdade, texto aparado, vazio fora). Chave que a
 * tela não conhece (posta pelo carregador do modelo, por exemplo) segue como
 * veio: salvar o rótulo de um campo não pode apagar a configuração dele.
 */
export function configParaEnvio(tipo: PeTipoCampo, config: PeConfigCampo | null): PeConfigCampo {
  const c: PeConfigCampo = { ...(config ?? {}) };
  const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const numeroOuFora = (chave: 'max' | 'min' | 'casas' | 'maxMb') => {
    const v = numero(c[chave]);
    if (v === null) delete c[chave];
    else c[chave] = v;
  };
  const textoOuFora = (chave: 'unidade' | 'secao' | 'catalogo' | 'calculo') => {
    const v = texto(c[chave]);
    if (v === null) delete c[chave];
    else c[chave] = v;
  };
  switch (tipo) {
    case 'texto_curto':
    case 'texto_longo':
      numeroOuFora('max');
      break;
    case 'numero':
      numeroOuFora('min');
      numeroOuFora('max');
      numeroOuFora('casas');
      textoOuFora('unidade');
      break;
    case 'ligacao_secao':
    case 'ligacao_catalogo':
      textoOuFora(tipo === 'ligacao_secao' ? 'secao' : 'catalogo');
      if (c.multipla !== undefined && c.multipla !== null) c.multipla = !!c.multipla;
      break;
    case 'arquivo':
      c.tipos = (c.tipos ?? []).filter(t => TIPOS_ARQUIVO.some(a => a.valor === t));
      numeroOuFora('maxMb');
      break;
    case 'calculado': {
      textoOuFora('calculo');
      c.campos = [...(c.campos ?? [])];
      if (c.calculo === 'soma_ponderada') {
        const pesos: Record<string, number> = {};
        for (const chave of c.campos) pesos[chave] = numero(c.pesos?.[chave]) ?? 1;
        c.pesos = pesos;
      }
      break;
    }
    default:
      break;
  }
  return c;
}

// ── Histórico ────────────────────────────────────────────────────────────────

const ENTIDADES: Record<string, string> = {
  nivel: 'Nível',
  etapa: 'Etapa',
  passo: 'Passo',
  secao: 'Seção',
  campo: 'Campo',
  opcao: 'Opção de lista',
  orgao_config: 'Nível do órgão',
  orgao_nivel: 'Nível do órgão',
  orgao_ajuste: 'Ajuste do órgão',
  configuracao: 'Configuração'
};

/** "Passo", "Seção"... (aceita "PePasso", "pe_passo" e "passo"). */
export function rotuloEntidade(entidade: string | null | undefined): string {
  const chave = normalizarEntidade(entidade);
  return ENTIDADES[chave] ?? (entidade || '-');
}

/** "PePasso", "pe_passo" ou "Passo" viram "passo"; "PeOrgaoAjuste", "orgao_ajuste". */
export function normalizarEntidade(entidade: string | null | undefined): string {
  if (!entidade) return '';
  return entidade
    .replace(/^Pe(?=[A-Z])/, '')
    .replace(/^pe_/, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

const ACOES: [RegExp, string][] = [
  [/^(criar|criou|criado|criacao|inclusao|incluir|insert)/i, 'Criou'],
  [/^(excluir|excluiu|excluido|exclusao|apagar|apagou|delete|remover)/i, 'Apagou'],
  [/(ordem|reordenar|ordenar)/i, 'Mudou a ordem'],
  [/(nivel|niveis|situacao)/i, 'Mudou a situação'],
  [/^(desativar|desativou)/i, 'Desativou'],
  [/^(reativar|ativar|ativou)/i, 'Ativou'],
  [/^(alterar|alterou|alterado|alteracao|editar|update|atualizar)/i, 'Alterou']
];

export function rotuloAcao(acao: string | null | undefined): string {
  if (!acao) return 'Alterou';
  const achada = ACOES.find(([regex]) => regex.test(acao));
  return achada ? achada[1] : acao.charAt(0).toUpperCase() + acao.slice(1);
}

const CAMPOS_HISTORICO: Record<string, string> = {
  titulo: 'Título',
  oquefazer: 'O que fazer',
  baselegal: 'Base legal',
  referenciaguia: 'Referência do guia',
  aceitanaoseaplica: 'Aceita "não se aplica"',
  niveis: 'Situação',
  situacaogeral: 'Situação',
  situacao: 'Situação',
  rotulo: 'Rótulo',
  ajuda: 'Ajuda',
  tipo: 'Tipo',
  config: 'Configuração',
  ordem: 'Posição',
  nodocumento: 'Aparece no documento',
  naplanilha: 'Aparece na planilha',
  largura: 'Largura na tabela',
  ativo: 'Ativo',
  ativa: 'Ativa',
  nome: 'Nome',
  descricao: 'Descrição',
  cor: 'Cor',
  valor: 'Valor',
  excluido: 'Apagado',
  excluidoem: 'Apagado em',
  prefixocodigo: 'Prefixo do código',
  principal: 'Campo principal',
  chave: 'Chave',
  codigo: 'Código',
  nivelid: 'Nível',
  justificativa: 'Justificativa',
  travado: 'Travado',
  travada: 'Travada',
  alvotipo: 'Tipo do item',
  alvoid: 'Item'
};

/** Chaves que não interessam a quem lê o histórico (auditoria e filhos). */
const IGNORADAS = new Set(['id', 'secoes', 'campos', 'opcoes', 'passos', 'criadoem', 'criadopor', 'alteradoem', 'alteradopor', 'etapaid', 'passoid', 'secaoid', 'campoid', 'orgaoid', 'sistema']);

export interface MudancaHistorico {
  campo: string;
  antes: string;
  depois: string;
}

function lerJson(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  const texto = valor.trim();
  if (!texto.startsWith('{') && !texto.startsWith('[')) return valor;
  try {
    return JSON.parse(texto);
  } catch {
    return valor;
  }
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor as Record<string, unknown> : null;
}

function textoValor(valor: unknown, chave: string): string {
  if (valor === null || valor === undefined || valor === '') return '-';
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  if (chave === 'situacao' || chave === 'situacaogeral') return rotuloSituacao(String(valor)).toLowerCase();
  if (chave === 'tipo' && typeof valor === 'string') {
    const tipo = TIPOS_CAMPO.find(t => t.valor === valor) ?? TIPOS_SECAO.find(t => t.valor === valor) ?? TIPOS_PASSO.find(t => t.valor === valor);
    if (tipo) return tipo.rotulo;
  }
  if (Array.isArray(valor)) return valor.map(v => textoValor(v, '')).join(', ') || '-';
  const obj = objeto(valor);
  if (obj) {
    const partes = Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${textoValor(v, '')}`);
    return partes.length ? partes.join('; ') : '-';
  }
  const texto = String(valor);
  return texto.length > 200 ? `${texto.slice(0, 197)}...` : texto;
}

/**
 * O que mudou entre o retrato de antes e o de depois, campo a campo. A situação
 * por nível sai nível a nível ("Situação no nível Básico"). Na criação e na
 * exclusão (um dos lados nulo) volta vazio: a ação já diz tudo.
 */
export function mudancasHistorico(antesBruto: unknown, depoisBruto: unknown, niveis: PeNivel[]): MudancaHistorico[] {
  const antes = objeto(lerJson(antesBruto));
  const depois = objeto(lerJson(depoisBruto));
  if (!antes || !depois) return [];

  const nomeNivel = (id: string) => niveis.find(n => String(n.Id) === id)?.Nome ?? `nível ${id}`;
  const mudancas: MudancaHistorico[] = [];
  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  for (const chaveOriginal of chaves) {
    const chave = chaveOriginal.toLowerCase();
    if (IGNORADAS.has(chave)) continue;
    const a = lerJson(antes[chaveOriginal]);
    const d = lerJson(depois[chaveOriginal]);
    if (JSON.stringify(a ?? null) === JSON.stringify(d ?? null)) continue;

    if (chave === 'niveis' && (objeto(a) || objeto(d))) {
      const porNivelAntes = objeto(a) ?? {};
      const porNivelDepois = objeto(d) ?? {};
      const ids = new Set([...Object.keys(porNivelAntes), ...Object.keys(porNivelDepois)]);
      for (const id of ids) {
        const sa = porNivelAntes[id] ?? 'desligado';
        const sd = porNivelDepois[id] ?? 'desligado';
        if (sa === sd) continue;
        mudancas.push({
          campo: `Situação no nível ${nomeNivel(id)}`,
          antes: rotuloSituacao(String(sa)).toLowerCase(),
          depois: rotuloSituacao(String(sd)).toLowerCase()
        });
      }
      continue;
    }
    mudancas.push({
      campo: CAMPOS_HISTORICO[chave] ?? chaveOriginal,
      antes: textoValor(a, chave),
      depois: textoValor(d, chave)
    });
  }
  return mudancas;
}

/** Nome do item no retrato (título, rótulo ou nome), para o histórico geral. */
export function nomeNoRetrato(antesBruto: unknown, depoisBruto: unknown): string | null {
  for (const lado of [lerJson(depoisBruto), lerJson(antesBruto)]) {
    const obj = objeto(lado);
    if (!obj) continue;
    for (const [k, v] of Object.entries(obj)) {
      if (['titulo', 'rotulo', 'nome'].includes(k.toLowerCase()) && typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return null;
}

// ── Etapas da trilha do órgão ─────────────────────────────────────────────────

/**
 * Rótulo curto e ícone da etapa na barra da trilha, pela chave (as sete do guia).
 * Etapa desconhecida usa o próprio título.
 */
export function aparenciaEtapa(chave: string, titulo: string): { rotulo: string; icone: string } {
  const c = chave.toLowerCase();
  if (c.includes('prepar')) return { rotulo: 'Preparação', icone: 'flag' };
  if (c.includes('diagn')) return { rotulo: 'Diagnóstico', icone: 'search' };
  if (c.includes('acompanh')) return { rotulo: 'Plano de acompanhamento', icone: 'assignment_turned_in' };
  if (c.includes('monitor')) return { rotulo: 'Monitoramento', icone: 'autorenew' };
  if (c.includes('fech') || c.includes('encerr') || c.includes('final')) return { rotulo: 'Fechamento', icone: 'task_alt' };
  if (c.includes('avalia')) return { rotulo: 'Avaliação intermediária', icone: 'rule' };
  if (c.includes('planej')) return { rotulo: 'Planejamento', icone: 'event_note' };
  return { rotulo: titulo, icone: 'label' };
}
