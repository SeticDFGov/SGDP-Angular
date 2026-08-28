import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, PapeisPgia, Perfis } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaSistemaService } from '../services/pgia-sistema.service';
import { PgiaOperacaoService } from '../services/pgia-operacao.service';
import { CitaDecretoDirective } from '../shared/cita-decreto.directive';
import { acompanharSecao } from '../shared/secao-rota';
import {
  HIPOTESES_INCIDENTE,
  PgiaIncidente,
  PgiaIncidenteComunicarForm,
  PgiaIncidenteCreateForm,
  PgiaNaoConformidade,
  PgiaNaoConformidadeUpdateForm,
  PgiaOrgao,
  PgiaUsoFonteSistema,
  SITUACOES_NAO_CONFORMIDADE
} from '../../../api/pgia/interface';

@Component({
  selector: 'app-pgia-incidentes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaDecretoDirective],
  templateUrl: './pgia-incidentes.component.html'
})
export class PgiaIncidentesComponent implements OnInit {
  /** Formulário mostrado nesta página (vem do parâmetro `:secao` da rota). */
  secao: string = '';
  user: UserProfile | null = null;
  loading = true;

  // Usabilidade por papel; a autorização real é do backend.
  podeEditar = false;
  isAuditoria = false;
  modoConsulta = false;
  /**
   * Agente sem papel no PGIA: só pode avisar o Responsável de IA (art. 13, II).
   * Nesse caso a página carrega apenas as fontes de uso — os demais GETs são negados.
   */
  semPapel = false;

  orgao: PgiaOrgao | null = null;
  sistemas: PgiaUsoFonteSistema[] = [];
  /** Só existe quando há papel: usado pelo aviso amarelo de unidade sem órgão. */
  orgaoIdFontes: number | null = null;

  hipoteses = HIPOTESES_INCIDENTE;
  situacoesNaoConformidade = SITUACOES_NAO_CONFORMIDADE;

  // ── Card 1: aviso do agente ───────────────────────────────────────────────
  avisoForm = this.novoAviso();
  avisoSubmetido = false;
  enviandoAviso = false;

  // ── Card 2: comunicação de incidente grave ────────────────────────────────
  incidenteForm = this.novoIncidente();
  incidenteSubmetido = false;
  salvandoIncidente = false;

  // ── Card 3: lista ─────────────────────────────────────────────────────────
  incidentes: PgiaIncidente[] = [];
  carregandoIncidentes = false;
  expandido: number | null = null;

  comunicandoId: number | null = null;
  comunicarForm = this.novoComunicar();
  comunicarSubmetido = false;
  salvandoComunicacao = false;

  medidasId: number | null = null;
  medidasTexto = '';
  salvandoMedidas = false;

  // ── Card 4: não conformidades ─────────────────────────────────────────────
  naoConformidades: PgiaNaoConformidade[] = [];
  ncForm = this.novaNaoConformidade();
  ncSubmetida = false;
  salvandoNc = false;
  ncEmEdicao: PgiaNaoConformidade | null = null;
  ncEdicao = this.novaEdicaoNc();
  salvandoEdicaoNc = false;

  constructor(
    private authService: AuthService,
    private orgaoService: PgiaOrgaoService,
    private sistemaService: PgiaSistemaService,
    private operacaoService: PgiaOperacaoService,
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
      this.semPapel = !papel && !isAdmin;
      this.podeEditar = isAdmin || papel === PapeisPgia.Orgao;
      this.modoConsulta = !this.podeEditar && !this.semPapel;
      if (this.isAuditoria) {
        // A área da auditoria externa chega na fase de auditorias técnicas;
        // evitar os GETs que o backend nega para este papel.
        this.loading = false;
      } else if (this.semPapel) {
        this.carregarFontes();
      } else {
        this.carregar();
      }
    });
  }

  private novoAviso() {
    return { SistemaIaId: null as number | null, Descricao: '' };
  }

  private novoIncidente() {
    return {
      SistemaIaId: null as number | null,
      Hipotese: 'I' as string,
      Descricao: '',
      DataOcorrencia: '',
      DataDeteccao: '',
      NotificadoResponsavelEm: '',
      DataComunicacaoSgdi: '',
      ProcessoSei: '',
      MedidasAdotadas: ''
    };
  }

  private novoComunicar() {
    return {
      Hipotese: 'I' as string,
      DataComunicacaoSgdi: '',
      ProcessoSei: '',
      MedidasAdotadas: '',
      // Permitem corrigir as datas aproximadas gravadas no aviso do agente.
      DataOcorrencia: '',
      DataDeteccao: ''
    };
  }

  /** O input datetime-local só aceita 'AAAA-MM-DDTHH:mm'. */
  private paraDatetimeLocal(valor: string | null): string {
    return valor ? valor.substring(0, 16) : '';
  }

  private novaNaoConformidade() {
    return { Descricao: '', ReportadaSgdiEm: '' };
  }

  private novaEdicaoNc() {
    return { Descricao: '', Situacao: 'Registrada' as string, ReportadaSgdiEm: '', ComunicadaControleInternoEm: '' };
  }

  /**
   * Caminho do agente sem papel: só as fontes do aviso, nada do inventário
   * nem da lista de incidentes (o backend nega esses GETs para ele).
   */
  carregarFontes(): void {
    this.loading = true;
    this.operacaoService.listarFontesUso().subscribe({
      next: (fontes) => {
        this.orgaoIdFontes = fontes.OrgaoId;
        this.sistemas = fontes.Sistemas;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Não foi possível carregar os sistemas do órgão.');
      }
    });
  }

  /** Verdadeiro quando não há órgão resolvido, nos dois caminhos de carga. */
  get semOrgao(): boolean {
    return this.semPapel ? !this.orgaoIdFontes : !this.orgao;
  }

  carregar(): void {
    this.loading = true;
    this.orgaoService.getMeuOrgao().subscribe({
      next: (meu) => {
        this.orgao = meu.Orgao;
        if (meu.Orgao) {
          this.carregarSistemas();
          this.carregarIncidentes();
          this.carregarNaoConformidades();
        }
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Não foi possível carregar os dados do órgão.');
        this.loading = false;
      }
    });
  }

  private carregarSistemas(): void {
    if (!this.orgao) return;
    this.sistemaService.listarSistemas(this.orgao.Id, 1, 200).subscribe({
      next: (pagina) => this.sistemas = pagina.Items ?? [],
      error: () => this.notificationService.error('Não foi possível carregar os sistemas do órgão.')
    });
  }

  carregarIncidentes(): void {
    if (!this.orgao) return;
    this.carregandoIncidentes = true;
    this.operacaoService.listarIncidentesDoOrgao(this.orgao.Id).subscribe({
      next: (lista) => { this.incidentes = lista; this.carregandoIncidentes = false; },
      error: () => {
        this.carregandoIncidentes = false;
        this.notificationService.error('Não foi possível carregar os incidentes do órgão.');
      }
    });
  }

  carregarNaoConformidades(): void {
    if (!this.orgao) return;
    this.operacaoService.listarNaoConformidadesDoOrgao(this.orgao.Id).subscribe({
      next: (lista) => this.naoConformidades = lista,
      error: () => this.notificationService.error('Não foi possível carregar as não conformidades.')
    });
  }

  // ── Rótulos e badges ──────────────────────────────────────────────────────

  rotuloHipotese(valor: string | null): string {
    if (!valor) return '— aviso sem hipótese';
    return this.hipoteses.find(h => h.valor === valor)?.rotulo ?? valor;
  }

  /** Enquanto não houver comunicação à SGDI, a situação real é "aguardando". */
  situacao(i: PgiaIncidente): string {
    return i.DataComunicacaoSgdi ? i.StatusApuracao : 'Aguardando comunicação à SGDI';
  }

  badgeSituacao(i: PgiaIncidente): string {
    if (!i.DataComunicacaoSgdi) return 'bg-amber-100 text-amber-800';
    switch (i.StatusApuracao) {
      case 'Recebida': return 'bg-blue-100 text-blue-800';
      case 'Em apuração': return 'bg-indigo-100 text-indigo-800';
      case 'Concluída com recomendações':
      case 'Concluída sem medidas': return 'bg-green-100 text-green-800';
      case 'Encaminhada ao CGTIC': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  badgeNaoConformidade(situacao: string): string {
    switch (situacao) {
      case 'Sanada': return 'bg-green-100 text-green-800';
      case 'Em tratamento': return 'bg-indigo-100 text-indigo-800';
      case 'Reportada à SGDI': return 'bg-blue-100 text-blue-800';
      case 'Comunicada ao controle interno': return 'bg-purple-100 text-purple-800';
      default: return 'bg-amber-100 text-amber-800'; // Registrada
    }
  }

  alternarDetalhe(i: PgiaIncidente): void {
    this.expandido = this.expandido === i.Id ? null : i.Id;
  }

  // ── Card 1: aviso ─────────────────────────────────────────────────────────

  get errAvisoSistema(): boolean { return this.avisoSubmetido && !this.avisoForm.SistemaIaId; }
  get errAvisoDescricao(): boolean { return this.avisoSubmetido && !this.avisoForm.Descricao.trim(); }

  enviarAviso(): void {
    this.avisoSubmetido = true;
    if (this.errAvisoSistema || this.errAvisoDescricao) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    this.enviandoAviso = true;
    this.operacaoService.avisarIncidente({
      SistemaIaId: Number(this.avisoForm.SistemaIaId),
      Descricao: this.avisoForm.Descricao.trim(),
      Hipotese: null,
      DataOcorrencia: null,
      DataDeteccao: null
    }).subscribe({
      next: () => {
        this.enviandoAviso = false;
        this.avisoForm = this.novoAviso();
        this.avisoSubmetido = false;
        this.carregarIncidentes();
        this.notificationService.success('Aviso enviado ao Responsável de IA do seu órgão. Obrigado por comunicar.');
      },
      error: () => {
        this.enviandoAviso = false;
        this.notificationService.error('Não foi possível enviar o aviso.');
      }
    });
  }

  // ── Card 2: comunicação de incidente grave ────────────────────────────────

  get errIncSistema(): boolean { return this.incidenteSubmetido && !this.incidenteForm.SistemaIaId; }
  get errIncDescricao(): boolean { return this.incidenteSubmetido && !this.incidenteForm.Descricao.trim(); }
  get errIncOcorrencia(): boolean { return this.incidenteSubmetido && !this.incidenteForm.DataOcorrencia; }
  get errIncDeteccao(): boolean { return this.incidenteSubmetido && !this.incidenteForm.DataDeteccao; }
  get errIncNotificado(): boolean { return this.incidenteSubmetido && !this.incidenteForm.NotificadoResponsavelEm; }
  get errIncComunicacao(): boolean { return this.incidenteSubmetido && !this.incidenteForm.DataComunicacaoSgdi; }
  get errIncSei(): boolean { return this.incidenteSubmetido && !this.incidenteForm.ProcessoSei.trim(); }

  comunicarIncidenteNovo(): void {
    this.incidenteSubmetido = true;
    if (this.errIncSistema || this.errIncDescricao || this.errIncOcorrencia || this.errIncDeteccao
      || this.errIncNotificado || this.errIncComunicacao || this.errIncSei) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const payload: PgiaIncidenteCreateForm = {
      SistemaIaId: Number(this.incidenteForm.SistemaIaId),
      Hipotese: this.incidenteForm.Hipotese,
      Descricao: this.incidenteForm.Descricao.trim(),
      DataOcorrencia: this.incidenteForm.DataOcorrencia,
      DataDeteccao: this.incidenteForm.DataDeteccao,
      NotificadoResponsavelEm: this.incidenteForm.NotificadoResponsavelEm,
      DataComunicacaoSgdi: this.incidenteForm.DataComunicacaoSgdi,
      ProcessoSei: this.incidenteForm.ProcessoSei.trim(),
      MedidasAdotadas: this.incidenteForm.MedidasAdotadas.trim() || null
    };
    this.salvandoIncidente = true;
    this.operacaoService.criarIncidente(payload).subscribe({
      next: () => {
        this.salvandoIncidente = false;
        this.incidenteForm = this.novoIncidente();
        this.incidenteSubmetido = false;
        this.carregarIncidentes();
        this.notificationService.success('Incidente comunicado à SGDI pelo processo SEI informado. Acompanhe a apuração por aqui.');
      },
      error: () => {
        this.salvandoIncidente = false;
        this.notificationService.error('Não foi possível comunicar o incidente.');
      }
    });
  }

  // ── Card 3: comunicar um aviso já registrado / editar medidas ─────────────

  abrirComunicacao(i: PgiaIncidente): void {
    this.comunicandoId = this.comunicandoId === i.Id ? null : i.Id;
    this.comunicarForm = this.novoComunicar();
    this.comunicarForm.Hipotese = i.Hipotese ?? 'I';
    this.comunicarForm.MedidasAdotadas = i.MedidasAdotadas ?? '';
    this.comunicarForm.DataOcorrencia = this.paraDatetimeLocal(i.DataOcorrencia);
    this.comunicarForm.DataDeteccao = this.paraDatetimeLocal(i.DataDeteccao);
    this.comunicarSubmetido = false;
  }

  get errComData(): boolean { return this.comunicarSubmetido && !this.comunicarForm.DataComunicacaoSgdi; }
  get errComSei(): boolean { return this.comunicarSubmetido && !this.comunicarForm.ProcessoSei.trim(); }
  get errComHipotese(): boolean { return this.comunicarSubmetido && !this.comunicarForm.Hipotese; }

  confirmarComunicacao(i: PgiaIncidente): void {
    this.comunicarSubmetido = true;
    if (this.errComHipotese || this.errComData || this.errComSei) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const payload: PgiaIncidenteComunicarForm = {
      Hipotese: this.comunicarForm.Hipotese,
      DataComunicacaoSgdi: this.comunicarForm.DataComunicacaoSgdi,
      ProcessoSei: this.comunicarForm.ProcessoSei.trim(),
      MedidasAdotadas: this.comunicarForm.MedidasAdotadas.trim() || null,
      DataOcorrencia: this.comunicarForm.DataOcorrencia || null,
      DataDeteccao: this.comunicarForm.DataDeteccao || null
    };
    this.salvandoComunicacao = true;
    this.operacaoService.comunicarIncidente(i.Id, payload).subscribe({
      next: () => {
        this.salvandoComunicacao = false;
        this.comunicandoId = null;
        this.comunicarSubmetido = false;
        this.carregarIncidentes();
        this.notificationService.success('Incidente comunicado à SGDI pelo processo SEI informado. Acompanhe a apuração por aqui.');
      },
      error: () => {
        this.salvandoComunicacao = false;
        this.notificationService.error('Não foi possível comunicar o incidente.');
      }
    });
  }

  abrirMedidas(i: PgiaIncidente): void {
    this.medidasId = this.medidasId === i.Id ? null : i.Id;
    this.medidasTexto = i.MedidasAdotadas ?? '';
  }

  salvarMedidas(i: PgiaIncidente): void {
    this.salvandoMedidas = true;
    this.operacaoService.atualizarMedidas(i.Id, this.medidasTexto.trim() || null).subscribe({
      next: () => {
        this.salvandoMedidas = false;
        this.medidasId = null;
        this.carregarIncidentes();
        this.notificationService.success('Medidas atualizadas. Elas entram no relatório semestral (art. 32, II).');
      },
      error: () => {
        this.salvandoMedidas = false;
        this.notificationService.error('Não foi possível salvar as medidas.');
      }
    });
  }

  // ── Card 4: não conformidades ─────────────────────────────────────────────

  get errNcDescricao(): boolean { return this.ncSubmetida && !this.ncForm.Descricao.trim(); }

  registrarNaoConformidade(): void {
    if (!this.orgao) return;
    this.ncSubmetida = true;
    if (this.errNcDescricao) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    this.salvandoNc = true;
    this.operacaoService.criarNaoConformidade({
      OrgaoId: this.orgao.Id,
      Descricao: this.ncForm.Descricao.trim(),
      // Quem registra pela tela do órgão é o SGTIC (art. 9º, II).
      Origem: 'Acompanhamento do SGTIC',
      ReportadaSgdiEm: this.ncForm.ReportadaSgdiEm || null
    }).subscribe({
      next: () => {
        this.salvandoNc = false;
        this.ncForm = this.novaNaoConformidade();
        this.ncSubmetida = false;
        this.carregarNaoConformidades();
        this.notificationService.success('Não conformidade registrada. Ela já aparece na lista.');
      },
      error: () => {
        this.salvandoNc = false;
        this.notificationService.error('Não foi possível registrar a não conformidade.');
      }
    });
  }

  editarNaoConformidade(nc: PgiaNaoConformidade): void {
    if (this.ncEmEdicao?.Id === nc.Id) {
      this.ncEmEdicao = null;
      return;
    }
    this.ncEmEdicao = nc;
    this.ncEdicao = {
      Descricao: nc.Descricao,
      Situacao: nc.Situacao,
      ReportadaSgdiEm: nc.ReportadaSgdiEm ?? '',
      ComunicadaControleInternoEm: nc.ComunicadaControleInternoEm ?? ''
    };
  }

  salvarEdicaoNaoConformidade(): void {
    if (!this.ncEmEdicao) return;
    const payload: PgiaNaoConformidadeUpdateForm = {
      Descricao: this.ncEdicao.Descricao.trim(),
      Situacao: this.ncEdicao.Situacao,
      ReportadaSgdiEm: this.ncEdicao.ReportadaSgdiEm || null,
      ComunicadaControleInternoEm: this.ncEdicao.ComunicadaControleInternoEm || null
    };
    this.salvandoEdicaoNc = true;
    this.operacaoService.atualizarNaoConformidade(this.ncEmEdicao.Id, payload).subscribe({
      next: () => {
        this.salvandoEdicaoNc = false;
        this.ncEmEdicao = null;
        this.carregarNaoConformidades();
        this.notificationService.success('Não conformidade atualizada.');
      },
      error: () => {
        this.salvandoEdicaoNc = false;
        this.notificationService.error('Não foi possível atualizar a não conformidade.');
      }
    });
  }
}
