import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { PeConfirmacaoService } from './pe-confirmacao.service';

/**
 * A janela das confirmações do módulo (F1, A04 e B03), uma só, na moldura da
 * trilha: mostra a pergunta do `PeConfirmacaoService` com a `DialogoDirective`
 * (o foco vai para o primeiro botão, o que desiste; Esc desiste; o foco volta a
 * quem abriu). Fica acima das outras janelas do módulo (o painel lateral dos
 * registros, por exemplo, pergunta antes de fechar com mudança não salva).
 */
@Component({
  selector: 'app-pe-confirmacao',
  standalone: true,
  imports: [CommonModule, DialogoDirective],
  templateUrl: './pe-confirmacao.component.html',
  host: { class: 'block' }
})
export class PeConfirmacaoComponent {
  readonly confirmacao = inject(PeConfirmacaoService);
}
