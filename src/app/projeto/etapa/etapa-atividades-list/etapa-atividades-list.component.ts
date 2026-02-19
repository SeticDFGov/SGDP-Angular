import { Component, Input, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AtividadeService } from '../../service/atividade.service';
import { AtividadeResponseDTO } from '../../../../api/atividade/interface';
import { AuthService } from '../../../auth/services/auth';

@Component({
  selector: 'app-etapa-atividades-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './etapa-atividades-list.component.html',
  styleUrls: ['./etapa-atividades-list.component.css']
})
export class EtapaAtividadesListComponent implements OnInit, OnDestroy, OnChanges {
  @Input() etapaId!: number;
  @Input() etapaIndex: number = 1;
  @Input() expanded: boolean = false;

  atividades: AtividadeResponseDTO[] = [];
  isLoading = false;
  error: string | null = null;
  mostrarFormulario = false;
  mostrarEdicao = false;
  atividadeEmEdicao: AtividadeResponseDTO | null = null;

  // Observables de permissão
  canCreateAtividade$: Observable<boolean>;
  canEditAtividade$: Observable<boolean>;
  canDeleteAtividade$: Observable<boolean>;
  isReadOnly$: Observable<boolean>;

  // Form data
  novaAtividade = {
    titulo: '',
    categoria: '',
    descricao: '',
    dataInicioPrevisto: '',
    dataTerminoPrevisto: '',
    responsavel: ''
  };

  edicaoForm = {
    dataInicioReal: '',
    dataTerminoReal: ''
  };

  private destroy$ = new Subject<void>();

  constructor(
    private atividadeService: AtividadeService,
    private authService: AuthService
  ) {
    // Inicializa os observables de permissão
    this.canCreateAtividade$ = this.authService.canCreate('atividade');
    this.canEditAtividade$ = this.authService.canEdit('atividade');
    this.canDeleteAtividade$ = this.authService.canDelete('atividade');
    this.isReadOnly$ = this.authService.isReadOnly();
  }

  ngOnInit(): void {
    if (this.expanded) {
      this.carregarAtividades();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(): void {
    if (this.expanded && this.atividades.length === 0) {
      this.carregarAtividades();
    }
  }

  carregarAtividades(): void {
    this.isLoading = true;
    this.error = null;

    this.atividadeService.listarPorEtapa(this.etapaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.atividades = data.sort((a, b) => a.Order - b.Order);
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Erro ao carregar atividades';
          this.isLoading = false;
          console.error('Erro ao carregar atividades:', err);
        }
      });
  }

  abrirEdicaoAtividade(atividade: AtividadeResponseDTO): void {
    this.atividadeEmEdicao = atividade;
    this.mostrarEdicao = true;

    // Preenche o formulário com as datas existentes (se houver)
    this.edicaoForm.dataInicioReal = this.toDateInputFormat(atividade.DT_INICIO_REAL);
    this.edicaoForm.dataTerminoReal = this.toDateInputFormat(atividade.DT_TERMINO_REAL);
  }

  fecharEdicao(): void {
    this.mostrarEdicao = false;
    this.atividadeEmEdicao = null;
    this.edicaoForm = {
      dataInicioReal: '',
      dataTerminoReal: ''
    };
  }

  salvarEdicaoAtividade(): void {
    if (!this.atividadeEmEdicao) return;

    const dto: any = {};

    // Só inclui as datas que foram preenchidas
    if (this.edicaoForm.dataInicioReal) {
      dto.DT_INICIO_REAL = this.edicaoForm.dataInicioReal;
    }
    if (this.edicaoForm.dataTerminoReal) {
      dto.DT_TERMINO_REAL = this.edicaoForm.dataTerminoReal;
    }

    this.atividadeService.atualizar(this.atividadeEmEdicao.AtividadeId, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.carregarAtividades();
          this.fecharEdicao();
        },
        error: (err) => {
          console.error('Erro ao atualizar atividade:', err);
          alert('Erro: ' + (err.error?.error || 'Não foi possível atualizar a atividade'));
        }
      });
  }

  toDateInputFormat(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getSituacaoClass(situacao: string): string {
    const classes: Record<string, string> = {
      'Concluído': 'bg-green-500 text-white',
      'Em Andamento': 'bg-blue-500 text-white',
      'Atrasado para Início': 'bg-red-500 text-white',
      'Atrasado para Conclusão': 'bg-orange-500 text-white',
      'Não Iniciada': 'bg-gray-400 text-white'
    };
    return classes[situacao] || 'bg-gray-300 text-white';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  abrirFormularioAtividade(): void {
    this.mostrarFormulario = true;
  }

  fecharFormulario(): void {
    this.mostrarFormulario = false;
    this.resetForm();
  }

  resetForm(): void {
    this.novaAtividade = {
      titulo: '',
      categoria: '',
      descricao: '',
      dataInicioPrevisto: '',
      dataTerminoPrevisto: '',
      responsavel: ''
    };
  }

  salvarAtividade(): void {
    const dados = this.novaAtividade;
    if (!dados.titulo || !dados.dataInicioPrevisto || !dados.dataTerminoPrevisto) {
      alert('Por favor, preencha os campos obrigatórios (Título e Datas)');
      return;
    }
    this.criarAtividade(dados);
  }

  criarAtividade(dados: any): void {
    const dto = {
      EtapaProjetoId: this.etapaId,
      Titulo: dados.titulo,
      Categoria: dados.categoria || undefined,
      Descricao: dados.descricao || undefined,
      DT_INICIO_PREVISTO: dados.dataInicioPrevisto,
      DT_TERMINO_PREVISTO: dados.dataTerminoPrevisto,
      RESPONSAVEL_ATIVIDADE: dados.responsavel || undefined,
      Order: this.atividades.length
    };

    this.atividadeService.criar(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.carregarAtividades();
          this.fecharFormulario();
        },
        error: (err) => {
          console.error('Erro ao criar atividade:', err);
          alert('Erro: ' + (err.error?.error || 'Não foi possível criar a atividade'));
        }
      });
  }

  excluirAtividade(atividade: AtividadeResponseDTO): void {
    if (!confirm(`Tem certeza que deseja excluir a atividade "${atividade.Titulo}"?`)) {
      return;
    }

    this.atividadeService.deletar(atividade.AtividadeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.carregarAtividades();
        },
        error: (err) => {
          console.error('Erro ao excluir atividade:', err);
          if (err.status === 403) {
            alert('Você não tem permissão para excluir atividades.');
          } else {
            alert('Erro: ' + (err.error?.error || 'Não foi possível excluir a atividade'));
          }
        }
      });
  }
}
