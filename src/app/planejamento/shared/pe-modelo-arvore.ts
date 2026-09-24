/**
 * Funções puras sobre o catálogo do modelo (GET api/planejamento/modelo): ordem,
 * situação de um item num nível, nomes para as descrições e o que um órgão de
 * um nível vê de fato (campo só aparece com a seção, seção só com o passo, e o
 * que é travado nunca desliga).
 */
import {
  PeAjusteOrgao,
  PeAlvoAjuste,
  PeCampoModelo,
  PeModelo,
  PePassoModelo,
  PeSecaoModelo,
  PeSituacao
} from '../../../api/planejamento/interface';
import { NomesDoModelo } from './pe-modelo-rotulos';

/** Item com situação por nível (passo, seção ou campo). */
export type ItemComSituacao = PePassoModelo | PeSecaoModelo | PeCampoModelo;

const porOrdem = <T extends { Ordem: number; Id: number }>(a: T, b: T) => a.Ordem - b.Ordem || a.Id - b.Id;

/** Cópia do modelo com tudo na ordem (níveis, etapas, passos, seções, campos e opções). */
export function modeloOrdenado(modelo: PeModelo): PeModelo {
  const secao = (s: PeSecaoModelo): PeSecaoModelo => ({
    ...s,
    Campos: [...(s.Campos ?? [])].sort(porOrdem).map(c => ({ ...c, Opcoes: [...(c.Opcoes ?? [])].sort(porOrdem) }))
  });
  return {
    Niveis: [...(modelo.Niveis ?? [])].sort(porOrdem),
    Etapas: [...(modelo.Etapas ?? [])].sort(porOrdem).map(e => ({
      ...e,
      Passos: [...(e.Passos ?? [])].sort(porOrdem).map(p => ({ ...p, Secoes: [...(p.Secoes ?? [])].sort(porOrdem).map(secao) }))
    })),
    SecoesForaDoPdtic: [...(modelo.SecoesForaDoPdtic ?? [])].sort(porOrdem).map(secao)
  };
}

/** Situação gravada do item no nível (sem registro, desligado). */
export function situacaoNoNivel(item: { Niveis: Record<string, PeSituacao> | null }, nivelId: number): PeSituacao {
  return item.Niveis?.[String(nivelId)] ?? 'desligado';
}

/** Todas as seções do modelo, do PDTIC e de fora dele. */
export function todasAsSecoes(modelo: PeModelo): PeSecaoModelo[] {
  return [
    ...modelo.Etapas.flatMap(e => e.Passos.flatMap(p => p.Secoes)),
    ...modelo.SecoesForaDoPdtic
  ];
}

/** Nomes para as descrições dos campos (seção ligada pela chave; campos do cálculo, primeiro na própria seção). */
export function nomesDoModelo(modelo: PeModelo, secaoAtual?: PeSecaoModelo | null): NomesDoModelo {
  const secoes = todasAsSecoes(modelo);
  return {
    secao: chave => secoes.find(s => s.Chave === chave)?.Titulo ?? null,
    campo: chave => secaoAtual?.Campos.find(c => c.Chave === chave)?.Rotulo
      ?? secoes.flatMap(s => s.Campos).find(c => c.Chave === chave)?.Rotulo ?? null
  };
}

/** O campo principal de uma seção travada não desliga (é a descrição do conteúdo mínimo). */
export function campoNaoDesliga(campo: PeCampoModelo, secao: PeSecaoModelo): boolean {
  return campo.Principal && secao.Travada;
}

/** Código estável a partir do nome ("Muito avançado" → "muito_avancado"). */
export function codigoDoNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'nivel';
}

// ── O que um órgão vê ────────────────────────────────────────────────────────

/** Situação final de um item para o órgão, ou `oculto` quando o pai não aparece. */
export type SituacaoEfetiva = PeSituacao | 'oculto';

/** Ajustes do órgão por alvo (`passo:10`), para a conta da situação efetiva. */
export function mapaDeAjustes(ajustes: PeAjusteOrgao[]): Map<string, PeSituacao> {
  const mapa = new Map<string, PeSituacao>();
  for (const a of ajustes) {
    if (a.Situacao) mapa.set(chaveAjuste(a.AlvoTipo, a.AlvoId), a.Situacao);
  }
  return mapa;
}

export function chaveAjuste(tipo: PeAlvoAjuste, id: number): string {
  return `${tipo}:${id}`;
}

/**
 * Situação de um item num nível, com o ajuste do órgão por cima; o que é
 * travado nunca desliga (fica obrigatório).
 */
export function situacaoComAjuste(
  item: { Niveis: Record<string, PeSituacao> | null; Id: number },
  tipo: PeAlvoAjuste, nivelId: number, ajustes: Map<string, PeSituacao>, travado: boolean
): PeSituacao {
  const situacao = ajustes.get(chaveAjuste(tipo, item.Id)) ?? situacaoNoNivel(item, nivelId);
  return travado && situacao === 'desligado' ? 'obrigatorio' : situacao;
}

/** Visível para o órgão: não desligado e com o pai visível. */
export function efetiva(situacao: PeSituacao, paiVisivel: boolean): SituacaoEfetiva {
  return paiVisivel ? situacao : 'oculto';
}

/** Quantos passos e campos um nível pede (só PDTIC; sem ajustes). */
export interface ResumoNivel {
  passosObrigatorios: number;
  passosOpcionais: number;
  campos: number;
}

export function resumoDoNivel(modelo: PeModelo, nivelId: number): ResumoNivel {
  const resumo: ResumoNivel = { passosObrigatorios: 0, passosOpcionais: 0, campos: 0 };
  const semAjustes = new Map<string, PeSituacao>();
  for (const etapa of modelo.Etapas) {
    for (const passo of etapa.Passos) {
      if (passo.Excluido) continue;
      const sp = situacaoComAjuste(passo, 'passo', nivelId, semAjustes, passo.Travado);
      if (sp === 'desligado') continue;
      if (sp === 'obrigatorio') resumo.passosObrigatorios++;
      else resumo.passosOpcionais++;
      for (const secao of passo.Secoes) {
        if (secao.Excluido) continue;
        if (situacaoComAjuste(secao, 'secao', nivelId, semAjustes, secao.Travada) === 'desligado') continue;
        for (const campo of secao.Campos) {
          if (campo.Excluido) continue;
          const sc = situacaoComAjuste(campo, 'campo', nivelId, semAjustes, campoNaoDesliga(campo, secao));
          if (sc !== 'desligado') resumo.campos++;
        }
      }
    }
  }
  return resumo;
}
