import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CtrProcessoService } from '../services/ctr-processo.service';
import {
  badgeFase,
  badgeNivelRisco,
  badgeRiscoClassificado,
  badgeSituacao,
  corDiasSemMovimento
} from '../shared/ctr-rotulos';
import { CtrContagem, CtrPainel } from '../../../api/contratacoes/interface';

/**
 * Painel da área: contagens por situação, fase, classificação de riscos,
 * categoria e órgão, tempos médios entre as instâncias e a lista de processos
 * parados (gargalos).
 *
 * Os números vêm prontos do backend, sobre os mesmos processos ativos da
 * listagem — nada é recalculado aqui.
 */
@Component({
  selector: 'app-ctr-painel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ctr-painel.component.html'
})
export class CtrPainelComponent implements OnInit {
  painel: CtrPainel | null = null;
  carregando = true;
  /** Falha de carregamento vira mensagem na própria página, não toast. */
  erroCarregar: string | null = null;

  /** Limite de dias sem movimento que define o gargalo. */
  limiteDias = 15;

  badgeSituacao = badgeSituacao;
  badgeFase = badgeFase;
  badgeRiscoClassificado = badgeRiscoClassificado;
  badgeNivelRisco = badgeNivelRisco;
  corDiasSemMovimento = corDiasSemMovimento;

  constructor(private processoService: CtrProcessoService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    // Campo vazio manda `diasSemMovimento=null` e o backend responde 400: o
    // valor é saneado aqui e volta para a tela já corrigido.
    this.limiteDias = Math.min(365, Math.max(1, this.limiteDias || 15));
    this.carregando = true;
    this.erroCarregar = null;
    this.processoService.getPainel(this.limiteDias).subscribe({
      next: painel => {
        this.painel = painel;
        this.limiteDias = painel.LimiteDias ?? this.limiteDias;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.erroCarregar = 'Não foi possível carregar o painel. Tente de novo em instantes.';
      }
    });
  }

  /**
   * Os 4 resultados dos quesitos + "Não classificado", sempre presentes, na
   * ordem do servidor (quantidade desc, empate pela ordem do domínio).
   */
  get porRiscoClassificado(): CtrContagem[] {
    return this.painel?.PorRiscoClassificado ?? [];
  }

  /** Baixo, Médio, Alto, Extremo + "Sem riscos declarados", mesma regra. */
  get porNivelRiscoDeclarado(): CtrContagem[] {
    return this.painel?.PorNivelRiscoDeclarado ?? [];
  }

  /** Tempo médio em dias, com um decimal; sem amostra mostra travessão. */
  media(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return `${(Math.round(valor * 10) / 10).toLocaleString('pt-BR')} dia(s)`;
  }

  /** Largura da barra proporcional ao maior valor da lista. */
  proporcao(quantidade: number, lista: { Quantidade: number }[]): number {
    const maior = lista.reduce((max, item) => Math.max(max, item.Quantidade), 0);
    if (maior <= 0) return 0;
    return Math.round((quantidade / maior) * 100);
  }
}
