import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../auth/services/auth';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { UserProfile } from '../../../../api/auth/interface';
import { filter } from 'rxjs/operators';
import { SidebarStateService } from './sidebar-state.service';
import { ItemNavPgia, arvorePgia } from './pgia-nav';
import { contratacoesNav } from './contratacoes-nav';
import { GrupoArvoreComponent } from './grupo-arvore.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    GrupoArvoreComponent
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

  /** Árvore do módulo Análises de Contratações (vazia sem acesso). */
  arvoreCtr: ItemNavPgia[] = [];
  /** Grupo "Análises de Contratações" aberto no menu. */
  grupoCtrAberto: boolean = false;
  /** O usuário está numa tela da área /analises. */
  dentroCtr: boolean = false;

  /** URL atual sem query/âncora — cada grupo destaca a área aberta com ela. */
  rotaAtual: string = '';

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
      this.arvoreCtr = contratacoesNav(response?.PapelContratacoes, response?.Perfil);
      // Quem só tem os módulos vê as árvores sempre abertas.
      if (this.soPgia) {
        this.grupoPgiaAberto = true;
        this.grupoCtrAberto = true;
      }
    }
    );
  }

  toggleSidebar(){
    this.sidebarStateService.setExpanded(!this.isExpanded);
  }

  // ── Grupos de módulo no menu ──────────────────────────────────────────────

  /** Destino do ícone do PGIA quando o menu está minimizado. */
  get rotaGrupoPgia(): string {
    return this.canPgia ? '/pgia' : '/pgia/uso';
  }

  alternarGrupoPgia(): void {
    // Usuário confinado ao PGIA: a árvore é o menu dele, fica sempre aberta.
    if (this.soPgia) return;
    this.grupoPgiaAberto = !this.grupoPgiaAberto;
  }

  alternarGrupoCtr(): void {
    if (this.soPgia) return;
    this.grupoCtrAberto = !this.grupoCtrAberto;
  }

  private lerUrl(url: string): void {
    this.rotaAtual = url.split('#')[0].split('?')[0];

    const dentro = this.rotaAtual.startsWith('/pgia');
    // Ao entrar na área, a árvore abre sozinha; fora dela o usuário decide.
    if (dentro && !this.dentroPgia) this.grupoPgiaAberto = true;
    this.dentroPgia = dentro;

    const dentroCtr = this.rotaAtual.startsWith('/analises');
    if (dentroCtr && !this.dentroCtr) this.grupoCtrAberto = true;
    this.dentroCtr = dentroCtr;
  }
}
