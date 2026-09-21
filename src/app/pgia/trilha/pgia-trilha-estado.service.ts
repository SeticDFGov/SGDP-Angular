import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AuthService, Perfis } from '../../auth/services/auth';
import {
  PassoNumerado, PerfilTrilha, TrilhaPgia,
  passosNumerados, perfilDoPapel, trilhaDoPerfil
} from './pgia-trilhas';
import { PgiaTrilhaStatusService, SituacaoTrilha, StatusPasso } from './pgia-trilha-status.service';
import { PgiaVisaoService } from './pgia-visao.service';

export interface EstadoTrilha {
  perfil: PerfilTrilha;
  admin: boolean;
  trilha: TrilhaPgia;
  passos: PassoNumerado[];
  situacao: SituacaoTrilha | null;
}

/** Intervalo mínimo entre duas atualizações automáticas do status (troca de passo). */
const INTERVALO_STATUS_MS = 5000;

/**
 * Estado da trilha do PGIA compartilhado pela moldura (barra de etapas) e pela
 * visão geral: qual trilha vale para o usuário e a situação de cada passo.
 * O status é recarregado ao entrar no módulo, ao trocar de passo (no máximo a
 * cada 5 s) e quando a visão geral abre; assim o que a pessoa acabou de salvar
 * aparece na trilha sem recarregar a página.
 */
@Injectable({ providedIn: 'root' })
export class PgiaTrilhaEstadoService {
  private readonly authService = inject(AuthService);
  private readonly visaoService = inject(PgiaVisaoService);
  private readonly statusService = inject(PgiaTrilhaStatusService);

  private readonly estado = new BehaviorSubject<EstadoTrilha | null>(null);
  readonly estado$ = this.estado.asObservable();

  private ultimaCarga = 0;
  private carga?: Subscription;

  get atual(): EstadoTrilha | null {
    return this.estado.value;
  }

  /** Monta a trilha do usuário (chamado ao entrar no módulo). */
  iniciar(): void {
    this.authService.getUser().subscribe(user => {
      const admin = user?.Perfil === Perfis.Admin;
      const perfil = admin ? this.visaoService.atual : perfilDoPapel(user?.PapelPgia);
      this.montar(perfil, admin);
    });
  }

  /** Admin troca a trilha que está vendo. */
  trocarVisao(perfil: PerfilTrilha): void {
    const atual = this.estado.value;
    if (!atual?.admin) return;
    this.visaoService.definir(perfil);
    this.montar(perfil, true);
  }

  atualizarStatus(forcar = false): void {
    const atual = this.estado.value;
    if (!atual) return;
    if (!forcar && Date.now() - this.ultimaCarga < INTERVALO_STATUS_MS) return;

    this.ultimaCarga = Date.now();
    const perfil = atual.perfil;
    this.carga?.unsubscribe();
    this.carga = this.statusService.carregar(perfil).subscribe(situacao => {
      const agora = this.estado.value;
      // Resposta de uma trilha que já foi trocada é descartada
      if (agora && agora.perfil === perfil) this.estado.next({ ...agora, situacao });
    });
  }

  statusDoPasso(passo: PassoNumerado): StatusPasso | null {
    if (!passo.status) return null;
    return this.estado.value?.situacao?.status[passo.status] ?? null;
  }

  private montar(perfil: PerfilTrilha, admin: boolean): void {
    const trilha = trilhaDoPerfil(perfil, admin);
    this.estado.next({ perfil, admin, trilha, passos: passosNumerados(trilha), situacao: null });
    this.atualizarStatus(true);
  }
}
