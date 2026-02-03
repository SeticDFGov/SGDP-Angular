import { Component } from '@angular/core';
import { Unidade, AreaDemandante, Esteira, ProjetoDetalhado, ProjetoInterfaceForm, PagedResponse } from '../../api/projeto/inteface';
import { AuthService } from '../auth/services/auth';
import { CommonModule } from '@angular/common';
import { Sidebar } from './components/sidebar/sidebar';
import { RouterLink } from '@angular/router';
import { ProjetoForm } from './components/projeto-form/projeto-form';
import { UnidadeService } from './service/unidade';
import { DemandanteService } from './service/demandante';
import { EsteiraService } from './service/esteira';
import { ProjetoService } from './service/projeto.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-projeto',
  standalone: true,
  imports: [
    CommonModule,
    Sidebar,
    RouterLink,
    ProjetoForm,
    FormsModule
  ],
  templateUrl: './projeto.html',
  styleUrl: './projeto.css'
})

export class Projeto {
  constructor(
    private authService: AuthService,
    private unidadeService: UnidadeService,
    private demandanteService: DemandanteService,
    private esteiraService: EsteiraService,
    private projetoService: ProjetoService
  ) { }

  // Data lists
  projetos: ProjetoDetalhado[] = [];
  listaEsteiras: Esteira[] = [];
  listaUnidades: Unidade[] = [];
  listaDemandantes: AreaDemandante[] = [];
  projetosFiltrados: ProjetoDetalhado[] = [];

  // UI state
  termoBusca: string = '';
  isModalOpen = false;
  esteiraSelecionada: string = '';

  // Pagination state
  currentPage: number = 1;
  pageSize: number = 20;
  totalItems: number = 0;
  totalPages: number = 0;
  hasNextPage: boolean = false;
  hasPreviousPage: boolean = false;

  // Loading state
  isLoading: boolean = false;

  ngOnInit() {
    this.carregarProjetos();
    this.carregarOpcoes();
  }

  abrirModal() {
    this.isModalOpen = true;
  }

  fecharModal() {
    this.isModalOpen = false;
  }
  carregarProjetos() {
    this.authService.getUser().subscribe(user => {
      if (user && user.Unidade && user.Unidade.Nome) {
        this.isLoading = true;
        this.projetoService.getProjetosPagedCompat(
          user.Unidade.Nome,
          this.currentPage,
          this.pageSize
        ).subscribe({
          next: (response) => {
            this.projetos = response.projetos;
            this.projetosFiltrados = response.projetos;

            // Update pagination state
            this.totalItems = response.pagination.TotalItems;
            this.totalPages = response.pagination.TotalPages;
            this.hasNextPage = response.pagination.HasNextPage;
            this.hasPreviousPage = response.pagination.HasPreviousPage;

            this.isLoading = false;

            // Reapply esteira filter if one was selected
            if (this.esteiraSelecionada) {
              this.aplicarFiltroEsteira();
            }
          },
          error: (err) => {
            console.error('Erro ao carregar projetos:', err);
            this.isLoading = false;
          }
        });
      } else {
        console.error('Usuário ou unidade não encontrados.');
      }
    });
  }

  filtrarPorEsteira(event: any): void {
    this.esteiraSelecionada = event.target.value;
    this.aplicarFiltroEsteira();
  }

  private aplicarFiltroEsteira(): void {
    if (!this.esteiraSelecionada) {
      this.projetosFiltrados = this.projetos;
    } else {
      this.projetosFiltrados = this.projetos.filter(p =>
        p.Esteira.EsteiraId === this.esteiraSelecionada
      );
    }
  }

  salvarProjetos(request: ProjetoInterfaceForm) {
    request.DT_INICIO = new Date(request.DT_INICIO).toISOString();
    request.DT_TERMINO = new Date(request.DT_TERMINO).toISOString();

    this.projetoService.createProjeto(request).subscribe({
      next: () => {
        this.fecharModal();
        this.carregarProjetos();
      },
      error: (err) => {
        console.error('Erro ao salvar o projeto', err);
      }
    });
  }

  // Pagination methods
  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.carregarProjetos();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
    this.carregarProjetos();
  }

  goToFirstPage(): void {
    this.onPageChange(1);
  }

  goToLastPage(): void {
    this.onPageChange(this.totalPages);
  }

  get startItem(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  carregarOpcoes() {
    this.esteiraService.getEsteira().subscribe(dados => this.listaEsteiras = dados);
    this.demandanteService.getDemandantes().subscribe(dados => this.listaDemandantes = dados);
    this.unidadeService.getUnidades().subscribe(dados => this.listaUnidades = dados)
  }

}
