import { Component, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  PeCiclo, PePainelAcao, PePainelAcompanhamento, PePainelMeta, PePdtic
} from '../../../api/planejamento/interface';
import { PeCiclosService } from '../services/pe-ciclos.service';
import {
  NIVEIS_RISCO, SITUACOES_RISCO, ciclosEmOrdem, classeSituacaoFisica, contagemDe, iconeSituacaoFisica, percentualDaBarra,
  quantidadeNaMatriz, rotuloSituacaoCiclo, rotuloSituacaoFisica, textoPercentual
} from '../shared/pe-ciclos-rotulos';
import { mensagemErroPe } from '../shared/pe-erros';
import { textoData } from '../shared/registros/pe-valores';

/** Uma linha dos quadros dos riscos (contagem pela situação ou pelo nível). */
interface LinhaQuadro {
  chave: string;
  rotulo: string;
  quantidade: number;
  cor: string | null;
}

/** Uma linha da matriz situação por nível. */
interface LinhaMatriz {
  chave: string;
  rotulo: string;
  celulas: { chave: string; quantidade: number }[];
  total: number;
}

/**
 * Painel de acompanhamento do PDTIC (AC-PDTIC, Anexo XIII do guia), na visão
 * geral do órgão depois da publicação (E7 rodada B):
 *
 * - as metas, cada uma com o indicador, o valor, o prazo, as necessidades e o
 *   percentual de execução (a média das ações ligadas), e as ações dela numa
 *   tabela: o percentual da ação (a execução física no último ciclo com dado), a
 *   situação física em texto (em dia, atrasada, concluída, cancelada, sem
 *   registro; a cor só acompanha) e a execução orçamentária ("Não se aplica"
 *   quando a ação não tem investimento nem custeio);
 * - os quadros dos riscos, com as contagens em tabela e a legenda: por situação
 *   (a última ocorrência de cada risco; os que nunca ocorreram contam à parte),
 *   por nível e a matriz situação por nível.
 *
 * O ciclo do painel é o último com dado (o servidor escolhe); a pessoa pode ver
 * outro ciclo já começado, pela lista e o botão "Ver" (as setas não trocam).
 */
@Component({
  selector: 'app-pe-painel-acompanhamento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pe-painel-acompanhamento.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PePainelAcompanhamentoComponent implements OnChanges, OnDestroy {
  private readonly ciclosService = inject(PeCiclosService);

  @Input({ required: true }) pdtic!: PePdtic;

  readonly situacoesRisco = SITUACOES_RISCO;
  readonly niveisRisco = NIVEIS_RISCO;

  painel: PePainelAcompanhamento | null = null;
  carregando = false;
  erro: string | null = null;
  /** Os ciclos de monitoramento já começados (a escolha do ciclo do painel). */
  ciclos: PeCiclo[] = [];
  /** A escolha da lista, confirmada no "Ver" (null: o último com dado). */
  escolha: number | null = null;
  private cicloPedido: number | null = null;

  porSituacao: LinhaQuadro[] = [];
  porNivel: LinhaQuadro[] = [];
  matriz: LinhaMatriz[] = [];
  totalRiscos = 0;

  private chave = '';
  private carga?: Subscription;

  ngOnChanges(): void {
    const chave = `${this.pdtic.Id}:${this.pdtic.Situacao}`;
    if (chave === this.chave) return;
    const outro = !this.chave.startsWith(`${this.pdtic.Id}:`);
    this.chave = chave;
    if (outro) {
      this.painel = null;
      this.escolha = null;
      this.cicloPedido = null;
      this.ciclos = [];
      this.carregarCiclos();
    }
    this.carregar();
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
  }

  /** Os ciclos de monitoramento que já começaram (sem eles, a lista não aparece). */
  private carregarCiclos(): void {
    const id = this.pdtic.Id;
    this.ciclosService.listar(id, 'monitoramento').subscribe({
      next: lista => {
        if (this.pdtic.Id !== id) return;
        this.ciclos = ciclosEmOrdem(lista).filter(c => c.Situacao !== 'futuro');
      },
      // Sem a lista, o painel fica no ciclo que o servidor escolher
      error: () => undefined
    });
  }

  carregar(): void {
    const id = this.pdtic.Id;
    const ciclo = this.cicloPedido;
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.carga = this.ciclosService.painel(id, ciclo).subscribe({
      next: painel => {
        this.carregando = false;
        if (this.pdtic.Id !== id) return;
        this.aplicar(painel);
      },
      error: erro => {
        this.carregando = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar o painel de acompanhamento.');
        if (mensagem !== null) this.erro = mensagem;
      }
    });
  }

  /** F1 (C02): as ações sem meta ligada (no Básico, todas), na mesma tabela das ações das metas. */
  acoesSemMeta: PePainelAcao[] = [];

  private aplicar(painel: PePainelAcompanhamento): void {
    this.painel = { ...painel, Metas: painel?.Metas ?? [] };
    this.acoesSemMeta = painel?.AcoesSemMeta ?? [];
    if (this.escolha === null && painel?.Ciclo) this.escolha = painel.Ciclo.Id;
    const riscos = painel?.Riscos;
    this.porSituacao = SITUACOES_RISCO.map(s => ({
      chave: s.chave, rotulo: s.rotulo, quantidade: contagemDe(riscos?.PorSituacao, s.chave), cor: null
    }));
    this.porNivel = NIVEIS_RISCO.map(n => ({ chave: n.chave, rotulo: n.rotulo, quantidade: contagemDe(riscos?.PorNivel, n.chave), cor: n.cor }));
    this.matriz = SITUACOES_RISCO.map(s => {
      const celulas = NIVEIS_RISCO.map(n => ({ chave: n.chave, quantidade: quantidadeNaMatriz(riscos?.Matriz, s.chave, n.chave) }));
      return { chave: s.chave, rotulo: s.rotulo, celulas, total: celulas.reduce((t, c) => t + c.quantidade, 0) };
    });
    this.totalRiscos = this.porSituacao.reduce((t, l) => t + l.quantidade, 0);
  }

  /** "Ver" o painel no ciclo escolhido na lista. */
  verCiclo(): void {
    if (this.escolha === null || this.escolha === (this.painel?.Ciclo?.Id ?? null)) return;
    this.cicloPedido = this.escolha;
    this.carregar();
  }

  // ── Rótulos ───────────────────────────────────────────────────────────────

  opcao(c: PeCiclo): string {
    return `${c.Rotulo} · ${rotuloSituacaoCiclo(c.Situacao)}`;
  }

  percentual(valor: number | null | undefined): string {
    return textoPercentual(valor);
  }

  barra(valor: number | null | undefined): number | null {
    return percentualDaBarra(valor);
  }

  prazo(m: PePainelMeta): string {
    return m.Prazo ? textoData(m.Prazo) : '-';
  }

  necessidades(m: PePainelMeta): string {
    const lista = (m.Necessidades ?? []).filter(Boolean);
    return lista.length ? lista.join(', ') : '-';
  }

  rotuloFisica(a: PePainelAcao): string {
    return rotuloSituacaoFisica(a.SituacaoFisica);
  }

  classeFisica(a: PePainelAcao): string {
    return classeSituacaoFisica(a.SituacaoFisica);
  }

  iconeFisica(a: PePainelAcao): string {
    return iconeSituacaoFisica(a.SituacaoFisica);
  }

  orcamentaria(a: PePainelAcao): string {
    return a.OrcamentoNaoSeAplica ? 'Não se aplica' : textoPercentual(a.ExecucaoOrcamentaria);
  }

  porMeta(_: number, m: PePainelMeta): number {
    return m.MetaId;
  }

  porAcao(_: number, a: PePainelAcao): number {
    return a.AcaoId;
  }

  porChave(_: number, l: { chave: string }): string {
    return l.chave;
  }

  porId(_: number, c: PeCiclo): number {
    return c.Id;
  }
}
