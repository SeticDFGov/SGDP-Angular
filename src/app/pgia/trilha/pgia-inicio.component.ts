import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CitaDecretoDirective } from '../shared/cita-decreto.directive';
import { EstadoTrilha, PgiaTrilhaEstadoService } from './pgia-trilha-estado.service';
import { EstadoPasso, StatusPasso } from './pgia-trilha-status.service';
import { PassoNumerado } from './pgia-trilhas';
import { PgiaPrazo } from '../../../api/pgia/interface';

/**
 * Visão geral do PGIA (primeira tela do módulo): o que o papel faz segundo o
 * decreto, o próximo passo recomendado, todas as etapas e passos numerados com a
 * situação de cada um, e os prazos do decreto.
 */
@Component({
  selector: 'app-pgia-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, CitaDecretoDirective],
  templateUrl: './pgia-inicio.component.html'
})
export class PgiaInicioComponent implements OnInit {
  private readonly estadoService = inject(PgiaTrilhaEstadoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  estado: EstadoTrilha | null = null;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => this.estado = estado);
    // A visão geral sempre mostra a situação atualizada
    this.estadoService.atualizarStatus(true);
  }

  passosDaEtapa(indice: number): PassoNumerado[] {
    return this.estado?.passos.filter(p => p.etapa === indice) ?? [];
  }

  status(passo: PassoNumerado): StatusPasso | null {
    return this.estadoService.statusDoPasso(passo);
  }

  get temStatus(): boolean {
    return !!this.estado?.passos.some(p => !!p.status);
  }

  get carregandoStatus(): boolean {
    return this.temStatus && !this.estado?.situacao;
  }

  /**
   * Próximo passo: o primeiro vencido; senão o primeiro com fila esperando; senão
   * o primeiro pendente, na ordem da trilha. Trilha sem prazo algum (agente)
   * começa pelo primeiro passo. Tudo em dia = nenhum.
   */
  get recomendado(): PassoNumerado | null {
    if (!this.estado) return null;
    if (!this.temStatus) return this.estado.passos[0] ?? null;
    for (const alvo of ['atrasado', 'atencao', 'pendente'] as EstadoPasso[]) {
      const passo = this.estado.passos.find(p => this.status(p)?.estado === alvo);
      if (passo) return passo;
    }
    return null;
  }

  get prazos(): PgiaPrazo[] {
    return this.estado?.situacao?.prazos ?? [];
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

  classePrazo(prazo: PgiaPrazo): string {
    if (prazo.CumpridoEm) return 'bg-green-50 text-green-800 border-green-200';
    if (prazo.Situacao === 'Vencida') return 'bg-red-50 text-red-800 border-red-200';
    return 'bg-blue-50 text-blue-800 border-blue-200';
  }

  irPara(passo: PassoNumerado): void {
    this.router.navigate([passo.rota], { queryParams: { passo: passo.numero } });
  }
}
