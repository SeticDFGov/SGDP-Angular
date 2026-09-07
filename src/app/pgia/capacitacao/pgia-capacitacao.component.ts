import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaOperacaoService } from '../services/pgia-operacao.service';
import { CitaDecretoDirective } from '../shared/cita-decreto.directive';
import {
  PgiaCapacitacao,
  PgiaCapacitacaoForm,
  PgiaOrgao,
  PgiaPessoa,
  STATUS_CAPACITACAO,
  TRILHAS_CAPACITACAO
} from '../../../api/pgia/interface';

@Component({
  selector: 'app-pgia-capacitacao',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaDecretoDirective],
  templateUrl: './pgia-capacitacao.component.html'
})
export class PgiaCapacitacaoComponent implements OnInit {
  user: UserProfile | null = null;
  loading = true;

  podeEditar = false;
  isAuditoria = false;
  modoConsulta = false;

  orgao: PgiaOrgao | null = null;
  pessoas: PgiaPessoa[] = [];
  capacitacoes: PgiaCapacitacao[] = [];

  trilhas = TRILHAS_CAPACITACAO;
  situacoes = STATUS_CAPACITACAO;

  form = this.novoForm();
  submetido = false;
  salvando = false;
  emEdicao: PgiaCapacitacao | null = null;

  constructor(
    private authService: AuthService,
    private orgaoService: PgiaOrgaoService,
    private operacaoService: PgiaOperacaoService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.user = user;
      const papel = user?.PapelPgia ?? null;
      const isAdmin = user?.Perfil === Perfis.Admin;
      this.isAuditoria = papel === PapeisPgia.Auditoria && !isAdmin;
      this.podeEditar = isAdmin || papel === PapeisPgia.Orgao;
      this.modoConsulta = !this.podeEditar;
      if (this.isAuditoria) {
        this.loading = false;
      } else {
        this.carregar();
      }
    });
  }

  private novoForm() {
    return {
      AgenteId: '',
      Trilha: 'Letramento em IA' as string,
      Status: 'Prevista' as string,
      DataConclusao: '',
      PrevistaPlanoCapacitacao: true
    };
  }

  carregar(): void {
    this.loading = true;
    this.orgaoService.getMeuOrgao().subscribe({
      next: (meu) => {
        this.orgao = meu.Orgao;
        if (meu.Orgao) {
          this.carregarPessoas();
          this.carregarCapacitacoes();
        }
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Não foi possível carregar os dados do órgão.');
        this.loading = false;
      }
    });
  }

  carregarPessoas(): void {
    if (!this.orgao) return;
    this.orgaoService.listarPessoas(this.orgao.Id).subscribe({
      next: (lista) => this.pessoas = lista,
      error: () => this.notificationService.error('Não foi possível carregar as pessoas do órgão.')
    });
  }

  carregarCapacitacoes(): void {
    if (!this.orgao) return;
    this.operacaoService.listarCapacitacoes(this.orgao.Id).subscribe({
      next: (lista) => this.capacitacoes = lista,
      error: () => this.notificationService.error('Não foi possível carregar os registros de capacitação.')
    });
  }

  badgeStatus(status: string): string {
    switch (status) {
      case 'Concluída': return 'bg-green-100 text-green-800';
      case 'Em andamento': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-amber-100 text-amber-800'; // Prevista
    }
  }

  editar(c: PgiaCapacitacao): void {
    if (this.emEdicao?.Id === c.Id) {
      this.cancelarEdicao();
      return;
    }
    this.emEdicao = c;
    this.submetido = false;
    this.form = {
      AgenteId: c.AgenteId,
      Trilha: c.Trilha,
      Status: c.Status,
      DataConclusao: c.DataConclusao ?? '',
      PrevistaPlanoCapacitacao: c.PrevistaPlanoCapacitacao
    };
  }

  cancelarEdicao(): void {
    this.emEdicao = null;
    this.submetido = false;
    this.form = this.novoForm();
  }

  get errAgente(): boolean { return this.submetido && !this.form.AgenteId; }
  /** A data de conclusão só é exigida quando a trilha foi concluída. */
  get errConclusao(): boolean {
    return this.submetido && this.form.Status === 'Concluída' && !this.form.DataConclusao;
  }

  salvar(): void {
    if (!this.orgao) return;
    this.submetido = true;
    if (this.errAgente || this.errConclusao) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    // Pessoa e trilha são a identidade do registro: barra a duplicata antes do
    // POST, porque o erro do backend volta sem corpo aproveitável.
    if (!this.emEdicao && this.capacitacoes.some(
      c => c.AgenteId === this.form.AgenteId && c.Trilha === this.form.Trilha)) {
      this.notificationService.warning('Esta pessoa já tem registro desta trilha de capacitação.');
      return;
    }
    const payload: PgiaCapacitacaoForm = {
      AgenteId: this.form.AgenteId,
      Trilha: this.form.Trilha,
      Status: this.form.Status,
      DataConclusao: this.form.DataConclusao || null,
      PrevistaPlanoCapacitacao: this.form.PrevistaPlanoCapacitacao,
      // Certificado entra como anexo em fase futura.
      CertificadoDocId: this.emEdicao?.CertificadoDocId ?? null
    };
    this.salvando = true;
    const chamada = this.emEdicao
      ? this.operacaoService.atualizarCapacitacao(this.emEdicao.Id, payload)
      : this.operacaoService.criarCapacitacao(this.orgao.Id, payload);
    chamada.subscribe({
      next: () => {
        this.salvando = false;
        this.notificationService.success(this.emEdicao
          ? 'Registro de capacitação atualizado.'
          : 'Capacitação registrada. Ela já aparece na lista.');
        this.cancelarEdicao();
        this.carregarCapacitacoes();
      },
      error: () => {
        this.salvando = false;
        this.notificationService.error('Não foi possível salvar o registro de capacitação.');
      }
    });
  }
}
