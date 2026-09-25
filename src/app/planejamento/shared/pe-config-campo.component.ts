import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeConfigCampo, PeTipoCampo } from '../../../api/planejamento/interface';
import { CALCULOS, CATALOGOS, FORMATOS_TEXTO, OpcaoRotulo, TIPOS_ARQUIVO, rotuloTipoCampo } from './pe-modelo-rotulos';

export interface SecaoParaLigar {
  chave: string;
  titulo: string;
}

export interface CampoParaCalculo {
  chave: string;
  rotulo: string;
  tipo: string;
}

/** Tipos que podem entrar num cálculo (as listas entram pelo valor, como a escala GUT e a matriz de risco). */
const TIPOS_CALCULAVEIS: ReadonlySet<string> = new Set(['numero', 'moeda', 'percentual', 'calculado', 'lista']);

/**
 * Configuração de um campo, conforme o tipo: tamanho máximo dos textos, faixa e
 * casas do número, seção ou catálogo da ligação, tipos e tamanho do arquivo e o
 * cálculo (só os previstos: produto, soma ponderada, nível de risco e subtração;
 * nada de fórmula livre). Mexe no objeto `config` recebido, que é o do
 * formulário da tela. Desde a F1: o formato do texto curto (SEI ou endereço de
 * internet), a data que não aceita dia depois de hoje e os erros por chave do
 * config (`erros`, da conferência da tela ou do 400), cada um ligado ao campo.
 */
@Component({
  selector: 'app-pe-config-campo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pe-config-campo.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeConfigCampoComponent {
  @Input({ required: true }) tipo!: PeTipoCampo;
  @Input({ required: true }) config!: PeConfigCampo;
  /** Seções que um campo de ligação pode apontar. */
  @Input() secoes: SecaoParaLigar[] = [];
  /** Os outros campos da mesma seção (para o cálculo). */
  @Input() campos: CampoParaCalculo[] = [];
  @Input() prefixoId = 'pe-config';
  @Input() somenteLeitura = false;
  /** F1 (A14): o erro de cada chave do config ("max", "secao"...), mostrado embaixo do campo. */
  @Input() erros: Record<string, string> = {};

  readonly calculos: OpcaoRotulo[] = CALCULOS;
  readonly formatos: OpcaoRotulo[] = FORMATOS_TEXTO;
  readonly catalogos: OpcaoRotulo[] = CATALOGOS;
  readonly tiposArquivo: OpcaoRotulo[] = TIPOS_ARQUIVO;

  /** Texto rico, valor em reais, percentual, sim ou não e listas: nada a configurar aqui. */
  get semConfiguracao(): boolean {
    return !['texto_curto', 'texto_longo', 'numero', 'ligacao_secao', 'ligacao_catalogo', 'arquivo', 'calculado', 'data'].includes(this.tipo);
  }

  erro(chave: string): string | null {
    return this.erros?.[chave] || null;
  }

  /** A ajuda e o erro do campo, para o `aria-describedby`. */
  descritores(chave: string, ajuda?: string): string | null {
    const ids = [ajuda ? `${this.prefixoId}-${ajuda}` : null, this.erro(chave) ? `${this.prefixoId}-${chave}-erro` : null].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  /** Data que não aceita dia depois de hoje: só vai quando marcada (o servidor só guarda o verdadeiro). */
  mudarNaoFutura(evento: Event): void {
    if ((evento.target as HTMLInputElement).checked) this.config.naoFutura = true;
    else delete this.config.naoFutura;
  }

  mudarFormato(valor: string | null): void {
    if (valor) this.config.formato = valor;
    else delete this.config.formato;
  }

  get calculaveis(): CampoParaCalculo[] {
    return this.campos.filter(c => TIPOS_CALCULAVEIS.has(c.tipo));
  }

  rotuloTipo(tipo: string): string {
    return rotuloTipoCampo(tipo);
  }

  // ── Arquivo ───────────────────────────────────────────────────────────────

  temTipoArquivo(tipo: string): boolean {
    return (this.config.tipos ?? []).includes(tipo);
  }

  alternarTipoArquivo(tipo: string, evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    const atuais = (this.config.tipos ?? []).filter(t => t !== tipo);
    this.config.tipos = marcado ? [...atuais, tipo] : atuais;
  }

  // ── Cálculo ───────────────────────────────────────────────────────────────

  temCampo(chave: string): boolean {
    return (this.config.campos ?? []).includes(chave);
  }

  /** Posição do campo no cálculo (1º, 2º...), que importa na subtração e no nível de risco. */
  posicao(chave: string): number {
    return (this.config.campos ?? []).indexOf(chave) + 1;
  }

  alternarCampo(chave: string, evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    const atuais = (this.config.campos ?? []).filter(c => c !== chave);
    this.config.campos = marcado ? [...atuais, chave] : atuais;
  }

  peso(chave: string): number | null {
    return this.config.pesos?.[chave] ?? 1;
  }

  definirPeso(chave: string, valor: number | null): void {
    this.config.pesos = { ...(this.config.pesos ?? {}), [chave]: valor ?? 1 };
  }

  /** Subtração e nível de risco usam exatamente dois campos, na ordem em que foram marcados. */
  get pedeDois(): boolean {
    return this.config.calculo === 'subtracao' || this.config.calculo === 'nivel_risco';
  }

  get avisoCalculo(): string | null {
    const n = (this.config.campos ?? []).length;
    if (this.pedeDois && n !== 2) return 'Marque dois campos: a ordem em que você marca é a ordem do cálculo.';
    if (!this.pedeDois && n < 2) return 'Marque ao menos dois campos.';
    return null;
  }
}
