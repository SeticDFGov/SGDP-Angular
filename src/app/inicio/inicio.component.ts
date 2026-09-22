import { Component, ElementRef, HostListener, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, PapeisPgia, Perfis } from '../auth/services/auth';
import { NotificationService } from '../core/services/notification.service';
import { PedidosAcessoService } from '../core/acessos/pedidos-acesso.service';
import { UserProfile } from '../../api/auth/interface';
import { MeuPedidoAcesso, SituacoesPedidoAcesso } from '../../api/acessos/interface';
import {
  MODULOS, Modulos, ModuloSgdp, mensagemAdministracao, podePedirAcesso, temModulo
} from '../core/modulos/modulos';
import { DialogoDirective } from '../core/acessibilidade/dialogo.directive';

/** Rótulo do papel do usuário dentro do PGIA (o card mostra "como" a pessoa entra). */
const ROTULO_PAPEL_PGIA: Record<string, string> = {
  [PapeisPgia.Orgao]: 'Órgão (Responsável de IA e equipe)',
  [PapeisPgia.Sgdi]: 'SGDI (órgão central da política)',
  [PapeisPgia.Cgtic]: 'Secretaria do CGTIC',
  [PapeisPgia.Auditoria]: 'Auditoria externa'
};

/** Exemplo de justificativa na janela do pedido, por módulo. */
const EXEMPLO_JUSTIFICATIVA: Record<string, string> = {
  [Modulos.Demandas]: 'Ex.: sou da equipe de TIC da minha unidade e vou acompanhar as demandas dela.',
  [Modulos.Pgia]: 'Ex.: trabalho no órgão X e vou registrar o uso de IA da minha equipe.',
  [Modulos.Contratacoes]: 'Ex.: entrei na equipe da SGDI que analisa as contratações de TIC.'
};

/** Tamanho máximo da justificativa (o backend guarda até 500). */
const TAMANHO_JUSTIFICATIVA = 500;

interface DialogoPedido {
  modulo: ModuloSgdp;
  justificativa: string;
}

/**
 * Tela inicial depois do login: os módulos do sistema lado a lado (a
 * Administração só para quem é administrador). Os
 * liberados para o usuário ficam no tom ativo, com o botão de acesso; os demais
 * ficam em cinza, com o botão "Pedir acesso", que abre a janela do pedido. O card
 * mostra o andamento do último pedido: aguardando ou recusado com o motivo. Os
 * módulos vêm do GET /api/Auth/me (revalidado ao abrir a tela).
 */
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DialogoDirective],
  providers: [DatePipe],
  templateUrl: './inicio.component.html'
})
export class InicioComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notificacoes = inject(NotificationService);
  private readonly pedidosAcesso = inject(PedidosAcessoService);
  private readonly router = inject(Router);
  private readonly datePipe = inject(DatePipe);
  private readonly platformId = inject(PLATFORM_ID);

  /** Cards da tela. A Administração só aparece para quem é administrador. */
  modulos: ModuloSgdp[] = this.modulosVisiveis();
  readonly tamanhoJustificativa = TAMANHO_JUSTIFICATIVA;
  readonly S = SituacoesPedidoAcesso;
  user: UserProfile | null = null;
  carregando = true;

  /** Último pedido de cada módulo, de quem está logado. */
  pedidos: Record<string, MeuPedidoAcesso> = {};

  /** Pedidos esperando a decisão de quem está logado (admin e SGDI). */
  readonly pendentesParaDecidir = this.pedidosAcesso.pendentes;

  dialogo: DialogoPedido | null = null;
  enviandoPedido = false;

  /** A caixa da justificativa ganha o foco assim que a janela aparece. */
  @ViewChild('campoJustificativa')
  set campoJustificativa(campo: ElementRef<HTMLTextAreaElement> | undefined) {
    campo?.nativeElement.focus();
  }

  ngOnInit(): void {
    // Mostra já o que está guardado e revalida no backend (acesso recém-liberado
    // aparece sem novo login)
    this.authService.getUser().subscribe(user => this.aplicarUsuario(user));
    this.authService.refreshUser().subscribe(user => {
      if (user) this.aplicarUsuario(user);
      this.carregando = false;
      if (this.decide) this.pedidosAcesso.atualizarPendentes();
    });
    this.carregarPedidos();
  }

  get primeiroNome(): string {
    return (this.user?.Nome ?? '').trim().split(/\s+/)[0] ?? '';
  }

  get semAcessoAlgum(): boolean {
    return !this.carregando && (this.user?.Modulos ?? []).length === 0;
  }

  get totalLiberados(): number {
    return this.modulos.filter(m => this.liberado(m)).length;
  }

  /** Admin decide os pedidos de todos os módulos; a SGDI, os do PGIA. */
  get decide(): boolean {
    return this.user?.Perfil === Perfis.Admin || this.user?.PapelPgia === PapeisPgia.Sgdi;
  }

  liberado(modulo: ModuloSgdp): boolean {
    return temModulo(this.user, modulo.id);
  }

  /** Último pedido do módulo, só enquanto ele não foi liberado. */
  pedidoDe(modulo: ModuloSgdp): MeuPedidoAcesso | null {
    return this.liberado(modulo) ? null : this.pedidos[modulo.id] ?? null;
  }

  aguardando(modulo: ModuloSgdp): boolean {
    return this.pedidoDe(modulo)?.Situacao === SituacoesPedidoAcesso.Pendente;
  }

  recusado(modulo: ModuloSgdp): boolean {
    return this.pedidoDe(modulo)?.Situacao === SituacoesPedidoAcesso.Recusado;
  }

  /**
   * Pedidos esperando quem está logado, no card onde ele decide: o admin, no da
   * Administração; a SGDI, no do PGIA.
   */
  pedidosParaDecidirNo(modulo: ModuloSgdp): number {
    const total = this.pendentesParaDecidir() ?? 0;
    if (total === 0 || !this.liberado(modulo)) return 0;
    if (this.user?.Perfil === Perfis.Admin) return modulo.id === Modulos.Administracao ? total : 0;
    return modulo.id === Modulos.Pgia && this.user?.PapelPgia === PapeisPgia.Sgdi ? total : 0;
  }

  /** Onde quem decide encontra a fila. */
  rotaDaFila(modulo: ModuloSgdp): string {
    return modulo.id === Modulos.Pgia ? '/pgia/sgdi/pessoas' : '/admin/pedidos';
  }

  /** Como o usuário entra no módulo (papel ou nível), para o card liberado. */
  comoEntra(modulo: ModuloSgdp): string {
    const admin = this.user?.Perfil === Perfis.Admin;
    switch (modulo.id) {
      case Modulos.Demandas:
        return admin || this.user?.Perfil === Perfis.Gestor ? 'Gestão: cria e edita demandas' : 'Consulta';
      case Modulos.Pgia:
        if (admin) return 'Administrador: visão de todos os papéis';
        return ROTULO_PAPEL_PGIA[this.user?.PapelPgia ?? ''] ?? 'Agente público: registra uso de IA e avisa incidentes';
      case Modulos.Contratacoes:
        return admin ? 'Administrador' : 'Supervisão contínua (SGDI)';
      case Modulos.Administracao:
        return 'Administrador do sistema';
      default:
        return '';
    }
  }

  exemploJustificativa(modulo: ModuloSgdp): string {
    return EXEMPLO_JUSTIFICATIVA[modulo.id] ?? '';
  }

  /** Clique no card ou no botão: entra, abre o pedido ou explica o que falta. */
  abrir(modulo: ModuloSgdp): void {
    if (this.liberado(modulo)) {
      this.router.navigateByUrl(modulo.rota);
      return;
    }
    if (!podePedirAcesso(modulo.id)) {
      this.notificacoes.warning(mensagemAdministracao());
      return;
    }
    const pedido = this.pedidoDe(modulo);
    if (pedido?.Situacao === SituacoesPedidoAcesso.Pendente) {
      this.notificacoes.info(`Seu pedido de acesso ao módulo ${modulo.nome} foi enviado em ${this.dataCurta(pedido.CriadoEm)} e aguarda a decisão dos administradores.`);
      return;
    }
    this.abrirDialogo(modulo);
  }

  // ── Janela do pedido ──────────────────────────────────────────────────────

  abrirDialogo(modulo: ModuloSgdp): void {
    this.dialogo = { modulo, justificativa: '' };
  }

  @HostListener('document:keydown.escape')
  fecharDialogo(): void {
    if (this.enviandoPedido) return;
    this.dialogo = null;
  }

  enviarPedido(): void {
    if (!this.dialogo || this.enviandoPedido) return;
    const { modulo, justificativa } = this.dialogo;

    this.enviandoPedido = true;
    this.pedidosAcesso.pedir(modulo.id, justificativa.trim() || null).subscribe({
      next: pedido => {
        this.enviandoPedido = false;
        this.dialogo = null;
        this.pedidos = { ...this.pedidos, [pedido.Modulo]: pedido };
        this.notificacoes.success(`Pedido de acesso ao módulo ${modulo.nome} enviado. A resposta aparece aqui, no card do módulo.`);
      },
      error: err => {
        this.enviandoPedido = false;
        this.notificacoes.error(err?.error?.Message || 'Não foi possível enviar o pedido. Tente de novo.');
        // "Você já tem acesso": o módulo foi liberado enquanto a tela estava aberta
        if (err?.status === 400) this.authService.refreshUser().subscribe(user => { if (user) this.aplicarUsuario(user); });
      }
    });
  }

  dataCurta(iso: string | null): string {
    return iso ? this.datePipe.transform(iso, 'dd/MM') ?? '' : '';
  }

  private aplicarUsuario(user: UserProfile | null): void {
    this.user = user;
    this.modulos = this.modulosVisiveis();
  }

  /**
   * Quem não é administrador nem vê o card da Administração: ela não se pede pelo
   * sistema (vem só do perfil admin do Keycloak).
   */
  private modulosVisiveis(): ModuloSgdp[] {
    return MODULOS.filter(m => m.id !== Modulos.Administracao || temModulo(this.user, m.id));
  }

  private carregarPedidos(): void {
    // No SSR não há sessão: os pedidos só existem no navegador
    if (!isPlatformBrowser(this.platformId)) return;
    this.pedidosAcesso.meus().subscribe({
      next: lista => this.pedidos = Object.fromEntries(lista.map(p => [p.Modulo, p])),
      // Sem a lista, os cards só não mostram o andamento; o botão continua pedindo
      error: () => this.pedidos = {}
    });
  }
}
