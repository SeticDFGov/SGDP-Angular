import { Component, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PeSistemaIaPgia } from '../../../api/planejamento/interface';
import { PePdticService } from '../services/pe-pdtic.service';
import { mensagemErroPe } from '../shared/pe-erros';
import { classeRiscoPgia, plural } from '../shared/pe-pdtic-rotulos';

/**
 * Passo dos sistemas de IA (art. 12, § 2º, VIII): o inventário do órgão no PGIA
 * (Governança de IA), só para ler, com a classificação de risco do Decreto nº
 * 48.901/2026 (GET pdtic/{id}/ia/pgia). As aquisições planejadas são uma seção
 * comum do passo, logo abaixo.
 */
@Component({
  selector: 'app-pe-sistemas-ia-pgia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pe-sistemas-ia-pgia.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeSistemasIaPgiaComponent implements OnChanges, OnDestroy {
  private readonly pdticService = inject(PePdticService);

  @Input({ required: true }) pdticId!: number;
  @Input() siglaOrgao = '';

  sistemas: PeSistemaIaPgia[] = [];
  carregando = false;
  carregado = false;
  erro: string | null = null;
  private carga?: Subscription;

  ngOnChanges(): void {
    this.carregar();
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
  }

  carregar(): void {
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.carga = this.pdticService.sistemasIaPgia(this.pdticId).subscribe({
      next: lista => {
        this.carregando = false;
        this.carregado = true;
        this.sistemas = [...(lista ?? [])].sort((a, b) => a.Nome.localeCompare(b.Nome, 'pt-BR'));
      },
      error: erro => {
        this.carregando = false;
        this.erro = mensagemErroPe(erro, 'Não foi possível ler os sistemas de IA do órgão no PGIA.');
      }
    });
  }

  get contagem(): string {
    return this.sistemas.length ? `${plural(this.sistemas.length, 'sistema', 'sistemas')} no inventário.` : '';
  }

  classeRisco(classificacao: string | null): string {
    return classeRiscoPgia(classificacao);
  }

  porId(_: number, s: PeSistemaIaPgia): number {
    return s.Id;
  }
}
