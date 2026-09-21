import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { AbaModulo, Modulos, ModuloSgdp, moduloDaRota } from '../../core/modulos/modulos';
import { PedidosAcessoService } from '../../core/acessos/pedidos-acesso.service';

/**
 * Moldura das telas autenticadas, SEM barra lateral: cabeçalho horizontal com a
 * trilha "Início › Módulo", o botão de voltar à tela inicial, o menu do usuário e
 * as abas do módulo aberto. Cada módulo é isolado: a navegação só leva às telas
 * do próprio módulo, e trocar de módulo é sempre pela tela inicial.
 * O PGIA não usa as abas daqui: tem a trilha numerada própria (pgia-shell).
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterModule, CommonModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayout implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pedidosAcesso = inject(PedidosAcessoService);

  /** Pedidos de acesso esperando decisão (contador da aba da Administração). */
  readonly pedidosPendentes = this.pedidosAcesso.pendentes;

  user: UserProfile | null = null;
  modulo: ModuloSgdp | null = null;
  rotaAtual = '';
  menuAberto = false;

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => this.user = user);
    // O /me revalidado pelos guards atualiza nome/módulos sem recarregar a página
    this.authService.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => { if (user) this.user = user; });

    this.lerUrl(this.router.url);
    this.router.events
      .pipe(filter(evento => evento instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(evento => this.lerUrl((evento as NavigationEnd).urlAfterRedirects));
  }

  get naInicio(): boolean {
    return this.rotaAtual === '/inicio';
  }

  get iniciais(): string {
    const partes = (this.user?.Nome ?? '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    const primeira = partes[0].charAt(0);
    const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return (primeira + ultima).toUpperCase();
  }

  abaAtiva(aba: AbaModulo): boolean {
    return aba.prefixos.some(p => this.rotaAtual === p || this.rotaAtual.startsWith(p + '/'));
  }

  /** Sub-abas (nível 2) da aba aberta, quando ela tem. */
  get filhosAtivos(): { rotulo: string; rota: string }[] {
    return this.modulo?.abas.find(aba => this.abaAtiva(aba))?.filhos ?? [];
  }

  subAbaAtiva(rota: string): boolean {
    return this.rotaAtual === rota;
  }

  contadorDa(aba: AbaModulo): number {
    return aba.contador === 'pedidosAcesso' ? (this.pedidosPendentes() ?? 0) : 0;
  }

  sair(): void {
    this.menuAberto = false;
    this.authService.logout();
  }

  @HostListener('document:keydown.escape')
  fecharMenu(): void {
    this.menuAberto = false;
  }

  private lerUrl(url: string): void {
    const anterior = this.modulo;
    this.rotaAtual = url.split('#')[0].split('?')[0];
    this.modulo = moduloDaRota(this.rotaAtual);
    this.menuAberto = false;

    // Ao entrar na Administração, o contador de pedidos da aba vem atualizado
    if (this.modulo?.id === Modulos.Administracao && anterior?.id !== Modulos.Administracao) {
      this.pedidosAcesso.atualizarPendentes();
    }
  }
}
