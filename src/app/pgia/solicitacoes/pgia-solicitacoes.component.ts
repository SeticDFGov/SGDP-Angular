import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaOperacaoService } from '../services/pgia-operacao.service';
import { PgiaOrgao, PgiaSolicitacaoOrgao } from '../../../api/pgia/interface';
import { CitaDecretoDirective } from '../shared/cita-decreto.directive';
import { mensagemDoErro } from '../shared/mensagem-erro';

@Component({
  selector: 'app-pgia-solicitacoes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaDecretoDirective],
  templateUrl: './pgia-solicitacoes.component.html'
})
export class PgiaSolicitacoesComponent implements OnInit {
  user: UserProfile | null = null;
  loading = true;

  podeEditar = false;
  isAuditoria = false;
  modoConsulta = false;

  orgao: PgiaOrgao | null = null;
  solicitacoes: PgiaSolicitacaoOrgao[] = [];
  carregandoSolicitacoes = false;

  expandido: number | null = null;
  respostaTexto = '';
  respostaSubmetida = false;
  salvandoResposta = false;
  acaoEmCursoId: number | null = null;

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

  carregar(): void {
    this.loading = true;
    this.orgaoService.getMeuOrgao().subscribe({
      next: (meu) => {
        this.orgao = meu.Orgao;
        if (meu.Orgao) {
          this.carregarSolicitacoes();
        }
        this.loading = false;
      },
      error: (err) => {
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível carregar os dados do órgão.'));
        this.loading = false;
      }
    });
  }

  carregarSolicitacoes(): void {
    if (!this.orgao) return;
    this.carregandoSolicitacoes = true;
    this.operacaoService.listarSolicitacoes(this.orgao.Id).subscribe({
      next: (lista) => { this.solicitacoes = lista; this.carregandoSolicitacoes = false; },
      error: (err) => {
        this.carregandoSolicitacoes = false;
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível carregar as solicitações do cidadão.'));
      }
    });
  }

  badgeStatus(status: string): string {
    switch (status) {
      case 'Respondida': return 'bg-green-100 text-green-800';
      case 'Em análise': return 'bg-indigo-100 text-indigo-800';
      case 'Encaminhada ao Encarregado de Dados': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800'; // Recebida
    }
  }

  alternarDetalhe(s: PgiaSolicitacaoOrgao): void {
    if (this.expandido === s.Id) {
      this.expandido = null;
      return;
    }
    this.expandido = s.Id;
    this.respostaTexto = s.Resposta ?? '';
    this.respostaSubmetida = false;
  }

  get errResposta(): boolean {
    return this.respostaSubmetida && !this.respostaTexto.trim();
  }

  marcarEmAnalise(s: PgiaSolicitacaoOrgao): void {
    this.acaoEmCursoId = s.Id;
    this.operacaoService.marcarSolicitacaoEmAnalise(s.Id).subscribe({
      next: () => {
        this.acaoEmCursoId = null;
        this.carregarSolicitacoes();
        this.notificationService.success('Pedido marcado como em análise. O cidadão vê essa situação pelo protocolo.');
      },
      error: (err) => {
        this.acaoEmCursoId = null;
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível atualizar a situação do pedido.'));
      }
    });
  }

  encaminharDpo(s: PgiaSolicitacaoOrgao): void {
    this.acaoEmCursoId = s.Id;
    this.operacaoService.encaminharSolicitacaoDpo(s.Id).subscribe({
      next: () => {
        this.acaoEmCursoId = null;
        this.carregarSolicitacoes();
        this.notificationService.success('Pedido encaminhado ao Encarregado de Dados do órgão.');
      },
      error: (err) => {
        this.acaoEmCursoId = null;
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível encaminhar o pedido.'));
      }
    });
  }

  responder(s: PgiaSolicitacaoOrgao): void {
    this.respostaSubmetida = true;
    if (!this.respostaTexto.trim()) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    this.salvandoResposta = true;
    this.operacaoService.responderSolicitacao(s.Id, this.respostaTexto.trim()).subscribe({
      next: () => {
        this.salvandoResposta = false;
        this.expandido = null;
        this.respostaSubmetida = false;
        this.carregarSolicitacoes();
        this.notificationService.success(
          `Resposta enviada. Ela já fica visível para o cidadão pelo protocolo ${s.Protocolo}.`);
      },
      error: (err) => {
        this.salvandoResposta = false;
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível enviar a resposta.'));
      }
    });
  }
}
