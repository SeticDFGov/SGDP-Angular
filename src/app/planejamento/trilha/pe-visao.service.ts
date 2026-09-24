import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PERFIS_TRILHA_PE, PerfilTrilhaPe } from './pe-trilhas';

const CHAVE = 'planejamentoVisaoAdmin';
const PADRAO: PerfilTrilhaPe = 'admin';

/**
 * Trilha que o admin do SGDP está vendo na Governança Estratégica (ele enxerga
 * todos os papéis). Guardada no navegador para não precisar escolher de novo a
 * cada entrada; sem storage (SSR, janela privada, bloqueio), vale só na sessão.
 */
@Injectable({ providedIn: 'root' })
export class PeVisaoService {
  private readonly platformId = inject(PLATFORM_ID);
  private visao: PerfilTrilhaPe = this.lerGuardada();

  get atual(): PerfilTrilhaPe {
    return this.visao;
  }

  definir(perfil: PerfilTrilhaPe): void {
    this.visao = perfil;
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(CHAVE, perfil); } catch { /* navegador sem storage: vale só na sessão */ }
    }
  }

  private lerGuardada(): PerfilTrilhaPe {
    if (!isPlatformBrowser(this.platformId)) return PADRAO;
    try {
      const guardada = localStorage.getItem(CHAVE) as PerfilTrilhaPe | null;
      return guardada && PERFIS_TRILHA_PE.includes(guardada) ? guardada : PADRAO;
    } catch {
      return PADRAO;
    }
  }
}
