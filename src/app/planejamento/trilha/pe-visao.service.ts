import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PERFIS_CENTRAIS_PE, PerfilCentralPe } from './pe-trilhas';

const CHAVE_PERFIL = 'planejamentoVisaoAdmin';
const CHAVE_ORGAO = 'planejamentoVisaoOrgao';
const PADRAO: PerfilCentralPe = 'admin';

/** Trilha que a pessoa escolheu em "Ver a trilha de". */
export interface VisaoTrilhaPe {
  /** Trilha central do admin do SGDP (os papéis globais ficam na deles). */
  perfil: PerfilCentralPe;
  /** Órgão cuja trilha está à vista, como o órgão vê; null = a trilha central. */
  orgaoId: number | null;
}

/**
 * Trilha que o admin do SGDP (todas as trilhas) ou um papel global (a dele ou a
 * de um órgão) está vendo na Governança Estratégica. Guardada no navegador para
 * não precisar escolher de novo a cada entrada; sem storage (SSR, janela privada,
 * bloqueio), vale só na sessão.
 */
@Injectable({ providedIn: 'root' })
export class PeVisaoService {
  private readonly platformId = inject(PLATFORM_ID);
  private visao: VisaoTrilhaPe = this.lerGuardada();

  get atual(): VisaoTrilhaPe {
    return this.visao;
  }

  /** Trilha central (admin do SGDP): deixa de ver o órgão. */
  definirPerfil(perfil: PerfilCentralPe): void {
    this.visao = { perfil, orgaoId: null };
    this.guardar(CHAVE_PERFIL, perfil);
    this.guardar(CHAVE_ORGAO, null);
  }

  /** Órgão à vista (null volta à trilha central). */
  definirOrgao(orgaoId: number | null): void {
    this.visao = { ...this.visao, orgaoId };
    this.guardar(CHAVE_ORGAO, orgaoId === null ? null : String(orgaoId));
  }

  private guardar(chave: string, valor: string | null): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (valor === null) localStorage.removeItem(chave);
      else localStorage.setItem(chave, valor);
    } catch { /* navegador sem storage: vale só na sessão */ }
  }

  private lerGuardada(): VisaoTrilhaPe {
    if (!isPlatformBrowser(this.platformId)) return { perfil: PADRAO, orgaoId: null };
    try {
      const perfil = localStorage.getItem(CHAVE_PERFIL) as PerfilCentralPe | null;
      const orgao = Number(localStorage.getItem(CHAVE_ORGAO));
      return {
        // A trilha fixa do órgão da E1 ("orgao") saiu: sem órgão escolhido, volta ao padrão
        perfil: perfil && PERFIS_CENTRAIS_PE.includes(perfil) ? perfil : PADRAO,
        orgaoId: Number.isInteger(orgao) && orgao > 0 ? orgao : null
      };
    } catch {
      return { perfil: PADRAO, orgaoId: null };
    }
  }
}
