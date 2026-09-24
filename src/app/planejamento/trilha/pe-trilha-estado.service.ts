import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AuthService, Perfis } from '../../auth/services/auth';
import { PeMeuPapel, PeOrgaoNivel, PeTrilhaOrgao } from '../../../api/planejamento/interface';
import { PePessoasService } from '../services/pe-pessoas.service';
import { PeModeloService } from '../services/pe-modelo.service';
import { PeOrgaosService } from '../services/pe-orgaos.service';
import { PapeisPlanejamento } from '../../core/acessos/papeis-planejamento';
import { mensagemErroPe } from '../shared/pe-erros';
import {
  PassoNumeradoPe, PerfilCentralPe, PerfilTrilhaPe, TrilhaPe,
  passosNumerados, perfilDoPapel, trilhaDoOrgao, trilhaDoPerfil
} from './pe-trilhas';
import { PeTrilhaStatusService, SituacaoTrilhaPe, StatusPassoPe } from './pe-trilha-status.service';
import { PeVisaoService } from './pe-visao.service';

/**
 * carregando: consultando o papel ou a trilha · pronta: trilha montada ·
 * sem-papel: a pessoa tem o módulo, mas não tem papel (fale com o administrador
 * do módulo) · sem-orgao: papel de órgão com a unidade sem órgão · erro: o papel
 * não pôde ser consultado · erro-trilha: a trilha do órgão não veio do servidor.
 */
export type CargaTrilhaPe = 'carregando' | 'pronta' | 'sem-papel' | 'sem-orgao' | 'erro' | 'erro-trilha';

export interface EstadoTrilhaPe {
  carga: CargaTrilhaPe;
  /** Perfil admin do SGDP: vê todas as trilhas ("Ver a trilha de") e tudo no módulo. */
  adminGeral: boolean;
  /** GET api/planejamento/meu-papel; null enquanto carrega ou se falhou. */
  meuPapel: PeMeuPapel | null;
  /** A consulta do papel (o admin do SGDP tem a trilha antes de ela terminar). */
  consultaPapel: 'carregando' | 'ok' | 'erro';
  /** Trilha à vista. */
  perfil: PerfilTrilhaPe | null;
  /** Trilha do papel global da pessoa (administrador do módulo, SGDI ou CGTIC); null nos demais. */
  perfilProprio: PerfilCentralPe | null;
  trilha: TrilhaPe | null;
  passos: PassoNumeradoPe[];
  situacao: SituacaoTrilhaPe | null;
  /** Trilha do órgão como o back-end resolveu (nível, ajustes e numeração); só com a trilha de um órgão à vista. */
  trilhaOrgao: PeTrilhaOrgao | null;
  /**
   * Órgão escolhido em "Ver a trilha de" ou em "Ver como o órgão vê" (papéis
   * globais e admin do SGDP): a trilha dele, só para ler. null = a trilha da pessoa.
   */
  orgaoVisto: number | null;
  /** Mensagem do servidor quando a trilha do órgão não veio. */
  erroTrilha: string | null;
}

/** Intervalo mínimo entre duas atualizações automáticas do status (troca de passo). */
const INTERVALO_STATUS_MS = 5000;

const SEM_TRILHA: Omit<EstadoTrilhaPe, 'carga' | 'consultaPapel'> = {
  adminGeral: false, meuPapel: null, perfil: null, perfilProprio: null, trilha: null, passos: [], situacao: null,
  trilhaOrgao: null, orgaoVisto: null, erroTrilha: null
};

/** Valor do "Ver a trilha de" para a trilha de um órgão. */
export function valorVisaoOrgao(orgaoId: number): string {
  return `orgao:${orgaoId}`;
}

/**
 * Estado da trilha da Governança Estratégica, compartilhado pela moldura, pela
 * visão geral e pelas telas do módulo: o papel da pessoa (GET meu-papel, a única
 * fonte do papel, que não vem no /me), a trilha que vale para ela e a situação
 * dos passos.
 *
 * - Papéis centrais: trilha fixa (`pe-trilhas.ts`). O admin do SGDP não precisa
 *   de papel: a trilha dele sai na hora, mesmo que a consulta do papel falhe.
 * - Papéis de órgão: a trilha vem do modelo configurado (GET modelo/trilha, sem
 *   órgão = o da pessoa), pelo nível do órgão e pelos ajustes.
 * - Papéis globais e admin do SGDP podem ver a trilha de um órgão como ele vê
 *   (GET modelo/trilha?orgaoId=), só para ler.
 */
@Injectable({ providedIn: 'root' })
export class PeTrilhaEstadoService {
  private readonly authService = inject(AuthService);
  private readonly pessoasService = inject(PePessoasService);
  private readonly modeloService = inject(PeModeloService);
  private readonly orgaosService = inject(PeOrgaosService);
  private readonly visaoService = inject(PeVisaoService);
  private readonly statusService = inject(PeTrilhaStatusService);

  private readonly estado = new BehaviorSubject<EstadoTrilhaPe | null>(null);
  readonly estado$ = this.estado.asObservable();

  /** Órgãos para o "Ver a trilha de" (papéis globais e admin do SGDP); null enquanto não carregou. */
  private readonly orgaos = new BehaviorSubject<PeOrgaoNivel[] | null>(null);
  readonly orgaos$ = this.orgaos.asObservable();

  private ultimaCarga = 0;
  private cargaStatus?: Subscription;
  private cargaPapel?: Subscription;
  private cargaTrilha?: Subscription;
  private cargaOrgaos?: Subscription;

  get atual(): EstadoTrilhaPe | null {
    return this.estado.value;
  }

  /**
   * Administrador do módulo ou admin do SGDP (dá papéis, decide os pedidos do
   * módulo e configura o modelo), SEMPRE pelo `meu-papel`: as consultas dessas
   * telas respondem 403 aos demais, e o interceptor manda todo 403 para /inicio.
   * null enquanto o papel não chegou; false também quando a consulta do papel
   * falhou (ver `consultaPapel`).
   */
  get podeGerirPessoas(): boolean | null {
    const e = this.estado.value;
    if (!e || e.consultaPapel === 'carregando') return null;
    const papel = e.meuPapel;
    return !!papel && (papel.EhAdminGeral || papel.Papel === PapeisPlanejamento.Admin);
  }

  /**
   * Configura o modelo, os níveis e os órgãos, e cadastra os referenciais do DF
   * (princípios, PETIC-DF e diretrizes do ciclo): os mesmos de `podeGerirPessoas`.
   */
  get podeConfigurar(): boolean | null {
    return this.podeGerirPessoas;
  }

  /**
   * Secretaria do CGTIC ou admin do SGDP: registra a deliberação do comitê. Pelo
   * `meu-papel`, como os demais. null enquanto o papel não chegou.
   */
  get podeDeliberar(): boolean | null {
    const e = this.estado.value;
    if (!e || e.consultaPapel === 'carregando') return null;
    const papel = e.meuPapel;
    return !!papel && (papel.EhAdminGeral || papel.Papel === PapeisPlanejamento.Cgtic);
  }

  /**
   * Papéis globais (administrador do módulo, SGDI e CGTIC) e admin do SGDP: veem a
   * fila e o histórico das deliberações. Papel de órgão recebe 403 nessa consulta,
   * e o interceptor tiraria a pessoa do módulo. null enquanto o papel não chegou.
   */
  get veDeliberacoes(): boolean | null {
    const e = this.estado.value;
    if (!e || e.consultaPapel === 'carregando') return null;
    const papel = e.meuPapel;
    if (!papel) return false;
    return papel.EhAdminGeral || papel.Papel === PapeisPlanejamento.Admin
      || papel.Papel === PapeisPlanejamento.Sgdi || papel.Papel === PapeisPlanejamento.Cgtic;
  }

  /** Papel de órgão (equipe ou consulta), sem ser admin do SGDP: lê só o que é publicado. */
  get ehPapelDeOrgao(): boolean {
    const papel = this.estado.value?.meuPapel;
    return !!papel && !papel.EhAdminGeral
      && (papel.Papel === PapeisPlanejamento.Orgao || papel.Papel === PapeisPlanejamento.OrgaoConsulta);
  }

  /** Papéis globais e admin do SGDP: escolhem um órgão para ver a trilha dele. */
  get podeVerOutrosOrgaos(): boolean {
    const e = this.estado.value;
    return !!e && (e.adminGeral || e.perfilProprio !== null);
  }

  /** Monta a trilha de quem está logado (chamado ao entrar no módulo e no "Tentar de novo"). */
  iniciar(): void {
    this.cargaPapel?.unsubscribe();
    this.cargaTrilha?.unsubscribe();
    this.authService.getUser().subscribe(user => {
      const adminGeral = user?.Perfil === Perfis.Admin;
      if (adminGeral) {
        this.abrirVisaoDoAdminGeral(null, 'carregando');
        this.carregarOrgaos();
      } else {
        this.estado.next({ ...SEM_TRILHA, carga: 'carregando', consultaPapel: 'carregando' });
      }

      this.cargaPapel = this.pessoasService.meuPapel().subscribe({
        next: papel => this.aplicarPapel(papel, adminGeral),
        error: () => {
          const atual = this.estado.value;
          // O admin do SGDP segue com a trilha que escolheu; os demais ficam sem saber o papel
          if (adminGeral && atual?.adminGeral) this.estado.next({ ...atual, consultaPapel: 'erro' });
          else this.estado.next({ ...SEM_TRILHA, carga: 'erro', consultaPapel: 'erro' });
        }
      });
    });
  }

  /**
   * "Ver a trilha de": uma trilha central (`admin`, `sgdi` ou `cgtic`; os papéis
   * globais só a deles) ou a de um órgão (`orgao:{id}`, ver `valorVisaoOrgao`).
   */
  trocarVisao(valor: string): void {
    const atual = this.estado.value;
    if (!atual || !this.podeVerOutrosOrgaos) return;
    const orgaoId = valor.startsWith('orgao:') ? Number(valor.slice('orgao:'.length)) : null;
    if (orgaoId !== null && Number.isInteger(orgaoId) && orgaoId > 0) {
      this.visaoService.definirOrgao(orgaoId);
      this.carregarTrilhaOrgao(orgaoId, atual);
      return;
    }
    if (atual.adminGeral) {
      const perfil = (['admin', 'sgdi', 'cgtic'] as PerfilCentralPe[]).find(p => p === valor) ?? 'admin';
      this.visaoService.definirPerfil(perfil);
      this.montarCentral(perfil, atual);
    } else if (atual.perfilProprio) {
      this.visaoService.definirOrgao(null);
      this.montarCentral(atual.perfilProprio, atual);
    }
  }

  /** "Ver como o órgão vê" (tela dos órgãos): a trilha do órgão, só para ler. */
  verOrgao(orgaoId: number): void {
    this.trocarVisao(valorVisaoOrgao(orgaoId));
  }

  /** Sai da trilha do órgão e volta à trilha central da pessoa. */
  verMinhaTrilha(): void {
    const atual = this.estado.value;
    if (!atual) return;
    this.trocarVisao(atual.adminGeral ? this.visaoService.atual.perfil : (atual.perfilProprio ?? 'admin'));
  }

  /** Valor do "Ver a trilha de" que está à vista. */
  get visaoAtual(): string {
    const e = this.estado.value;
    if (!e) return '';
    if (e.orgaoVisto !== null) return valorVisaoOrgao(e.orgaoVisto);
    return e.perfil ?? '';
  }

  /** Órgãos de novo (depois de trocar o nível de um órgão, por exemplo). */
  carregarOrgaos(): void {
    this.cargaOrgaos?.unsubscribe();
    this.cargaOrgaos = this.orgaosService.listar().subscribe({
      next: lista => this.orgaos.next([...lista].sort((a, b) => a.Sigla.localeCompare(b.Sigla, 'pt-BR'))),
      // Sem a lista, o "Ver a trilha de" fica só com as trilhas centrais
      error: () => this.orgaos.next(this.orgaos.value ?? [])
    });
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

  // ── Montagem ──────────────────────────────────────────────────────────────

  private aplicarPapel(papel: PeMeuPapel, adminGeral: boolean): void {
    if (adminGeral || papel.EhAdminGeral) {
      const atual = this.estado.value;
      // A trilha do admin já está montada (ou a do órgão, carregando): só guarda o papel
      if (atual?.adminGeral && atual.carga !== 'erro') {
        this.estado.next({ ...atual, meuPapel: papel, consultaPapel: 'ok' });
      } else {
        this.abrirVisaoDoAdminGeral(papel, 'ok');
        this.carregarOrgaos();
      }
      return;
    }

    const perfil = perfilDoPapel(papel.Papel);
    const base = { ...SEM_TRILHA, meuPapel: papel, consultaPapel: 'ok' as const };
    if (!perfil) {
      this.estado.next({ ...base, carga: 'sem-papel' });
      return;
    }
    if (perfil === 'orgao') {
      // Papel de órgão com a unidade sem órgão: não há trilha para mostrar
      if (papel.OrgaoId === null) this.estado.next({ ...base, carga: 'sem-orgao', perfil });
      else this.carregarTrilhaOrgao(null, { ...base, carga: 'carregando' });
      return;
    }

    // Papel global: a trilha dele, ou a do órgão que escolheu ver
    const comPerfil: EstadoTrilhaPe = { ...base, carga: 'carregando', perfilProprio: perfil };
    this.carregarOrgaos();
    const orgaoId = this.visaoService.atual.orgaoId;
    if (orgaoId !== null) this.carregarTrilhaOrgao(orgaoId, comPerfil);
    else this.montarCentral(perfil, comPerfil);
  }

  /** Admin do SGDP: a trilha central escolhida ou a do órgão escolhido. */
  private abrirVisaoDoAdminGeral(meuPapel: PeMeuPapel | null, consultaPapel: EstadoTrilhaPe['consultaPapel']): void {
    const base: EstadoTrilhaPe = { ...SEM_TRILHA, carga: 'carregando', consultaPapel, adminGeral: true, meuPapel };
    const visao = this.visaoService.atual;
    if (visao.orgaoId !== null) this.carregarTrilhaOrgao(visao.orgaoId, base);
    else this.montarCentral(visao.perfil, base);
  }

  private montarCentral(perfil: PerfilCentralPe, base: EstadoTrilhaPe): void {
    this.cargaTrilha?.unsubscribe();
    const trilha = trilhaDoPerfil(perfil);
    this.estado.next({
      ...base, carga: 'pronta', perfil, trilha, passos: passosNumerados(trilha), situacao: null,
      trilhaOrgao: null, orgaoVisto: null, erroTrilha: null
    });
    this.atualizarStatus(true);
  }

  /**
   * Trilha resolvida de um órgão: `orgaoId` null é o órgão da própria pessoa
   * (papéis de órgão); com órgão, a trilha dele vista por um papel global ou pelo
   * admin do SGDP.
   */
  private carregarTrilhaOrgao(orgaoId: number | null, base: EstadoTrilhaPe): void {
    this.cargaTrilha?.unsubscribe();
    this.estado.next({
      ...base, carga: 'carregando', perfil: 'orgao', trilha: null, passos: [], situacao: null,
      trilhaOrgao: null, orgaoVisto: orgaoId, erroTrilha: null
    });
    this.cargaTrilha = this.modeloService.trilha(orgaoId).subscribe({
      next: resolvida => {
        const agora = this.estado.value;
        if (!agora || agora.orgaoVisto !== orgaoId) return;
        const trilha = trilhaDoOrgao(resolvida);
        this.estado.next({
          ...agora, carga: 'pronta', trilha, passos: passosNumerados(trilha), trilhaOrgao: resolvida, erroTrilha: null
        });
        this.atualizarStatus(true);
      },
      error: erro => {
        const agora = this.estado.value;
        if (!agora || agora.orgaoVisto !== orgaoId) return;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar a trilha do órgão.');
        if (mensagem === null) return;
        this.estado.next({ ...agora, carga: 'erro-trilha', erroTrilha: mensagem });
      }
    });
  }
}
