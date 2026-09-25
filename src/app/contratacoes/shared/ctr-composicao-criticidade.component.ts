import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PONTOS_MINIMOS_ALTA,
  PONTOS_MINIMOS_MEDIA,
  RESPOSTA_DESCONHECIDO,
  RespostasCriticidade,
  composicaoCriticidade,
  respostaAnteriorII
} from '../../../api/contratacoes/criticidade';

/** Uma linha da tabela da composição. */
interface LinhaComposicao {
  codigo: string;
  rotulo: string;
  resposta: string;
  /** Referência mostrada no II enquanto só há a resposta à pergunta anterior. */
  anterior: string | null;
  pontos: number;
}

/**
 * Composição da soma da criticidade (pedido de 2026-09-24): os pontos de cada critério,
 * de I a VII, a soma e a regra do VII, que decide Alta sozinho. Usada na prévia ao vivo
 * do formulário (pontos calculados aqui, pelo espelho da regra em `criticidade.ts`) e na
 * página do processo (pontos que o servidor devolveu em `PontosPorCriterio`). Só
 * apresentação: a criticidade gravada é sempre a do servidor.
 *
 * As linhas são montadas no `ngOnChanges`: quem usa passa o objeto das respostas, que só
 * troca quando uma resposta muda (o formulário cria um objeto novo a cada escolha).
 */
@Component({
  selector: 'app-ctr-composicao-criticidade',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overflow-x-auto" tabindex="0" role="region" [attr.aria-label]="titulo">
      <table class="w-full text-sm">
        <caption class="text-left text-xs font-semibold text-gray-700 mb-1">{{ titulo }}</caption>
        <thead>
          <tr class="bg-blue-50 text-blue-900 text-left text-xs">
            <th scope="col" class="px-3 py-2">Critério</th>
            <th scope="col" class="px-3 py-2">Resposta considerada</th>
            <th scope="col" class="px-3 py-2 text-right">Pontos</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let l of linhas; trackBy: porCodigo" class="border-b border-gray-200 align-top">
            <th scope="row" class="px-3 py-2 text-left font-normal text-gray-800">
              <span class="font-semibold text-blue-900">{{ l.codigo }}.</span> {{ l.rotulo }}
            </th>
            <td class="px-3 py-2 text-gray-800">
              {{ l.resposta }}
              <span *ngIf="l.anterior" class="block text-xs text-gray-600">resposta à pergunta anterior: {{ l.anterior }}</span>
            </td>
            <td class="px-3 py-2 text-right whitespace-nowrap">
              <ng-container *ngIf="l.codigo !== 'VII'">{{ sinal(l.pontos) }}</ng-container>
              <ng-container *ngIf="l.codigo === 'VII'">{{ l.resposta === 'Sim' ? 'decide Alta' : 'não soma' }}</ng-container>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="font-semibold text-gray-900">
            <th scope="row" colspan="2" class="px-3 py-2 text-left">Soma dos pontos</th>
            <td class="px-3 py-2 text-right whitespace-nowrap">{{ total }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p class="text-xs text-gray-600 mt-2">
      <ng-container *ngIf="soma < 0">A soma deu {{ soma }}, mas nunca fica negativa: conta como 0. </ng-container>
      De 0 a {{ minimaMedia - 1 }} pontos é Baixa, de {{ minimaMedia }} a {{ minimaAlta - 1 }} é Média e com
      {{ minimaAlta }} ou mais é Alta. Com o critério VII em Sim, a criticidade é Alta, seja qual for a soma<ng-container
      *ngIf="valorNoLimite">, e é o caso deste processo</ng-container>.
    </p>
  `
})
export class CtrComposicaoCriticidadeComponent implements OnChanges {
  /** Respostas (as do formulário ou as gravadas); critério ausente vale a resposta padrão. */
  @Input({ required: true }) respostas!: RespostasCriticidade;
  /** Pontos que o servidor devolveu; sem eles, a conta é feita aqui (prévia). */
  @Input() pontosDoServidor: Record<string, number> | null = null;
  @Input() titulo = 'Composição da criticidade';

  readonly minimaMedia = PONTOS_MINIMOS_MEDIA;
  readonly minimaAlta = PONTOS_MINIMOS_ALTA;

  linhas: LinhaComposicao[] = [];
  /** Soma sem o piso de zero (só aparece quando fica negativa). */
  soma = 0;
  total = 0;
  valorNoLimite = false;

  ngOnChanges(): void {
    const respostas = this.respostas ?? {};
    const anterior = respostaAnteriorII(respostas);
    this.linhas = composicaoCriticidade(respostas).map(p => ({
      codigo: p.codigo,
      rotulo: p.rotulo,
      // A resposta à pergunta anterior do II conta como Desconhecido
      resposta: p.codigo === 'II' && anterior ? RESPOSTA_DESCONHECIDO : p.resposta,
      anterior: p.codigo === 'II' ? anterior : null,
      pontos: this.pontosDoServidor?.[p.codigo] ?? p.pontos
    }));
    this.soma = this.linhas.reduce((total, l) => total + l.pontos, 0);
    this.total = Math.max(0, this.soma);
    this.valorNoLimite = respostas['VII'] === 'Sim';
  }

  porCodigo(_: number, linha: LinhaComposicao): string {
    return linha.codigo;
  }

  /** "+3", "0", "-1". */
  sinal(pontos: number): string {
    return pontos > 0 ? `+${pontos}` : String(pontos);
  }
}
