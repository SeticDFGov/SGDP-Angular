import { Component, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PeModeloHistorico, PeNivel } from '../../../api/planejamento/interface';
import { PeModeloService } from '../services/pe-modelo.service';
import {
  MudancaHistorico, mudancasHistorico, nomeNoRetrato, normalizarEntidade, rotuloAcao, rotuloEntidade
} from './pe-modelo-rotulos';

interface LinhaHistorico {
  quando: string;
  quem: string | null;
  acao: string;
  /** "Passo: Liste as soluções..." no histórico geral; null no histórico de um item. */
  alvo: string | null;
  mudancas: MudancaHistorico[];
}

/**
 * "O que mudou" no modelo (GET api/planejamento/modelo/historico): de um item
 * (`entidade` e `entidadeId`) ou de tudo (sem os dois), do mais recente para o
 * mais antigo, com quem mudou, quando e o antes e depois de cada campo, em
 * linguagem simples. Pagina com "Carregar mais". Só para quem configura o modelo.
 */
@Component({
  selector: 'app-pe-historico',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pe-historico.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeHistoricoComponent implements OnChanges {
  private readonly modeloService = inject(PeModeloService);

  /** passo, secao, campo, nivel, etapa ou opcao; sem ela, o histórico de tudo. */
  @Input() entidade: string | null = null;
  @Input() entidadeId: number | null = null;
  /** Para dar nome aos níveis na mudança de situação. */
  @Input() niveis: PeNivel[] = [];
  /** Nome do item de cada linha, no histórico geral (a entidade chega normalizada: "passo", "campo"...). */
  @Input() nomeItem: ((entidade: string, id: number) => string | null) | null = null;
  @Input() vazio = 'Nenhuma mudança registrada ainda.';

  linhas: LinhaHistorico[] = [];
  pagina = 0;
  temMais = false;
  carregando = false;
  carregou = false;
  erro = false;
  private carga?: Subscription;

  ngOnChanges(): void {
    this.linhas = [];
    this.carregou = false;
    this.carregar(1);
  }

  carregarMais(): void {
    if (!this.carregando) this.carregar(this.pagina + 1);
  }

  /** Refaz a página que falhou: a primeira, ou a seguinte às já mostradas. */
  tentarDeNovo(): void {
    this.carregar(this.linhas.length ? this.pagina + 1 : 1);
  }

  private carregar(pagina: number): void {
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erro = false;
    this.carga = this.modeloService.historico({
      Entidade: this.entidade,
      EntidadeId: this.entidadeId,
      Page: pagina
    }).subscribe({
      next: resposta => {
        const novas = resposta.Items.map(h => this.linha(h));
        this.linhas = pagina === 1 ? novas : [...this.linhas, ...novas];
        this.pagina = resposta.CurrentPage || pagina;
        this.temMais = resposta.HasNextPage;
        this.carregando = false;
        this.carregou = true;
      },
      error: () => {
        this.carregando = false;
        this.erro = true;
      }
    });
  }

  private linha(h: PeModeloHistorico): LinhaHistorico {
    let alvo: string | null = null;
    if (!this.entidade) {
      const entidade = normalizarEntidade(h.Entidade);
      const nome = this.nomeItem?.(entidade, h.EntidadeId) ?? nomeNoRetrato(h.Antes, h.Depois);
      alvo = nome ? `${rotuloEntidade(h.Entidade)}: ${nome}` : `${rotuloEntidade(h.Entidade)} nº ${h.EntidadeId}`;
    }
    return {
      quando: h.AlteradoEm,
      quem: h.AlteradoPor,
      acao: rotuloAcao(h.Acao),
      alvo,
      mudancas: mudancasHistorico(h.Antes, h.Depois, this.niveis)
    };
  }
}
