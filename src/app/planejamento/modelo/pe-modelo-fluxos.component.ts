import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { PeFluxoEditorComponent } from '../fluxos/pe-fluxo-editor.component';
import { PeFluxosService, PeFonteFluxos } from '../services/pe-fluxos.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

/**
 * Fluxos-modelo (passo 1.5 do administrador do módulo; só ele e o admin do
 * SGDP, pelo `meu-papel`): os fluxos do Guia de PDTIC que os órgãos copiam e
 * adaptam, no mesmo editor do órgão (o visual, de arrastar e soltar, e o em
 * lista: raias, passos, decisões, paralelos, documentos e o desenho). Os demais papéis veem um aviso e a tela
 * não consulta nada. Sair com mudança não salva pergunta antes (guarda de rota).
 */
@Component({
  selector: 'app-pe-modelo-fluxos',
  standalone: true,
  imports: [CommonModule, CitaPlanejamentoDirective, PeFluxoEditorComponent],
  templateUrl: './pe-modelo-fluxos.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeModeloFluxosComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly fluxosService = inject(PeFluxosService);
  private readonly destroyRef = inject(DestroyRef);

  pode: boolean | null = null;
  erroPapel = false;
  fonte: PeFonteFluxos | null = null;
  private sujo = false;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.pode = this.estadoService.podeConfigurar;
        this.erroPapel = estado.consultaPapel === 'erro';
        if (this.pode && !this.fonte) this.fonte = this.fluxosService.fonteDoModelo(true);
      });
  }

  tentarDeNovo(): void {
    this.estadoService.iniciar();
  }

  aoAlterar(sujo: boolean): void {
    this.sujo = sujo;
  }

  /** Guarda de rota: com o fluxo mudado e não salvo, ela pergunta antes de sair (F1, A04). */
  podeSair(): boolean {
    return !this.sujo;
  }

  textoSaida(): string {
    return 'Há mudanças no fluxo-modelo que ainda não foram salvas. Se sair agora, elas se perdem.';
  }
}
