import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaAbasComponent } from '../shared/pgia-abas.component';
import { PgiaOrgao, PgiaPrazo } from '../../../api/pgia/interface';

@Component({
  selector: 'app-pgia-prazos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PgiaAbasComponent],
  templateUrl: './pgia-prazos.component.html'
})
export class PgiaPrazosComponent implements OnInit {
  loading = true;
  orgao: PgiaOrgao | null = null;
  prazosOrgao: PgiaPrazo[] = [];
  prazosCentrais: PgiaPrazo[] = [];
  veCentrais = false;
  podeMarcar = false;
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
      error: () => {
        this.notificationService.error('Não foi possível carregar os prazos.');
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
      error: () => {
        this.salvando = false;
        this.notificationService.error('Não foi possível registrar o cumprimento.');
      }
    });
  }
}
