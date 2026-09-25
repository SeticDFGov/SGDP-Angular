import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Tom de uma barra (a cor só acompanha: o nome e o número vêm sempre escritos). */
export type TomBarra = 'roxo' | 'azul' | 'verde' | 'ambar' | 'vermelho' | 'cinza';

/** Uma série do gráfico (uma coluna da tabela equivalente). */
export interface SerieGrafico {
  nome: string;
  tom: TomBarra;
}

/** Uma linha do gráfico: o rótulo e um valor por série (o tom, quando a linha tem cor própria). */
export interface BarraGrafico {
  chave: string;
  rotulo: string;
  valores: number[];
  tom?: TomBarra | null;
}

/** Cor da barra no SVG (preenchimento pela cor do texto: os temas escuro e de alto contraste trocam a cor do texto). */
const CLASSE_TOM: Record<TomBarra, string> = {
  roxo: 'text-purple-600',
  azul: 'text-blue-600',
  verde: 'text-green-600',
  ambar: 'text-amber-600',
  vermelho: 'text-red-600',
  cinza: 'text-gray-500'
};

interface LinhaDesenhada {
  chave: string;
  rotulo: string;
  celulas: { serie: string; valor: number; largura: string; classe: string }[];
}

let proximoId = 0;

/** Largura da barra em percentual do maior valor; valor positivo pequeno ainda aparece (1%). */
function largura(valor: number, maximo: number): string {
  if (!(valor > 0) || !(maximo > 0)) return '0%';
  return `${Math.max(1, Math.round((valor / maximo) * 1000) / 10)}%`;
}

function numero(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Gráfico de barras horizontais em HTML e SVG, sem biblioteca, no estilo do
 * painel de Demandas (o rótulo e o número numa linha, a barra embaixo):
 *
 * - título, legenda em texto e, com mais de uma série, a legenda das séries (o
 *   nome da série também vai escrito ao lado de cada barra: a cor nunca é a única
 *   informação);
 * - descrição para o leitor de tela (quantos itens, o maior valor e o total);
 * - a tabela equivalente, sempre no leitor de tela, e à vista pelo botão "Ver
 *   como tabela" (o desenho sai da tela e a tabela entra no lugar dele, numa
 *   região com rolagem focável e com nome);
 * - o desenho fica escondido do leitor de tela (a tabela diz o mesmo) e não tem
 *   nada focável;
 * - sem dado nenhum (tudo zero ou lista vazia), o texto do estado vazio.
 */
@Component({
  selector: 'app-pe-grafico-barras',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pe-grafico-barras.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeGraficoBarrasComponent implements OnChanges {
  @Input({ required: true }) titulo!: string;
  /** O que cada barra mostra, em texto. */
  @Input() legenda = '';
  @Input() series: SerieGrafico[] = [{ nome: 'Quantidade', tom: 'roxo' }];
  @Input() barras: BarraGrafico[] = [];
  /** Cabeçalho da primeira coluna da tabela ("Situação", "Nível"). */
  @Input() rotuloCategoria = 'Item';
  /** A unidade dos valores, para a descrição ("órgão", "órgãos"). */
  @Input() unidade: { singular: string; plural: string } = { singular: 'item', plural: 'itens' };
  /** Texto quando não há dado nenhum. */
  @Input() vazio = 'Ainda não há dados para este gráfico.';
  /** Linha de total na tabela (só com uma série). */
  @Input() mostrarTotal = true;

  readonly id = `pe-grafico-${++proximoId}`;

  comoTabela = false;
  linhas: LinhaDesenhada[] = [];
  semDados = true;
  descricao = '';
  totais: number[] = [];
  classesSeries: string[] = [];

  ngOnChanges(): void {
    const series = this.series?.length ? this.series : [{ nome: 'Quantidade', tom: 'roxo' as TomBarra }];
    const barras = this.barras ?? [];
    const valores = barras.map(b => series.map((_, i) => numero(b.valores?.[i])));
    const maximo = Math.max(0, ...valores.flat());
    this.classesSeries = series.map(s => CLASSE_TOM[s.tom] ?? CLASSE_TOM.roxo);
    this.linhas = barras.map((b, l) => ({
      chave: b.chave,
      rotulo: b.rotulo,
      celulas: series.map((s, i) => ({
        serie: s.nome,
        valor: valores[l][i],
        largura: largura(valores[l][i], maximo),
        classe: (series.length === 1 && b.tom ? CLASSE_TOM[b.tom] : null) ?? this.classesSeries[i]
      }))
    }));
    this.totais = series.map((_, i) => valores.reduce((t, v) => t + v[i], 0));
    this.semDados = maximo === 0;
    this.descricao = this.semDados ? '' : this.descrever(series);
  }

  get varias(): boolean {
    return (this.series?.length ?? 0) > 1;
  }

  alternar(): void {
    this.comoTabela = !this.comoTabela;
  }

  private quantos(valor: number): string {
    return `${valor} ${valor === 1 ? this.unidade.singular : this.unidade.plural}`;
  }

  /** "Gráfico de barras com 8 linhas. Maior valor: Em elaboração, com 5 órgãos. Total: 12 órgãos." */
  private descrever(series: SerieGrafico[]): string {
    const partes = [`Gráfico de barras com ${this.linhas.length} ${this.linhas.length === 1 ? 'linha' : 'linhas'}.`];
    series.forEach((s, i) => {
      let maior: LinhaDesenhada | null = null;
      for (const linha of this.linhas) {
        if (!maior || linha.celulas[i].valor > maior.celulas[i].valor) maior = linha;
      }
      if (!maior || maior.celulas[i].valor === 0) return;
      const rotulo = series.length > 1 ? `Maior valor de ${s.nome.toLowerCase()}` : 'Maior valor';
      partes.push(`${rotulo}: ${maior.rotulo}, com ${this.quantos(maior.celulas[i].valor)}.`);
    });
    if (series.length === 1) partes.push(`Total: ${this.quantos(this.totais[0])}.`);
    partes.push('Os números de cada linha estão na tabela a seguir.');
    return partes.join(' ');
  }

  porChave(_: number, l: LinhaDesenhada): string {
    return l.chave;
  }
}
