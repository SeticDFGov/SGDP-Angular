import {
  AfterViewChecked, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, PLATFORM_ID, SimpleChanges, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PeCiclo, PePendenciaCiclo } from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { PeCiclosService } from '../services/pe-ciclos.service';
import {
  ResumoAvaliacao, acoesSemSituacao, cicloAceitaDados, classeSituacaoCiclo, iconeSituacaoCiclo, oCiclo, partesDaAvaliacao,
  pendenciasDoErro, periodoCiclo, rotuloSituacaoCiclo
} from '../shared/pe-ciclos-rotulos';
import { rotuloSituacaoVersao } from '../shared/pe-documento-rotulos';
import { mensagemErroPe } from '../shared/pe-erros';
import { plural } from '../shared/pe-pdtic-rotulos';
import { nomeDeQuem, textoData, textoDataHora } from '../shared/registros/pe-valores';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

/** Uma pendência do fechamento com o link para o passo dela, já no ciclo (null quando o passo não está na trilha). */
interface ItemPendencia {
  chave: string;
  pendencia: PePendenciaCiclo;
  rota: string | null;
  query: Record<string, string | number> | null;
  rotulo: string;
  /** A pendência é deste mesmo passo: um link não sairia do lugar (F1, C13). */
  nestePasso: boolean;
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
  templateUrl: './pe-ciclo-fechamento.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeCicloFechamentoComponent implements OnChanges, AfterViewChecked, OnDestroy {
  private readonly ciclosService = inject(PeCiclosService);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly notificacoes = inject(NotificationService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) ciclo!: PeCiclo;
  /** O passo aceita gravação agora (equipe do órgão com o PDTIC publicado ou em acompanhamento). */
  @Input() podeEditar = false;
  /** Há mudança não salva no passo: o fechamento espera. */
  @Input() mudancaPendente = false;
  /** O nível tem o resumo do ciclo (5.2): o fechamento também o exige e gera o RA (no Básico, não gera). */
  @Input() exigeResumo = false;
  /** O PDTIC (o que a avaliação tem, lido das seções dela, F1). */
  @Input() pdticId: number | null = null;
  /** O passo da tela (a pendência deste mesmo passo leva à célula, não a um link que não sai do lugar). */
  @Input() passoId: number | null = null;
  @Output() readonly mudou = new EventEmitter<PeCiclo>();

  janela: 'fechar' | 'reabrir' | null = null;
  gravando = false;
  itens: ItemPendencia[] = [];
  erroServidor: string | null = null;
  /** F1 (C23): o que a avaliação tem (os resultados das metas, a análise e a decisão do comitê). */
  partesAvaliacao: ReturnType<typeof partesDaAvaliacao> | null = null;
  private focoPendente: string | null = null;
  private cargaAvaliacao?: Subscription;

  ngOnChanges(mudancas: SimpleChanges): void {
    const m = mudancas['ciclo'];
    const antes = m?.previousValue as PeCiclo | undefined;
    if (m && antes?.Id !== this.ciclo.Id) {
      // Outro ciclo: as pendências eram do anterior
      this.itens = [];
      this.erroServidor = null;
      this.janela = null;
      this.partesAvaliacao = null;
    } else if (m && antes && this.itens.length > 0) {
      // O ciclo veio de novo, com o resumo de agora: algo foi salvo no passo (a grade, uma seção), e a
      // lista das pendências era da tentativa anterior (F1, C12); a próxima tentativa diz o que ainda falta
      this.itens = [];
    }
    if ((m || mudancas['pdticId']) && this.avaliacao) this.carregarAvaliacao();
  }

  ngOnDestroy(): void {
    this.cargaAvaliacao?.unsubscribe();
  }

  /** O que a avaliação tem, pelas seções dela no ciclo (vem de novo a cada vez que o ciclo vem de novo). */
  private carregarAvaliacao(): void {
    this.cargaAvaliacao?.unsubscribe();
    const pdticId = this.pdticId;
    if (pdticId === null) return;
    const cicloId = this.ciclo.Id;
    this.cargaAvaliacao = this.ciclosService.resumoDaAvaliacao(pdticId, cicloId, this.ciclo.Resumo).subscribe((r: ResumoAvaliacao) => {
      if (this.ciclo.Id === cicloId) this.partesAvaliacao = partesDaAvaliacao(r);
    });
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

  /** "24/09/2026 às 14:05 por Tereza do Teste" (o nome, F1, C19; sem ele, o e-mail). */
  get fechadoEm(): string {
    const quem = nomeDeQuem(this.ciclo.FechadoPorNome, this.ciclo.FechadoPor);
    return quem ? `${textoDataHora(this.ciclo.FechadoEm)} por ${quem}` : textoDataHora(this.ciclo.FechadoEm);
  }

  /**
   * A pendência deste mesmo passo (F1, C13): o foco vai à primeira situação vazia
   * da grade das ações (a ação que falta); sem ela, ao título da grade ou da
   * primeira seção do passo.
   */
  irParaPendencia(): void {
    if (!this.noNavegador) return;
    const situacoes = Array.from(document.querySelectorAll<HTMLSelectElement>('select[id^="pe-grade-acoes-"][id$="-situacao"]'));
    const alvo: HTMLElement | null = situacoes.find(s => !s.value) ?? document.getElementById('pe-grade-acoes-titulo')
      ?? document.querySelector<HTMLElement>('[id^="pe-secao-"][id$="-titulo"]');
    if (!alvo) return;
    alvo.scrollIntoView({ block: 'center' });
    alvo.focus();
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
      const nestePasso = this.passoId !== null && (achado?.doOrgao?.Id ?? p.PassoId ?? null) === this.passoId;
      return {
        chave: `${i}:${p.Motivo}`,
        pendencia: p,
        rota: achado?.rota ?? null,
        query: achado ? { passo: achado.numero, ciclo: this.ciclo.Id } : null,
        rotulo,
        nestePasso
      };
    });
  }
}
