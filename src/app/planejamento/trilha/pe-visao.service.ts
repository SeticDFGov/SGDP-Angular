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
 * não precisar escolher de novo a cada entrada, **por pessoa** (F1, C35: a chave
 * leva o id de quem está logado; antes, a escolha de uma pessoa valia para a
 * próxima que entrasse no mesmo navegador). Sem storage (SSR, janela privada,
 * bloqueio), vale só na sessão.
 */
@Injectable({ providedIn: 'root' })
export class PeVisaoService {
  private readonly platformId = inject(PLATFORM_ID);
  /** Quem está logado (o sufixo das chaves); null antes de a trilha começar. */
  private pessoa: string | null = null;
  private visao: VisaoTrilhaPe = { perfil: PADRAO, orgaoId: null };

  get atual(): VisaoTrilhaPe {
    return this.visao;
  }

  /** A pessoa que está logada (chamado ao montar a trilha): a escolha guardada passa a ser a dela. */
  definirPessoa(pessoa: string | null): void {
    this.pessoa = pessoa?.trim() || null;
    this.visao = this.lerGuardada();
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

  /** A chave da pessoa ("planejamentoVisaoOrgao:<id>"); sem pessoa, nada se guarda. */
  private chave(base: string): string | null {
    return this.pessoa ? `${base}:${this.pessoa}` : null;
  }

  private guardar(base: string, valor: string | null): void {
    const chave = this.chave(base);
    if (!chave || !isPlatformBrowser(this.platformId)) return;
    try {
      if (valor === null) localStorage.removeItem(chave);
      else localStorage.setItem(chave, valor);
      // As chaves antigas, sem a pessoa, valiam para qualquer um no navegador: saem
      localStorage.removeItem(base);
    } catch { /* navegador sem storage: vale só na sessão */ }
  }

  private lerGuardada(): VisaoTrilhaPe {
    const chavePerfil = this.chave(CHAVE_PERFIL);
    const chaveOrgao = this.chave(CHAVE_ORGAO);
    if (!chavePerfil || !chaveOrgao || !isPlatformBrowser(this.platformId)) return { perfil: PADRAO, orgaoId: null };
    try {
      const perfil = localStorage.getItem(chavePerfil) as PerfilCentralPe | null;
      const orgao = Number(localStorage.getItem(chaveOrgao));
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
