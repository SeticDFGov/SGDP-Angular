import { AfterViewChecked, Component, EventEmitter, Input, Output, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PePdtic } from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { mensagemErroPe } from '../shared/pe-erros';
import { proximaVersao, quandoPdtic } from '../shared/pe-pdtic-rotulos';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

/**
 * encerrar-equipe: a autoridade máxima aprovou os resultados (7.4) · encerrar-admin:
 * a vigência terminou (administrador do módulo e admin do SGDP, com o motivo) ·
 * revisao-avaliacao: o comitê decidiu revisar (6.3) · revisao-justificativa: o
 * órgão sem o passo da avaliação do comitê (Básico), com a justificativa.
 */
export type ModoAcaoPdtic = 'encerrar-equipe' | 'encerrar-admin' | 'revisao-avaliacao' | 'revisao-justificativa';

/** Tamanho do motivo e da justificativa (o servidor confere de novo). */
/** O motivo de encerrar e a justificativa da revisão: o mesmo máximo do servidor (F2). */
const MAX_TEXTO = 1000;

/**
 * Encerrar o PDTIC ou abrir a revisão (E7), com a confirmação numa janela da
 * `DialogoDirective` (foco preso, Esc fecha, foco de volta ao botão):
 *
 * - encerrar: o PDTIC fica só para consulta; a equipe encerra depois da aprovação
 *   da autoridade máxima (7.4), e o administrador, com a vigência terminada, com o
 *   motivo obrigatório;
 * - revisão: a janela diz o que vai e o que não vai para a versão nova; sem o passo
 *   da avaliação do comitê no nível do órgão, a justificativa é obrigatória.
 *
 * Quem usa decide se o bloco aparece (o papel e a situação); o servidor confere de
 * novo. O resultado (o PDTIC encerrado ou a versão nova) sai em `concluiu`.
 */
@Component({
  selector: 'app-pe-acao-pdtic',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogoDirective],
  templateUrl: './pe-acao-pdtic.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeAcaoPdticComponent implements AfterViewChecked {
  private readonly pdticService = inject(PePdticService);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly notificacoes = inject(NotificationService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) pdtic!: PePdtic;
  @Input({ required: true }) modo!: ModoAcaoPdtic;
  @Output() readonly concluiu = new EventEmitter<PePdtic>();

  readonly maxTexto = MAX_TEXTO;

  janela = false;
  texto = '';
  tentou = false;
  gravando = false;
  erroServidor: string | null = null;
  private focoPendente: string | null = null;

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  get encerrar(): boolean {
    return this.modo === 'encerrar-equipe' || this.modo === 'encerrar-admin';
  }

  /** Motivo (administrador) ou justificativa (revisão sem a avaliação do comitê): obrigatório. */
  get pedeTexto(): boolean {
    return this.modo === 'encerrar-admin' || this.modo === 'revisao-justificativa';
  }

  get idBase(): string {
    return `pe-acao-${this.modo}`;
  }

  get versaoNova(): string {
    return proximaVersao(this.pdtic.Versao);
  }

  get fimVigencia(): string {
    return quandoPdtic(this.pdtic.VigenciaFim);
  }

  get rotuloTexto(): string {
    return this.encerrar ? 'Motivo do encerramento' : 'Por que revisar o PDTIC?';
  }

  get erroTexto(): string | null {
    if (!this.tentou || !this.pedeTexto) return null;
    const t = this.texto.trim();
    if (!t) return this.encerrar ? 'Escreva o motivo do encerramento.' : 'Diga por que o PDTIC precisa ser revisado.';
    return t.length > MAX_TEXTO ? `Escreva até ${MAX_TEXTO} caracteres (agora são ${t.length}).` : null;
  }

  abrir(): void {
    this.janela = true;
    this.texto = '';
    this.tentou = false;
    this.erroServidor = null;
    if (this.pedeTexto) this.focoPendente = `${this.idBase}-texto`;
  }

  fechar(): void {
    if (!this.gravando) this.janela = false;
  }

  confirmar(): void {
    if (this.gravando) return;
    this.tentou = true;
    this.erroServidor = null;
    if (this.erroTexto) {
      this.focoPendente = `${this.idBase}-texto`;
      return;
    }
    const texto = this.pedeTexto ? this.texto.trim() : null;
    const pedido = this.encerrar
      ? this.pdticService.encerrar(this.pdtic.Id, texto)
      : this.pdticService.abrirRevisao(this.pdtic.Id, texto);
    this.gravando = true;
    pedido.subscribe({
      next: pdtic => {
        this.gravando = false;
        this.janela = false;
        this.notificacoes.success(this.encerrar
          ? `PDTIC ${this.pdtic.Versao} encerrado. Ele fica só para consulta.`
          : `Revisão aberta: a versão ${pdtic?.Versao ?? this.versaoNova} está em elaboração, com os dados de hoje. A versão ${this.pdtic.Versao} segue valendo até o CGTIC aprovar a nova.`);
        if (pdtic) this.concluiu.emit(pdtic);
      },
      error: erro => {
        this.gravando = false;
        const mensagem = mensagemErroPe(erro, this.encerrar
          ? 'Não foi possível encerrar o PDTIC. Tente de novo.'
          : 'Não foi possível abrir a revisão. Tente de novo.');
        if (mensagem === null) {
          this.janela = false;
          return;
        }
        if ((erro as { status?: number } | null)?.status === 409) {
          // A situação mudou por fora (outra pessoa abriu a revisão ou encerrou): o PDTIC vem de novo
          this.janela = false;
          this.notificacoes.error(mensagem);
          this.estadoService.recarregarPdtic();
          return;
        }
        // O erro fica na janela, perto do botão, e recebe o foco
        this.erroServidor = mensagem;
        this.focoPendente = `${this.idBase}-erro-servidor`;
      }
    });
  }
}
