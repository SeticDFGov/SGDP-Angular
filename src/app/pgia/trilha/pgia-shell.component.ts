import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { CitaDecretoDirective } from '../shared/cita-decreto.directive';
import { EstadoTrilha, PgiaTrilhaEstadoService } from './pgia-trilha-estado.service';
import { EstadoPasso, StatusPasso } from './pgia-trilha-status.service';
import {
  EtapaTrilha, PERFIS_TRILHA, PassoNumerado, PerfilTrilha, ROTULOS_PERFIL_TRILHA
} from './pgia-trilhas';

/**
 * Moldura de todas as telas do PGIA: a trilha numerada do papel do usuário fica
 * sempre à vista: etapas (1, 2, 3...) e os passos da etapa aberta (2.1, 2.2...),
 * com o que fazer, a base legal e o prazo. O conteúdo troca embaixo, sem sair do
 * lugar, e "Anterior"/"Próximo passo" levam adiante na ordem do decreto.
 *
 * As telas continuam as mesmas (uma por formulário, rota `area/:secao`): a
 * moldura é a rota-mãe, então trocar de passo não recria a trilha.
 */
@Component({
  selector: 'app-pgia-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaDecretoDirective],
  templateUrl: './pgia-shell.component.html'
})
export class PgiaShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly estadoService = inject(PgiaTrilhaEstadoService);

  readonly perfis = PERFIS_TRILHA;
  readonly rotulosPerfil = ROTULOS_PERFIL_TRILHA;

  estado: EstadoTrilha | null = null;
  rotaAtual = '';
  passoAtual: PassoNumerado | null = null;
  /** Etapa aberta na barra (a do passo atual, ou a escolhida pelo usuário). */
  etapaAberta: number | null = null;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        const trocouTrilha = estado?.perfil !== this.estado?.perfil;
        this.estado = estado;
        if (trocouTrilha) this.lerUrl(this.router.url);
      });
    this.estadoService.iniciar();

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(e => {
        const anterior = this.passoAtual?.numero;
        this.lerUrl((e as NavigationEnd).urlAfterRedirects);
        if (this.passoAtual?.numero !== anterior) this.estadoService.atualizarStatus();
      });
  }

  // ── Leitura da posição ────────────────────────────────────────────────────

  get naVisaoGeral(): boolean {
    return this.rotaAtual === '/pgia';
  }

  get etapa(): EtapaTrilha | null {
    return this.estado && this.etapaAberta !== null ? this.estado.trilha.etapas[this.etapaAberta] ?? null : null;
  }

  passosDaEtapa(indice: number): PassoNumerado[] {
    return this.estado?.passos.filter(p => p.etapa === indice) ?? [];
  }

  get anterior(): PassoNumerado | null {
    if (!this.estado || !this.passoAtual) return null;
    return this.estado.passos[this.passoAtual.indice - 1] ?? null;
  }

  get proximo(): PassoNumerado | null {
    if (!this.estado || !this.passoAtual) return null;
    return this.estado.passos[this.passoAtual.indice + 1] ?? null;
  }

  /** Telas do módulo que não são passo da trilha (ex.: Prazos) ganham um título. */
  get atalhoAtual(): string | null {
    return this.estado?.trilha.atalhos.find(a => a.rota === this.rotaAtual)?.rotulo ?? null;
  }

  private lerUrl(url: string): void {
    const [caminho, query] = url.split('#')[0].split('?');
    this.rotaAtual = caminho;
    const pedido = new URLSearchParams(query ?? '').get('passo');

    const candidatos = this.estado?.passos.filter(p => p.rota === caminho) ?? [];
    // Duas etapas podem usar a mesma tela (ex.: lista de sistemas e AIA): o
    // ?passo= da navegação pela trilha desempata
    this.passoAtual = candidatos.find(p => p.numero === pedido) ?? candidatos[0] ?? null;

    if (this.passoAtual) this.etapaAberta = this.passoAtual.etapa;
    else if (this.naVisaoGeral || this.atalhoAtual) this.etapaAberta = null;
  }

  // ── Status ────────────────────────────────────────────────────────────────

  status(passo: PassoNumerado): StatusPasso | null {
    return this.estadoService.statusDoPasso(passo);
  }

  /** Pior situação entre os passos da etapa (vale para a bolinha da barra). */
  estadoEtapa(indice: number): EstadoPasso {
    const estados = this.passosDaEtapa(indice).map(p => this.status(p)?.estado ?? 'continuo');
    for (const e of ['atrasado', 'atencao', 'pendente'] as EstadoPasso[]) {
      if (estados.includes(e)) return e;
    }
    return estados.length > 0 && estados.every(e => e === 'feito') ? 'feito' : 'continuo';
  }

  classeEstado(estado: EstadoPasso | undefined): string {
    switch (estado) {
      case 'feito': return 'bg-green-50 text-green-800 border-green-200';
      case 'atrasado': return 'bg-red-50 text-red-800 border-red-200';
      case 'atencao': return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'pendente': return 'bg-blue-50 text-blue-800 border-blue-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  }

  iconeEstado(estado: EstadoPasso | undefined): string {
    switch (estado) {
      case 'feito': return 'check_circle';
      case 'atrasado': return 'error';
      case 'atencao': return 'notifications_active';
      case 'pendente': return 'schedule';
      default: return 'autorenew';
    }
  }

  corBolinha(indice: number): string {
    switch (this.estadoEtapa(indice)) {
      case 'feito': return 'bg-green-500';
      case 'atrasado': return 'bg-red-500';
      case 'atencao': return 'bg-amber-500';
      case 'pendente': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  }

  // ── Navegação ─────────────────────────────────────────────────────────────

  irPara(passo: PassoNumerado): void {
    this.router.navigate([passo.rota], { queryParams: { passo: passo.numero } });
  }

  abrirEtapa(indice: number): void {
    const primeiro = this.passosDaEtapa(indice)[0];
    if (primeiro) this.irPara(primeiro);
  }

  trocarVisao(perfil: PerfilTrilha): void {
    this.estadoService.trocarVisao(perfil);
    // Outra trilha, outras telas: recomeça pela visão geral
    this.router.navigate(['/pgia']);
  }
}
