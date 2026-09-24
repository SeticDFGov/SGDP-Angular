import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AuthService, Perfis } from '../../auth/services/auth';
import { PeMeuPapel } from '../../../api/planejamento/interface';
import { PePessoasService } from '../services/pe-pessoas.service';
import { PapeisPlanejamento } from '../../core/acessos/papeis-planejamento';
import {
  PassoNumeradoPe, PerfilTrilhaPe, TrilhaPe,
  passosNumerados, perfilDoPapel, trilhaDoPerfil
} from './pe-trilhas';
import { PeTrilhaStatusService, SituacaoTrilhaPe, StatusPassoPe } from './pe-trilha-status.service';
import { PeVisaoService } from './pe-visao.service';

/**
 * carregando: consultando o papel · pronta: trilha montada · sem-papel: a pessoa
 * tem o módulo, mas não tem papel (fale com o administrador do módulo) · erro: o
 * papel não pôde ser consultado (ex.: API fora do ar).
 */
export type CargaTrilhaPe = 'carregando' | 'pronta' | 'sem-papel' | 'erro';

export interface EstadoTrilhaPe {
  carga: CargaTrilhaPe;
  /** Perfil admin do SGDP: vê todas as trilhas ("Ver a trilha de") e tudo no módulo. */
  adminGeral: boolean;
  /** GET api/planejamento/meu-papel; null enquanto carrega ou se falhou. */
  meuPapel: PeMeuPapel | null;
  /** A consulta do papel (o admin do SGDP tem a trilha antes de ela terminar). */
  consultaPapel: 'carregando' | 'ok' | 'erro';
  perfil: PerfilTrilhaPe | null;
  trilha: TrilhaPe | null;
  passos: PassoNumeradoPe[];
  situacao: SituacaoTrilhaPe | null;
}

/** Intervalo mínimo entre duas atualizações automáticas do status (troca de passo). */
const INTERVALO_STATUS_MS = 5000;

const SEM_TRILHA: Omit<EstadoTrilhaPe, 'carga' | 'consultaPapel'> = {
  adminGeral: false, meuPapel: null, perfil: null, trilha: null, passos: [], situacao: null
};

/**
 * Estado da trilha da Governança Estratégica, compartilhado pela moldura, pela
 * visão geral e pelas telas do módulo: o papel da pessoa (GET meu-papel, a única
 * fonte do papel, que não vem no /me), a trilha que vale para ela e a situação
 * dos passos. O admin do SGDP não precisa de papel: a trilha dele sai na hora,
 * mesmo que a consulta do papel falhe.
 */
@Injectable({ providedIn: 'root' })
export class PeTrilhaEstadoService {
  private readonly authService = inject(AuthService);
  private readonly pessoasService = inject(PePessoasService);
  private readonly visaoService = inject(PeVisaoService);
  private readonly statusService = inject(PeTrilhaStatusService);

  private readonly estado = new BehaviorSubject<EstadoTrilhaPe | null>(null);
  readonly estado$ = this.estado.asObservable();

  private ultimaCarga = 0;
  private cargaStatus?: Subscription;
  private cargaPapel?: Subscription;

  get atual(): EstadoTrilhaPe | null {
    return this.estado.value;
  }

  /**
   * Administrador do módulo ou admin do SGDP (dá papéis e decide os pedidos do
   * módulo), SEMPRE pelo `meu-papel`: as consultas de pessoas respondem 403 aos
   * demais, e o interceptor manda todo 403 para /inicio. null enquanto o papel não
   * chegou; false também quando a consulta do papel falhou (ver `consultaPapel`).
   */
  get podeGerirPessoas(): boolean | null {
    const e = this.estado.value;
    if (!e || e.consultaPapel === 'carregando') return null;
    const papel = e.meuPapel;
    return !!papel && (papel.EhAdminGeral || papel.Papel === PapeisPlanejamento.Admin);
  }

  /** Monta a trilha de quem está logado (chamado ao entrar no módulo e no "Tentar de novo"). */
  iniciar(): void {
    this.cargaPapel?.unsubscribe();
    this.authService.getUser().subscribe(user => {
      const adminGeral = user?.Perfil === Perfis.Admin;
      if (adminGeral) this.montar(this.visaoService.atual, true, null, 'carregando');
      else this.estado.next({ carga: 'carregando', consultaPapel: 'carregando', ...SEM_TRILHA });

      this.cargaPapel = this.pessoasService.meuPapel().subscribe({
        next: papel => this.aplicarPapel(papel, adminGeral),
        error: () => {
          const atual = this.estado.value;
          // O admin do SGDP segue com a trilha que escolheu; os demais ficam sem saber o papel
          if (adminGeral && atual?.adminGeral) this.estado.next({ ...atual, consultaPapel: 'erro' });
          else this.estado.next({ carga: 'erro', consultaPapel: 'erro', ...SEM_TRILHA });
        }
      });
    });
  }

  /** Admin do SGDP troca a trilha que está vendo. */
  trocarVisao(perfil: PerfilTrilhaPe): void {
    const atual = this.estado.value;
    if (!atual?.adminGeral) return;
    this.visaoService.definir(perfil);
    this.montar(perfil, true, atual.meuPapel, atual.consultaPapel);
  }

  atualizarStatus(forcar = false): void {
    const atual = this.estado.value;
    if (!atual || atual.carga !== 'pronta' || !atual.perfil) return;
    if (!forcar && Date.now() - this.ultimaCarga < INTERVALO_STATUS_MS) return;

    this.ultimaCarga = Date.now();
    const perfil = atual.perfil;
    this.cargaStatus?.unsubscribe();
    this.cargaStatus = this.statusService.carregar(perfil).subscribe(situacao => {
      const agora = this.estado.value;
      // Resposta de uma trilha que já foi trocada é descartada
      if (agora && agora.perfil === perfil) this.estado.next({ ...agora, situacao });
    });
  }

  statusDoPasso(passo: PassoNumeradoPe): StatusPassoPe | null {
    if (!passo.status) return null;
    return this.estado.value?.situacao?.status[passo.status] ?? null;
  }

  private aplicarPapel(papel: PeMeuPapel, adminGeral: boolean): void {
    if (adminGeral || papel.EhAdminGeral) {
      const atual = this.estado.value;
      // A trilha do admin já está montada: só guarda o papel e o órgão
      if (atual?.adminGeral && atual.carga === 'pronta') this.estado.next({ ...atual, meuPapel: papel, consultaPapel: 'ok' });
      else this.montar(this.visaoService.atual, true, papel, 'ok');
      return;
    }
    const perfil = perfilDoPapel(papel.Papel);
    if (!perfil) {
      this.estado.next({ carga: 'sem-papel', consultaPapel: 'ok', ...SEM_TRILHA, meuPapel: papel });
      return;
    }
    this.montar(perfil, false, papel, 'ok');
  }

  private montar(
    perfil: PerfilTrilhaPe, adminGeral: boolean, meuPapel: PeMeuPapel | null,
    consultaPapel: EstadoTrilhaPe['consultaPapel']
  ): void {
    const trilha = trilhaDoPerfil(perfil);
    this.estado.next({
      carga: 'pronta', consultaPapel, adminGeral, meuPapel, perfil, trilha, passos: passosNumerados(trilha), situacao: null
    });
    this.atualizarStatus(true);
  }
}
