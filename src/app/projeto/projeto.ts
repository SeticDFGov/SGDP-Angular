import { Component } from '@angular/core';
import { DemandaDetalhada, DemandaForm, Esteira, PagedResponse } from '../../api/demanda/interface';
import { AreaDemandante } from '../../api/demanda/interface';
import { AuthService } from '../auth/services/auth';
import { UserProfile } from '../../api/auth/interface';
import { CommonModule } from '@angular/common';
import { Sidebar } from './components/sidebar/sidebar';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { DemandaService } from '../demanda/service/demanda.service';
import { DemandanteService } from './service/demandante';
import { EsteiraService } from './service/esteira';

@Component({
  selector: 'app-projeto',
  standalone: true,
  imports: [
    CommonModule,
    Sidebar,
    RouterLink,
    FormsModule
  ],
  templateUrl: './projeto.html',
  styleUrl: './projeto.css'
})
export class Projeto {
  canCreateProjeto$: Observable<boolean>;
  currentUser: UserProfile | null = null;

  get perfilLabel(): string {
    const user = this.currentUser;
    if (!user) return '';
    switch (user.Perfil) {
      case 'gestor':    return `Gestor da Unidade ${user.Unidade?.Nome ?? ''}`;
      case 'admin':     return 'Administrador';
      default:          return '';
    }
  }

  constructor(
    private authService: AuthService,
    private demandaService: DemandaService,
    private demandanteService: DemandanteService,
    private esteiraService: EsteiraService
  ) {
    this.canCreateProjeto$ = this.authService.canCreate('projeto');
  }

  demandas: DemandaDetalhada[] = [];
  listaEsteiras: Esteira[] = [];
  listaDemandantes: AreaDemandante[] = [];
  demandasFiltradas: DemandaDetalhada[] = [];

  newDemanda: DemandaForm = { NM_PROJETO: '', NM_AREA_DEMANDANTE: 0, EsteiraId: '' };

  termoBusca: string = '';
  isModalOpen = false;
  esteiraSelecionada: string = '';

  currentPage: number = 1;
  pageSize: number = 20;
  totalItems: number = 0;
  totalPages: number = 0;
  hasNextPage: boolean = false;
  hasPreviousPage: boolean = false;
  isLoading: boolean = false;

  ngOnInit() {
    this.carregarDemandas();
    this.carregarOpcoes();
    this.authService.getUser().subscribe(user => this.currentUser = user);
  }

  abrirModal() {
    this.newDemanda = { NM_PROJETO: '', NM_AREA_DEMANDANTE: 0, EsteiraId: '' };
    this.isModalOpen = true;
  }
  fecharModal() { this.isModalOpen = false; }

  carregarDemandas() {
    this.isLoading = true;
    this.demandaService.getDemandas(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.demandas = response.Items;
        this.demandasFiltradas = response.Items;
        this.totalItems = response.TotalItems;
        this.totalPages = response.TotalPages;
        this.hasNextPage = response.HasNextPage;
        this.hasPreviousPage = response.HasPreviousPage;
        this.isLoading = false;
        if (this.esteiraSelecionada) this.aplicarFiltroEsteira();
      },
      error: (err) => {
        console.error('Erro ao carregar demandas:', err);
        this.isLoading = false;
      }
    });
  }

  filtrarPorEsteira(event: any): void {
    this.esteiraSelecionada = event.target.value;
    this.aplicarFiltroEsteira();
  }

  private aplicarFiltroEsteira(): void {
    if (!this.esteiraSelecionada) {
      this.demandasFiltradas = this.demandas;
    } else {
      this.demandasFiltradas = this.demandas.filter(d =>
        d.Esteira?.EsteiraId === this.esteiraSelecionada
      );
    }
  }

  salvarDemanda(request: DemandaForm) {
    this.demandaService.createDemanda(request).subscribe({
      next: () => {
        this.fecharModal();
        this.carregarDemandas();
      },
      error: (err) => {
        console.error('Erro ao salvar demanda', err);
      }
    });
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.carregarDemandas();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.carregarDemandas();
  }

  goToFirstPage(): void { this.onPageChange(1); }
  goToLastPage(): void { this.onPageChange(this.totalPages); }

  get startItem(): number { return (this.currentPage - 1) * this.pageSize + 1; }
  get endItem(): number { return Math.min(this.currentPage * this.pageSize, this.totalItems); }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  }

  carregarOpcoes() {
    this.esteiraService.getEsteira().subscribe(dados => this.listaEsteiras = dados);
    this.demandanteService.getDemandantes().subscribe(dados => this.listaDemandantes = dados);
  }
}
