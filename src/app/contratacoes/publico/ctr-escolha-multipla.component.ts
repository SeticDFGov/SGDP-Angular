import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface OpcaoEscolha {
  valor: string;
  rotulo: string;
  /** Segunda linha, menor (o nome do órgão debaixo da sigla). */
  detalhe?: string;
  /** Processos com esta opção, contados com os outros filtros. */
  quantidade: number;
}

/**
 * Filtro de várias escolhas do painel público: um botão que abre uma lista. Sem caixa de
 * marcar (pedido do usuário em 2026-10-01): o texto da opção é clicável e a escolhida fica
 * com o fundo azulado do tema, a barra à esquerda e o negrito; o botão também fica azulado
 * quando há algo escolhido. Ao abrir, as escolhidas vêm primeiro, e a ordem fica parada
 * enquanto a lista está aberta, para nada pular debaixo do clique.
 *
 * Teclado: a lista é um listbox de escolha múltipla; as setas, Home e End andam, o espaço
 * ou o Enter escolhe, o Esc fecha e devolve o foco ao botão. Da busca, a seta para baixo
 * entra na lista.
 */
@Component({
  selector: 'app-ctr-escolha-multipla',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ctr-escolha-multipla.component.html'
})
export class CtrEscolhaMultiplaComponent {
  @Input({ required: true }) idBase!: string;
  @Input({ required: true }) rotulo!: string;
  @Input() opcoes: OpcaoEscolha[] = [];
  @Input() escolhidos: ReadonlySet<string> = new Set<string>();
  /** Campo de busca no topo da lista (para a lista longa, a dos órgãos). */
  @Input() comBusca = false;
  @Input() placeholderBusca = 'Buscar';
  @Input() textoTodos = 'Todos';
  /** "3 órgãos": o plural que o botão mostra a partir de `nomesAte` + 1 escolhas. */
  @Input() plural = 'itens';
  @Input() nomesAte = 1;
  @Input() rotuloLimpar = 'Limpar';
  @Input() textoNenhuma = 'Nenhuma opção com os outros filtros.';

  @Output() readonly alternar = new EventEmitter<string>();
  @Output() readonly limpar = new EventEmitter<void>();

  @ViewChild('botao') private botao?: ElementRef<HTMLButtonElement>;
  @ViewChild('lista') private lista?: ElementRef<HTMLElement>;
  @ViewChild('campoBusca') private campoBusca?: ElementRef<HTMLInputElement>;

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  aberta = false;
  busca = '';
  /** Opção que fica no Tab (as outras ficam com tabindex -1). */
  ativa: string | null = null;
  private ordemFixa: string[] = [];

  get resumo(): string {
    const escolhidos = [...this.escolhidos].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    if (escolhidos.length === 0) return this.textoTodos;
    if (escolhidos.length <= this.nomesAte) return escolhidos.join(', ');
    return `${escolhidos.length} ${this.plural}`;
  }

  get visiveis(): OpcaoEscolha[] {
    const posicao = (valor: string) => {
      const i = this.ordemFixa.indexOf(valor);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    const termo = normalizar(this.busca.trim());
    return [...this.opcoes]
      .sort((a, b) => posicao(a.valor) - posicao(b.valor) || a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
      .filter(o => !termo || normalizar(`${o.rotulo} ${o.detalhe ?? ''}`).includes(termo));
  }

  /** O que o leitor de tela lê em cada opção: o nome, o detalhe e a quantidade. */
  nomeAcessivel(o: OpcaoEscolha): string {
    return `${o.rotulo}${o.detalhe ? ', ' + o.detalhe : ''}, ${o.quantidade} ${o.quantidade === 1 ? 'processo' : 'processos'}`;
  }

  porValor(_: number, o: OpcaoEscolha): string {
    return o.valor;
  }

  abrir(): void {
    const porNome = (a: OpcaoEscolha, b: OpcaoEscolha) => a.rotulo.localeCompare(b.rotulo, 'pt-BR');
    const ordenadas = [...this.opcoes].sort(porNome);
    this.ordemFixa = [
      ...ordenadas.filter(o => this.escolhidos.has(o.valor)),
      ...ordenadas.filter(o => !this.escolhidos.has(o.valor))
    ].map(o => o.valor);
    this.busca = '';
    this.ativa = this.ordemFixa[0] ?? null;
    this.aberta = true;
    setTimeout(() => {
      if (this.comBusca) this.campoBusca?.nativeElement.focus();
      else this.opcaoAtiva()?.focus();
    });
  }

  fechar(devolverFoco: boolean): void {
    if (!this.aberta) return;
    this.aberta = false;
    if (devolverFoco) setTimeout(() => this.botao?.nativeElement.focus());
  }

  escolher(valor: string): void {
    this.ativa = valor;
    this.alternar.emit(valor);
  }

  aoBuscar(valor: string): void {
    this.busca = valor;
    this.ativa = this.visiveis[0]?.valor ?? null;
  }

  teclaNaBusca(evento: KeyboardEvent): void {
    if (evento.key !== 'ArrowDown' || !this.visiveis.length) return;
    evento.preventDefault();
    this.irPara(this.visiveis[0].valor);
  }

  teclaNaLista(evento: KeyboardEvent): void {
    const visiveis = this.visiveis;
    const atual = visiveis.findIndex(o => o.valor === this.ativa);
    if (atual < 0) return;
    let destino: number | null = null;
    switch (evento.key) {
      case ' ':
      case 'Enter':
        evento.preventDefault();
        this.escolher(visiveis[atual].valor);
        return;
      case 'ArrowDown': destino = Math.min(visiveis.length - 1, atual + 1); break;
      case 'ArrowUp':
        if (atual === 0 && this.comBusca) {
          evento.preventDefault();
          this.campoBusca?.nativeElement.focus();
          return;
        }
        destino = Math.max(0, atual - 1);
        break;
      case 'Home': destino = 0; break;
      case 'End': destino = visiveis.length - 1; break;
      default: return;
    }
    evento.preventDefault();
    this.irPara(visiveis[destino].valor);
  }

  teclaNoPainel(evento: KeyboardEvent): void {
    if (evento.key !== 'Escape') return;
    evento.stopPropagation();
    this.fechar(true);
  }

  /** O foco saiu da lista e do botão (Tab para fora): fecha. */
  aoSairDoFoco(evento: FocusEvent): void {
    const destino = evento.relatedTarget as Node | null;
    if (destino && !this.elemento.nativeElement.contains(destino)) this.fechar(false);
  }

  @HostListener('document:click', ['$event'])
  aoClicarFora(evento: MouseEvent): void {
    const alvo = evento.target as Node | null;
    if (this.aberta && alvo?.isConnected && !this.elemento.nativeElement.contains(alvo)) this.fechar(false);
  }

  private irPara(valor: string): void {
    this.ativa = valor;
    setTimeout(() => this.opcaoAtiva()?.focus());
  }

  private opcaoAtiva(): HTMLElement | null {
    const valor = this.ativa;
    if (valor === null || !this.lista) return null;
    return Array.from(this.lista.nativeElement.querySelectorAll<HTMLElement>('[role="option"]'))
      .find(o => o.dataset['valor'] === valor) ?? null;
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
