import { AfterViewChecked, Component, OnInit } from '@angular/core';
import { CitaInDirective } from '../shared/cita-in.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { mensagemDoErro } from '../../pgia/shared/mensagem-erro';
import { CtrProcessoService } from '../services/ctr-processo.service';
import { secaoDaLista } from '../shared/ctr-filtro-lista';
import { CtrProcessoFormComponent } from '../shared/ctr-processo-form.component';
import { CtrAnteriorRegimeFormComponent } from '../shared/ctr-anterior-regime-form.component';
import { CtrTramiteComponent } from '../shared/ctr-tramite.component';
import { CtrComposicaoCriticidadeComponent } from '../shared/ctr-composicao-criticidade.component';
import {
  badgeCriticidade,
  badgeEstagio,
  badgeNivelRisco,
  badgeSituacao,
  badgeStatusTcdf,
  corUltimaMovimentacao,
  formatarReais,
  rotuloAtoTcdf,
  rotuloEtapaPlanejamento,
  rotuloGdfnet,
  textoHaDias
} from '../shared/ctr-rotulos';
import {
  CtrManifestacao,
  CtrProcesso,
  CtrProcessoForm,
  ORIGEM_ANTERIOR_REGIME,
  ORIGEM_PADRAO,
  ORIGEM_TCDF,
  SITUACAO_CONTRATO_ASSINADO
} from '../../../api/contratacoes/interface';

/**
 * Página de um processo (`/analises/processos/editar/:id`): o estado atual num
 * cabeçalho (situação com a data, criticidade, maior risco e a linha do tempo do
 * trâmite), o mesmo formulário compartilhado da tela de cadastro e as manifestações ao
 * TCDF já registradas para ele, com atalho para registrar uma nova.
 *
 * O registro histórico (origem "Anterior ao regime") tem a ficha simplificada: sem
 * criticidade, riscos, esclarecimentos, análise técnica nem nota; com o contrato, a
 * autorização e a linha do tempo quando há datas; o formulário curto; e o "Desfazer",
 * que o devolve à supervisão. O processo da supervisão com contrato assinado pode ser
 * marcado como anterior ao regime.
 */
@Component({
  selector: 'app-ctr-processo-editar',
  standalone: true,
  imports: [
    CitaInDirective, CommonModule, FormsModule, RouterModule, CtrProcessoFormComponent, CtrAnteriorRegimeFormComponent,
    CtrTramiteComponent, CtrComposicaoCriticidadeComponent
  ],
  templateUrl: './ctr-processo-editar.component.html'
})
export class CtrProcessoEditarComponent implements OnInit, AfterViewChecked {
  processo: CtrProcesso | null = null;
  /** Valor inicial do formulário (separado da resposta, que traz os derivados). */
  valorForm: CtrProcessoForm | null = null;
  manifestacoes: CtrManifestacao[] = [];
  siglas: string[] = [];

  carregando = true;
  salvando = false;
  /** Falha de carregamento vira mensagem na própria página, não toast. */
  erroCarregar: string | null = null;

  // "Marcar como anterior ao regime" e "Desfazer"
  /** O quadro da marcação aberto (pede o nº do contrato quando falta). */
  marcandoAnterior = false;
  numeroContratoMarcar = '';
  marcacaoSubmetida = false;
  salvandoAnterior = false;
  /** Id do elemento que recebe o foco depois da próxima renderização. */
  private focoPendente: string | null = null;

  badgeSituacao = badgeSituacao;
  badgeEstagio = badgeEstagio;
  badgeCriticidade = badgeCriticidade;
  badgeStatusTcdf = badgeStatusTcdf;
  badgeNivelRisco = badgeNivelRisco;
  corUltimaMovimentacao = corUltimaMovimentacao;
  textoHaDias = textoHaDias;
  rotuloEtapaPlanejamento = rotuloEtapaPlanejamento;
  formatarReais = formatarReais;
  rotuloGdfnet = rotuloGdfnet;
  rotuloAtoTcdf = rotuloAtoTcdf;
  readonly contratoAssinado = SITUACAO_CONTRATO_ASSINADO;

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
      error: erro => {
        this.carregando = false;
        this.erroCarregar = mensagemDoErro(erro, 'Não foi possível carregar este processo. Ele pode ter sido excluído.');
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
      TipoContratacao: processo.TipoContratacao ?? null,
      UsaGdfnet: processo.UsaGdfnet ?? null,
      ChegadaSgdi: processo.ChegadaSgdi ?? null,
      ChegadaSubgd: processo.ChegadaSubgd ?? null,
      ChegadaUgtic: processo.ChegadaUgtic ?? null,
      UgticNaoSeAplica: processo.UgticNaoSeAplica,
      RetornoGabSgdi: processo.RetornoGabSgdi ?? null,
      RetornoOrgao: processo.RetornoOrgao ?? null,
      RetornoOrgaoNaoSeAplica: processo.RetornoOrgaoNaoSeAplica,
      NotaInformativaEnviadaEm: processo.NotaInformativaEnviadaEm ?? null,
      NotaInformativaDocumentoSei: processo.NotaInformativaDocumentoSei ?? null,
      NumeroContrato: processo.NumeroContrato ?? null,
      AutorizacaoDocumentoSei: processo.AutorizacaoDocumentoSei ?? null,
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
        this.notificationService.success(this.ehAnterior ? 'Contratação atualizada.' : 'Processo atualizado.');
      },
      error: erro => {
        this.salvando = false;
        this.notificationService.error(mensagemDoErro(erro, this.ehAnterior
          ? 'Não foi possível salvar. Confira se o número do processo já não está em outro cadastro e se as datas estão coerentes.'
          : 'Não foi possível salvar. Confira se o número do processo já não está em outro cadastro, se as datas estão coerentes '
            + 'e se os riscos da contratação estão completos.'
        ));
      }
    });
  }

  // ── Registro histórico ──────────────────────────────────────────────────────

  /** O processo é um registro histórico (contratação anterior ao regime). */
  get ehAnterior(): boolean {
    return this.processo?.Origem === ORIGEM_ANTERIOR_REGIME;
  }

  /** O registro histórico tem alguma data do trâmite da época (a linha do tempo só aparece com elas). */
  get temDatasDoTramite(): boolean {
    const p = this.processo;
    return !!p && !!(p.ChegadaSgdi || p.ChegadaSubgd || p.ChegadaUgtic || p.RetornoGabSgdi || p.RetornoOrgao);
  }

  /**
   * "Marcar como anterior ao regime": só no processo da supervisão (órgão comunicante)
   * com contrato assinado. As comunicações do TCDF ficam de fora, para não perderem a origem.
   */
  get podeMarcarAnterior(): boolean {
    const p = this.processo;
    return !!p && (p.Origem ?? ORIGEM_PADRAO) === ORIGEM_PADRAO && !!p.DataAssinaturaContrato;
  }

  /** Falta o nº do contrato: o quadro da marcação o pede. */
  get faltaNumeroContrato(): boolean {
    return !(this.processo?.NumeroContrato || '').trim();
  }

  get errNumeroContratoMarcar(): string | null {
    if (!this.faltaNumeroContrato) return null;
    const valor = this.numeroContratoMarcar.trim();
    if (!valor) return 'Informe o nº do contrato.';
    if (valor.length > 60) return 'O nº do contrato tem até 60 caracteres.';
    return null;
  }

  /**
   * O botão que abre a marcação some quando o quadro abre (e volta no "Cancelar"), e a
   * ficha muda inteira depois de marcar ou desfazer: sem levar o foco a um lugar certo,
   * ele cairia no começo da página.
   */
  ngAfterViewChecked(): void {
    if (!this.focoPendente) return;
    const id = this.focoPendente;
    this.focoPendente = null;
    document.getElementById(id)?.focus();
  }

  abrirMarcacao(): void {
    this.marcandoAnterior = true;
    this.marcacaoSubmetida = false;
    this.numeroContratoMarcar = '';
    this.focoPendente = this.faltaNumeroContrato ? 'ctr-marcar-contrato' : 'ctr-marcar-confirmar';
  }

  cancelarMarcacao(): void {
    this.marcandoAnterior = false;
    this.focoPendente = 'ctr-marcar-abrir';
  }

  marcarAnterior(): void {
    const processo = this.processo;
    if (!processo) return;
    this.marcacaoSubmetida = true;
    if (this.errNumeroContratoMarcar) {
      this.focoPendente = 'ctr-marcar-contrato';
      return;
    }
    const confirmou = confirm(
      `Marcar o processo ${processo.NumeroProcesso} (${processo.OrgaoSigla}) como contratação anterior ao regime?\n\n`
      + 'Ele sai da lista e dos números da supervisão contínua e passa para a aba "Contratações anteriores ao regime", '
      + 'como registro histórico. O registro histórico não leva criticidade, riscos, esclarecimentos, análise técnica, '
      + 'nota informativa nem o Nº SEI do Formulário: esses dados são apagados, e "Desfazer" (que devolve o processo à '
      + 'supervisão) não os traz de volta.'
    );
    if (!confirmou) return;
    this.salvandoAnterior = true;
    this.processoService.definirAnteriorAoRegime(processo.Id, {
      Anterior: true,
      NumeroContrato: this.faltaNumeroContrato ? this.numeroContratoMarcar.trim() : null
    }).subscribe({
      next: atualizado => {
        this.salvandoAnterior = false;
        this.marcandoAnterior = false;
        this.aplicar(atualizado);
        this.focoPendente = 'ctr-ficha-titulo-anterior';
        this.notificationService.success('Processo marcado como contratação anterior ao regime.');
      },
      error: erro => {
        this.salvandoAnterior = false;
        this.notificationService.error(mensagemDoErro(erro, 'Não foi possível marcar o processo como anterior ao regime.'));
      }
    });
  }

  /** "Desfazer": o registro histórico volta à supervisão contínua. */
  desfazerAnterior(): void {
    const processo = this.processo;
    if (!processo) return;
    const confirmou = confirm(
      `Devolver o processo ${processo.NumeroProcesso} (${processo.OrgaoSigla}) à supervisão contínua?\n\n`
      + 'Ele sai da aba "Contratações anteriores ao regime" e volta à lista e aos números da supervisão contínua.'
    );
    if (!confirmou) return;
    this.salvandoAnterior = true;
    this.processoService.definirAnteriorAoRegime(processo.Id, { Anterior: false }).subscribe({
      next: atualizado => {
        this.salvandoAnterior = false;
        this.aplicar(atualizado);
        this.focoPendente = 'ctr-ficha-titulo-processo';
        this.notificationService.success('O processo voltou à supervisão contínua.');
      },
      error: erro => {
        this.salvandoAnterior = false;
        this.notificationService.error(mensagemDoErro(erro, 'Não foi possível devolver o processo à supervisão contínua.'));
      }
    });
  }

  // ── Volta à lista ───────────────────────────────────────────────────────────

  /**
   * A lista do processo, pela origem (supervisão contínua, comunicações do TCDF ou
   * anteriores ao regime). Volta com os filtros que estavam aplicados quando a lista foi
   * deixada, se foi essa a lista.
   */
  get rotaDaLista(): string {
    return `/analises/processos/${secaoDaLista(this.processo?.Origem)}`;
  }

  get rotuloDaLista(): string {
    if (this.processo?.Origem === ORIGEM_TCDF) return 'Voltar para as comunicações do TCDF';
    if (this.ehAnterior) return 'Voltar para as contratações anteriores ao regime';
    return 'Voltar para os processos de supervisão contínua';
  }

  get filtrosDaLista(): Params {
    const lista = this.processoService.ultimaLista;
    // O mesmo objeto vazio a cada leitura: objeto novo no [queryParams] daria NG0100
    return lista && lista.secao === secaoDaLista(this.processo?.Origem) ? lista.params : CtrProcessoEditarComponent.semFiltros;
  }

  private static readonly semFiltros: Params = {};

  irParaLista(): void {
    this.router.navigate([this.rotaDaLista], { queryParams: this.filtrosDaLista });
  }
}
