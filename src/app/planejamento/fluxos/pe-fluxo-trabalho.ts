import { PeFluxoDefinicao } from '../../../api/planejamento/interface';
import { PeFonteFluxos } from '../services/pe-fluxos.service';
import { DicionarioFluxo } from '../shared/pe-fluxo-rotulos';

/** O item selecionado no editor visual: um bloco, uma seta ou uma raia. */
export type PeSelecaoFluxo =
  | { tipo: 'elemento'; id: string }
  | { tipo: 'ligacao'; id: string }
  | { tipo: 'raia'; id: string };

/** Pedido de seleção do desenho: `abrirPainel` leva o foco ao painel do item (Enter no bloco). */
export interface PeSelecionarFluxo {
  selecao: PeSelecaoFluxo | null;
  abrirPainel: boolean;
}

/** Id de um item na tela (o mesmo formato nos dois modos): "pe-fx-e-e12-bloco". */
export function idNaTela(tipo: 'e' | 'l' | 'r', id: string, parte: string): string {
  return `pe-fx-${tipo}-${id.replace(/[^A-Za-z0-9_-]/g, '_')}-${parte}`;
}

/**
 * O estado de trabalho do editor de fluxos, que os dois modos de edição usam
 * (o editor em lista e o visual): a mesma definição, o mesmo "Desfazer", o mesmo
 * "Salvar o fluxo" e a mesma lista de problemas. Quem guarda é o editor
 * (`PeFluxoEditorComponent`, que se oferece com este token); o desenho interativo
 * só pede mudanças por aqui, com as funções de `pe-fluxo-rotulos.ts`.
 */
export abstract class PeFluxoTrabalho {
  abstract readonly fonte: PeFonteFluxos;
  /** O nome do fluxo na tela (vai com a geometria: a faixa do fluxo à esquerda, como no PDF). */
  abstract readonly nome: string;
  abstract readonly dicionario: DicionarioFluxo;
  /** Os números que valem agora (os da geometria, ou a numeração provisória). */
  abstract readonly numeros: ReadonlyMap<string, string>;
  abstract readonly podeEditar: boolean;

  /** Rótulo de um elemento ("2.3 Descrever o ambiente tecnológico", "Decisão: Minuta aprovada?"). */
  abstract rotuloPorId(id: string): string;

  /** Nome de uma raia como aparece no desenho (com os nomes do dicionário). */
  abstract nomeRaiaPorId(id: string): string;

  /**
   * Aplica uma mudança na cópia de trabalho (guardando o retrato de antes para o
   * "Desfazer") e devolve o que ela devolveu; null quando não pôde mudar.
   */
  abstract mudar<T>(descricao: string, mudanca: (def: PeFluxoDefinicao) => T, agrupar?: string | null): T | null;

  /**
   * Remove o passo com a regra de religar da E6. Pergunta antes quando o passo tem
   * ligações. Devolve se removeu.
   */
  abstract removerPassoDoDesenho(id: string): boolean;

  /** Tira uma seta (ligação). */
  abstract removerLigacaoDoDesenho(id: string): void;

  /** Inclui uma raia nova no fim e abre, no painel, o nome dela. */
  abstract incluirRaiaNoDesenho(): void;

  /**
   * A geometria da definição de trabalho chegou (`retrato`: a definição que foi
   * enviada): os problemas entram na mesma lista do modo em lista, e os números do
   * servidor passam a valer.
   */
  abstract receberGeometria(retrato: string, erros: string[], numeros: Record<string, string>): void;
}
