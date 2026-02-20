import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/services/auth';
import { EtapaService } from '../projeto/etapa/etapa.service';
import { Entregavel, EntregavelUpdatePercentForm } from '../../api/demanda/interface';
import { UserProfile } from '../../api/auth/interface';

@Component({
  selector: 'app-centralit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './centralit.component.html',
  styleUrls: ['./centralit.component.css']
})
export class CentralITComponent implements OnInit {
  currentUser: UserProfile | null = null;
  entregaveis: Entregavel[] = [];
  loading = false;
  message = '';
  messageType = '';

  percentOptions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  // Track edits per entregavel
  editState: { [id: number]: { percent: number; descricao: string } } = {};

  constructor(
    private authService: AuthService,
    private etapaService: EtapaService
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.currentUser = user;
      if (user?.Unidade?.Nome) {
        this.loadEntregaveis(user.Unidade.Nome);
      }
    });
  }

  loadEntregaveis(areaExecutoraNome: string): void {
    this.loading = true;
    this.etapaService.getEntregaveisCentralIT(areaExecutoraNome).subscribe({
      next: (data) => {
        this.entregaveis = data;
        // Initialize edit state
        data.forEach(e => {
          this.editState[e.EtapaProjetoId] = {
            percent: e.PERCENT_EXECUTADO,
            descricao: e.Descricao ?? ''
          };
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar entregáveis:', err);
        this.loading = false;
      }
    });
  }

  salvar(entregavel: Entregavel): void {
    const state = this.editState[entregavel.EtapaProjetoId];
    if (!state) return;

    const payload: EntregavelUpdatePercentForm = {
      PERCENT_EXECUTADO: state.percent,
      Descricao: state.descricao
    };

    this.etapaService.updatePercentual(entregavel.EtapaProjetoId, payload).subscribe({
      next: () => {
        entregavel.PERCENT_EXECUTADO = state.percent;
        entregavel.Descricao = state.descricao;
        this.showMessage('Salvo com sucesso!', 'success');
      },
      error: (err) => {
        console.error('Erro ao salvar:', err);
        this.showMessage('Erro ao salvar.', 'error');
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  showMessage(msg: string, type: string): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 3000);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }
}
