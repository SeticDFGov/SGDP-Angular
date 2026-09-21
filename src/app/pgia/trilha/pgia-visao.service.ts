import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { PERFIS_TRILHA, PerfilTrilha } from './pgia-trilhas';

const CHAVE = 'pgiaVisaoAdmin';

/**
 * Trilha que o admin do SGDP está vendo no PGIA (ele enxerga todos os papéis).
 * Guardada no navegador para o admin não precisar escolher de novo a cada entrada.
 */
@Injectable({ providedIn: 'root' })
export class PgiaVisaoService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly visao = new BehaviorSubject<PerfilTrilha>(this.lerGuardada());
  readonly visao$ = this.visao.asObservable();

  get atual(): PerfilTrilha {
    return this.visao.value;
  }

  definir(perfil: PerfilTrilha): void {
    this.visao.next(perfil);
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(CHAVE, perfil); } catch { /* navegador sem storage: vale só na sessão */ }
    }
  }

  private lerGuardada(): PerfilTrilha {
    if (!isPlatformBrowser(this.platformId)) return 'orgao';
    try {
      const guardada = localStorage.getItem(CHAVE) as PerfilTrilha | null;
      return guardada && PERFIS_TRILHA.includes(guardada) ? guardada : 'orgao';
    } catch {
      return 'orgao';
    }
  }
}
