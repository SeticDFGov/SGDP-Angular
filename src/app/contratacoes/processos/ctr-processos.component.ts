import { Component, OnInit } from '@angular/core';
import { CitaInDirective } from '../shared/cita-in.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { acompanharSecao } from '../../pgia/shared/secao-rota';
import { CtrProcessoService } from '../services/ctr-processo.service';
import { CtrProcessoFormComponent } from '../shared/ctr-processo-form.component';
import { filtroDosParametros, parametrosDaLista } from '../shared/ctr-filtro-lista';
import {
  badgeCriticidade,
  badgeNivelRisco,
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
  ETAPA_ASSINATURA,
  ETAPAS_PLANEJAMENTO,
  NIVEIS_RISCO,
  ORIGENS,
  SEM_RISCOS_DECLARADOS,
  SITUACOES
} from '../../../api/contratacoes/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';

/** Filtro aplicado, mostrado como etiqueta removível acima da lista. */
interface FiltroAtivo {
  campo: keyof CtrProcessoFiltro;
  rotulo: string;
}

/** Filtros que ficam em "Mais filtros" (os demais estão sempre à mostra). */
const CAMPOS_AVANCADOS: (keyof CtrProcessoFiltro)[] = [
  'Categoria', 'Sigla', 'EtapaPlanejamento', 'Origem', 'EsclarecimentoPendente', 'Restituidos', 'IncluirConcluidos',
  'De', 'Ate'
];

/** A situação dos processos com contrato assinado (fora da lista por padrão). */
const SITUACAO_CONCLUIDO = 'Concluído';

/**
 * Área "Processos": a lista com busca e filtros e a página de cadastro.
 * Uma seção por página (`/analises/processos/:secao`), como no PGIA.
 *
 * Os filtros da lista valem assim que escolhidos (a busca por texto, no Enter
 * ou no botão) e ficam gravados na URL: voltar de um processo, recarregar ou
 * seguir um link do painel mostra a mesma lista.
 */
@Component({
  selector: 'app-ctr-processos',
  standalone: true,
  imports: [CitaInDirective, DialogoDirective, CommonModule, FormsModule, RouterModule, CtrProcessoFormComponent],
  templateUrl: './ctr-processos.component.html'
})
export class CtrProcessosComponent implements OnInit {
  /** Formulário mostrado nesta página (vem do parâmetro `:secao` da rota). */
  secao = '';

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
  /** Cópia dos filtros da consulta que está na tela (congelada a cada aplicação). */
  private filtroAplicado: CtrProcessoFiltro = {};
  /** A lista é buscada na primeira vez que a seção dela abre. */
  private carregouLista = false;
  /** Painel "Mais filtros" aberto. */
  filtrosAbertos = false;
  /** Etiquetas dos filtros aplicados (montadas a cada aplicação). */
  filtrosAtivos: FiltroAtivo[] = [];
  categorias = CATEGORIAS_OBJETO;
  situacoes = SITUACOES;
  etapas = ETAPAS;
  readonly etapaAssinatura = ETAPA_ASSINATURA;
  etapasPlanejamento = ETAPAS_PLANEJAMENTO;
  criticidades = CRITICIDADES;
  origens = ORIGENS;
  niveisRisco = NIVEIS_RISCO;
  readonly semRiscosDeclarados = SEM_RISCOS_DECLARADOS;

  private static filtroVazio(): CtrProcessoFiltro {
    return {
      Filtro: '', Categoria: '', Situacao: '', Sigla: '', Restituidos: null, De: '', Ate: '',
      EtapaPlanejamento: '', Criticidade: '', Origem: '', EsclarecimentoPendente: null,
      NivelRiscoDeclarado: '', IncluirConcluidos: false
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
  badgeCriticidade = badgeCriticidade;
  badgeNivelRisco = badgeNivelRisco;
  corDiasSemMovimento = corDiasSemMovimento;
  rotuloEtapaPlanejamento = rotuloEtapaPlanejamento;

  constructor(
    private processoService: CtrProcessoService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    acompanharSecao(secao => {
      this.secao = secao;
      // O modal é da lista: trocar de seção (inclusive pelo histórico) o fecha.
      this.fecharCheckpoint();
      // A lista só é buscada quando é ela que está na tela: a mensagem de erro
      // dela mora na própria seção e ficaria muda em "Novo processo". Na
      // primeira vez, os filtros vêm da URL (volta de um processo, link do painel).
      if (secao === 'lista' && !this.carregouLista) {
        this.filtro = { ...CtrProcessosComponent.filtroVazio(), ...filtroDosParametros(this.route.snapshot.queryParamMap) };
        this.filtrosAbertos = this.filtrosAvancadosAtivos(this.filtro) > 0;
        this.buscar();
      }
    });
  }

  ngOnInit(): void {
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
      Sigla: (this.filtro.Sigla || '').trim().toUpperCase() || null,
      // Só vai quando marcado: desmarcado é o padrão (concluídos fora)
      IncluirConcluidos: this.filtro.IncluirConcluidos ? true : null
    };
  }

  buscar(): void {
    this.carregouLista = true;
    // Os filtros da consulta ficam congelados aqui: "Carregar mais" e o export
    // trabalham sobre a lista que está na tela, não sobre o que foi digitado
    // depois e ainda não foi buscado.
    this.filtroAplicado = this.filtroDigitado();
    this.filtrosAtivos = this.descreverFiltros(this.filtroAplicado);
    this.gravarFiltrosNaUrl();
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

  /**
   * Os filtros aplicados vão para a URL sem entrar no histórico: voltar de um
   * processo ou recarregar mostra a mesma lista. O serviço guarda os mesmos
   * parâmetros para o "Voltar para a lista" da página do processo.
   */
  private gravarFiltrosNaUrl(): void {
    const queryParams = parametrosDaLista(this.filtroAplicado);
    this.processoService.filtrosDaLista = queryParams;
    this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }

  /** Quantos filtros de "Mais filtros" estão preenchidos (checkbox desmarcado não conta). */
  private filtrosAvancadosAtivos(filtro: CtrProcessoFiltro): number {
    return CAMPOS_AVANCADOS.filter(campo => {
      const valor = filtro[campo];
      return valor !== null && valor !== undefined && valor !== '' && valor !== false;
    }).length;
  }

  /** Contagem no botão "Mais filtros", do que está aplicado na lista. */
  get totalFiltrosAvancados(): number {
    return this.filtrosAvancadosAtivos(this.filtroAplicado);
  }

  /** Os filtros aplicados, em etiquetas que dizem em palavras o que está valendo. */
  private descreverFiltros(f: CtrProcessoFiltro): FiltroAtivo[] {
    const ativos: FiltroAtivo[] = [];
    const data = (valor: string) => this.brasileira(valor);
    if (f.Filtro) ativos.push({ campo: 'Filtro', rotulo: `Busca: "${f.Filtro}"` });
    if (f.Situacao) ativos.push({ campo: 'Situacao', rotulo: `Situação: ${f.Situacao}` });
    if (f.IncluirConcluidos) ativos.push({ campo: 'IncluirConcluidos', rotulo: 'Incluindo os concluídos' });
    if (f.NivelRiscoDeclarado) {
      ativos.push({
        campo: 'NivelRiscoDeclarado',
        rotulo: f.NivelRiscoDeclarado === this.semRiscosDeclarados
          ? this.semRiscosDeclarados
          : `Maior risco: ${f.NivelRiscoDeclarado}`
      });
    }
    if (f.Categoria) ativos.push({ campo: 'Categoria', rotulo: `Categoria: ${f.Categoria}` });
    if (f.Sigla) ativos.push({ campo: 'Sigla', rotulo: `Órgão: ${f.Sigla}` });
    if (f.Criticidade) ativos.push({ campo: 'Criticidade', rotulo: `Criticidade: ${f.Criticidade}` });
    if (f.EtapaPlanejamento) ativos.push({ campo: 'EtapaPlanejamento', rotulo: `Etapa: ${f.EtapaPlanejamento}` });
    if (f.Origem) ativos.push({ campo: 'Origem', rotulo: `Origem: ${f.Origem}` });
    if (f.EsclarecimentoPendente !== null && f.EsclarecimentoPendente !== undefined) {
      ativos.push({
        campo: 'EsclarecimentoPendente',
        rotulo: f.EsclarecimentoPendente ? 'Aguardando esclarecimento' : 'Sem esclarecimento pendente'
      });
    }
    if (f.Restituidos !== null && f.Restituidos !== undefined) {
      ativos.push({ campo: 'Restituidos', rotulo: f.Restituidos ? 'Só os restituídos' : 'Sem os restituídos' });
    }
    if (f.De) ativos.push({ campo: 'De', rotulo: `Chegada na SGDI a partir de ${data(f.De)}` });
    if (f.Ate) ativos.push({ campo: 'Ate', rotulo: `Chegada na SGDI até ${data(f.Ate)}` });
    return ativos;
  }

  /** Tira um filtro (a etiqueta) e busca de novo. */
  removerFiltro(campo: keyof CtrProcessoFiltro): void {
    (this.filtro as Record<string, unknown>)[campo] =
      campo === 'EsclarecimentoPendente' || campo === 'Restituidos' ? null
      : campo === 'IncluirConcluidos' ? false
      : '';
    this.buscar();
  }

  /** Nenhum processo cadastrado ainda (e não é um filtro que esconde todos). */
  get semNenhumProcesso(): boolean {
    return this.totalItens === 0 && this.filtrosAtivos.length === 0;
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
      `Excluir o processo ${processo.NumeroProcesso} (${processo.OrgaoSigla})?\n\n`
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

  /** Campo do processo que guarda a data de uma etapa (a assinatura tem nome próprio). */
  private static campoDaEtapa(etapa: string): keyof CtrProcesso {
    return (etapa === ETAPA_ASSINATURA ? 'DataAssinaturaContrato' : etapa) as keyof CtrProcesso;
  }

  /** Sugere a primeira etapa ainda em branco (etapa dispensada não conta). */
  private proximaEtapa(processo: CtrProcesso): string {
    for (const etapa of ETAPAS) {
      if (etapa.valor === 'ChegadaUgtic' && processo.UgticNaoSeAplica) continue;
      if (etapa.valor === 'RetornoOrgao' && processo.RetornoOrgaoNaoSeAplica) continue;
      if (!processo[CtrProcessosComponent.campoDaEtapa(etapa.valor)]) return etapa.valor;
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
    return (processo[CtrProcessosComponent.campoDaEtapa(this.checkpointEtapa)] as string | null | undefined) ?? null;
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

    // A assinatura fica fora da cronologia: nem é conferida contra as outras datas
    // nem as outras contra ela (o TCDF também analisa contrato já assinado).
    if (this.checkpointEtapa === ETAPA_ASSINATURA) return null;

    const indice = ETAPAS.findIndex(e => e.valor === this.checkpointEtapa);
    for (let i = 0; i < ETAPAS.length; i++) {
      if (i === indice || ETAPAS[i].valor === ETAPA_ASSINATURA) continue;
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
    // limpar a data não pode desmarcar o flag; aí a chave também é omitida.
    if (this.etapaAceitaNaoSeAplica && (this.checkpointNaoSeAplica || !this.checkpointLimpar)) {
      corpo.NaoSeAplica = this.checkpointNaoSeAplica;
    }
    this.processoService.registrarCheckpoint(processo.Id, corpo).subscribe({
      next: atualizado => {
        this.salvandoCheckpoint = false;
        this.fecharCheckpoint();
        // Concluído (contrato assinado) sai da lista, a menos que ela o inclua
        const saiDaLista = atualizado.Situacao === SITUACAO_CONCLUIDO
          && !this.filtroAplicado.IncluirConcluidos && this.filtroAplicado.Situacao !== SITUACAO_CONCLUIDO;
        if (saiDaLista) {
          this.processos = this.processos.filter(p => p.Id !== atualizado.Id);
          this.totalItens = Math.max(0, this.totalItens - 1);
          this.notificationService.success(
            `Processo concluído: contrato assinado em ${this.brasileira(atualizado.DataAssinaturaContrato || '')}. `
            + 'Ele passa para a relação de concluídos do painel.');
          return;
        }
        this.processos = this.processos.map(p => p.Id === atualizado.Id ? atualizado : p);
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
          + 'e se os riscos da contratação estão completos.'
        );
      }
    });
  }

  irParaLista(): void {
    this.router.navigate(['/analises/processos/lista'], { queryParams: this.processoService.filtrosDaLista });
  }
}
