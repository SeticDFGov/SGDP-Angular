import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { CitaDecretoDirective } from '../shared/cita-decreto.directive';
import { acompanharSecao } from '../shared/secao-rota';
import { PgiaDesignacoesComponent } from './pgia-designacoes.component';
import {
  NATUREZAS_JURIDICAS,
  PgiaAgenteInfoForm,
  PgiaOrgao,
  PgiaOrgaoDadosForm,
  PgiaPessoa,
  VINCULOS
} from '../../../api/pgia/interface';
import { mensagemDoErro } from '../shared/mensagem-erro';

@Component({
  selector: 'app-pgia-orgao-etapa1',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaDecretoDirective, PgiaDesignacoesComponent],
  templateUrl: './pgia-orgao-etapa1.component.html'
})
export class PgiaOrgaoEtapa1Component implements OnInit {
  /** Formulário mostrado nesta página (vem do parâmetro `:secao` da rota). */
  secao: string = '';
  user: UserProfile | null = null;
  loading = true;

  // Usabilidade por papel (a autorização real é do backend):
  // dados do órgão e cadastro das pessoas: pgia_sgdi e admin (a SGDI entrega o
  // órgão pronto); designações: pgia_orgao e admin.
  podeEditarDados = false;
  podeDesignar = false;
  // Completar ou corrigir o ato (PUT): equipe do órgão, SGDI e admin.
  podeCompletarAto = false;
  isAuditoria = false;
  modoConsulta = false;

  orgao: PgiaOrgao | null = null;

  naturezas = NATUREZAS_JURIDICAS;
  vinculos = VINCULOS;

  // Card: dados do órgão
  dadosForm: PgiaOrgaoDadosForm = { Nome: '', NaturezaJuridica: 'Administração direta', PrestaServicoCidadao: null };
  salvandoDados = false;
  dadosSubmetido = false;

  // Card: pessoas do órgão
  pessoas: PgiaPessoa[] = [];
  pessoaEmEdicao: PgiaPessoa | null = null;
  infoForm: PgiaAgenteInfoForm = { Matricula: null, CargoFuncao: null, Vinculo: 'Servidor efetivo' };
  salvandoInfo = false;

  constructor(
    private authService: AuthService,
    private pgiaOrgaoService: PgiaOrgaoService,
    private notificationService: NotificationService
  ) {
    // A seção vem do parâmetro da rota; o componente é reaproveitado na troca.
    acompanharSecao(secao => this.secao = secao);
  }

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => {
      this.user = user;
      const papel = user?.PapelPgia ?? null;
      const isAdmin = user?.Perfil === Perfis.Admin;
      this.isAuditoria = papel === PapeisPgia.Auditoria && !isAdmin;
      // A SGDI pré-cadastra o órgão e as pessoas; o órgão só faz as designações.
      this.podeEditarDados = isAdmin || papel === PapeisPgia.Sgdi;
      this.podeDesignar = isAdmin || papel === PapeisPgia.Orgao;
      this.podeCompletarAto = this.podeDesignar || papel === PapeisPgia.Sgdi;
      this.modoConsulta = !this.podeEditarDados && !this.podeDesignar;
      if (this.isAuditoria) {
        // A área da auditoria externa chega na fase de auditorias técnicas;
        // evitar os GETs que o backend nega para este papel.
        this.loading = false;
      } else {
        this.carregarMeuOrgao();
      }
    });
  }

  carregarMeuOrgao(): void {
    this.loading = true;
    this.pgiaOrgaoService.getMeuOrgao().subscribe({
      next: (meu) => {
        this.orgao = meu.Orgao;
        if (meu.Orgao) {
          this.dadosForm = {
            Nome: meu.Orgao.Nome,
            NaturezaJuridica: meu.Orgao.NaturezaJuridica,
            PrestaServicoCidadao: meu.Orgao.PrestaServicoCidadao
          };
          this.carregarPessoas();
        }
        this.loading = false;
      },
      error: (err) => {
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível carregar os dados do órgão.'));
        this.loading = false;
      }
    });
  }

  carregarPessoas(): void {
    if (!this.orgao) return;
    this.pgiaOrgaoService.listarPessoas(this.orgao.Id).subscribe({
      next: (pessoas) => this.pessoas = pessoas,
      error: (err) => this.notificationService.error(mensagemDoErro(err, 'Não foi possível carregar as pessoas do órgão.'))
    });
  }

  // ── Dados do órgão ────────────────────────────────────────────────────────

  get mostraServicoCidadao(): boolean {
    return this.dadosForm.NaturezaJuridica === 'Empresa pública'
      || this.dadosForm.NaturezaJuridica === 'Sociedade de economia mista';
  }

  salvarDadosOrgao(): void {
    if (!this.orgao) return;
    this.dadosSubmetido = true;
    if (!this.dadosForm.Nome.trim()) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    this.salvandoDados = true;
    this.pgiaOrgaoService.atualizarDados(this.orgao.Id, this.dadosForm).subscribe({
      next: (orgao) => {
        this.orgao = orgao;
        this.salvandoDados = false;
        this.dadosSubmetido = false;
        this.notificationService.success('Dados do órgão salvos.');
      },
      error: (err) => {
        this.salvandoDados = false;
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível salvar os dados do órgão.'));
      }
    });
  }

  // ── Pessoas ───────────────────────────────────────────────────────────────

  editarPessoa(pessoa: PgiaPessoa): void {
    this.pessoaEmEdicao = pessoa;
    this.infoForm = {
      Matricula: pessoa.Matricula,
      CargoFuncao: pessoa.CargoFuncao,
      Vinculo: pessoa.Vinculo ?? 'Servidor efetivo'
    };
  }

  cancelarEdicaoPessoa(): void {
    this.pessoaEmEdicao = null;
  }

  salvarInfoPessoa(): void {
    if (!this.orgao || !this.pessoaEmEdicao) return;
    this.salvandoInfo = true;
    this.pgiaOrgaoService.salvarAgenteInfo(this.orgao.Id, this.pessoaEmEdicao.UserId, this.infoForm).subscribe({
      next: () => {
        this.salvandoInfo = false;
        this.notificationService.success(`Cadastro de ${this.pessoaEmEdicao?.Nome} atualizado.`);
        this.pessoaEmEdicao = null;
        this.carregarPessoas();
      },
      error: (err) => {
        this.salvandoInfo = false;
        this.notificationService.error(mensagemDoErro(err, 'Não foi possível salvar os dados da pessoa.'));
      }
    });
  }
}
