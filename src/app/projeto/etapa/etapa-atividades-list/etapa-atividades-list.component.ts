import { Component, Input, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AtividadeService } from '../../service/atividade.service';
import { AtividadeResponseDTO } from '../../../../api/atividade/interface';

@Component({
  selector: 'app-etapa-atividades-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './etapa-atividades-list.component.html',
  styleUrls: ['./etapa-atividades-list.component.css']
})
export class EtapaAtividadesListComponent implements OnInit, OnDestroy, OnChanges {
  @Input() etapaId!: number;
  @Input() expanded: boolean = false;

  atividades: AtividadeResponseDTO[] = [];
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private atividadeService: AtividadeService) {}

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

  iniciarAtividade(id: number): void {
    this.atividadeService.iniciar(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.carregarAtividades();
        },
        error: (err) => {
          console.error('Erro ao iniciar atividade:', err);
          alert('Erro: ' + (err.error?.error || 'Não foi possível iniciar a atividade'));
        }
      });
  }

  concluirAtividade(id: number): void {
    this.atividadeService.concluir(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.carregarAtividades();
        },
        error: (err) => {
          console.error('Erro ao concluir atividade:', err);
          alert('Erro: ' + (err.error?.error || 'Não foi possível concluir a atividade'));
        }
      });
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

  podeIniciar(atividade: AtividadeResponseDTO): boolean {
    return !atividade.DT_INICIO_REAL;
  }

  podeConcluir(atividade: AtividadeResponseDTO): boolean {
    return !!atividade.DT_INICIO_REAL && !atividade.DT_TERMINO_REAL;
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
}
