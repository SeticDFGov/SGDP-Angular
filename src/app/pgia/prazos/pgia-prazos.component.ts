import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaOrgao, PgiaPrazo } from '../../../api/pgia/interface';
import { CitaDecretoDirective } from '../shared/cita-decreto.directive';
import { mensagemDoErro } from '../shared/mensagem-erro';

@Component({
  selector: 'app-pgia-prazos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaDecretoDirective],
  templateUrl: './pgia-prazos.component.html'
})
export class PgiaPrazosComponent implements OnInit {
  loading = true;
  orgao: PgiaOrgao | null = null;
  prazosOrgao: PgiaPrazo[] = [];
  prazosCentrais: PgiaPrazo[] = [];
  veCentrais = false;
  podeMarcar = false;
  /** Só a SGDI e o admin registram as obrigações da própria SGDI (o servidor recusa os demais). */
  podeMarcarCentral = false;
  isAuditoria = false;

  // edição de cumprimento
  prazoEmEdicao: PgiaPrazo | null = null;
  dataCumprimento = '';
  salvando = false;

  constructor(
    private authService: AuthService,
    private pgiaOrgaoService: PgiaOrgaoService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      const papel = user?.PapelPgia ?? null;
      const isAdmin = user?.Perfil === Perfis.Admin;
      this.isAuditoria = papel === PapeisPgia.Auditoria && !isAdmin;
      this.veCentrais = isAdmin || papel === PapeisPgia.Sgdi || papel === PapeisPgia.Cgtic;
      this.podeMarcar = isAdmin || papel === PapeisPgia.Orgao || papel === PapeisPgia.Sgdi;
      this.podeMarcarCentral = isAdmin || papel === PapeisPgia.Sgdi;
      if (this.isAuditoria) {
        // O backend nega prazos ao papel de auditoria na fase 0; evita os GETs
        this.loading = false;
      } else {
        this.carregar();
      }
    });
  }

  carregar(): void {
    this.loading = true;
    this.pgiaOrgaoService.getMeuOrgao().subscribe({
      next: (meu) => {
        this.orgao = meu.Orgao;
        if (meu.Orgao) {
          this.pgiaOrgaoService.listarPrazos(meu.Orgao.Id).subscribe({
            next: (prazos) => { this.prazosOrgao = prazos; this.loading = false; },
            error: () => { this.loading = false; }
          });
        } else {
          this.loading = false;
        }
        if (this.veCentrais) {
          this.pgiaOrgaoService.listarPrazosCentrais().subscribe({
            next: (prazos) => this.prazosCentrais = prazos
          });
        }
      },
      error: (err) => {
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível carregar os prazos.'));
        this.loading = false;
      }
    });
  }

  badgeClasse(situacao: string): string {
    switch (situacao) {
      case 'Cumprida no prazo': return 'bg-green-100 text-green-800';
      case 'Cumprida em atraso': return 'bg-yellow-100 text-yellow-800';
      case 'Vencida': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800'; // No prazo
    }
  }

  /**
   * Obrigação da própria SGDI. Entre as linhas centrais (sem órgão), as que começam
   * com "SGDI:" são dela; as demais são linhas-modelo, copiadas para cada órgão na
   * adesão, e cada órgão registra o cumprimento na sua cópia. É a mesma regra do
   * servidor (PgiaAdminService, na criação do órgão).
   */
  ehObrigacaoDaSgdi(prazo: PgiaPrazo): boolean {
    return prazo.OrgaoId === null && prazo.Obrigacao.startsWith('SGDI:');
  }

  get temCentralMarcavel(): boolean {
    return this.podeMarcarCentral && this.prazosCentrais.some(p => this.ehObrigacaoDaSgdi(p));
  }

  iniciarMarcacao(prazo: PgiaPrazo): void {
    this.prazoEmEdicao = prazo;
    this.dataCumprimento = prazo.CumpridoEm ?? '';
  }

  cancelarMarcacao(): void {
    this.prazoEmEdicao = null;
    this.dataCumprimento = '';
  }

  salvarCumprimento(): void {
    if (!this.prazoEmEdicao) return;
    this.salvando = true;
    this.pgiaOrgaoService.marcarCumprimento(this.prazoEmEdicao.Id, this.dataCumprimento || null).subscribe({
      next: () => {
        this.salvando = false;
        this.prazoEmEdicao = null;
        this.notificationService.success('Cumprimento registrado.');
        this.carregar();
      },
      error: (err) => {
        this.salvando = false;
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível registrar o cumprimento.'));
      }
    });
  }
}
