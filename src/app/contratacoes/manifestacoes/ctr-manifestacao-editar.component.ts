import { Component, OnInit } from '@angular/core';
import { CitaInDirective } from '../shared/cita-in.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { CtrManifestacaoService } from '../services/ctr-manifestacao.service';
import { CtrContratacaoResumo, CtrManifestacaoFormComponent } from '../shared/ctr-manifestacao-form.component';
import { badgeCriticidade, badgeEstagio, badgeStatusTcdf, rotuloAtoTcdf } from '../shared/ctr-rotulos';
import { CtrManifestacao, CtrManifestacaoForm } from '../../../api/contratacoes/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';

/**
 * Página de uma manifestação (`/analises/manifestacoes/editar/:id`): o mesmo
 * formulário da comunicação do TCDF e do despacho (com a contratação só em
 * consulta), mais a geração do documento em PDF.
 *
 * Editar é a forma de acompanhar a evolução do caso: "Aguardando resposta"
 * vira "Risco resolvido" ou "Não pode prosseguir" na mesma manifestação.
 */
@Component({
  selector: 'app-ctr-manifestacao-editar',
  standalone: true,
  imports: [CitaInDirective, DialogoDirective, CommonModule, FormsModule, RouterModule, CtrManifestacaoFormComponent],
  templateUrl: './ctr-manifestacao-editar.component.html'
})
export class CtrManifestacaoEditarComponent implements OnInit {
  manifestacao: CtrManifestacao | null = null;
  valorForm: CtrManifestacaoForm | null = null;
  /** O processo da manifestação, para o resumo da contratação no formulário. */
  contratacao: CtrContratacaoResumo | null = null;
  /**
   * Registrada depois dos dados da comunicação do TCDF (2026-09-23)? As
   * anteriores podem seguir sem eles.
   */
  temComunicacao = false;

  carregando = true;
  salvando = false;
  /** Falha de carregamento vira mensagem na própria página, não toast. */
  erroCarregar: string | null = null;

  // Modal do despacho em PDF (os três dados vão no fecho e não persistem)
  modalPdfAberto = false;
  despacho = { Local: 'Brasília', Nome: '', Cargo: '' };
  gerandoPdf = false;
  submetidoPdf = false;

  badgeEstagio = badgeEstagio;
  badgeStatusTcdf = badgeStatusTcdf;
  badgeCriticidade = badgeCriticidade;
  rotuloAtoTcdf = rotuloAtoTcdf;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private manifestacaoService: CtrManifestacaoService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.carregando = false;
      this.erroCarregar = 'Manifestação não encontrada.';
      return;
    }
    this.carregar(id);
  }

  private carregar(id: number): void {
    this.carregando = true;
    this.erroCarregar = null;
    this.manifestacaoService.getManifestacao(id).subscribe({
      next: manifestacao => {
        this.aplicar(manifestacao);
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.erroCarregar = 'Não foi possível carregar esta manifestação. O processo dela pode ter sido excluído.';
      }
    });
  }

  private aplicar(manifestacao: CtrManifestacao): void {
    this.manifestacao = manifestacao;
    this.temComunicacao = !!(manifestacao.ProcessoComunicacaoTcdf || manifestacao.DataRecebimento
      || manifestacao.AtoTcdf || manifestacao.NumeroAtoTcdf);
    this.contratacao = {
      Id: manifestacao.ProcessoId,
      NumeroProcesso: manifestacao.NumeroProcesso,
      OrgaoNome: manifestacao.OrgaoNome,
      OrgaoSigla: manifestacao.OrgaoSigla,
      Objeto: manifestacao.Objeto,
      CategoriaObjeto: manifestacao.CategoriaObjeto,
      ValorEstimado: manifestacao.ValorEstimado ?? null,
      Criticidade: manifestacao.Criticidade ?? null,
      Origem: manifestacao.Origem
    };
    this.valorForm = {
      OficioTcdf: manifestacao.OficioTcdf,
      DataOficio: manifestacao.DataOficio,
      ProcessoComunicacaoTcdf: manifestacao.ProcessoComunicacaoTcdf ?? null,
      DataRecebimento: manifestacao.DataRecebimento ?? null,
      AtoTcdf: manifestacao.AtoTcdf ?? null,
      NumeroAtoTcdf: manifestacao.NumeroAtoTcdf ?? null,
      SituacaoPortfolio: manifestacao.SituacaoPortfolio,
      ComunicadaDesde: manifestacao.ComunicadaDesde ?? null,
      ResultadoAnalise: manifestacao.ResultadoAnalise ?? null,
      RecomendouSuspensao: manifestacao.RecomendouSuspensao,
      ComunicouControleInterno: manifestacao.ComunicouControleInterno,
      DesfechoRisco: manifestacao.DesfechoRisco ?? null,
      PrazoRegularizacaoDias: manifestacao.PrazoRegularizacaoDias ?? null,
      EsclarecimentosAdicionais: manifestacao.EsclarecimentosAdicionais ?? null,
      StatusTcdf: manifestacao.StatusTcdf ?? null,
      Observacao: manifestacao.Observacao ?? null
    };
  }

  salvar(form: CtrManifestacaoForm): void {
    if (!this.manifestacao) return;
    this.salvando = true;
    this.manifestacaoService.atualizar(this.manifestacao.Id, form).subscribe({
      next: atualizada => {
        this.salvando = false;
        this.aplicar(atualizada);
        this.notificationService.success('Manifestação atualizada.');
      },
      error: () => {
        this.salvando = false;
        this.notificationService.error(
          'Não foi possível salvar. Confira os campos do inciso escolhido.'
        );
      }
    });
  }

  irParaLista(): void {
    this.router.navigate(['/analises/manifestacoes/lista']);
  }

  // ── Despacho em PDF ───────────────────────────────────────────────────────

  abrirModalPdf(): void {
    this.submetidoPdf = false;
    this.modalPdfAberto = true;
  }

  fecharModalPdf(): void {
    this.modalPdfAberto = false;
  }

  get errDespacho(): string | null {
    if (!this.despacho.Local.trim()) return 'Informe o local.';
    if (!this.despacho.Nome.trim()) return 'Informe o nome de quem assina.';
    if (!this.despacho.Cargo.trim()) return 'Informe o cargo e a unidade de quem assina.';
    return null;
  }

  gerarPdf(): void {
    this.submetidoPdf = true;
    if (!this.manifestacao || this.errDespacho) return;

    this.gerandoPdf = true;
    const id = this.manifestacao.Id;
    // O mesmo número do cabeçalho do despacho
    const numero = (this.manifestacao.ProcessoComunicacaoTcdf || this.manifestacao.NumeroProcesso).replace(/[^0-9]/g, '');
    this.manifestacaoService.baixarDespachoPdf(id, {
      Local: this.despacho.Local.trim(),
      Nome: this.despacho.Nome.trim(),
      Cargo: this.despacho.Cargo.trim()
    }).subscribe({
      next: blob => {
        this.gerandoPdf = false;
        this.modalPdfAberto = false;
        // Handler de clique: só roda no browser.
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `despacho-tcdf-${numero}-${id}.pdf`;
        link.click();
        // Revogar na hora corre com o início do download em alguns navegadores.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => {
        this.gerandoPdf = false;
        this.notificationService.error('Não foi possível gerar o despacho em PDF.');
      }
    });
  }
}
