import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ItemGraficoTipo {
  tipo: string;
  quantidade: number;
}

interface Dica {
  x: number;
  y: number;
  tipo: string;
  quantidade: number;
  percentual: number;
}

/**
 * Gráfico do painel público: quantas contratações há em cada tipo (a categoria do objeto),
 * com os outros filtros. É a lista do filtro de tipo desenhada: clicar numa coluna escolhe ou
 * tira o tipo; com tipos escolhidos, eles ficam na cor e os outros em cinza. Com contratações
 * marcadas na tabela, conta só elas, como os cartões (`selecao`: a borda azul e o selo
 * "Seleção da tabela").
 *
 * Colunas na largura toda; quando o espaço é estreito (celular ou quadro incorporado estreito),
 * barras deitadas, para caber o nome dos tipos. Uma cor só (a série é uma, o título diz o que
 * é), o valor na ponta da coluna e, por isso, sem eixo; a dica (passar o mouse ou o foco) mostra
 * a quantidade e a parte do total. Cada coluna é um botão com `aria-pressed`.
 */
@Component({
  selector: 'app-ctr-grafico-tipos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ctr-grafico-tipos.component.html',
  styleUrl: './ctr-grafico-tipos.component.css'
})
export class CtrGraficoTiposComponent implements OnChanges {
  /** Já na ordem do gráfico: a maior quantidade primeiro. */
  @Input() itens: ItemGraficoTipo[] = [];
  @Input() escolhidos: ReadonlySet<string> = new Set<string>();
  /** As quantidades são só das contratações marcadas na tabela. */
  @Input() selecao = false;
  /** Quadro incorporado em outro site: borda no lugar da sombra, como os outros cartões. */
  @Input() incorporado = false;

  @Output() readonly alternar = new EventEmitter<string>();
  @Output() readonly limpar = new EventEmitter<void>();

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  dica: Dica | null = null;

  /** As colunas mudaram: uma dica aberta ficaria com os números de antes. */
  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['itens'] || mudancas['selecao']) this.dica = null;
  }

  get maior(): number {
    return Math.max(1, ...this.itens.map(i => i.quantidade));
  }

  get total(): number {
    return this.itens.reduce((soma, i) => soma + i.quantidade, 0);
  }

  get resumo(): string {
    if (!this.itens.length) return '';
    const tipos = this.itens.filter(i => i.quantidade > 0).length;
    const total = this.selecao
      ? this.plural(this.total, 'contratação marcada', 'contratações marcadas')
      : this.plural(this.total, 'contratação', 'contratações');
    return `${total} em ${this.plural(tipos, 'tipo', 'tipos')}`
      + (this.escolhidos.size ? '; só os tipos escolhidos, em destaque, entram nos cartões e na tabela.' : '.');
  }

  /** O tipo escolhido com zero contratações some ao ser tirado: aí o foco vai para a primeira coluna. */
  clicar(item: ItemGraficoTipo): void {
    this.esconder();
    const vaiSumir = item.quantidade === 0 && this.escolhidos.has(item.tipo);
    this.alternar.emit(item.tipo);
    if (vaiSumir) this.focarPrimeiraColuna();
  }

  /** "Mostrar todos os tipos" some com o clique: o foco vai para a primeira coluna. */
  mostrarTodos(): void {
    this.limpar.emit();
    this.focarPrimeiraColuna();
  }

  apagada(item: ItemGraficoTipo): boolean {
    return this.escolhidos.size > 0 && !this.escolhidos.has(item.tipo);
  }

  proporcao(item: ItemGraficoTipo): number {
    return item.quantidade / this.maior;
  }

  nomeAcessivel(item: ItemGraficoTipo): string {
    return `${item.tipo}: ${this.selecao
      ? this.plural(item.quantidade, 'contratação marcada', 'contratações marcadas')
      : this.plural(item.quantidade, 'contratação', 'contratações')}`;
  }

  porTipo(_: number, item: ItemGraficoTipo): string {
    return item.tipo;
  }

  plural(n: number, um: string, varios: string): string {
    return `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;
  }

  /** A dica fica acima do número da coluna e dentro do cartão. */
  mostrar(evento: Event, item: ItemGraficoTipo): void {
    const botao = evento.currentTarget as HTMLElement;
    const cartao = this.elemento.nativeElement.querySelector('section')!.getBoundingClientRect();
    const barra = botao.querySelector('.barra')!.getBoundingClientRect();
    const numero = botao.querySelector('.barra-valor')!.getBoundingClientRect();
    const meia = 130;
    this.dica = {
      x: Math.min(Math.max(barra.left + barra.width / 2 - cartao.left, meia), cartao.width - meia),
      y: Math.min(numero.top, barra.top) - cartao.top,
      tipo: item.tipo,
      quantidade: item.quantidade,
      percentual: this.total ? Math.round(item.quantidade * 100 / this.total) : 0
    };
  }

  esconder(): void {
    this.dica = null;
  }

  private focarPrimeiraColuna(): void {
    setTimeout(() => this.elemento.nativeElement.querySelector<HTMLElement>('.barra-item')?.focus());
  }

  /**
   * Hífen opcional (U+00AD) nas sílabas das palavras de 13 letras ou mais: embaixo da coluna,
   * "Desenvolvimento" quebra em "Desenvolvi-mento", e não no meio de qualquer jeito (o Chrome no
   * Windows não hifeniza o português sozinho). Regra simples: separa antes de consoante seguida
   * de vogal e entre duas consoantes, menos nos grupos que não se separam.
   */
  hifenizar(texto: string): string {
    return texto.split(' ').map(silabar).join(' ');
  }
}

const VOGAIS = 'aeiouáéíóúâêôãõàü';
const JUNTOS = ['br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr', 'vr', 'bl', 'cl', 'fl', 'gl', 'pl', 'ch', 'lh', 'nh', 'gu', 'qu'];

function silabar(palavra: string): string {
  if (palavra.length < 13) return palavra;
  const p = palavra.toLowerCase();
  const vogal = (i: number) => VOGAIS.includes(p[i]);
  const cortes = new Set<number>();
  for (let i = 2; i <= p.length - 3; i++) {
    if (vogal(i)) continue;
    if (vogal(i - 1) && vogal(i + 1)) cortes.add(i);
    else if (vogal(i - 1) && i + 2 < p.length && vogal(i + 2)) cortes.add(JUNTOS.includes(p.slice(i, i + 2)) ? i : i + 1);
  }
  let saida = '';
  let ultimo = 0;
  [...cortes].filter(c => c >= 4 && c <= p.length - 4).sort((a, b) => a - b).forEach(c => {
    saida += palavra.slice(ultimo, c) + '\u00AD';
    ultimo = c;
  });
  return saida + palavra.slice(ultimo);
}
