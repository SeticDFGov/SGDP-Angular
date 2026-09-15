import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../auth/services/auth';
import { UserProfile } from '../../../api/auth/interface';
import { NotificationService } from '../../core/services/notification.service';
import { acompanharSecao } from '../../pgia/shared/secao-rota';
import { CtrProcessoService } from '../services/ctr-processo.service';
import { CtrProcessoFormComponent } from '../shared/ctr-processo-form.component';
import {
  badgeCriticidade,
  badgeFase,
  badgeNivelRisco,
  badgeRiscoClassificado,
  badgeSituacao,
  corDiasSemMovimento,
  rotuloEtapaPlanejamento
} from '../shared/ctr-rotulos';
import {
  CATEGORIAS_OBJETO,
  CRITICIDADES,
  CtrCheckpointForm,
  CtrProcesso,
  CtrProcessoFiltro,
  CtrProcessoForm,
  ETAPAS,
  ETAPAS_PLANEJAMENTO,
  FASES,
  NAO_CLASSIFICADO,
  NIVEIS_RISCO,
  ORIGENS,
  RISCOS_CLASSIFICADOS,
  SEM_RISCOS_DECLARADOS,
  SITUACOES
} from '../../../api/contratacoes/interface';

/**
 * Área "Processos": a lista com busca e filtros e a página de cadastro.
 * Uma seção por página (`/analises/processos/:secao`), como no PGIA.
 */
@Component({
  selector: 'app-ctr-processos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CtrProcessoFormComponent],
  templateUrl: './ctr-processos.component.html'
})
export class CtrProcessosComponent implements OnInit {
  /** Formulário mostrado nesta página (vem do parâmetro `:secao` da rota). */
  secao = '';
  user: UserProfile | null = null;

  processos: CtrProcesso[] = [];
  siglas: string[] = [];
  carregando = true;
  carregandoMais = false;
  /** Falha de carregamento vira mensagem na própria seção, não toast. */
  erroCarregar: string | null = null;

  paginaAtual = 1;
  totalPaginas = 1;
  totalItens = 0;
  readonly tamanhoPagina = 25;

  // Filtros da lista
  filtro: CtrProcessoFiltro = CtrProcessosComponent.filtroVazio();
  /** Cópia dos filtros da consulta que está na tela (congelada no Buscar). */
  private filtroAplicado: CtrProcessoFiltro = {};
  /** A lista é buscada na primeira vez que a seção dela abre. */
  private carregouLista = false;
  categorias = CATEGORIAS_OBJETO;
  situacoes = SITUACOES;
  etapas = ETAPAS;
  fases = FASES;
  etapasPlanejamento = ETAPAS_PLANEJAMENTO;
  criticidades = CRITICIDADES;
  origens = ORIGENS;
  riscosClassificados = RISCOS_CLASSIFICADOS;
  niveisRisco = NIVEIS_RISCO;
  readonly naoClassificado = NAO_CLASSIFICADO;
  readonly semRiscosDeclarados = SEM_RISCOS_DECLARADOS;

  private static filtroVazio(): CtrProcessoFiltro {
    return {
      Filtro: '', Categoria: '', Situacao: '', Sigla: '', Restituidos: null, De: '', Ate: '',
      Fase: '', EtapaPlanejamento: '', Criticidade: '', Origem: '', EsclarecimentoPendente: null,
      RiscoClassificado: '', NivelRiscoDeclarado: ''
    };
  }

  // Cadastro
  salvando = false;

  // Modal de checkpoint ("Registrar chegada")
  processoCheckpoint: CtrProcesso | null = null;
  checkpointEtapa: string = ETAPAS[0].valor;
  checkpointData = '';
  checkpointNaoSeAplica = false;
  checkpointLimpar = false;
  salvandoCheckpoint = false;

  exportando = false;

  badgeSituacao = badgeSituacao;
  badgeFase = badgeFase;
  badgeCriticidade = badgeCriticidade;
  badgeRiscoClassificado = badgeRiscoClassificado;
  badgeNivelRisco = badgeNivelRisco;
  corDiasSemMovimento = corDiasSemMovimento;
  rotuloEtapaPlanejamento = rotuloEtapaPlanejamento;

  constructor(
    private processoService: CtrProcessoService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    acompanharSecao(secao => {
      this.secao = secao;
      // O modal é da lista: trocar de seção (inclusive pelo histórico) o fecha.
      this.fecharCheckpoint();
      // A lista só é buscada quando é ela que está na tela — a mensagem de erro
      // dela mora na própria seção e ficaria muda em "Novo processo".
      if (secao === 'lista' && !this.carregouLista) this.buscar();
    });
  }

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => this.user = user);
    this.carregarSiglas();
  }

  // ── Lista ─────────────────────────────────────────────────────────────────

  private carregarSiglas(): void {
    this.processoService.listarSiglas().subscribe({
      next: siglas => this.siglas = siglas,
      error: () => this.siglas = []
    });
  }

  /** Os filtros como estão digitados na tela, normalizados. */
  private filtroDigitado(): CtrProcessoFiltro {
    return {
      ...this.filtro,
      Filtro: (this.filtro.Filtro || '').trim() || null,
      // A sigla é gravada em caixa alta: mandar assim evita filtro que não casa.
      Sigla: (this.filtro.Sigla || '').trim().toUpperCase() || null
    };
  }

  buscar(): void {
    this.carregouLista = true;
    // Os filtros da consulta ficam congelados aqui: "Carregar mais" e o export
    // trabalham sobre a lista que está na tela, não sobre o que foi digitado
    // depois e ainda não foi buscado.
    this.filtroAplicado = this.filtroDigitado();
    this.carregando = true;
    this.erroCarregar = null;
    this.processoService.listar({ ...this.filtroAplicado, Page: 1, PageSize: this.tamanhoPagina }).subscribe({
      next: pagina => {
        this.processos = pagina.Items ?? [];
        this.paginaAtual = pagina.CurrentPage ?? 1;
        this.totalPaginas = pagina.TotalPages ?? 1;
        this.totalItens = pagina.TotalItems ?? this.processos.length;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.erroCarregar = 'Não foi possível carregar os processos. Tente de novo em instantes.';
      }
    });
  }

  limparFiltros(): void {
    this.filtro = CtrProcessosComponent.filtroVazio();
    this.buscar();
  }

  get temMais(): boolean {
    return this.paginaAtual < this.totalPaginas;
  }

  carregarMais(): void {
    if (!this.temMais || this.carregandoMais) return;
    this.carregandoMais = true;
    this.processoService.listar({
      ...this.filtroAplicado, Page: this.paginaAtual + 1, PageSize: this.tamanhoPagina
    }).subscribe({
      next: pagina => {
        this.processos = [...this.processos, ...(pagina.Items ?? [])];
        this.paginaAtual = pagina.CurrentPage ?? this.paginaAtual + 1;
        this.totalPaginas = pagina.TotalPages ?? this.totalPaginas;
        this.carregandoMais = false;
      },
      error: () => {
        this.carregandoMais = false;
        this.notificationService.error('Não foi possível carregar mais processos.');
      }
    });
  }

  exportarCsv(): void {
    this.exportando = true;
    this.processoService.exportarCsv(this.filtroAplicado).subscribe({
      next: blob => {
        this.exportando = false;
        // Handler de clique: só roda no browser.
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'supervisao-continua-contratacoes.csv';
        link.click();
        // Revogar na hora corre com o início do download em alguns navegadores.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => {
        this.exportando = false;
        this.notificationService.error('Não foi possível exportar a lista em CSV.');
      }
    });
  }

  excluir(processo: CtrProcesso): void {
    const confirmou = confirm(
      `Excluir o processo ${processo.NumeroProcesso}?\n\n`
      + 'Ele sai das listas e dos números do painel, junto com as manifestações dele. '
      + 'O registro continua guardado para auditoria.'
    );
    if (!confirmou) return;

    this.processoService.excluir(processo.Id).subscribe({
      next: () => {
        this.notificationService.success('Processo excluído.');
        this.processos = this.processos.filter(p => p.Id !== processo.Id);
        this.totalItens = Math.max(0, this.totalItens - 1);
      },
      error: () => this.notificationService.error('Não foi possível excluir o processo.')
    });
  }

  // ── Modal de checkpoint ───────────────────────────────────────────────────

  private get hoje(): string {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${agora.getFullYear()}-${mes}-${dia}`;
  }

  abrirCheckpoint(processo: CtrProcesso): void {
    this.processoCheckpoint = processo;
    this.checkpointEtapa = this.proximaEtapa(processo);
    this.checkpointData = this.hoje;
    this.checkpointNaoSeAplica = false;
    this.checkpointLimpar = false;
  }

  fecharCheckpoint(): void {
    this.processoCheckpoint = null;
  }

  /** Sugere a primeira etapa ainda em branco (etapa dispensada não conta). */
  private proximaEtapa(processo: CtrProcesso): string {
    for (const etapa of ETAPAS) {
      if (etapa.valor === 'ChegadaUgtic' && processo.UgticNaoSeAplica) continue;
      if (etapa.valor === 'RetornoOrgao' && processo.RetornoOrgaoNaoSeAplica) continue;
      if (!processo[etapa.valor as keyof CtrProcesso]) return etapa.valor;
    }
    return ETAPAS[ETAPAS.length - 1].valor;
  }

  /**
   * As duas etapas que podem ser dispensadas: a UGTIC (etapa pulada) e o
   * retorno ao órgão (processo que não é devolvido). Nas demais o servidor
   * recusa o "não se aplica".
   */
  get etapaAceitaNaoSeAplica(): boolean {
    return this.checkpointEtapa === 'ChegadaUgtic' || this.checkpointEtapa === 'RetornoOrgao';
  }

  /** Texto do checkbox: o motivo de dispensar muda conforme a etapa. */
  get rotuloNaoSeAplica(): string {
    return this.checkpointEtapa === 'RetornoOrgao'
      ? 'Não se aplica (o processo não é devolvido ao órgão)'
      : 'Não se aplica (etapa pulada de propósito)';
  }

  aoTrocarEtapaCheckpoint(valor: string): void {
    this.checkpointEtapa = valor;
    if (!this.etapaAceitaNaoSeAplica) this.checkpointNaoSeAplica = false;
  }

  /** Data já gravada na etapa que está sendo editada no modal. */
  private get dataGravadaDaEtapa(): string | null {
    const processo = this.processoCheckpoint;
    if (!processo) return null;
    return (processo[this.checkpointEtapa as keyof CtrProcesso] as string | null | undefined) ?? null;
  }

  /**
   * Marcar "não se aplica" apaga a data gravada (o servidor limpa junto com o
   * flag): com data preenchida, pedir confirmação antes.
   */
  aoMarcarCheckpointNaoSeAplica(marcado: boolean): void {
    const gravada = this.dataGravadaDaEtapa;
    if (marcado && gravada) {
      const confirmou = confirm(
        `A data já registrada nesta etapa (${this.brasileira(gravada)}) será apagada ao marcar "não se aplica".\n\nContinuar?`
      );
      if (!confirmou) {
        this.checkpointNaoSeAplica = false;
        return;
      }
    }
    this.checkpointNaoSeAplica = marcado;
  }

  /**
   * Mesma cronologia do formulário completo, aplicada só à data que está sendo
   * registrada: ela não pode ser anterior às etapas anteriores já preenchidas
   * nem posterior às seguintes, e não pode estar no futuro.
   */
  get errCheckpoint(): string | null {
    // Limpar a data ou marcar "não se aplica" dispensa a conferência.
    if (this.checkpointLimpar || (this.etapaAceitaNaoSeAplica && this.checkpointNaoSeAplica)) return null;
    const processo = this.processoCheckpoint;
    if (!processo) return null;
    if (!this.checkpointData) return 'Informe a data.';
    if (this.checkpointData > this.hoje) return 'A data está no futuro.';

    const indice = ETAPAS.findIndex(e => e.valor === this.checkpointEtapa);
    for (let i = 0; i < ETAPAS.length; i++) {
      if (i === indice) continue;
      const valor = processo[ETAPAS[i].valor as keyof CtrProcesso] as string | null | undefined;
      if (!valor) continue;
      if (i < indice && this.checkpointData < valor) {
        return `A data não pode ser anterior à de "${ETAPAS[i].rotulo}" (${this.brasileira(valor)}).`;
      }
      if (i > indice && this.checkpointData > valor) {
        return `A data não pode ser posterior à de "${ETAPAS[i].rotulo}" (${this.brasileira(valor)}).`;
      }
    }

    // Mesma regra do formulário completo: a restituição não acontece antes da
    // chegada na SGDI.
    if (this.checkpointEtapa === 'ChegadaSgdi' && processo.RestituidoEm
        && this.checkpointData > processo.RestituidoEm) {
      return `A data não pode ser posterior à da restituição (${this.brasileira(processo.RestituidoEm)}).`;
    }

    return null;
  }

  private brasileira(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  salvarCheckpoint(): void {
    const processo = this.processoCheckpoint;
    if (!processo || this.errCheckpoint) return;

    this.salvandoCheckpoint = true;
    const limpar = this.checkpointLimpar || (this.etapaAceitaNaoSeAplica && this.checkpointNaoSeAplica);
    const corpo: CtrCheckpointForm = {
      Etapa: this.checkpointEtapa,
      Data: limpar ? null : this.checkpointData
    };
    // A chave só vai quando a etapa aceita "não se aplica" E há intenção: o
    // servidor recusa qualquer valor não nulo nas outras três etapas (mandar
    // `false` derrubava o primeiro uso do modal, que sugere ChegadaSgdi). E só
    // limpar a data não pode desmarcar o flag — aí a chave também é omitida.
    if (this.etapaAceitaNaoSeAplica && (this.checkpointNaoSeAplica || !this.checkpointLimpar)) {
      corpo.NaoSeAplica = this.checkpointNaoSeAplica;
    }
    this.processoService.registrarCheckpoint(processo.Id, corpo).subscribe({
      next: atualizado => {
        this.salvandoCheckpoint = false;
        this.processos = this.processos.map(p => p.Id === atualizado.Id ? atualizado : p);
        this.fecharCheckpoint();
        this.notificationService.success('Andamento registrado.');
      },
      error: () => {
        this.salvandoCheckpoint = false;
        this.notificationService.error('Não foi possível registrar o andamento. Confira se a data respeita a ordem das etapas.');
      }
    });
  }

  // ── Cadastro ──────────────────────────────────────────────────────────────

  criar(form: CtrProcessoForm): void {
    this.salvando = true;
    this.processoService.criar(form).subscribe({
      next: criado => {
        this.salvando = false;
        this.notificationService.success('Processo cadastrado.');
        this.router.navigate(['/analises/processos/editar', criado.Id]);
      },
      error: () => {
        this.salvando = false;
        this.notificationService.error(
          'Não foi possível cadastrar. Confira se o número do processo já não está cadastrado, se as datas estão coerentes '
          + 'e se a classificação de riscos está correta.'
        );
      }
    });
  }

  irParaLista(): void {
    this.router.navigate(['/analises/processos/lista']);
  }
}
