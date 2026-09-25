import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PeInadimplencia } from '../../../api/planejamento/interface';
import {
  classeSituacaoInadimplencia, iconeSituacaoInadimplencia, rotuloMotivoInadimplencia, rotuloSituacaoInadimplencia,
  textoPrazoInadimplencia
} from '../shared/pe-inadimplencia-rotulos';
import { quandoPdtic } from '../shared/pe-pdtic-rotulos';
import { rotaPaginaOrgao } from '../trilha/pe-trilhas';

/**
 * Uma notificação da SGDI e o que aconteceu com ela (E8), só para ler: a
 * comunicação pendente, a situação (selo com ícone e texto), o prazo descumprido,
 * a notificação (data, documento e SEI), o prazo de 5 dias úteis em texto e,
 * conforme a situação, a justificativa aceita, o registro da inadimplência (motivo,
 * nota de motivação, comunicação ao controle interno) ou o saneamento.
 *
 * Usado na lista das inadimplências (com as ações ao lado), nas notificações do
 * próprio órgão (visão geral da equipe e da consulta do órgão) e na página do órgão.
 */
@Component({
  selector: 'app-pe-inadimplencia-detalhe',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pe-inadimplencia-detalhe.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeInadimplenciaDetalheComponent {
  @Input({ required: true }) item!: PeInadimplencia;
  /** Mostra o órgão com o link para a página dele (a lista de todos os órgãos). */
  @Input() mostrarOrgao = false;

  get situacao(): string {
    return rotuloSituacaoInadimplencia(this.item.Situacao, this.item.SituacaoRotulo);
  }

  get classeSituacao(): string {
    return classeSituacaoInadimplencia(this.item.Situacao);
  }

  get iconeSituacao(): string {
    return iconeSituacaoInadimplencia(this.item.Situacao);
  }

  get prazo(): string {
    return textoPrazoInadimplencia(this.item);
  }

  get motivo(): string {
    return rotuloMotivoInadimplencia(this.item.Motivo, this.item.MotivoRotulo);
  }

  get pagina(): string {
    return rotaPaginaOrgao(this.item.OrgaoId);
  }

  quando(valor: string | null | undefined): string {
    return quandoPdtic(valor);
  }

  /** "24/09/2026 às 14:05 por fulano@df.gov.br". */
  quandoEQuem(quando: string | null | undefined, quem: string | null | undefined): string {
    const data = quando ? quandoPdtic(quando) : '';
    if (data && quem) return `${data} por ${quem}`;
    return data || quem || '-';
  }
}
