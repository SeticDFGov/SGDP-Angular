import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { PeSecaoRegistrosComponent } from '../shared/registros/pe-secao-registros.component';
import { PeFonteRegistros, PeRegistrosService } from '../services/pe-registros.service';

/** Os referenciais do DF que moram no catálogo do DF (seções de escopo `df`). */
export type ReferencialDf = 'principios' | 'diretrizes';

interface ConfigReferencial {
  /** Chave da seção no modelo. */
  secao: string;
  titulo: string;
  rotuloItem: string;
}

const REFERENCIAIS: Record<ReferencialDf, ConfigReferencial> = {
  principios: { secao: 'principio', titulo: 'Princípios da política', rotuloItem: 'princípio' },
  diretrizes: { secao: 'diretriz_ciclo', titulo: 'Diretrizes do ciclo', rotuloItem: 'diretriz' }
};

/**
 * Referenciais do catálogo do DF (dono `df`), numa tela cada (a rota diz qual):
 *
 * - Princípios (passo 2.1 do administrador): os onze do art. 4º do Decreto nº
 *   48.900/2026 vêm do sistema, com o fundamento que abre a dica do artigo, e não
 *   mudam; o administrador do módulo acrescenta outros (de uma resolução do CGTIC,
 *   por exemplo).
 * - Diretrizes do ciclo (passo 2.3): as diretrizes e prioridades do próximo ciclo
 *   de planejamento que a SGDI propõe ao comitê (art. 9º, VIII, do Decreto nº
 *   48.899/2026).
 *
 * Qualquer papel do módulo lê e baixa a planilha; incluir, editar e apagar é do
 * administrador do módulo e do admin do SGDP (o servidor diz em `PodeEditar`).
 * A seção usa os componentes genéricos de registros. A moldura só abre a tela
 * com o papel conferido.
 */
@Component({
  selector: 'app-pe-referencial-df',
  standalone: true,
  imports: [CommonModule, RouterModule, CitaPlanejamentoDirective, PeSecaoRegistrosComponent],
  templateUrl: './pe-referencial-df.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeReferencialDfComponent implements OnInit {
  private readonly rota = inject(ActivatedRoute);
  private readonly registrosService = inject(PeRegistrosService);

  referencial: ReferencialDf = 'principios';
  config: ConfigReferencial = REFERENCIAIS.principios;
  readonly fonte: PeFonteRegistros = this.registrosService.fonte({ tipo: 'df' });
  private sujo = false;

  ngOnInit(): void {
    const pedido = this.rota.snapshot.data['referencial'] as ReferencialDf | undefined;
    this.referencial = pedido && REFERENCIAIS[pedido] ? pedido : 'principios';
    this.config = REFERENCIAIS[this.referencial];
  }

  aoAlterar(sujo: boolean): void {
    this.sujo = sujo;
  }

  /** Guarda de rota: com mudança não salva no formulário ou no painel aberto, ela pergunta antes de sair (F1, A04). */
  podeSair(): boolean {
    return !this.sujo;
  }
}
