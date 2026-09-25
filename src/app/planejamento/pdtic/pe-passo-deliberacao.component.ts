import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PeDeliberacao, PePdtic } from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { PdfDoPdtic, baixarPdfDoPdtic, pdfDoPdtic } from '../shared/pe-pdf-pdtic';
import { quandoPdtic } from '../shared/pe-pdtic-rotulos';
import { quandoEQuem, textoAto } from '../shared/pe-referenciais-rotulos';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

/** Link para um passo da trilha à vista. */
interface LinkPasso {
  rota: string;
  numero: string;
}

/** Os passos que a deliberação cita: o documento (3.10), o envio (3.11) e a publicação (3.13). */
interface LinksDeliberacao {
  documento: LinkPasso | null;
  envio: LinkPasso | null;
  publicacao: LinkPasso | null;
}

/**
 * Deliberação do CGTIC sobre o PDTIC (passo do tipo `deliberacao`, o 3.12 no
 * Avançado: "Acompanhe a deliberação do CGTIC", art. 5º). Só leitura: quem
 * registra a decisão é a Secretaria do CGTIC, na fila dela. A tela mostra, pela
 * situação do PDTIC e pela deliberação mais recente:
 *
 * - antes do envio: o caminho até o passo do envio;
 * - enviado: desde quando espera a decisão e o PDF enviado;
 * - devolvido: a observação da Secretaria em destaque e o caminho para ajustar e
 *   enviar de novo;
 * - aprovado em diante: o ato, a data e o próximo passo (a publicação).
 */
@Component({
  selector: 'app-pe-passo-deliberacao',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pe-passo-deliberacao.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PePassoDeliberacaoComponent {
  private readonly pdticService = inject(PePdticService);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly notificacoes = inject(NotificationService);

  @Input({ required: true }) pdtic!: PePdtic;

  baixando = false;
  // Objetos estáveis para os *ngIf do template (objeto novo a cada verificação daria NG0100)
  private passosVistos: unknown = null;
  private linksCache: LinksDeliberacao = { documento: null, envio: null, publicacao: null };
  private pdfDe: PePdtic | null = null;
  private pdfCache: PdfDoPdtic | null = null;

  get deliberacao(): PeDeliberacao | null {
    return this.pdtic.Deliberacao ?? null;
  }

  /** Ainda não foi enviado (em elaboração, sem deliberação). */
  get antesDoEnvio(): boolean {
    return this.pdtic.Situacao === 'em_elaboracao' && !this.pdtic.EnviadoEm;
  }

  get aguardando(): boolean {
    return this.pdtic.Situacao === 'em_aprovacao';
  }

  get devolvido(): boolean {
    return this.pdtic.Situacao === 'devolvido';
  }

  /** Aprovado pelo CGTIC: aprovado, publicado, em acompanhamento, encerrado ou substituído. */
  get aprovado(): boolean {
    return ['aprovado', 'publicado', 'em_acompanhamento', 'encerrado', 'substituido'].includes(this.pdtic.Situacao);
  }

  /** Registrado já aprovado, fora do sistema, sem deliberação do CGTIC no sistema. */
  get externoSemDeliberacao(): boolean {
    return this.pdtic.RegistradoExternamente && !this.deliberacao;
  }

  get pdf(): PdfDoPdtic | null {
    if (this.pdfDe !== this.pdtic) {
      this.pdfDe = this.pdtic;
      this.pdfCache = pdfDoPdtic(this.pdtic);
    }
    return this.pdfCache;
  }

  get links(): LinksDeliberacao {
    const passos = this.estadoService.atual?.passos ?? [];
    if (passos !== this.passosVistos) {
      this.passosVistos = passos;
      const link = (tipo: string): LinkPasso | null => {
        const achado = passos.find(x => x.doOrgao?.Tipo === tipo);
        return achado ? { rota: achado.rota, numero: achado.numero } : null;
      };
      this.linksCache = { documento: link('documento'), envio: link('envio'), publicacao: link('publicacao') };
    }
    return this.linksCache;
  }

  quando(valor: string | null | undefined): string {
    return quandoPdtic(valor);
  }

  /** "Resolução nº 12, de 20/09/2026 · SEI ..." ou vazio. */
  get ato(): string {
    return this.deliberacao ? textoAto(this.deliberacao) : '';
  }

  /** Quando e por quem a decisão foi registrada. */
  get registradaEm(): string {
    const d = this.deliberacao;
    return d?.DecididoEm ? quandoEQuem(d.DecididoEm, d.DecididoPor) : '';
  }

  /** A data da aprovação: a do ato (data pura) ou, sem ela, a gravada no PDTIC. */
  get dataAprovacao(): string {
    const d = this.deliberacao;
    if (d?.Situacao === 'aprovado' && d.AtoData) return quandoPdtic(d.AtoData);
    return quandoPdtic(this.pdtic.AprovadoEm ?? d?.DecididoEm ?? null);
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
