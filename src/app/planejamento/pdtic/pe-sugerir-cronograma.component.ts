import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { PeFluxosService } from '../services/pe-fluxos.service';
import { mensagemErroPe } from '../shared/pe-erros';

/**
 * "Sugerir o cronograma pelos fluxos" (E6), dentro da seção do cronograma do
 * plano de trabalho enquanto ela está vazia: o servidor cria uma linha por
 * tarefa dos fluxos de preparação, diagnóstico e planejamento (atividade,
 * responsável pela raia e a atividade que vem antes), e o órgão completa as
 * datas. Com a seção já preenchida o servidor recusa (409): a tela avisa e a
 * seção vem de novo.
 */
@Component({
  selector: 'app-pe-sugerir-cronograma',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pe-sugerir-cronograma.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeSugerirCronogramaComponent {
  private readonly fluxosService = inject(PeFluxosService);
  private readonly notificacoes = inject(NotificationService);

  @Input({ required: true }) pdticId!: number;
  /** O passo onde o órgão adapta os fluxos (link "ajuste os fluxos antes"). */
  @Input() passoFluxos: { numero: string; rota: string } | null = null;
  /** As linhas foram criadas (quantas). */
  @Output() readonly sugeriu = new EventEmitter<number>();
  /** A seção já tinha linhas (409): quem usa busca a seção de novo. */
  @Output() readonly recarregar = new EventEmitter<void>();

  sugerindo = false;
  erro: string | null = null;

  sugerir(): void {
    if (this.sugerindo) return;
    this.sugerindo = true;
    this.erro = null;
    this.fluxosService.sugerirCronograma(this.pdticId).subscribe({
      next: registros => {
        this.sugerindo = false;
        this.sugeriu.emit(Array.isArray(registros) ? registros.length : 0);
      },
      error: erro => {
        this.sugerindo = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível sugerir o cronograma. Tente de novo em alguns instantes.');
        if (mensagem === null) return;
        if ((erro as { status?: number } | null)?.status === 409) {
          this.notificacoes.warning(mensagem);
          this.recarregar.emit();
          return;
        }
        this.erro = mensagem;
      }
    });
  }
}
