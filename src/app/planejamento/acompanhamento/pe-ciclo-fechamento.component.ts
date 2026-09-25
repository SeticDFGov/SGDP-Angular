import {
  AfterViewChecked, Component, EventEmitter, Input, OnChanges, Output, PLATFORM_ID, SimpleChanges, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PeCiclo, PePendenciaCiclo } from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { PeCiclosService } from '../services/pe-ciclos.service';
import {
  acoesSemSituacao, cicloAceitaDados, classeSituacaoCiclo, iconeSituacaoCiclo, oCiclo, pendenciasDoErro, periodoCiclo,
  rotuloSituacaoCiclo
} from '../shared/pe-ciclos-rotulos';
import { rotuloSituacaoVersao } from '../shared/pe-documento-rotulos';
import { mensagemErroPe } from '../shared/pe-erros';
import { plural } from '../shared/pe-pdtic-rotulos';
import { textoData, textoDataHora } from '../shared/registros/pe-valores';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

/** Uma pendência do fechamento com o link para o passo dela, já no ciclo (null quando o passo não está na trilha). */
interface ItemPendencia {
  chave: string;
  pendencia: PePendenciaCiclo;
  rota: string | null;
  query: Record<string, string | number> | null;
  rotulo: string;
}

/**
 * O fechamento de um ciclo (E7 rodada B), no último passo do tipo na trilha (5.2
 * no monitoramento; 5.1 quando o nível não tem o 5.2; 6.3 na avaliação):
 *
 * - o resumo do ciclo: a situação em texto, o período, o prazo para fechar, as
 *   ações com situação, as medições, os riscos que ocorreram, quem fechou e o
 *   relatório (RA) gerado;
 * - "Fechar o ciclo" (ou "Fechar a avaliação"), com a confirmação numa janela da
 *   `DialogoDirective` que diz o que acontece e o que ainda falta pelo resumo; o
 *   400 traz as pendências, que aparecem em lista, cada uma com o link para o
 *   passo dela já no ciclo, e recebem o foco;
 * - "Reabrir" o ciclo fechado, também com a janela (a equipe volta a mudar os
 *   dados; quem reabriu e quando ficam guardados).
 *
 * Só a equipe do órgão fecha e reabre (o `PodeEditar` do passo, que já considera a
 * situação do PDTIC); o servidor confere de novo. O ciclo devolvido sai em `mudou`.
 */
@Component({
  selector: 'app-pe-ciclo-fechamento',
  standalone: true,
  imports: [CommonModule, RouterModule, DialogoDirective],
  templateUrl: './pe-ciclo-fechamento.component.html'
})
export class PeCicloFechamentoComponent implements OnChanges, AfterViewChecked {
  private readonly ciclosService = inject(PeCiclosService);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly notificacoes = inject(NotificationService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) ciclo!: PeCiclo;
  /** O passo aceita gravação agora (equipe do órgão com o PDTIC publicado ou em acompanhamento). */
  @Input() podeEditar = false;
  /** Há mudança não salva no passo: o fechamento espera. */
  @Input() mudancaPendente = false;
  /** O nível tem o resumo do ciclo (5.2): o fechamento também o exige. */
  @Input() exigeResumo = false;
  @Output() readonly mudou = new EventEmitter<PeCiclo>();

  janela: 'fechar' | 'reabrir' | null = null;
  gravando = false;
  itens: ItemPendencia[] = [];
  erroServidor: string | null = null;
  private focoPendente: string | null = null;

  ngOnChanges(mudancas: SimpleChanges): void {
    // Outro ciclo: as pendências eram do anterior
    const m = mudancas['ciclo'];
    if (m && (m.previousValue as PeCiclo | undefined)?.Id !== this.ciclo.Id) {
      this.itens = [];
      this.erroServidor = null;
      this.janela = null;
    }
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  // ── Leitura ───────────────────────────────────────────────────────────────

  get avaliacao(): boolean {
    return this.ciclo.Tipo === 'avaliacao';
  }

  /** "o ciclo" ou "a avaliação". */
  get oCiclo(): string {
    return oCiclo(this.ciclo.Tipo);
  }

  get titulo(): string {
    return this.avaliacao ? 'Resumo e fechamento da avaliação' : 'Resumo e fechamento do ciclo';
  }

  get rotuloFechar(): string {
    return this.avaliacao ? 'Fechar a avaliação' : 'Fechar o ciclo';
  }

  get rotuloReabrir(): string {
    return this.avaliacao ? 'Reabrir a avaliação' : 'Reabrir o ciclo';
  }

  get podeFechar(): boolean {
    return this.podeEditar && cicloAceitaDados(this.ciclo);
  }

  get podeReabrir(): boolean {
    return this.podeEditar && this.ciclo.Situacao === 'fechado';
  }

  get rotuloSituacao(): string {
    return rotuloSituacaoCiclo(this.ciclo.Situacao);
  }

  get classeSituacao(): string {
    return classeSituacaoCiclo(this.ciclo.Situacao);
  }

  get iconeSituacao(): string {
    return iconeSituacaoCiclo(this.ciclo.Situacao);
  }

  get periodo(): string {
    return periodoCiclo(this.ciclo);
  }

  get semSituacao(): number {
    return acoesSemSituacao(this.ciclo);
  }

  data(valor: string | null): string {
    return textoData(valor);
  }

  quando(valor: string | null): string {
    return textoDataHora(valor);
  }

  rotuloVersao(situacao: string): string {
    return rotuloSituacaoVersao(situacao).toLowerCase();
  }

  get resumoPendencias(): string {
    return `Para fechar ${this.oCiclo}, falta resolver ${plural(this.itens.length, 'pendência', 'pendências')}:`;
  }

  porChave(_: number, item: ItemPendencia): string {
    return item.chave;
  }

  // ── Fechar e reabrir ──────────────────────────────────────────────────────

  abrirJanela(qual: 'fechar' | 'reabrir'): void {
    if (this.gravando) return;
    if (qual === 'fechar' && !this.podeFechar) return;
    if (qual === 'reabrir' && !this.podeReabrir) return;
    if (this.mudancaPendente) {
      this.notificacoes.warning(`Salve (ou desfaça) as mudanças deste passo antes de ${qual === 'fechar' ? 'fechar' : 'reabrir'} ${this.oCiclo}.`);
      return;
    }
    this.erroServidor = null;
    this.janela = qual;
  }

  fecharJanela(): void {
    if (!this.gravando) this.janela = null;
  }

  confirmar(): void {
    const qual = this.janela;
    if (!qual || this.gravando) return;
    this.gravando = true;
    this.erroServidor = null;
    const pedido = qual === 'fechar' ? this.ciclosService.fechar(this.ciclo.Id) : this.ciclosService.reabrir(this.ciclo.Id);
    pedido.subscribe({
      next: ciclo => {
        this.gravando = false;
        this.janela = null;
        this.itens = [];
        const novo = ciclo ?? { ...this.ciclo, Situacao: qual === 'fechar' ? 'fechado' : 'aberto' };
        if (qual === 'fechar') {
          this.notificacoes.success(this.avaliacao
            ? `Avaliação "${novo.Rotulo}" fechada. Os dados dela ficam só para consulta.`
            : `Ciclo ${novo.Rotulo} fechado.${novo.Relatorio ? ' O relatório de acompanhamento saiu em minuta: confira logo abaixo.' : ''}`);
        } else {
          this.notificacoes.success(`${this.avaliacao ? 'Avaliação' : 'Ciclo'} ${novo.Rotulo} reaberto: a equipe já pode mudar os dados.`);
        }
        this.focoPendente = 'pe-fechamento-titulo';
        this.mudou.emit(novo);
      },
      error: erro => {
        this.gravando = false;
        const mensagem = mensagemErroPe(erro, qual === 'fechar'
          ? `Não foi possível fechar ${this.oCiclo}. Tente de novo.`
          : `Não foi possível reabrir ${this.oCiclo}. Tente de novo.`);
        if (mensagem === null) {
          this.janela = null;
          return;
        }
        const pendencias = qual === 'fechar' ? pendenciasDoErro(erro) : [];
        if (pendencias.length > 0) {
          // O servidor diz o que falta: a lista fica na tela, com os links, e recebe o foco
          this.janela = null;
          this.itens = this.comLinks(pendencias);
          this.notificacoes.error(mensagem);
          this.focoPendente = 'pe-fechamento-pendencias';
          return;
        }
        if ((erro as { status?: number } | null)?.status === 409) {
          // A situação mudou por fora (outra pessoa fechou ou reabriu): os ciclos vêm de novo
          this.janela = null;
          this.notificacoes.error(mensagem);
          this.mudou.emit(this.ciclo);
          return;
        }
        this.erroServidor = mensagem;
        this.focoPendente = 'pe-fechamento-erro-servidor';
      }
    });
  }

  /** Cada pendência com o link para o passo dela (pelo id; senão pelo número), já no ciclo. */
  private comLinks(pendencias: PePendenciaCiclo[]): ItemPendencia[] {
    const passos = this.estadoService.atual?.passos ?? [];
    return pendencias.map((p, i) => {
      const achado = (p.PassoId ? passos.find(x => x.doOrgao?.Id === p.PassoId) : undefined)
        ?? (p.PassoNumero ? passos.find(x => x.numero === p.PassoNumero) : undefined);
      const numero = achado?.numero ?? p.PassoNumero ?? null;
      const titulo = p.PassoTitulo ?? achado?.titulo ?? null;
      const rotulo = numero ? `Passo ${numero}${titulo ? ' · ' + titulo : ''}` : (titulo ?? '');
      return {
        chave: `${i}:${p.Motivo}`,
        pendencia: p,
        rota: achado?.rota ?? null,
        query: achado ? { passo: achado.numero, ciclo: this.ciclo.Id } : null,
        rotulo
      };
    });
  }
}
