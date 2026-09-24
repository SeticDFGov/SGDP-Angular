import { Component, OnInit } from '@angular/core';
import { CitaInDirective } from '../shared/cita-in.directive';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { CtrProcessoService } from '../services/ctr-processo.service';
import { secaoDaLista } from '../shared/ctr-filtro-lista';
import { CtrProcessoFormComponent } from '../shared/ctr-processo-form.component';
import { CtrTramiteComponent } from '../shared/ctr-tramite.component';
import { CtrComposicaoCriticidadeComponent } from '../shared/ctr-composicao-criticidade.component';
import {
  badgeCriticidade,
  badgeEstagio,
  badgeNivelRisco,
  badgeSituacao,
  badgeStatusSupervisao,
  badgeStatusTcdf,
  corDiasSemMovimento,
  formatarReais,
  rotuloAtoTcdf,
  rotuloEtapaPlanejamento,
  rotuloGdfnet
} from '../shared/ctr-rotulos';
import { CtrManifestacao, CtrProcesso, CtrProcessoForm, ORIGEM_TCDF } from '../../../api/contratacoes/interface';

/**
 * Página de um processo (`/analises/processos/editar/:id`): o estado atual num
 * cabeçalho (situação, fase, maior risco e a linha do tempo do trâmite), o mesmo
 * formulário compartilhado da tela de cadastro e as manifestações ao TCDF já
 * registradas para ele, com atalho para registrar uma nova.
 */
@Component({
  selector: 'app-ctr-processo-editar',
  standalone: true,
  imports: [
    CitaInDirective, CommonModule, RouterModule, CtrProcessoFormComponent, CtrTramiteComponent,
    CtrComposicaoCriticidadeComponent
  ],
  templateUrl: './ctr-processo-editar.component.html'
})
export class CtrProcessoEditarComponent implements OnInit {
  processo: CtrProcesso | null = null;
  /** Valor inicial do formulário (separado da resposta, que traz os derivados). */
  valorForm: CtrProcessoForm | null = null;
  manifestacoes: CtrManifestacao[] = [];
  siglas: string[] = [];

  carregando = true;
  salvando = false;
  /** Falha de carregamento vira mensagem na própria página, não toast. */
  erroCarregar: string | null = null;

  badgeSituacao = badgeSituacao;
  badgeStatusSupervisao = badgeStatusSupervisao;
  badgeEstagio = badgeEstagio;
  badgeCriticidade = badgeCriticidade;
  badgeStatusTcdf = badgeStatusTcdf;
  badgeNivelRisco = badgeNivelRisco;
  corDiasSemMovimento = corDiasSemMovimento;
  rotuloEtapaPlanejamento = rotuloEtapaPlanejamento;
  formatarReais = formatarReais;
  rotuloGdfnet = rotuloGdfnet;
  rotuloAtoTcdf = rotuloAtoTcdf;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private processoService: CtrProcessoService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.carregando = false;
      this.erroCarregar = 'Processo não encontrado.';
      return;
    }
    this.carregar(id);
    this.processoService.listarSiglas().subscribe({
      next: siglas => this.siglas = siglas,
      error: () => this.siglas = []
    });
  }

  private carregar(id: number): void {
    this.carregando = true;
    this.erroCarregar = null;
    this.processoService.getProcesso(id).subscribe({
      next: processo => {
        this.aplicar(processo);
        this.carregando = false;
        this.carregarManifestacoes(id);
      },
      error: () => {
        this.carregando = false;
        this.erroCarregar = 'Não foi possível carregar este processo. Ele pode ter sido excluído.';
      }
    });
  }

  private aplicar(processo: CtrProcesso): void {
    this.processo = processo;
    this.valorForm = {
      NumeroProcesso: processo.NumeroProcesso,
      NumeroSeiFormulario: processo.NumeroSeiFormulario ?? null,
      OrgaoNome: processo.OrgaoNome,
      OrgaoSigla: processo.OrgaoSigla,
      ComplementoArea: processo.ComplementoArea ?? null,
      Objeto: processo.Objeto,
      CategoriaObjeto: processo.CategoriaObjeto,
      ValorEstimado: processo.ValorEstimado ?? null,
      HospedagemCetic: processo.HospedagemCetic ?? null,
      UsaGdfnet: processo.UsaGdfnet ?? null,
      ChegadaSgdi: processo.ChegadaSgdi ?? null,
      ChegadaSubgd: processo.ChegadaSubgd ?? null,
      ChegadaUgtic: processo.ChegadaUgtic ?? null,
      UgticNaoSeAplica: processo.UgticNaoSeAplica,
      RetornoGabSgdi: processo.RetornoGabSgdi ?? null,
      RetornoOrgao: processo.RetornoOrgao ?? null,
      RetornoOrgaoNaoSeAplica: processo.RetornoOrgaoNaoSeAplica,
      AnaliseTecnicaEncaminhadaEm: processo.AnaliseTecnicaEncaminhadaEm ?? null,
      AnaliseTecnicaArea: processo.AnaliseTecnicaArea ?? null,
      AnaliseTecnicaRetornoEm: processo.AnaliseTecnicaRetornoEm ?? null,
      AnaliseTecnicaRetornoResumo: processo.AnaliseTecnicaRetornoResumo ?? null,
      EtapaPlanejamento: processo.EtapaPlanejamento ?? null,
      DataAssinaturaContrato: processo.DataAssinaturaContrato ?? null,
      Criticidade: processo.Criticidade ?? null,
      CriteriosCriticidade: processo.CriteriosCriticidade ?? null,
      Origem: processo.Origem ?? null,
      EsclarecimentoSolicitadoEm: processo.EsclarecimentoSolicitadoEm ?? null,
      EsclarecimentoDescricao: processo.EsclarecimentoDescricao ?? null,
      EsclarecimentoDocumentoSei: processo.EsclarecimentoDocumentoSei ?? null,
      EsclarecimentoRespondidoEm: processo.EsclarecimentoRespondidoEm ?? null,
      // A tela não pede mais a restituição: o que está gravado volta como veio
      Restituido: processo.Restituido,
      RestituidoEm: processo.RestituidoEm ?? null,
      RestituidoMotivo: processo.RestituidoMotivo ?? null,
      Observacao: processo.Observacao ?? null
    };
  }

  private carregarManifestacoes(id: number): void {
    this.processoService.listarManifestacoes(id).subscribe({
      next: lista => this.manifestacoes = lista ?? [],
      error: () => this.manifestacoes = []
    });
  }

  salvar(form: CtrProcessoForm): void {
    if (!this.processo) return;
    this.salvando = true;
    this.processoService.atualizar(this.processo.Id, form).subscribe({
      next: atualizado => {
        this.salvando = false;
        this.aplicar(atualizado);
        this.notificationService.success('Processo atualizado.');
      },
      error: () => {
        this.salvando = false;
        this.notificationService.error(
          'Não foi possível salvar. Confira se o número do processo já não está em outro cadastro, se as datas estão coerentes '
          + 'e se os riscos da contratação estão completos.'
        );
      }
    });
  }

  /**
   * A lista do processo: as comunicações do TCDF têm a sua (pela origem). Volta com os
   * filtros que estavam aplicados quando a lista foi deixada, se foi essa a lista.
   */
  get rotaDaLista(): string {
    return `/analises/processos/${secaoDaLista(this.processo?.Origem)}`;
  }

  get rotuloDaLista(): string {
    return this.processo?.Origem === ORIGEM_TCDF
      ? 'Voltar para as comunicações do TCDF'
      : 'Voltar para os processos de supervisão contínua';
  }

  get filtrosDaLista(): Params {
    const lista = this.processoService.ultimaLista;
    return lista && lista.secao === secaoDaLista(this.processo?.Origem) ? lista.params : {};
  }

  irParaLista(): void {
    this.router.navigate([this.rotaDaLista], { queryParams: this.filtrosDaLista });
  }
}
