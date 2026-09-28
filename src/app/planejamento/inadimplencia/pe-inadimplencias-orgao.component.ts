import { Component, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PeInadimplencia } from '../../../api/planejamento/interface';
import { mensagemErroPe } from '../shared/pe-erros';
import { inadimplenciaVigente } from '../shared/pe-inadimplencia-rotulos';
import { PeInadimplenciasService } from '../services/pe-inadimplencias.service';
import { PeInadimplenciaDetalheComponent } from './pe-inadimplencia-detalhe.component';

/**
 * As notificações da SGDI a um órgão, só para ler (E8): a equipe e a consulta do
 * órgão veem as do próprio órgão na visão geral e na tela das inadimplências (GET
 * orgaos/{id}/inadimplencias). As em aberto (notificado ou inadimplente) vêm
 * primeiro. Sem nenhuma, uma linha que diz isso; falha, mensagem com "Tentar de
 * novo".
 *
 * Não tem `citaPlanejamento` próprio: as telas que o usam já têm a diretiva no
 * raiz (duas no mesmo texto duplicariam os chips).
 */
@Component({
  selector: 'app-pe-inadimplencias-orgao',
  standalone: true,
  imports: [CommonModule, PeInadimplenciaDetalheComponent],
  templateUrl: './pe-inadimplencias-orgao.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeInadimplenciasOrgaoComponent implements OnChanges, OnDestroy {
  private readonly inadimplenciasService = inject(PeInadimplenciasService);

  @Input({ required: true }) orgaoId!: number;
  @Input() sigla = '';
  /** Nível do título do bloco (2 na visão geral; 3 dentro de uma tela com título próprio). */
  @Input() nivelTitulo: 2 | 3 = 2;

  itens: PeInadimplencia[] | null = null;
  carregando = false;
  erro: string | null = null;
  private carga?: Subscription;
  private orgaoCarregado: number | null = null;

  ngOnChanges(): void {
    if (this.orgaoId && this.orgaoId !== this.orgaoCarregado) this.carregar();
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
  }

  get emAberto(): number {
    return (this.itens ?? []).filter(i => inadimplenciaVigente(i.Situacao)).length;
  }

  carregar(): void {
    const orgao = this.orgaoId;
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.carga = this.inadimplenciasService.doOrgao(orgao).subscribe({
      next: lista => {
        this.carregando = false;
        this.orgaoCarregado = orgao;
        // As em aberto primeiro (o servidor já manda assim; a tela não depende disso)
        this.itens = [...lista].sort((a, b) => Number(inadimplenciaVigente(b.Situacao)) - Number(inadimplenciaVigente(a.Situacao)));
      },
      error: erro => {
        this.carregando = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar as notificações da SGDI ao órgão.');
        if (mensagem !== null) this.erro = mensagem;
      }
    });
  }

  porId(_: number, i: PeInadimplencia): number {
    return i.Id;
  }
}
