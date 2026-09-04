import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IsActiveMatchOptions, RouterModule } from '@angular/router';
import { ItemNavPgia } from './pgia-nav';

/**
 * Um grupo de módulo no menu lateral: cabeçalho que abre/fecha e a árvore de
 * áreas (nível 1) e formulários (nível 2).
 *
 * Extraído do `Sidebar` sem mudar comportamento, para os dois grupos ("Governança
 * de IA" e "Análises de Contratações") usarem exatamente a mesma renderização.
 * Só configuração e rotas entram aqui — nada de `src/app/pgia` ou
 * `src/app/contratacoes`, que continuam lazy.
 */
@Component({
  selector: 'app-grupo-arvore',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './grupo-arvore.component.html'
})
export class GrupoArvoreComponent {
  /** Nome do grupo no cabeçalho (e no title do ícone minimizado). */
  @Input() titulo = '';
  /** Material Icon do grupo. */
  @Input() icone = '';
  /** Destino do ícone quando o menu está minimizado. */
  @Input() rotaGrupo = '';
  @Input() arvore: ItemNavPgia[] = [];
  /** Menu lateral expandido (senão, só o ícone do grupo aparece). */
  @Input() isExpanded = true;
  /** Grupo aberto pelo usuário (ou pela entrada na área). */
  @Input() aberto = false;
  /** O usuário está numa tela desta área: realça o cabeçalho. */
  @Input() dentro = false;
  /**
   * Usuário confinado aos módulos (perfil 'basico'): a árvore é o menu dele,
   * fica sempre aberta e sem chevron.
   */
  @Input() sempreAberto = false;
  /** URL atual sem query/âncora — destaca a área aberta. */
  @Input() rotaAtual = '';

  @Output() alternar = new EventEmitter<void>();

  /**
   * Destaque do formulário aberto: compara só o caminho. Com `{ exact: true }`
   * o roteador exigiria também os query params iguais, e o item perderia o
   * realce em telas que usam a URL para passar contexto (por exemplo
   * `/pgia/cgtic/deliberacoes?sistema=12`, vindo de "Preparar deliberação").
   */
  readonly opcoesFormularioAtivo: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored'
  };

  /** Áreas abertas na árvore, por `base` (o usuário abriu ou fechou à mão). */
  private areasAbertas: Record<string, boolean> = {};

  /** A árvore só aparece com o menu aberto. */
  get mostrarArvore(): boolean {
    return this.isExpanded && (this.aberto || this.sempreAberto);
  }

  alternarGrupo(): void {
    // Usuário confinado: a árvore é o menu dele, fica sempre aberta.
    if (this.sempreAberto) return;
    this.alternar.emit();
  }

  /**
   * A área é a que está aberta na tela (qualquer um dos formulários dela).
   *
   * Grupo com formulários casa primeiro pelos **filhos**, não pelo prefixo da
   * rota: "Cadastro Inicial" e "Governança (SGDI)" moram os dois sob
   * `/pgia/sgdi`, e o prefixo destacaria os dois ao mesmo tempo.
   *
   * Sem filho casando exato, o grupo ainda acende pelo prefixo da `base` — é o
   * que mantém a área realçada nas páginas que não estão na árvore, como
   * `/analises/processos/editar/12`. A ressalva preserva o caso do PGIA: se a
   * rota atual é o formulário de **outro** item (em `/pgia/sgdi/orgaos-dados`
   * quem casa é o "Cadastro Inicial"), o dono do prefixo não acende junto.
   *
   * Item sem filhos segue pelo prefixo de `base`, como antes.
   */
  areaAtiva(item: ItemNavPgia): boolean {
    const filhos = item.filhos ?? [];

    if (filhos.length > 0) {
      if (filhos.some(f => this.rotaAtual === f.rota)) return true;
      if (!item.base || this.outroItemCasaPorFilho(item)) return false;
      return this.casaPrefixo(item.base);
    }

    return this.casaPrefixo(item.base ?? item.rota);
  }

  private casaPrefixo(base: string): boolean {
    return this.rotaAtual === base || this.rotaAtual.startsWith(base + '/');
  }

  /** A rota atual é o formulário de outro item da mesma árvore? */
  private outroItemCasaPorFilho(item: ItemNavPgia): boolean {
    return this.arvore.some(outro =>
      outro !== item && (outro.filhos ?? []).some(f => this.rotaAtual === f.rota));
  }

  /** Formulários da área visíveis: a área ativa abre sozinha. */
  areaAberta(item: ItemNavPgia): boolean {
    const base = item.base ?? item.rota;
    return this.areasAbertas[base] ?? this.areaAtiva(item);
  }

  /** Clique no nome da área: abre a lista de formulários (e navega ao 1º). */
  abrirArea(item: ItemNavPgia): void {
    this.areasAbertas[item.base ?? item.rota] = true;
  }

  /** Chevron: mostra ou esconde os formulários da área, sem sair da tela. */
  alternarArea(item: ItemNavPgia): void {
    const base = item.base ?? item.rota;
    this.areasAbertas[base] = !this.areaAberta(item);
  }
}
