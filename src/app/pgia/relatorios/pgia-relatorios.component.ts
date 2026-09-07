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
  CATEGORIAS_INDICADOR,
  PgiaIndicador,
  PgiaIndicadorForm,
  PgiaOrgao,
  PgiaRelatorioSemestral,
  PgiaSistema
} from '../../../api/pgia/interface';

@Component({
  selector: 'app-pgia-relatorios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaDecretoDirective],
  templateUrl: './pgia-relatorios.component.html'
})
export class PgiaRelatoriosComponent implements OnInit {
  /** Formulário mostrado nesta página (vem do parâmetro `:secao` da rota). */
  secao: string = '';
  user: UserProfile | null = null;
  loading = true;

  podeEditar = false;
  isAuditoria = false;
  modoConsulta = false;

  orgao: PgiaOrgao | null = null;
  sistemas: PgiaSistema[] = [];

  categorias = CATEGORIAS_INDICADOR;

  // ── Indicadores ───────────────────────────────────────────────────────────
  sistemaSelecionadoId: number | null = null;
  indicadores: PgiaIndicador[] = [];
  carregandoIndicadores = false;
  indicadorForm = this.novoIndicador();
  indicadorEmEdicao: PgiaIndicador | null = null;
  indicadorSubmetido = false;
  salvandoIndicador = false;

  // ── Relatório semestral ───────────────────────────────────────────────────
  relatorios: PgiaRelatorioSemestral[] = [];
  anoGeracao = new Date().getFullYear();
  semestreGeracao = 1;
  gerando = false;

  expandido: number | null = null;
  detalhe: PgiaRelatorioSemestral | null = null;
  carregandoDetalhe = false;
  baixandoPdf = false;

  envioId: number | null = null;
  envioData = '';
  envioSei = '';
  envioSubmetido = false;
  salvandoEnvio = false;

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
      this.podeEditar = isAdmin || papel === PapeisPgia.Orgao;
      this.modoConsulta = !this.podeEditar;
      if (this.isAuditoria) {
        this.loading = false;
      } else {
        this.carregar();
      }
    });
  }

  private novoIndicador() {
    return {
      Nome: '',
      Categoria: 'Desempenho' as string,
      Valor: null as number | null,
      Unidade: '',
      PeriodoInicio: '',
      PeriodoFim: '',
      Meta: null as number | null,
      PublicadoRegistroPublico: false
    };
  }

  carregar(): void {
    this.loading = true;
    this.orgaoService.getMeuOrgao().subscribe({
      next: (meu) => {
        this.orgao = meu.Orgao;
        if (meu.Orgao) {
          this.sistemaService.listarSistemas(meu.Orgao.Id, 1, 200).subscribe({
            next: (pagina) => this.sistemas = pagina.Items ?? [],
            error: () => this.notificationService.error('Não foi possível carregar os sistemas do órgão.')
          });
          this.carregarRelatorios();
        }
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Não foi possível carregar os dados do órgão.');
        this.loading = false;
      }
    });
  }

  // ── Indicadores ───────────────────────────────────────────────────────────

  aoTrocarSistema(): void {
    this.indicadores = [];
    this.cancelarEdicaoIndicador();
    if (!this.sistemaSelecionadoId) return;
    this.carregarIndicadores();
  }

  carregarIndicadores(): void {
    if (!this.sistemaSelecionadoId) return;
    this.carregandoIndicadores = true;
    this.operacaoService.listarIndicadores(Number(this.sistemaSelecionadoId)).subscribe({
      next: (lista) => { this.indicadores = lista; this.carregandoIndicadores = false; },
      error: () => {
        this.carregandoIndicadores = false;
        this.notificationService.error('Não foi possível carregar os indicadores do sistema.');
      }
    });
  }

  get errIndNome(): boolean { return this.indicadorSubmetido && !this.indicadorForm.Nome.trim(); }
  get errIndValor(): boolean { return this.indicadorSubmetido && this.indicadorForm.Valor === null; }
  get errIndInicio(): boolean { return this.indicadorSubmetido && !this.indicadorForm.PeriodoInicio; }
  get errIndFim(): boolean { return this.indicadorSubmetido && !this.indicadorForm.PeriodoFim; }

  editarIndicador(i: PgiaIndicador): void {
    this.indicadorEmEdicao = i;
    this.indicadorSubmetido = false;
    this.indicadorForm = {
      Nome: i.Nome,
      Categoria: i.Categoria,
      Valor: i.Valor,
      Unidade: i.Unidade ?? '',
      PeriodoInicio: i.PeriodoInicio ?? '',
      PeriodoFim: i.PeriodoFim ?? '',
      Meta: i.Meta,
      PublicadoRegistroPublico: i.PublicadoRegistroPublico
    };
  }

  cancelarEdicaoIndicador(): void {
    this.indicadorEmEdicao = null;
    this.indicadorSubmetido = false;
    this.indicadorForm = this.novoIndicador();
  }

  salvarIndicador(): void {
    if (!this.sistemaSelecionadoId) {
      this.notificationService.warning('Escolha o sistema antes de registrar o indicador.');
      return;
    }
    this.indicadorSubmetido = true;
    if (this.errIndNome || this.errIndValor || this.errIndInicio || this.errIndFim) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    const payload: PgiaIndicadorForm = {
      Nome: this.indicadorForm.Nome.trim(),
      Categoria: this.indicadorForm.Categoria,
      Valor: Number(this.indicadorForm.Valor),
      Unidade: this.indicadorForm.Unidade.trim() || null,
      PeriodoInicio: this.indicadorForm.PeriodoInicio,
      PeriodoFim: this.indicadorForm.PeriodoFim,
      Meta: this.indicadorForm.Meta === null ? null : Number(this.indicadorForm.Meta),
      PublicadoRegistroPublico: this.indicadorForm.PublicadoRegistroPublico
    };
    this.salvandoIndicador = true;
    const chamada = this.indicadorEmEdicao
      ? this.operacaoService.atualizarIndicador(this.indicadorEmEdicao.Id, payload)
      : this.operacaoService.criarIndicador(Number(this.sistemaSelecionadoId), payload);
    chamada.subscribe({
      next: () => {
        this.salvandoIndicador = false;
        this.notificationService.success(this.indicadorEmEdicao
          ? 'Indicador atualizado.'
          : 'Indicador registrado. Ele já aparece na lista.');
        this.cancelarEdicaoIndicador();
        this.carregarIndicadores();
      },
      error: () => {
        this.salvandoIndicador = false;
        this.notificationService.error('Não foi possível salvar o indicador.');
      }
    });
  }

  // ── Relatório semestral ───────────────────────────────────────────────────

  carregarRelatorios(): void {
    if (!this.orgao) return;
    this.operacaoService.listarRelatoriosSemestrais(this.orgao.Id).subscribe({
      next: (lista) => this.relatorios = lista,
      error: () => this.notificationService.error('Não foi possível carregar os relatórios semestrais.')
    });
  }

  badgeRelatorio(status: string): string {
    switch (status) {
      case 'Enviado no prazo': return 'bg-green-100 text-green-800';
      case 'Enviado em atraso': return 'bg-amber-100 text-amber-800';
      case 'Inadimplente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700'; // Pendente
    }
  }

  gerarRelatorio(): void {
    if (!this.orgao) return;
    this.gerando = true;
    this.operacaoService.gerarRelatorioSemestral(this.orgao.Id, Number(this.anoGeracao), Number(this.semestreGeracao)).subscribe({
      next: () => {
        this.gerando = false;
        this.notificationService.success('Relatório do período gerado. Confira o conteúdo antes de enviar à SGDI.');
        this.carregarRelatorios();
      },
      error: () => {
        this.gerando = false;
        this.notificationService.error('Não foi possível gerar o relatório do período.');
      }
    });
  }

  alternarDetalhe(r: PgiaRelatorioSemestral): void {
    if (this.expandido === r.Id) {
      this.expandido = null;
      this.detalhe = null;
      return;
    }
    this.expandido = r.Id;
    this.detalhe = null;
    this.carregandoDetalhe = true;
    this.operacaoService.getRelatorioSemestral(r.Id).subscribe({
      next: (completo) => { this.detalhe = completo; this.carregandoDetalhe = false; },
      error: () => {
        this.carregandoDetalhe = false;
        this.notificationService.error('Não foi possível carregar o conteúdo do relatório.');
      }
    });
  }

  /** Só roda em handler de clique, no browser: sem risco no SSR. */
  baixarPdf(r: PgiaRelatorioSemestral): void {
    this.baixandoPdf = true;
    this.operacaoService.baixarRelatorioSemestralPdf(r.Id).subscribe({
      next: (blob) => {
        this.baixandoPdf = false;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-semestral-${r.OrgaoSigla}-${r.Ano}-${r.Semestre}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.baixandoPdf = false;
        this.notificationService.error('Não foi possível baixar o PDF do relatório.');
      }
    });
  }

  abrirEnvio(r: PgiaRelatorioSemestral): void {
    if (this.envioId === r.Id) {
      this.envioId = null;
      return;
    }
    this.envioId = r.Id;
    this.envioData = r.DataEnvio ?? '';
    this.envioSei = r.ProcessoSei ?? '';
    this.envioSubmetido = false;
  }

  get errEnvioData(): boolean { return this.envioSubmetido && !this.envioData; }
  get errEnvioSei(): boolean { return this.envioSubmetido && !this.envioSei.trim(); }

  confirmarEnvio(r: PgiaRelatorioSemestral): void {
    this.envioSubmetido = true;
    if (this.errEnvioData || this.errEnvioSei) {
      this.notificationService.warning('Alguns campos obrigatórios ficaram em branco. Eles estão destacados em vermelho.');
      return;
    }
    this.salvandoEnvio = true;
    this.operacaoService.enviarRelatorioSemestral(r.Id, {
      DataEnvio: this.envioData,
      ProcessoSei: this.envioSei.trim(),
      // Arquivo do relatório em anexo entra em fase futura.
      DocumentoId: r.DocumentoId
    }).subscribe({
      next: () => {
        this.salvandoEnvio = false;
        this.envioId = null;
        this.envioSubmetido = false;
        this.carregarRelatorios();
        this.notificationService.success('Envio registrado. A SGDI acompanha o cumprimento do prazo.');
      },
      error: () => {
        this.salvandoEnvio = false;
        this.notificationService.error('Não foi possível registrar o envio do relatório.');
      }
    });
  }
}
