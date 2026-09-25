import {
  AfterViewChecked, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, PLATFORM_ID, SimpleChanges, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PeErroEnvio, PePendenciaEnvio, PePdtic, PePreviaEnvio } from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { mensagemErroPe } from '../shared/pe-erros';
import { PdfDoPdtic, baixarPdfDoPdtic, pdfDoPdtic } from '../shared/pe-pdf-pdtic';
import { pdticEmEdicao, plural, quandoPdtic } from '../shared/pe-pdtic-rotulos';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

/** Link para um passo da trilha à vista (o que falta resolver, a deliberação). */
interface LinkPasso {
  rota: string;
  numero: string;
}

/** Uma pendência do envio com o link para o passo dela (null quando o passo não está na trilha à vista). */
interface ItemPendencia {
  pendencia: PePendenciaEnvio;
  link: LinkPasso | null;
}

/**
 * Envio do PDTIC ao CGTIC (passo do tipo `envio`, o 3.11 no Avançado: "Registre
 * a aprovação do SGTIC e envie à SGDI"). A aprovação do SGTIC é a seção do passo,
 * que a tela do passo mostra acima; este bloco cuida do envio:
 *
 * - em elaboração ou devolvido, para quem edita o passo: o que ainda falta (GET
 *   pdtic/{id}/envio), cada pendência com o link para o passo dela, e "Enviar ao
 *   CGTIC", que pede confirmação numa janela (nunca `confirm`); o 400 do envio
 *   traz a mesma lista, que substitui a da tela;
 * - enviado: a data do envio, que vale como a comunicação à SGDI (art. 7º, V, do
 *   Decreto nº 48.899/2026), o PDF enviado e o link para a deliberação.
 *
 * Quem não edita o passo não consulta a prévia (a consulta é da equipe do órgão:
 * um 403 tiraria a pessoa do módulo).
 */
@Component({
  selector: 'app-pe-passo-envio',
  standalone: true,
  imports: [CommonModule, RouterModule, DialogoDirective],
  templateUrl: './pe-passo-envio.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PePassoEnvioComponent implements OnChanges, AfterViewChecked, OnDestroy {
  private readonly pdticService = inject(PePdticService);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly notificacoes = inject(NotificationService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) pdtic!: PePdtic;
  /** Quem está logado grava neste passo agora (o `PodeEditar` do passo). */
  @Input() podeEditar = false;
  /** Há mudança não salva numa seção do passo (a aprovação do SGTIC): o envio espera. */
  @Input() mudancaPendente = false;
  /** Muda quando uma seção do passo é salva: o que falta vem de novo. */
  @Input() recarga = 0;
  /** O PDTIC foi enviado (o servidor devolveu o PDTIC em aprovação). */
  @Output() readonly enviou = new EventEmitter<PePdtic>();

  previa: PePreviaEnvio | null = null;
  /** As pendências da prévia (ou do 400 do envio), com o link de cada uma. */
  itens: ItemPendencia[] = [];
  carregandoPrevia = false;
  erroPrevia: string | null = null;
  janela = false;
  enviando = false;
  baixando = false;
  private carga?: Subscription;
  private chave = '';
  private focoPendente: string | null = null;
  // Objetos estáveis para os *ngIf do template (objeto novo a cada verificação daria NG0100)
  private passosVistos: unknown = null;
  private links: { deliberacao: LinkPasso | null; documento: LinkPasso | null } = { deliberacao: null, documento: null };
  private pdfDe: PePdtic | null = null;
  private pdfCache: PdfDoPdtic | null = null;

  ngOnChanges(mudancas: SimpleChanges): void {
    const chave = `${this.pdtic.Id}:${this.pdtic.Situacao}:${this.podeEditar}:${this.recarga}`;
    if (chave === this.chave) return;
    const outroPdtic = !!mudancas['pdtic'] && mudancas['pdtic'].previousValue?.Id !== this.pdtic.Id;
    this.chave = chave;
    if (outroPdtic) this.aplicarPrevia(null);
    if (this.emEdicao && this.podeEditar) this.carregarPrevia();
    else {
      this.carga?.unsubscribe();
      this.aplicarPrevia(null);
      this.carregandoPrevia = false;
      this.erroPrevia = null;
    }
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
  }

  // ── Leitura ───────────────────────────────────────────────────────────────

  /** Em elaboração ou devolvido: o PDTIC ainda (ou de novo) se envia. */
  get emEdicao(): boolean {
    return pdticEmEdicao(this.pdtic.Situacao);
  }

  get devolvido(): boolean {
    return this.pdtic.Situacao === 'devolvido';
  }

  get podeEnviar(): boolean {
    return this.podeEditar && this.emEdicao && !!this.previa?.PodeEnviar && this.itens.length === 0;
  }

  get resumoPendencias(): string {
    return `Antes de enviar, falta resolver ${plural(this.itens.length, 'pendência', 'pendências')}:`;
  }

  /** O PDF enviado (o mesmo objeto enquanto o PDTIC não muda). */
  get pdf(): PdfDoPdtic | null {
    if (this.pdfDe !== this.pdtic) {
      this.pdfDe = this.pdtic;
      this.pdfCache = pdfDoPdtic(this.pdtic);
    }
    return this.pdfCache;
  }

  quando(valor: string | null | undefined): string {
    return quandoPdtic(valor);
  }

  /** O passo da deliberação do CGTIC (3.12 no Avançado). */
  get passoDeliberacao(): LinkPasso | null {
    return this.linksDaTrilha().deliberacao;
  }

  /** O passo do documento (3.10), para conferir a prévia antes de enviar. */
  get passoDocumento(): LinkPasso | null {
    return this.linksDaTrilha().documento;
  }

  porPasso(_: number, item: ItemPendencia): string {
    return `${item.pendencia.PassoId}:${item.pendencia.Motivo}`;
  }

  /** Os passos da deliberação e do documento na trilha à vista (refeitos só quando a trilha muda). */
  private linksDaTrilha(): { deliberacao: LinkPasso | null; documento: LinkPasso | null } {
    const passos = this.estadoService.atual?.passos ?? [];
    if (passos !== this.passosVistos) {
      this.passosVistos = passos;
      const link = (tipo: string): LinkPasso | null => {
        const achado = passos.find(x => x.doOrgao?.Tipo === tipo);
        return achado ? { rota: achado.rota, numero: achado.numero } : null;
      };
      this.links = { deliberacao: link('deliberacao'), documento: link('documento') };
    }
    return this.links;
  }

  /** A prévia (ou a lista do 400), com o passo de cada pendência na trilha à vista (pelo id; senão pelo número). */
  private aplicarPrevia(previa: PePreviaEnvio | null): void {
    this.previa = previa;
    const passos = this.estadoService.atual?.passos ?? [];
    this.itens = (previa?.Pendencias ?? []).map(p => {
      const achado = passos.find(x => x.doOrgao?.Id === p.PassoId) ?? passos.find(x => x.numero === p.PassoNumero);
      return { pendencia: p, link: achado ? { rota: achado.rota, numero: achado.numero } : null };
    });
  }

  // ── Prévia do envio ───────────────────────────────────────────────────────

  carregarPrevia(): void {
    this.carga?.unsubscribe();
    this.carregandoPrevia = true;
    this.erroPrevia = null;
    const id = this.pdtic.Id;
    this.carga = this.pdticService.previaEnvio(id).subscribe({
      next: previa => {
        this.carregandoPrevia = false;
        if (this.pdtic.Id !== id) return;
        this.aplicarPrevia({ PodeEnviar: !!previa?.PodeEnviar, Pendencias: previa?.Pendencias ?? [] });
      },
      error: erro => {
        this.carregandoPrevia = false;
        // 403: o interceptor já tirou a pessoa do módulo
        this.erroPrevia = mensagemErroPe(erro, 'Não foi possível conferir o que falta para enviar.');
      }
    });
  }

  // ── Envio ─────────────────────────────────────────────────────────────────

  abrirJanela(): void {
    if (!this.podeEnviar || this.enviando) return;
    if (this.mudancaPendente) {
      this.notificacoes.warning('Salve (ou desfaça) a aprovação do SGTIC antes de enviar: há mudança que ainda não foi salva.');
      return;
    }
    this.janela = true;
  }

  fecharJanela(): void {
    if (!this.enviando) this.janela = false;
  }

  enviar(): void {
    if (!this.podeEnviar || this.enviando) return;
    this.enviando = true;
    this.pdticService.enviar(this.pdtic.Id).subscribe({
      next: pdtic => {
        this.enviando = false;
        this.janela = false;
        this.aplicarPrevia(null);
        this.notificacoes.success(`PDTIC ${pdtic?.Versao ?? this.pdtic.Versao} enviado ao CGTIC. O PDF enviado ficou guardado, e o PDTIC fica em aprovação até o comitê decidir.`);
        this.focoPendente = 'pe-envio-titulo';
        if (pdtic?.Deliberacao) {
          this.enviou.emit(pdtic);
          return;
        }
        // Sem a deliberação na resposta (o PDF enviado sai dela), o PDTIC vem de novo; sem ele, vale a resposta
        const id = pdtic?.Id ?? this.pdtic.Id;
        this.pdticService.obter(id).subscribe({
          next: completo => this.enviou.emit(completo),
          error: () => {
            if (pdtic) this.enviou.emit(pdtic);
          }
        });
      },
      error: erro => {
        this.enviando = false;
        this.janela = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível enviar ao CGTIC. Tente de novo.');
        if (mensagem === null) return;
        const corpo = (erro as { error?: PeErroEnvio } | null)?.error;
        if (Array.isArray(corpo?.Pendencias) && corpo.Pendencias.length > 0) {
          // O servidor achou o que falta: a lista da tela passa a ser a dele
          this.aplicarPrevia({ PodeEnviar: false, Pendencias: corpo.Pendencias });
          this.notificacoes.error(mensagem);
          this.focoPendente = 'pe-envio-pendencias';
          return;
        }
        this.notificacoes.error(mensagem);
        // 409: a situação mudou por fora (outra pessoa enviou): o PDTIC vem de novo
        if ((erro as { status?: number } | null)?.status === 409) this.estadoService.recarregarPdtic();
      }
    });
  }

  baixarPdf(): void {
    const pdf = this.pdf;
    if (!pdf || this.baixando) return;
    this.baixando = true;
    baixarPdfDoPdtic(this.pdticService, pdf).then(mensagem => {
      this.baixando = false;
      if (mensagem) this.notificacoes.error(mensagem);
    });
  }
}
