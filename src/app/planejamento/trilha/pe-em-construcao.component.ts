import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { PeTrilhaEstadoService } from './pe-trilha-estado.service';
import {
  BASE_PE, PassoNumeradoPe, PassoTrilhaPe, TELAS_CENTRAIS_EM_CONSTRUCAO,
  passoDaUrl, passoDeQualquerTrilha, rotuloGuia
} from './pe-trilhas';

/**
 * Tela central (administrador, SGDI e CGTIC) que ainda não existe: mostra o
 * título e o "o que fazer" do passo e diz, em linguagem simples, que a tela chega
 * numa próxima etapa do desenvolvimento. Uma rota por tela; cada entrega troca o
 * componente da sua rota pela tela real. (Os passos do órgão têm tela própria,
 * `pdtic/pe-passo-orgao.component.ts`.)
 *
 * Aberta fora da trilha de quem está vendo (link direto, ou o admin do SGDP em
 * outra trilha), o passo é procurado nas outras trilhas centrais, sem número.
 */
@Component({
  selector: 'app-pe-em-construcao',
  standalone: true,
  imports: [CommonModule, RouterModule, CitaPlanejamentoDirective],
  templateUrl: './pe-em-construcao.component.html'
})
export class PeEmConstrucaoComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly estadoService = inject(PeTrilhaEstadoService);

  readonly base = BASE_PE;

  /** Passo da trilha de quem está vendo (com número), quando a tela é dela. */
  numerado: PassoNumeradoPe | null = null;
  /** O passo, da trilha de quem está vendo ou de outra. */
  passo: PassoTrilhaPe | null = null;
  /** Título da tela, quando nenhuma trilha tem o passo. */
  tituloTela = '';

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ler());
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ler());
  }

  guia(passo: PassoTrilhaPe): string {
    return rotuloGuia(passo.guia);
  }

  private ler(): void {
    const url = this.router.url;
    const caminho = url.split('#')[0].split('?')[0];
    this.numerado = passoDaUrl(this.estadoService.atual?.passos ?? [], url);
    this.passo = this.numerado ?? passoDeQualquerTrilha(caminho);
    this.tituloTela = TELAS_CENTRAIS_EM_CONSTRUCAO[caminho.slice(BASE_PE.length + 1)] ?? 'Tela em construção';
  }
}
