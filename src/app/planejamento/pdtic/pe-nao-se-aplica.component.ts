import { AfterViewChecked, Component, EventEmitter, Input, OnChanges, Output, PLATFORM_ID, SimpleChanges, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeNaoSeAplica } from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { mensagemErroPe } from '../shared/pe-erros';
import { quandoEQuem } from '../shared/pe-referenciais-rotulos';

/** Tamanho da justificativa (o servidor confere de novo). */
const MAX_JUSTIFICATIVA = 2000;

/**
 * "Não se aplica" de um passo do PDTIC (só em passo opcional no nível do órgão
 * que aceita; travado nunca): a equipe do órgão marca com a justificativa
 * obrigatória e pode desfazer; os demais papéis leem. A tela só mostra este
 * bloco quando o passo aceita.
 */
@Component({
  selector: 'app-pe-nao-se-aplica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pe-nao-se-aplica.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeNaoSeAplicaComponent implements OnChanges, AfterViewChecked {
  private readonly pdticService = inject(PePdticService);
  private readonly notificacoes = inject(NotificationService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) pdticId!: number;
  @Input({ required: true }) passoId!: number;
  /** "2.6" (para as mensagens). */
  @Input() numero = '';
  @Input() marcado: PeNaoSeAplica | null = null;
  /** A equipe do órgão, com o PDTIC em elaboração ou devolvido. */
  @Input() podeEditar = false;
  @Output() readonly mudou = new EventEmitter<void>();

  readonly maxJustificativa = MAX_JUSTIFICATIVA;

  formAberto = false;
  justificativa = '';
  erro: string | null = null;
  erroServidor: string | null = null;
  gravando = false;
  private tentou = false;
  private focoPendente: string | null = null;

  ngOnChanges(mudancas: SimpleChanges): void {
    // Outro passo, ou o passo passou a (ou deixou de) estar marcado: o formulário recomeça
    const marcado = mudancas['marcado'];
    const virou = !!marcado && !!marcado.previousValue !== !!marcado.currentValue;
    if (mudancas['passoId'] || virou) {
      this.formAberto = false;
      this.erro = null;
      this.erroServidor = null;
    }
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  get idBase(): string {
    return `pe-nsa-${this.passoId}`;
  }

  get quando(): string {
    return this.marcado ? quandoEQuem(this.marcado.MarcadoEm, this.marcado.MarcadoPor, this.marcado.MarcadoPorNome) : '';
  }

  abrir(): void {
    this.formAberto = true;
    this.justificativa = '';
    this.erro = null;
    this.erroServidor = null;
    this.tentou = false;
    this.focoPendente = `${this.idBase}-justificativa`;
  }

  cancelar(): void {
    this.formAberto = false;
    this.focoPendente = `${this.idBase}-marcar`;
  }

  aoDigitar(): void {
    if (this.tentou) this.erro = this.conferir();
  }

  private conferir(): string | null {
    const texto = this.justificativa.trim();
    if (!texto) return 'Diga por que este passo não se aplica ao órgão.';
    return texto.length > MAX_JUSTIFICATIVA ? `Escreva até ${MAX_JUSTIFICATIVA} caracteres (agora são ${texto.length}).` : null;
  }

  marcar(): void {
    if (this.gravando) return;
    this.tentou = true;
    this.erroServidor = null;
    this.erro = this.conferir();
    if (this.erro) {
      this.focoPendente = `${this.idBase}-justificativa`;
      return;
    }
    this.gravando = true;
    this.pdticService.marcarNaoSeAplica(this.pdticId, this.passoId, this.justificativa.trim()).subscribe({
      next: () => {
        this.gravando = false;
        this.formAberto = false;
        // Um aviso só: o toast já é lido pelo leitor de tela (F1, B05). O formulário sai da tela: o foco vai para
        // o "Desfazer", que aparece quando a situação do passo volta (F1, B01)
        this.notificacoes.success(`Passo ${this.numero} marcado como "não se aplica".`);
        this.focoPendente = `${this.idBase}-desfazer`;
        this.mudou.emit();
      },
      error: erro => {
        this.gravando = false;
        this.erroServidor = mensagemErroPe(erro, 'Não foi possível marcar. Tente de novo.');
        if (this.erroServidor) this.focoPendente = `${this.idBase}-erro-servidor`;
      }
    });
  }

  desfazer(): void {
    if (this.gravando) return;
    this.gravando = true;
    this.erroServidor = null;
    this.pdticService.desfazerNaoSeAplica(this.pdticId, this.passoId).subscribe({
      next: () => {
        this.gravando = false;
        // Um aviso só (F1, B05); o "Desfazer" sai da tela: o foco vai para o botão de marcar (F1, B01)
        this.notificacoes.success(`O passo ${this.numero} volta a ser preenchido normalmente.`);
        this.focoPendente = `${this.idBase}-marcar`;
        this.mudou.emit();
      },
      error: erro => {
        this.gravando = false;
        this.erroServidor = mensagemErroPe(erro, 'Não foi possível desfazer. Tente de novo.');
        if (this.erroServidor) this.focoPendente = `${this.idBase}-erro-servidor`;
      }
    });
  }
}
