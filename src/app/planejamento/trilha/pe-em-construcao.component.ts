import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { PeTrilhaEstadoService } from './pe-trilha-estado.service';
import {
  BASE_PE, PassoNumeradoPe, PassoTrilhaPe, TELAS_CENTRAIS_EM_CONSTRUCAO,
  passoDaUrl, passoDeQualquerTrilha, passoDoOrgao, rotuloGuia
} from './pe-trilhas';

const PREFIXO_PASSO_ORGAO = `${BASE_PE}/pdtic/`;

/**
 * Tela de um passo que ainda não tem tela própria: mostra o título e o "o que
 * fazer" do passo e diz, em linguagem simples, que a tela chega numa próxima
 * etapa do desenvolvimento. Serve às telas centrais ainda sem tela (uma rota
 * por tela) e aos passos do órgão (`pdtic/:passo`, a rota que a tela genérica do
 * passo vai ocupar quando o modelo configurável chegar).
 *
 * Aberta fora da trilha de quem está vendo (link direto, ou o admin do SGDP em
 * outra trilha), o passo é procurado nas outras trilhas, sem número.
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
    // A mesma instância serve a todos os passos do órgão (pdtic/:passo)
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
    // Lido da própria URL (e não do snapshot da rota): só vale na rota dos passos do órgão
    const codigo = caminho.startsWith(PREFIXO_PASSO_ORGAO) ? caminho.slice(PREFIXO_PASSO_ORGAO.length) : null;

    // Passo do órgão com código desconhecido: volta para a visão geral
    if (codigo !== null && !passoDoOrgao(codigo)) {
      this.router.navigate([BASE_PE], { replaceUrl: true });
      return;
    }

    this.numerado = passoDaUrl(this.estadoService.atual?.passos ?? [], url);
    this.passo = this.numerado ?? passoDeQualquerTrilha(caminho);
    this.tituloTela = TELAS_CENTRAIS_EM_CONSTRUCAO[caminho.slice(BASE_PE.length + 1)] ?? 'Tela em construção';
  }
}
