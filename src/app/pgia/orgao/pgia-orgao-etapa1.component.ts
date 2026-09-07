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
import {
  NATUREZAS_JURIDICAS,
  PgiaAgenteInfoForm,
  PgiaDesignacao,
  PgiaDesignacaoForm,
  PgiaOrgao,
  PgiaOrgaoDadosForm,
  PgiaPessoa,
  PgiaResponsavelIaForm,
  PRAZO_DESIGNACAO,
  VINCULOS
} from '../../../api/pgia/interface';

@Component({
  selector: 'app-pgia-orgao-etapa1',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaDecretoDirective],
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
  isAuditoria = false;
  modoConsulta = false;

  orgao: PgiaOrgao | null = null;
  responsavelVigente: PgiaDesignacao | null = null;
  encarregadoVigente: PgiaDesignacao | null = null;

  naturezas = NATUREZAS_JURIDICAS;
  vinculos = VINCULOS;
  prazoDesignacao = PRAZO_DESIGNACAO;

  // Card: dados do órgão
  dadosForm: PgiaOrgaoDadosForm = { Nome: '', NaturezaJuridica: 'Administração direta', PrestaServicoCidadao: null };
  salvandoDados = false;
  dadosSubmetido = false;

  // Card: pessoas do órgão
  pessoas: PgiaPessoa[] = [];
  pessoaEmEdicao: PgiaPessoa | null = null;
  infoForm: PgiaAgenteInfoForm = { Matricula: null, CargoFuncao: null, Vinculo: 'Servidor efetivo' };
  salvandoInfo = false;

  // Card: Responsável de IA
  riaForm: PgiaResponsavelIaForm = this.novoRiaForm();
  riaSubmetido = false;
  salvandoRia = false;
  historicoRia: PgiaDesignacao[] = [];

  // Card: Encarregado de Dados
  dpoForm: PgiaDesignacaoForm = this.novoDpoForm();
  dpoSubmetido = false;
  salvandoDpo = false;
  historicoDpo: PgiaDesignacao[] = [];

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

  private novoRiaForm(): PgiaResponsavelIaForm {
    return {
      AgenteId: '', AtoTipo: 'Portaria', AtoNumero: '', AtoData: '',
      ProcessoSeiComunicacao: '', DataComunicacaoSgdi: '', InicioVigencia: '',
      AcumulaFuncaoTic: false, CapacitacaoAdequada: null
    };
  }

  private novoDpoForm(): PgiaDesignacaoForm {
    return {
      AgenteId: '', AtoTipo: 'Portaria', AtoNumero: '', AtoData: '',
      ProcessoSeiComunicacao: '', DataComunicacaoSgdi: '', InicioVigencia: ''
    };
  }

  carregarMeuOrgao(): void {
    this.loading = true;
    this.pgiaOrgaoService.getMeuOrgao().subscribe({
      next: (meu) => {
        this.orgao = meu.Orgao;
        this.responsavelVigente = meu.ResponsavelIaVigente;
        this.encarregadoVigente = meu.EncarregadoDadosVigente;
        if (meu.Orgao) {
          this.dadosForm = {
            Nome: meu.Orgao.Nome,
            NaturezaJuridica: meu.Orgao.NaturezaJuridica,
            PrestaServicoCidadao: meu.Orgao.PrestaServicoCidadao
          };
          this.carregarPessoas();
          this.carregarHistoricos();
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
    this.pgiaOrgaoService.listarPessoas(this.orgao.Id).subscribe({
      next: (pessoas) => this.pessoas = pessoas,
      error: () => this.notificationService.error('Não foi possível carregar as pessoas do órgão.')
    });
  }

  carregarHistoricos(): void {
    if (!this.orgao) return;
    this.pgiaOrgaoService.listarResponsaveisIa(this.orgao.Id).subscribe({
      next: (lista) => this.historicoRia = lista.filter(d => !d.Ativo)
    });
    this.pgiaOrgaoService.listarEncarregadosDados(this.orgao.Id).subscribe({
      next: (lista) => this.historicoDpo = lista.filter(d => !d.Ativo)
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
      error: () => {
        this.salvandoDados = false;
        this.notificationService.error('Não foi possível salvar os dados do órgão.');
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
      error: () => {
        this.salvandoInfo = false;
        this.notificationService.error('Não foi possível salvar os dados da pessoa.');
      }
    });
  }

  // ── Prazo de comunicação (art. 35, I) ─────────────────────────────────────

  prazoOk(data: string): boolean {
    return !!data && data <= this.prazoDesignacao;
  }

  // ── Responsável de IA ─────────────────────────────────────────────────────

  private designacaoValida(form: PgiaDesignacaoForm): boolean {
    return !!form.AgenteId && !!form.AtoTipo && !!form.AtoNumero.trim() && !!form.AtoData
      && !!form.ProcessoSeiComunicacao.trim() && !!form.DataComunicacaoSgdi && !!form.InicioVigencia;
  }

  salvarResponsavelIa(): void {
    if (!this.orgao) return;
    this.riaSubmetido = true;
    if (!this.designacaoValida(this.riaForm)) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    this.salvandoRia = true;
    this.pgiaOrgaoService.designarResponsavelIa(this.orgao.Id, this.riaForm).subscribe({
      next: (designacao) => {
        this.responsavelVigente = designacao;
        this.riaForm = this.novoRiaForm();
        this.riaSubmetido = false;
        this.salvandoRia = false;
        this.carregarHistoricos();
        this.notificationService.success('Designação salva. A comunicação à SGDI foi registrada no processo SEI informado.');
      },
      error: () => {
        this.salvandoRia = false;
        this.notificationService.error('Não foi possível salvar a designação.');
      }
    });
  }

  // ── Encarregado de Dados ──────────────────────────────────────────────────

  salvarEncarregado(): void {
    if (!this.orgao) return;
    this.dpoSubmetido = true;
    if (!this.designacaoValida(this.dpoForm)) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    this.salvandoDpo = true;
    this.pgiaOrgaoService.designarEncarregadoDados(this.orgao.Id, this.dpoForm).subscribe({
      next: (designacao) => {
        this.encarregadoVigente = designacao;
        this.dpoForm = this.novoDpoForm();
        this.dpoSubmetido = false;
        this.salvandoDpo = false;
        this.carregarHistoricos();
        this.notificationService.success('Designação do Encarregado de Dados salva e comunicada.');
      },
      error: () => {
        this.salvandoDpo = false;
        this.notificationService.error('Não foi possível salvar a designação.');
      }
    });
  }
}
