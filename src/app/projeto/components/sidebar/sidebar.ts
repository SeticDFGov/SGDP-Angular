import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../auth/services/auth';
import { CommonModule } from '@angular/common';
import { IsActiveMatchOptions, NavigationEnd, Router, RouterModule } from '@angular/router';
import { UserProfile } from '../../../../api/auth/interface';
import { filter } from 'rxjs/operators';
import { SidebarStateService } from './sidebar-state.service';
import { ItemNavPgia, arvorePgia } from './pgia-nav';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {
  user: UserProfile | null = null;
  isExpanded: boolean = true; // Sidebar expandido por padrão
  canPgia: boolean = false; // papel PGIA ou admin: entra na área completa
  soPgia: boolean = false;  // perfil 'basico': confinado à área /pgia

  /** Árvore de navegação do PGIA, montada conforme o papel do usuário. */
  arvore: ItemNavPgia[] = [];
  /** Grupo "Governança de IA" aberto no menu. */
  grupoPgiaAberto: boolean = false;
  /** O usuário está numa tela da área /pgia. */
  dentroPgia: boolean = false;

  /**
   * Destaque do formulário aberto: compara só o caminho. Com `{ exact: true }`
   * o roteador exigiria também os query params iguais, e o item perderia o
   * realce em telas que usam a URL para passar contexto (por exemplo
   * `/pgia/cgtic/deliberacoes?sistema=12`, vindo de "Preparar deliberação").
   */
  readonly opcoesFormularioAtivo: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored'
  };

  /** Áreas abertas na árvore, por `base` (o usuário abriu ou fechou à mão). */
  private areasAbertas: Record<string, boolean> = {};
  private rotaAtual: string = '';

  constructor(
    private authService: AuthService,
    private sidebarStateService: SidebarStateService,
    private router: Router
  ){};

  logout(){
    this.authService.logout();
  }

  ngOnInit(){
    this.carregarUser();
    // Carregar estado do serviço
    this.isExpanded = this.sidebarStateService.getExpanded();

    // Inscrever-se nas mudanças
    this.sidebarStateService.isExpanded$.subscribe(expanded => {
      this.isExpanded = expanded;
    });

    // Rota e âncora atuais: destacam o item aberto na árvore do PGIA
    this.lerUrl(this.router.url);
    this.router.events
      .pipe(filter(evento => evento instanceof NavigationEnd))
      .subscribe(evento => this.lerUrl((evento as NavigationEnd).urlAfterRedirects));
  }

  carregarUser(){
    this.authService.getUser().subscribe(response =>{
      this.user = response
      this.canPgia = !!(response && (response.PapelPgia || response.Perfil === 'admin'));
      this.soPgia = !!(response && response.Perfil === 'basico');
      this.arvore = arvorePgia(response?.PapelPgia, response?.Perfil);
      // Quem só tem o PGIA vê a árvore sempre aberta.
      if (this.soPgia) this.grupoPgiaAberto = true;
    }
    );
  }

  toggleSidebar(){
    this.sidebarStateService.setExpanded(!this.isExpanded);
  }

  // ── Árvore do PGIA ────────────────────────────────────────────────────────

  /** A árvore só aparece com o menu aberto. */
  get mostrarArvore(): boolean {
    return this.isExpanded && (this.grupoPgiaAberto || this.soPgia);
  }

  /** Destino do ícone quando o menu está minimizado. */
  get rotaGrupoPgia(): string {
    return this.canPgia ? '/pgia' : '/pgia/uso';
  }

  alternarGrupoPgia(): void {
    // Usuário confinado ao PGIA: a árvore é o menu dele, fica sempre aberta.
    if (this.soPgia) return;
    this.grupoPgiaAberto = !this.grupoPgiaAberto;
  }

  /** A área é a que está aberta na tela (qualquer um dos formulários dela). */
  areaAtiva(item: ItemNavPgia): boolean {
    const base = item.base ?? item.rota;
    return this.rotaAtual === base || this.rotaAtual.startsWith(base + '/');
  }

  /** Formulários da área visíveis: a área ativa abre sozinha. */
  areaAberta(item: ItemNavPgia): boolean {
    const base = item.base ?? item.rota;
    return this.areasAbertas[base] ?? this.areaAtiva(item);
  }

  /** Clique no nome da área: abre a lista de formulários (e navega ao 1º). */
  abrirArea(item: ItemNavPgia): void {
    this.areasAbertas[item.base ?? item.rota] = true;
  }

  /** Chevron: mostra ou esconde os formulários da área, sem sair da tela. */
  alternarArea(item: ItemNavPgia): void {
    const base = item.base ?? item.rota;
    this.areasAbertas[base] = !this.areaAberta(item);
  }

  private lerUrl(url: string): void {
    this.rotaAtual = url.split('#')[0].split('?')[0];

    const dentro = this.rotaAtual.startsWith('/pgia');
    // Ao entrar na área, a árvore abre sozinha; fora dela o usuário decide.
    if (dentro && !this.dentroPgia) this.grupoPgiaAberto = true;
    this.dentroPgia = dentro;
  }
}
