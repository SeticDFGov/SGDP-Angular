import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CtrProcesso } from '../../../api/contratacoes/interface';
import { situacaoTerminal } from './ctr-rotulos';

/** Uma etapa do trâmite, como a linha do tempo mostra. */
interface EtapaTramite {
  rotulo: string;
  /** O que a data da etapa significa (chegada ou retorno). */
  acao: string;
  data: string | null;
  naoSeAplica: boolean;
  /** Última etapa com data: é onde o processo está agora. */
  atual: boolean;
}

/**
 * Linha do tempo do trâmite de um processo: SGDI, SUBGD, UGTIC, Gab SGDI,
 * órgão comunicante, a nota informativa (quando enviada) e, por fim, a assinatura do
 * contrato (a data que conclui o processo), com a data de cada etapa, as dispensadas ("não se aplica") e
 * onde o processo está agora. Só apresentação: as datas e a situação vêm
 * prontas do servidor (a situação é derivada lá).
 */
@Component({
  selector: 'app-ctr-tramite',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ol class="flex flex-wrap items-start gap-2" aria-label="Trâmite do processo">
      <li *ngFor="let e of etapas; let ultimo = last" class="flex items-start gap-2">
        <div class="flex flex-col items-center text-center w-24">
          <span class="w-8 h-8 rounded-full flex items-center justify-center border-2"
                [ngClass]="e.atual ? 'bg-blue-600 border-blue-600 text-white'
                  : e.data ? 'bg-green-700 border-green-700 text-white'
                  : e.naoSeAplica ? 'bg-white border-dashed border-gray-300 text-gray-500'
                  : 'bg-white border-gray-300 text-gray-500'">
            <span class="material-icons text-base leading-none" aria-hidden="true">{{
              e.data ? (e.atual ? 'place' : 'check') : (e.naoSeAplica ? 'remove' : 'more_horiz') }}</span>
          </span>
          <span class="mt-1 text-xs font-semibold" [ngClass]="e.atual ? 'text-blue-800' : 'text-gray-700'">{{ e.rotulo }}</span>
          <span class="text-[0.6875rem] text-gray-500">
            <ng-container *ngIf="e.data">{{ e.acao }} {{ e.data | date:'dd/MM/yyyy':'UTC' }}</ng-container>
            <ng-container *ngIf="!e.data && e.naoSeAplica">não se aplica</ng-container>
            <ng-container *ngIf="!e.data && !e.naoSeAplica">pendente</ng-container>
          </span>
        </div>
        <span *ngIf="!ultimo" class="material-icons text-gray-300 mt-1" aria-hidden="true">chevron_right</span>
      </li>
    </ol>
  `
})
export class CtrTramiteComponent implements OnChanges {
  @Input({ required: true }) processo!: CtrProcesso;

  /** Montadas quando o processo chega (a página troca o objeto a cada carga ou salvamento). */
  etapas: EtapaTramite[] = [];

  ngOnChanges(): void {
    this.etapas = CtrTramiteComponent.montar(this.processo);
  }

  private static montar(p: CtrProcesso): EtapaTramite[] {
    const etapas: EtapaTramite[] = [
      { rotulo: 'SGDI', acao: 'chegou em', data: p.ChegadaSgdi ?? null, naoSeAplica: false, atual: false },
      { rotulo: 'SUBGD', acao: 'chegou em', data: p.ChegadaSubgd ?? null, naoSeAplica: false, atual: false },
      { rotulo: 'UGTIC', acao: 'chegou em', data: p.ChegadaUgtic ?? null, naoSeAplica: p.UgticNaoSeAplica, atual: false },
      { rotulo: 'Gab SGDI', acao: 'voltou em', data: p.RetornoGabSgdi ?? null, naoSeAplica: false, atual: false },
      {
        rotulo: 'Órgão', acao: 'devolvido em', data: p.RetornoOrgao ?? null,
        naoSeAplica: p.RetornoOrgaoNaoSeAplica, atual: false
      },
      { rotulo: 'Contrato', acao: 'assinado em', data: p.DataAssinaturaContrato ?? null, naoSeAplica: false, atual: false }
    ];
    // A nota informativa só aparece quando foi enviada (nem todo processo a tem), antes do contrato
    if (p.NotaInformativaEnviadaEm) {
      etapas.splice(etapas.length - 1, 0,
        { rotulo: 'Nota informativa', acao: 'enviada em', data: p.NotaInformativaEnviadaEm, naoSeAplica: false, atual: false });
    }
    // Onde o processo está: a última etapa com data, enquanto a SGDI ainda age (nas
    // situações terminais e no restituído o processo não "está" em etapa nenhuma).
    const terminou = situacaoTerminal(p.Situacao) || p.Restituido;
    const ultima = etapas.map(e => !!e.data).lastIndexOf(true);
    if (!terminou && ultima >= 0) etapas[ultima].atual = true;
    return etapas;
  }
}
