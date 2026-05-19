import { Component } from '@angular/core';
import { DemandaDetalhada, DemandaForm, DemandaUpdateForm, Esteira, PagedResponse } from '../../api/demanda/interface';
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
  demandaEmEdicao: DemandaDetalhada | null = null;

  termoBusca: string = '';
  isModalOpen = false;
  isModalEdicaoOpen = false;
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

  abrirModalEdicao(demanda: DemandaDetalhada) {
    this.demandaEmEdicao = demanda;
    this.newDemanda = {
      NM_PROJETO: demanda.NM_PROJETO,
      NR_PROCESSO_SEI: demanda.NR_PROCESSO_SEI ?? '',
      NM_AREA_DEMANDANTE: demanda.AREA_DEMANDANTE?.AreaDemandanteID ?? 0,
      EsteiraId: demanda.Esteira?.EsteiraId ?? ''
    };
    this.isModalEdicaoOpen = true;
  }

  fecharModalEdicao() {
    this.isModalEdicaoOpen = false;
    this.demandaEmEdicao = null;
  }

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
      }
    });
  }

  salvarEdicaoDemanda(request: DemandaUpdateForm) {
    if (!this.demandaEmEdicao) return;

    this.demandaService.updateDemanda(this.demandaEmEdicao.demandaId, request).subscribe({
      next: () => {
        this.fecharModalEdicao();
        this.carregarDemandas();
      },
      error: (err) => {
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

  formatarProcessoSEI(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 19) value = value.slice(0, 19);
    value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    value = value.replace(/^(\d{5})-(\d{8})(\d)/, '$1-$2/$3');
    value = value.replace(/^(\d{5})-(\d{8})\/(\d{4})(\d)/, '$1-$2/$3-$4');
    input.value = value;
    this.newDemanda.NR_PROCESSO_SEI = value;
  }

  carregarOpcoes() {
    this.esteiraService.getEsteira().subscribe(dados => this.listaEsteiras = dados);
    this.demandanteService.getDemandantes().subscribe(dados => this.listaDemandantes = dados);
  }
}
