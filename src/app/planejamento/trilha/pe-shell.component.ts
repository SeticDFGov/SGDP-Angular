import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { EstadoTrilhaPe, PeTrilhaEstadoService } from './pe-trilha-estado.service';
import { EstadoPassoPe, StatusPassoPe } from './pe-trilha-status.service';
import {
  BASE_PE, EtapaTrilhaPe, PERFIS_TRILHA_PE, PassoNumeradoPe, PerfilTrilhaPe, ROTULOS_PERFIL_TRILHA_PE,
  passoDaUrl, rotuloGuia
} from './pe-trilhas';

/**
 * Moldura de todas as telas da Governança Estratégica, no molde da trilha do PGIA
 * (`pgia/trilha/pgia-shell.component.ts`): a trilha numerada do papel fica sempre
 * à vista (etapas 1, 2, 3... e os passos da etapa aberta, 2.1, 2.2...), com o que
 * fazer, a base legal e a atividade do guia. O conteúdo troca embaixo, e "Passo
 * anterior"/"Próximo passo" seguem a ordem da trilha.
 *
 * É a rota-mãe do módulo: trocar de passo não recria a trilha. O `citaPlanejamento`
 * fica só na seção da trilha, nunca no elemento que contém o `router-outlet`
 * (cada tela tem o seu no raiz; dois no mesmo texto duplicariam os chips).
 * Sem papel ou sem conseguir consultar o papel, a moldura mostra o aviso no lugar
 * da trilha e não abre tela nenhuma.
 */
@Component({
  selector: 'app-pe-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective],
  templateUrl: './pe-shell.component.html'
})
export class PeShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly estadoService = inject(PeTrilhaEstadoService);

  readonly perfis = PERFIS_TRILHA_PE;
  readonly rotulosPerfil = ROTULOS_PERFIL_TRILHA_PE;
  readonly base = BASE_PE;

  estado: EstadoTrilhaPe | null = null;
  rotaAtual = '';
  passoAtual: PassoNumeradoPe | null = null;
  /** Etapa aberta na barra (a do passo atual, ou a escolhida pelo usuário). */
  etapaAberta: number | null = null;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        const trocouTrilha = estado?.trilha !== this.estado?.trilha;
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
    return this.rotaAtual === BASE_PE;
  }

  get etapa(): EtapaTrilhaPe | null {
    const trilha = this.estado?.trilha;
    return trilha && this.etapaAberta !== null ? trilha.etapas[this.etapaAberta] ?? null : null;
  }

  passosDaEtapa(indice: number): PassoNumeradoPe[] {
    return this.estado?.passos.filter(p => p.etapa === indice) ?? [];
  }

  get anterior(): PassoNumeradoPe | null {
    if (!this.estado || !this.passoAtual) return null;
    return this.estado.passos[this.passoAtual.indice - 1] ?? null;
  }

  get proximo(): PassoNumeradoPe | null {
    if (!this.estado || !this.passoAtual) return null;
    return this.estado.passos[this.passoAtual.indice + 1] ?? null;
  }

  /** Sigla do órgão ao lado do nome da trilha (papéis de órgão). */
  get siglaOrgao(): string | null {
    return this.estado?.perfil === 'orgao' && !this.estado.adminGeral ? this.estado.meuPapel?.OrgaoSigla ?? null : null;
  }

  guia(passo: PassoNumeradoPe): string {
    return rotuloGuia(passo.guia);
  }

  private lerUrl(url: string): void {
    this.rotaAtual = url.split('#')[0].split('?')[0];
    this.passoAtual = passoDaUrl(this.estado?.passos ?? [], url);
    if (this.passoAtual) this.etapaAberta = this.passoAtual.etapa;
    else if (this.naVisaoGeral) this.etapaAberta = null;
  }

  // ── Status ────────────────────────────────────────────────────────────────

  status(passo: PassoNumeradoPe): StatusPassoPe | null {
    return this.estadoService.statusDoPasso(passo);
  }

  /** Pior situação entre os passos da etapa (vale para a bolinha da barra). */
  private estadoEtapa(indice: number): EstadoPassoPe | null {
    const estados = this.passosDaEtapa(indice).map(p => this.status(p)?.estado).filter((e): e is EstadoPassoPe => !!e);
    for (const e of ['atrasado', 'atencao', 'pendente'] as EstadoPassoPe[]) {
      if (estados.includes(e)) return e;
    }
    return estados.length > 0 ? 'feito' : null;
  }

  classeEstado(estado: EstadoPassoPe | undefined): string {
    switch (estado) {
      case 'feito': return 'bg-green-50 text-green-800 border-green-200';
      case 'atrasado': return 'bg-red-50 text-red-800 border-red-200';
      case 'atencao': return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'pendente': return 'bg-blue-50 text-blue-800 border-blue-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  }

  iconeEstado(estado: EstadoPassoPe | undefined): string {
    switch (estado) {
      case 'feito': return 'check_circle';
      case 'atrasado': return 'error';
      case 'atencao': return 'notifications_active';
      default: return 'schedule';
    }
  }

  corIconeEstado(estado: EstadoPassoPe): string {
    switch (estado) {
      case 'feito': return 'text-green-600';
      case 'atrasado': return 'text-red-600';
      case 'atencao': return 'text-amber-600';
      default: return 'text-blue-600';
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

  irPara(passo: PassoNumeradoPe): void {
    this.router.navigate([passo.rota], { queryParams: { passo: passo.numero } });
  }

  abrirEtapa(indice: number): void {
    const primeiro = this.passosDaEtapa(indice)[0];
    if (primeiro) this.irPara(primeiro);
  }

  trocarVisao(perfil: PerfilTrilhaPe): void {
    this.estadoService.trocarVisao(perfil);
    // Outra trilha, outras telas: recomeça pela visão geral
    this.router.navigate([BASE_PE]);
  }

  tentarDeNovo(): void {
    this.estadoService.iniciar();
  }
}
