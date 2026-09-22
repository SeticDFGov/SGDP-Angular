import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { CtrProcessoService } from '../services/ctr-processo.service';
import { CtrProcessoFormComponent } from '../shared/ctr-processo-form.component';
import { CtrTramiteComponent } from '../shared/ctr-tramite.component';
import {
  badgeCriticidade,
  badgeEstagio,
  badgeFase,
  badgeNivelRisco,
  badgeSituacao,
  badgeStatusTcdf,
  corDiasSemMovimento,
  rotuloEtapaPlanejamento
} from '../shared/ctr-rotulos';
import { CtrManifestacao, CtrProcesso, CtrProcessoForm } from '../../../api/contratacoes/interface';

/**
 * Página de um processo (`/analises/processos/editar/:id`): o estado atual num
 * cabeçalho (situação, fase, maior risco e a linha do tempo do trâmite), o mesmo
 * formulário compartilhado da tela de cadastro e as manifestações ao TCDF já
 * registradas para ele, com atalho para registrar uma nova.
 */
@Component({
  selector: 'app-ctr-processo-editar',
  standalone: true,
  imports: [CommonModule, RouterModule, CtrProcessoFormComponent, CtrTramiteComponent],
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
  badgeEstagio = badgeEstagio;
  badgeFase = badgeFase;
  badgeCriticidade = badgeCriticidade;
  badgeStatusTcdf = badgeStatusTcdf;
  badgeNivelRisco = badgeNivelRisco;
  corDiasSemMovimento = corDiasSemMovimento;
  rotuloEtapaPlanejamento = rotuloEtapaPlanejamento;

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
      OrgaoNome: processo.OrgaoNome,
      OrgaoSigla: processo.OrgaoSigla,
      ComplementoArea: processo.ComplementoArea ?? null,
      Objeto: processo.Objeto,
      CategoriaObjeto: processo.CategoriaObjeto,
      ChegadaSgdi: processo.ChegadaSgdi ?? null,
      ChegadaSubgd: processo.ChegadaSubgd ?? null,
      ChegadaUgtic: processo.ChegadaUgtic ?? null,
      UgticNaoSeAplica: processo.UgticNaoSeAplica,
      RetornoGabSgdi: processo.RetornoGabSgdi ?? null,
      RetornoOrgao: processo.RetornoOrgao ?? null,
      RetornoOrgaoNaoSeAplica: processo.RetornoOrgaoNaoSeAplica,
      EtapaPlanejamento: processo.EtapaPlanejamento ?? null,
      DataAssinaturaContrato: processo.DataAssinaturaContrato ?? null,
      Criticidade: processo.Criticidade ?? null,
      Origem: processo.Origem ?? null,
      EsclarecimentoSolicitadoEm: processo.EsclarecimentoSolicitadoEm ?? null,
      EsclarecimentoDescricao: processo.EsclarecimentoDescricao ?? null,
      EsclarecimentoRespondidoEm: processo.EsclarecimentoRespondidoEm ?? null,
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

  /** A lista volta com os filtros que estavam aplicados quando o processo foi aberto. */
  get filtrosDaLista(): Params {
    return this.processoService.filtrosDaLista;
  }

  irParaLista(): void {
    this.router.navigate(['/analises/processos/lista'], { queryParams: this.filtrosDaLista });
  }
}
