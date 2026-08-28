import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaGovernancaService } from '../services/pgia-governanca.service';
import { PgiaAbasComponent } from '../shared/pgia-abas.component';
import { PgiaAuditoria } from '../../../api/pgia/interface';

/** Campos que a entidade auditora edita em cada auditoria designada. */
interface EdicaoParecer {
  DataInicio: string;
  DataFim: string;
  Parecer: string;
}

@Component({
  selector: 'app-pgia-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, PgiaAbasComponent],
  templateUrl: './pgia-auditoria.component.html'
})
export class PgiaAuditoriaComponent implements OnInit {
  user: UserProfile | null = null;
  loading = true;
  temAcesso = false;

  auditorias: PgiaAuditoria[] = [];
  edicao: Record<number, EdicaoParecer> = {};
  submetido: Record<number, boolean> = {};
  entregandoId: number | null = null;

  constructor(
    private authService: AuthService,
    private governancaService: PgiaGovernancaService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.user = user;
      const papel = user?.PapelPgia ?? null;
      const isAdmin = user?.Perfil === Perfis.Admin;
      this.temAcesso = isAdmin || papel === PapeisPgia.Auditoria;
      this.loading = false;
      if (this.temAcesso) {
        this.carregar();
      }
    });
  }

  carregar(): void {
    this.governancaService.listarMinhasAuditorias().subscribe({
      next: (lista) => {
        this.auditorias = lista;
        this.edicao = {};
        this.submetido = {};
        lista.forEach(a => {
          this.edicao[a.Id] = {
            DataInicio: a.DataInicio ?? '',
            DataFim: a.DataFim ?? '',
            Parecer: a.Parecer ?? ''
          };
          this.submetido[a.Id] = false;
        });
      },
      error: () => this.notificationService.error('Não foi possível carregar as auditorias designadas a você.')
    });
  }

  /** Identificação no formato do mock: AUD-{ano}-{Id}. */
  codigo(a: PgiaAuditoria): string {
    const ano = (a.DataInicio ?? a.CriadoEm ?? '').substring(0, 4);
    return `AUD-${ano}-${a.Id}`;
  }

  /** "Periódica (definida pelo CGTIC)" quando for o caso, como no mock. */
  tipoDescrito(a: PgiaAuditoria): string {
    return a.Tipo === 'Periódica' ? 'Periódica (definida pelo CGTIC)' : a.Tipo;
  }

  entidadeDescrita(a: PgiaAuditoria): string {
    return a.ExternaFornecedor ? `${a.EntidadeAuditora}, externa ao fornecedor` : a.EntidadeAuditora;
  }

  apoioFapdf(a: PgiaAuditoria): string {
    if (a.ApoioFapdf === null) return 'não informado';
    return a.ApoioFapdf ? 'Sim (art. 12, I)' : 'Não';
  }

  errParecer(a: PgiaAuditoria): boolean {
    return !!this.submetido[a.Id] && !this.edicao[a.Id]?.Parecer.trim();
  }

  entregarParecer(a: PgiaAuditoria): void {
    const dados = this.edicao[a.Id];
    if (!dados) return;
    this.submetido[a.Id] = true;
    if (!dados.Parecer.trim()) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    this.entregandoId = a.Id;
    this.governancaService.entregarParecer(a.Id, {
      DataInicio: dados.DataInicio,
      DataFim: dados.DataFim || null,
      Parecer: dados.Parecer.trim()
    }).subscribe({
      next: () => {
        this.entregandoId = null;
        this.notificationService.success('Parecer entregue à SGDI. Obrigado.');
        this.carregar();
      },
      error: () => {
        this.entregandoId = null;
        this.notificationService.error('Não foi possível entregar o parecer.');
      }
    });
  }
}
