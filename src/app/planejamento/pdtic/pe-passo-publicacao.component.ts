import { AfterViewChecked, Component, EventEmitter, Input, Output, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PePdtic, PeSecaoTrilha } from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { mensagemErroPe } from '../shared/pe-erros';
import { PdfDoPdtic, baixarPdfDoPdtic, pdfDoPdtic, rotuloPdfDoPdtic } from '../shared/pe-pdf-pdtic';
import { minusculaInicial, quandoMarcoPdtic } from '../shared/pe-pdtic-rotulos';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

/** Um problema que o servidor achou na seção da publicação (400 com `Campos`). */
interface ErroPublicacao {
  mensagem: string;
  /** Id do campo no formulário da seção, quando ele está na tela (para levar o foco). */
  alvo: string | null;
}

/**
 * Publicação do PDTIC (passo do tipo `publicacao`, o 3.12 no Avançado). A seção
 * da publicação (data, endereço da íntegra na internet, DODF) é a do passo, que a
 * tela do passo mostra acima; este bloco registra a publicação:
 *
 * - antes da aprovação do CGTIC: explica que a publicação vem depois;
 * - aprovado: "Registrar a publicação", com confirmação numa janela; o 400 traz
 *   os campos que faltam na seção, com o link para cada um;
 * - publicado em diante: a data da publicação e o PDF publicado.
 */
@Component({
  selector: 'app-pe-passo-publicacao',
  standalone: true,
  imports: [CommonModule, DialogoDirective],
  templateUrl: './pe-passo-publicacao.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PePassoPublicacaoComponent implements AfterViewChecked {
  private readonly pdticService = inject(PePdticService);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly notificacoes = inject(NotificationService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) pdtic!: PePdtic;
  /** Quem está logado grava neste passo agora (o `PodeEditar` do passo). */
  @Input() podeEditar = false;
  /** Há mudança não salva na seção da publicação: registrar espera. */
  @Input() mudancaPendente = false;
  /** A seção da publicação na trilha (para achar os campos citados no 400). */
  @Input() secao: PeSecaoTrilha | null = null;
  @Output() readonly publicou = new EventEmitter<PePdtic>();

  janela = false;
  publicando = false;
  baixando = false;
  erros: ErroPublicacao[] = [];
  erroGeral: string | null = null;
  private focoPendente: string | null = null;
  private pdfDe: PePdtic | null = null;
  private pdfCache: PdfDoPdtic | null = null;

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  get aprovado(): boolean {
    return this.pdtic.Situacao === 'aprovado';
  }

  /** Já publicado (publicado, em acompanhamento, encerrado ou substituído). */
  get publicado(): boolean {
    return ['publicado', 'em_acompanhamento', 'encerrado', 'substituido'].includes(this.pdtic.Situacao);
  }

  get podePublicar(): boolean {
    return this.podeEditar && this.aprovado;
  }

  get pdf(): PdfDoPdtic | null {
    if (this.pdfDe !== this.pdtic) {
      this.pdfDe = this.pdtic;
      this.pdfCache = pdfDoPdtic(this.pdtic);
    }
    return this.pdfCache;
  }

  /** A data da publicação: no PDTIC registrado fora do sistema, só o dia (F2, C-O2). */
  get quandoPublicado(): string {
    return quandoMarcoPdtic(this.pdtic, this.pdtic.PublicadoEm);
  }

  /** O nome do PDF pelo caminho do PDTIC (F1, I02: "PDF publicado" depois da publicação). */
  rotuloPdf(f: PdfDoPdtic): string {
    return rotuloPdfDoPdtic(this.pdtic, f);
  }

  focar(id: string): void {
    this.focoPendente = id;
  }

  abrirJanela(): void {
    if (!this.podePublicar || this.publicando) return;
    if (this.mudancaPendente) {
      this.notificacoes.warning('Salve ou desfaça a mudança na seção da publicação antes de registrar.');
      return;
    }
    this.janela = true;
  }

  fecharJanela(): void {
    if (!this.publicando) this.janela = false;
  }

  publicar(): void {
    if (!this.podePublicar || this.publicando) return;
    this.publicando = true;
    this.erros = [];
    this.erroGeral = null;
    this.pdticService.publicar(this.pdtic.Id).subscribe({
      next: pdtic => {
        this.publicando = false;
        this.janela = false;
        this.notificacoes.success(`Publicação registrada: o PDTIC ${pdtic?.Versao ?? this.pdtic.Versao} passou a valer. Agora começa o acompanhamento.`);
        this.focoPendente = 'pe-publicacao-registro-titulo';
        if (pdtic) this.publicou.emit(pdtic);
      },
      error: erro => {
        this.publicando = false;
        this.janela = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível registrar a publicação. Tente de novo.');
        if (mensagem === null) return;
        if ((erro as { status?: number } | null)?.status === 409) {
          // A situação mudou por fora (outra pessoa registrou antes): o PDTIC vem de novo
          this.notificacoes.error(mensagem);
          this.estadoService.recarregarPdtic();
          return;
        }
        this.erros = this.errosDosCampos(erro);
        this.erroGeral = mensagem;
        this.focoPendente = 'pe-publicacao-erros';
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

  /**
   * As mensagens do 400 (`Campos`), cada uma com o campo da seção na tela, quando
   * ele existe e se edita (o id do controle é `pe-{seção}-{campo}`).
   */
  private errosDosCampos(erro: unknown): ErroPublicacao[] {
    const campos = (erro as { error?: { Campos?: unknown } } | null)?.error?.Campos;
    if (!campos || typeof campos !== 'object') return [];
    const secao = this.secao;
    return Object.entries(campos as Record<string, unknown>)
      .filter(([, m]) => typeof m === 'string' && !!m.trim())
      .map(([chave, m]) => {
        const campo = secao?.Campos.find(c => c.Chave.toLowerCase() === chave.toLowerCase()
          || `publicacao${c.Chave}`.toLowerCase() === chave.toLowerCase());
        const alvo = campo && secao && this.noNavegador && document.getElementById(`pe-${secao.Chave}-${campo.Chave}`)
          ? `pe-${secao.Chave}-${campo.Chave}` : null;
        const texto = (m as string).trim();
        return { mensagem: campo ? `${campo.Rotulo}: ${minusculaInicial(texto)}` : texto, alvo };
      });
  }
}
