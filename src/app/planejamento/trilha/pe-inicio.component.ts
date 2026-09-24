import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { EstadoTrilhaPe, PeTrilhaEstadoService } from './pe-trilha-estado.service';
import { EstadoPassoPe, StatusPassoPe } from './pe-trilha-status.service';
import { PassoNumeradoPe, rotuloGuia } from './pe-trilhas';
import { papelPlanejamentoDeOrgao, rotuloCurtoPapelPlanejamento } from '../../core/acessos/papeis-planejamento';

/**
 * Visão geral da Governança Estratégica (primeira tela do módulo): o que o módulo
 * faz, em linguagem simples, o papel e o órgão de quem está logado (e, na trilha
 * de um órgão, o nível de maturidade dele), o próximo passo recomendado e todas
 * as etapas e passos numerados, com a situação de cada um (ou "em construção",
 * para os passos cuja tela chega nas próximas entregas, e "prévia dos campos",
 * para os passos de dados do órgão).
 */
@Component({
  selector: 'app-pe-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, CitaPlanejamentoDirective],
  templateUrl: './pe-inicio.component.html'
})
export class PeInicioComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  estado: EstadoTrilhaPe | null = null;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => this.estado = estado);
    // A visão geral sempre mostra a situação atualizada
    this.estadoService.atualizarStatus(true);
  }

  passosDaEtapa(indice: number): PassoNumeradoPe[] {
    return this.estado?.passos.filter(p => p.etapa === indice) ?? [];
  }

  status(passo: PassoNumeradoPe): StatusPassoPe | null {
    return this.estadoService.statusDoPasso(passo);
  }

  guia(passo: PassoNumeradoPe): string {
    return rotuloGuia(passo.guia);
  }

  get temStatus(): boolean {
    return !!this.estado?.passos.some(p => !!p.status);
  }

  get carregandoStatus(): boolean {
    return this.temStatus && !this.estado?.situacao;
  }

  /**
   * Próximo passo: o primeiro vencido; senão o primeiro com fila esperando; senão
   * o primeiro pendente, na ordem da trilha. Trilha sem situação alguma (os
   * passos ainda sem tela) começa pelo primeiro passo. Nada esperando = nenhum.
   */
  get recomendado(): PassoNumeradoPe | null {
    if (!this.estado) return null;
    if (!this.temStatus) return this.estado.passos[0] ?? null;
    for (const alvo of ['atrasado', 'atencao', 'pendente'] as EstadoPassoPe[]) {
      const passo = this.estado.passos.find(p => this.status(p)?.estado === alvo);
      if (passo) return passo;
    }
    return null;
  }

  // ── Papel e órgão ─────────────────────────────────────────────────────────

  get rotuloPapel(): string {
    const e = this.estado;
    if (!e) return '';
    if (e.adminGeral) return 'Administrador do SGDP: vê todas as trilhas e tudo no módulo';
    return rotuloCurtoPapelPlanejamento(e.meuPapel?.Papel);
  }

  /** Nível de maturidade na trilha de um órgão (a do órgão da pessoa ou a do órgão à vista). */
  get rotuloNivel(): string | null {
    const t = this.estado?.trilhaOrgao;
    if (!t) return null;
    return t.NivelPadrao ? `${t.NivelNome} (o padrão, até o administrador do módulo definir o nível do órgão)` : t.NivelNome;
  }

  /** "SES · Secretaria de Estado de Saúde" ou "Todos os órgãos" para os papéis centrais. */
  get rotuloOrgao(): string {
    const papel = this.estado?.meuPapel;
    if (this.estado?.adminGeral || !papelPlanejamentoDeOrgao(papel?.Papel)) return 'Todos os órgãos';
    if (!papel?.OrgaoId) return 'Nenhum órgão ligado à sua unidade';
    return [papel.OrgaoSigla, papel.OrgaoNome].filter(Boolean).join(' · ');
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

  irPara(passo: PassoNumeradoPe): void {
    this.router.navigate([passo.rota], { queryParams: { passo: passo.numero } });
  }
}
