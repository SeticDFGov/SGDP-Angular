import { AfterViewChecked, Component, EventEmitter, Input, OnChanges, Output, PLATFORM_ID, SimpleChanges, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PePassoSituacao, PeSituacaoPassoPdtic, PeValidacaoPasso } from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { PeConfirmacaoService } from '../shared/pe-confirmacao.service';
import { mensagemErroPe } from '../shared/pe-erros';
import { nomeDeQuem, textoData } from '../shared/registros/pe-valores';

/**
 * F3 (B) · "Validação da equipe" de um passo da elaboração (os que aceitam: dados,
 * conferência dos temas, documento e fluxo, nas etapas 1 a 3). A equipe do PDTIC
 * marca o passo quando revisou o conteúdo e o considera pronto: não é a aprovação
 * do SGTIC nem a do CGTIC. A marca guarda quem e quando; se os dados do passo mudam
 * depois, ela fica, com o aviso de que houve mudança (e o "Validar de novo").
 *
 * - Sem marca, com o passo feito e quem grava: "Marcar como validado pela equipe".
 * - Sem marca e o passo não feito: "Complete o passo para poder validá-lo."
 * - Com marca: quem e quando, e "Desfazer a validação" (com a confirmação do módulo).
 * - Quem só lê vê o estado, sem botões.
 *
 * Depois de marcar ou desmarcar, a situação do passo (a resposta) sobe à tela, que a
 * põe no estado; um aviso só (o toast) e o foco no título do quadro. O erro fica no
 * quadro, com o foco nele.
 */
@Component({
  selector: 'app-pe-validacao-passo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pe-validacao-passo.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeValidacaoPassoComponent implements OnChanges, AfterViewChecked {
  private readonly pdticService = inject(PePdticService);
  private readonly notificacoes = inject(NotificationService);
  private readonly confirmacao = inject(PeConfirmacaoService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) pdticId!: number;
  @Input({ required: true }) passoId!: number;
  /** "2.3" (para as mensagens e a confirmação). */
  @Input() numero = '';
  /** A situação do passo (a situação, a marca). */
  @Input() andamento: PeSituacaoPassoPdtic | null = null;
  /** Quem está logado grava no passo agora (o `PodeEditar` do passo). */
  @Input() podeEditar = false;
  /** A situação do passo que o servidor devolveu depois de marcar ou desmarcar. */
  @Output() readonly mudou = new EventEmitter<PePassoSituacao>();

  gravando: 'marcar' | 'desfazer' | null = null;
  erro: string | null = null;
  private focoPendente: string | null = null;

  ngOnChanges(mudancas: SimpleChanges): void {
    // Outro passo: o erro do anterior não vale aqui
    if (mudancas['passoId'] && !mudancas['passoId'].firstChange) this.erro = null;
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  get idBase(): string {
    return `pe-val-${this.passoId}`;
  }

  get validacao(): PeValidacaoPasso | null {
    return this.andamento?.Validacao ?? null;
  }

  /** O passo está feito (só o passo feito recebe a marca). */
  get feito(): boolean {
    return this.andamento?.Situacao === 'feito';
  }

  get mudouDepois(): boolean {
    return !!this.validacao?.AlteradoDepoisEm;
  }

  /** "Validado pela equipe em 25/09/2026, por Fulano." */
  get textoValidado(): string {
    const v = this.validacao;
    if (!v) return '';
    const quem = nomeDeQuem(v.ValidadoPorNome, v.ValidadoPor);
    return `Validado pela equipe em ${textoData(v.ValidadoEm)}${quem ? `, por ${quem}` : ''}.`;
  }

  /** O aviso da mudança depois da validação, com o que fazer (quem grava) ou o que a equipe faz (quem lê). */
  get textoMudou(): string {
    const v = this.validacao;
    if (!v?.AlteradoDepoisEm) return '';
    const inicio = `Os dados deste passo mudaram depois da validação (em ${textoData(v.AlteradoDepoisEm)}).`;
    return this.podeEditar ? `${inicio} Confira e valide de novo.` : `${inicio} A equipe do PDTIC confere e valida de novo.`;
  }

  marcar(): void {
    if (this.gravando || !this.podeEditar || !this.feito) return;
    const deNovo = !!this.validacao;
    this.gravando = 'marcar';
    this.erro = null;
    this.pdticService.validarPasso(this.pdticId, this.passoId).subscribe({
      next: situacao => {
        this.gravando = null;
        // Um aviso só: o toast já é lido pelo leitor de tela
        this.notificacoes.success(deNovo
          ? `Passo ${this.numero} validado de novo pela equipe.`
          : `Passo ${this.numero} validado pela equipe.`);
        this.focoPendente = `${this.idBase}-titulo`;
        this.mudou.emit(situacao);
      },
      error: erro => this.falhou(erro, 'Não foi possível validar o passo. Tente de novo.')
    });
  }

  desfazer(): void {
    if (this.gravando || !this.podeEditar || !this.validacao) return;
    this.confirmacao.perguntar({
      titulo: `Desfazer a validação do passo ${this.numero}?`,
      texto: 'Os dados do passo não mudam. A equipe pode validar de novo depois.',
      sim: 'Desfazer a validação'
    }).then(sim => {
      if (!sim || this.gravando) return;
      this.gravando = 'desfazer';
      this.erro = null;
      this.pdticService.desfazerValidacao(this.pdticId, this.passoId).subscribe({
        next: situacao => {
          this.gravando = null;
          this.notificacoes.success(`A validação do passo ${this.numero} foi desfeita.`);
          this.focoPendente = `${this.idBase}-titulo`;
          this.mudou.emit(situacao);
        },
        error: erro => this.falhou(erro, 'Não foi possível desfazer a validação. Tente de novo.')
      });
    });
  }

  /** O erro fica no quadro (e recebe o foco); o 403 o interceptor já tratou. */
  private falhou(erro: unknown, padrao: string): void {
    this.gravando = null;
    this.erro = mensagemErroPe(erro, padrao);
    if (this.erro) this.focoPendente = `${this.idBase}-erro`;
  }
}
