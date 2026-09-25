import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PeTemaDoPdtic } from '../../../api/planejamento/interface';
import { PePdticService } from '../services/pe-pdtic.service';
import { mensagemErroPe } from '../shared/pe-erros';
import { plural } from '../shared/pe-pdtic-rotulos';

/**
 * Passo de conferência dos temas (art. 12, § 2º, V, VI e IX): para cada um dos
 * três temas do decreto, as ações do plano marcadas com ele (código, descrição e
 * situação) e, para o tema sem ação, a justificativa, que se grava na seção
 * formulário "Temas sem ação", logo abaixo na mesma tela (GET pdtic/{id}/temas).
 */
@Component({
  selector: 'app-pe-temas-acoes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pe-temas-acoes.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeTemasAcoesComponent implements OnChanges, OnDestroy {
  private readonly pdticService = inject(PePdticService);

  @Input({ required: true }) pdticId!: number;
  /** Muda quando a tela quer os temas de novo (a justificativa foi salva). */
  @Input() recarga = 0;
  /** O passo onde ficam as ações ("3.3"), para o link; null quando ele não está na trilha do órgão. */
  @Input() passoAcoes: { numero: string; rota: string; titulo: string } | null = null;

  temas: PeTemaDoPdtic[] = [];
  carregando = false;
  erro: string | null = null;
  private carga?: Subscription;

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['pdticId'] || mudancas['recarga']) this.carregar();
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
  }

  carregar(): void {
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.carga = this.pdticService.temas(this.pdticId).subscribe({
      next: resposta => {
        this.carregando = false;
        this.temas = resposta?.Temas ?? [];
      },
      error: erro => {
        this.carregando = false;
        this.erro = mensagemErroPe(erro, 'Não foi possível conferir as ações por tema.');
      }
    });
  }

  /** "art. 12, § 2º, V" (vira a dica do decreto). */
  citacao(t: PeTemaDoPdtic): string {
    return `art. 12, § 2º, ${t.Inciso}`;
  }

  contagem(t: PeTemaDoPdtic): string {
    return t.Acoes.length ? plural(t.Acoes.length, 'ação', 'ações') : 'Nenhuma ação';
  }

  get semAcaoSemJustificativa(): number {
    return this.temas.filter(t => t.Acoes.length === 0 && !t.Justificativa?.trim()).length;
  }

  porValor(_: number, t: PeTemaDoPdtic): string {
    return t.Valor;
  }

  porRegistro(_: number, a: { RegistroId: number }): number {
    return a.RegistroId;
  }
}
