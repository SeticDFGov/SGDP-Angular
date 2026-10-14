import { Component, OnInit } from '@angular/core';
import { CitaInDirective } from '../shared/cita-in.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { acompanharSecao } from '../../pgia/shared/secao-rota';
import { mensagemDoErro } from '../../pgia/shared/mensagem-erro';
import { CtrProcessoService } from '../services/ctr-processo.service';
import { CtrProcessoFormComponent } from '../shared/ctr-processo-form.component';
import { CtrAnteriorRegimeFormComponent } from '../shared/ctr-anterior-regime-form.component';
import {
  SECAO_LISTA_ANTERIORES,
  SECAO_LISTA_SUPERVISAO,
  SECAO_LISTA_TCDF,
  SECAO_REGISTRAR_ANTERIOR,
  filtroDosParametros,
  origemDaSecao,
  parametrosDaLista
} from '../shared/ctr-filtro-lista';
import {
  badgeCriticidade,
  badgeSituacao,
  corUltimaMovimentacao,
  textoHaDias
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
  ETAPA_NOTA_INFORMATIVA,
  ETAPAS_PLANEJAMENTO,
  TIPO_CONTRATACAO_NAO_INFORMADO,
  TIPOS_CONTRATACAO,
  NIVEIS_RISCO,
  SEM_RISCOS_DECLARADOS,
  SITUACAO_CONTRATO_ASSINADO,
  SITUACOES
} from '../../../api/contratacoes/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';

/** Filtro aplicado, mostrado como etiqueta removível acima da lista. */
interface FiltroAtivo {
  campo: keyof CtrProcessoFiltro;
  rotulo: string;
}

/**
 * Filtros que ficam em "Mais filtros" (os demais estão sempre à mostra). A origem
 * saiu em 2026-09-24 (é a sub-aba que a escolhe), e a restituição também (as telas
 * não a pedem mais). Em 2026-10-13 a categoria subiu para a barra principal, o maior
 * risco desceu para cá e o esclarecimento saiu (a situação nova cobre).
 */
const CAMPOS_AVANCADOS: (keyof CtrProcessoFiltro)[] = [
  'NivelRiscoDeclarado', 'Sigla', 'EtapaPlanejamento', 'TipoContratacao', 'IncluirConcluidos', 'De', 'Ate'
];

/** Os filtros que a lista dos registros históricos usa (os outros não se aplicam a ela). */
const CAMPOS_ANTERIORES: (keyof CtrProcessoFiltro)[] = ['Filtro', 'Categoria', 'Sigla'];

/**
 * Área "Processos": as três listas com busca e filtros e as páginas de cadastro. Uma
 * seção por página (`/analises/processos/:secao`), como no PGIA. As listas são sub-abas
 * de Processos, separadas pela origem: "Processos de supervisão contínua" (`lista`, os que
 * vieram do órgão comunicante), "Comunicações do TCDF" (`comunicacoes-tcdf`, os que
 * nasceram de uma comunicação do Tribunal), com os mesmos filtros, e "Contratações
 * anteriores ao regime" (`anteriores-ao-regime`, os registros históricos), com a busca, a
 * categoria e a sigla. O registro histórico tem o formulário curto próprio
 * (`registrar-anterior`).
 *
 * Os filtros da lista valem assim que escolhidos (a busca por texto, no Enter
 * ou no botão) e ficam gravados na URL: voltar de um processo, recarregar ou
 * seguir um link do painel mostra a mesma lista.
 */
@Component({
  selector: 'app-ctr-processos',
  standalone: true,
  imports: [
    CitaInDirective, DialogoDirective, CommonModule, FormsModule, RouterModule, CtrProcessoFormComponent,
    CtrAnteriorRegimeFormComponent
  ],
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
  /**
   * Qual das listas está carregada: cada uma é buscada quando a seção dela abre, e
   * trocar de lista busca a outra, com os filtros da URL dela.
   */
  private listaCarregada: string | null = null;
  /** Painel "Mais filtros" aberto. */
  filtrosAbertos = false;
  /** Etiquetas dos filtros aplicados (montadas a cada aplicação). */
  filtrosAtivos: FiltroAtivo[] = [];
  categorias = CATEGORIAS_OBJETO;
  situacoes = SITUACOES;
  etapas = ETAPAS;
  readonly etapaAssinatura = ETAPA_ASSINATURA;
  readonly etapaNota = ETAPA_NOTA_INFORMATIVA;
  readonly secaoRegistrarAnterior = SECAO_REGISTRAR_ANTERIOR;
  etapasPlanejamento = ETAPAS_PLANEJAMENTO;
  tiposContratacao = TIPOS_CONTRATACAO;
  readonly tipoNaoInformado = TIPO_CONTRATACAO_NAO_INFORMADO;
  criticidades = CRITICIDADES;
  niveisRisco = NIVEIS_RISCO;
  readonly semRiscosDeclarados = SEM_RISCOS_DECLARADOS;

  private static filtroVazio(): CtrProcessoFiltro {
    return {
      Filtro: '', Categoria: '', Situacao: '', Sigla: '', De: '', Ate: '',
      EtapaPlanejamento: '', TipoContratacao: '', Criticidade: '',
      NivelRiscoDeclarado: '', IncluirConcluidos: false
    };
  }

  /** A seção mostra uma das três listas (e não um cadastro). */
  get ehLista(): boolean {
    return origemDaSecao(this.secao) !== null;
  }

  /** A lista das comunicações do TCDF. */
  get ehListaTcdf(): boolean {
    return this.secao === SECAO_LISTA_TCDF;
  }

  /** A lista dos registros históricos (contratações anteriores ao regime). */
  get ehListaAnteriores(): boolean {
    return this.secao === SECAO_LISTA_ANTERIORES;
  }

  // Cadastro
  salvando = false;

  // Modal de checkpoint ("Registrar andamento")
  processoCheckpoint: CtrProcesso | null = null;
  checkpointEtapa: string = ETAPAS[0].valor;
  checkpointData = '';
  /** Nº do documento SEI da nota informativa (só na etapa da nota). */
  checkpointDocumento = '';
  checkpointNaoSeAplica = false;
  checkpointLimpar = false;
  salvandoCheckpoint = false;

  exportando = false;

  badgeSituacao = badgeSituacao;
  badgeCriticidade = badgeCriticidade;
  corUltimaMovimentacao = corUltimaMovimentacao;
  textoHaDias = textoHaDias;

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
      // dela mora na própria seção e ficaria muda nos cadastros. Ao abrir uma
      // lista (ou trocar de uma para outra), os filtros vêm da URL dela (volta de
      // um processo, link do painel); voltar do cadastro para a mesma lista não
      // busca de novo.
      if (this.ehLista && this.listaCarregada !== secao) {
        const daUrl = filtroDosParametros(this.route.snapshot.queryParamMap);
        this.filtro = { ...CtrProcessosComponent.filtroVazio(), ...this.soDaLista(daUrl) };
        this.filtrosAbertos = !this.ehListaAnteriores && this.filtrosAvancadosAtivos(this.filtro) > 0;
        this.processos = [];
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

  /** Na lista dos registros históricos só valem a busca, a categoria e a sigla. */
  private soDaLista(filtro: Partial<CtrProcessoFiltro>): Partial<CtrProcessoFiltro> {
    if (!this.ehListaAnteriores) return filtro;
    const saida: Partial<CtrProcessoFiltro> = {};
    for (const campo of CAMPOS_ANTERIORES) {
      if (filtro[campo] !== undefined) (saida as Record<string, unknown>)[campo] = filtro[campo];
    }
    return saida;
  }

  /** Os filtros como estão digitados na tela, normalizados. */
  private filtroDigitado(): CtrProcessoFiltro {
    const filtro: CtrProcessoFiltro = {
      ...this.filtro,
      Filtro: (this.filtro.Filtro || '').trim() || null,
      // A sigla é gravada em caixa alta: mandar assim evita filtro que não casa.
      Sigla: (this.filtro.Sigla || '').trim().toUpperCase() || null,
      // Só vai quando marcado: desmarcado é o padrão (contrato assinado fora)
      IncluirConcluidos: this.filtro.IncluirConcluidos ? true : null,
      // A origem é a da lista aberta (sub-aba), nunca um filtro da tela
      Origem: origemDaSecao(this.secao)
    };
    if (!this.ehListaAnteriores) return filtro;
    return { Filtro: filtro.Filtro, Categoria: filtro.Categoria || null, Sigla: filtro.Sigla, Origem: filtro.Origem };
  }

  /**
   * O que vai ao servidor: os registros históricos têm todos o contrato assinado, que a
   * lista esconde por padrão; nessa sub-aba eles sempre vêm (sem ir para a URL).
   */
  private consulta(filtro: CtrProcessoFiltro): CtrProcessoFiltro {
    return this.ehListaAnteriores ? { ...filtro, IncluirConcluidos: true } : filtro;
  }

  buscar(): void {
    this.listaCarregada = this.secao;
    // Os filtros da consulta ficam congelados aqui: "Carregar mais" e o export
    // trabalham sobre a lista que está na tela, não sobre o que foi digitado
    // depois e ainda não foi buscado.
    this.filtroAplicado = this.filtroDigitado();
    this.filtrosAtivos = this.descreverFiltros(this.filtroAplicado);
    this.gravarFiltrosNaUrl();
    this.carregando = true;
    this.erroCarregar = null;
    this.processoService.listar({ ...this.consulta(this.filtroAplicado), Page: 1, PageSize: this.tamanhoPagina }).subscribe({
      next: pagina => {
        this.processos = pagina.Items ?? [];
        this.paginaAtual = pagina.CurrentPage ?? 1;
        this.totalPaginas = pagina.TotalPages ?? 1;
        this.totalItens = pagina.TotalItems ?? this.processos.length;
        this.carregando = false;
      },
      error: erro => {
        this.carregando = false;
        this.erroCarregar = mensagemDoErro(erro, 'Não foi possível carregar os processos. Tente de novo em instantes.');
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
    this.processoService.ultimaLista = { secao: this.secao, params: queryParams };
    // Ao abrir uma lista (inclusive trocando de sub-aba) os filtros vêm da própria URL:
    // sem mudança não há o que gravar. E a gravação espera a navegação em curso
    // terminar: navegar enquanto a rota ainda está sendo ativada cancelava a navegação
    // da sub-aba, e o cabeçalho e o título da página ficavam na seção anterior.
    if (CtrProcessosComponent.mesmosParametros(queryParams, this.route.snapshot.queryParams)) return;
    Promise.resolve().then(() =>
      this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true }));
  }

  private static mesmosParametros(a: Params, b: Params): boolean {
    const chavesA = Object.keys(a);
    const chavesB = Object.keys(b);
    return chavesA.length === chavesB.length && chavesA.every(chave => String(a[chave]) === String(b[chave]));
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
    if (f.Criticidade) ativos.push({ campo: 'Criticidade', rotulo: `Criticidade: ${f.Criticidade}` });
    if (f.Categoria) ativos.push({ campo: 'Categoria', rotulo: `Categoria: ${f.Categoria}` });
    if (f.IncluirConcluidos) ativos.push({ campo: 'IncluirConcluidos', rotulo: 'Incluindo os de contrato assinado' });
    if (f.NivelRiscoDeclarado) {
      ativos.push({
        campo: 'NivelRiscoDeclarado',
        rotulo: f.NivelRiscoDeclarado === this.semRiscosDeclarados
          ? this.semRiscosDeclarados
          : `Maior risco: ${f.NivelRiscoDeclarado}`
      });
    }
    if (f.Sigla) ativos.push({ campo: 'Sigla', rotulo: `Órgão: ${f.Sigla}` });
    if (f.EtapaPlanejamento) ativos.push({ campo: 'EtapaPlanejamento', rotulo: `Etapa: ${f.EtapaPlanejamento}` });
    if (f.TipoContratacao) {
      ativos.push({
        campo: 'TipoContratacao',
        rotulo: f.TipoContratacao === this.tipoNaoInformado ? 'Tipo da contratação não informado' : f.TipoContratacao
      });
    }
    if (f.De) ativos.push({ campo: 'De', rotulo: `Chegada na SGDI a partir de ${data(f.De)}` });
    if (f.Ate) ativos.push({ campo: 'Ate', rotulo: `Chegada na SGDI até ${data(f.Ate)}` });
    return ativos;
  }

  /** Tira um filtro (a etiqueta) e busca de novo. */
  removerFiltro(campo: keyof CtrProcessoFiltro): void {
    (this.filtro as Record<string, unknown>)[campo] = campo === 'IncluirConcluidos' ? false : '';
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
      ...this.consulta(this.filtroAplicado), Page: this.paginaAtual + 1, PageSize: this.tamanhoPagina
    }).subscribe({
      next: pagina => {
        this.processos = [...this.processos, ...(pagina.Items ?? [])];
        this.paginaAtual = pagina.CurrentPage ?? this.paginaAtual + 1;
        this.totalPaginas = pagina.TotalPages ?? this.totalPaginas;
        this.carregandoMais = false;
      },
      error: erro => {
        this.carregandoMais = false;
        this.notificationService.error(mensagemDoErro(erro, 'Não foi possível carregar mais processos.'));
      }
    });
  }

  /** Nome do arquivo baixado: cada lista baixa o próprio (o formato é o mesmo e reimporta igual). */
  private get nomeCsv(): string {
    if (this.ehListaTcdf) return 'supervisao-continua-comunicacoes-tcdf.csv';
    if (this.ehListaAnteriores) return 'supervisao-continua-anteriores-ao-regime.csv';
    return 'supervisao-continua-contratacoes.csv';
  }

  exportarCsv(): void {
    this.exportando = true;
    this.processoService.exportarCsv(this.consulta(this.filtroAplicado)).subscribe({
      next: blob => {
        this.exportando = false;
        // Handler de clique: só roda no browser.
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.nomeCsv;
        link.click();
        // Revogar na hora corre com o início do download em alguns navegadores.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: erro => {
        this.exportando = false;
        this.notificationService.error(mensagemDoErro(erro, 'Não foi possível exportar a lista em CSV.'));
      }
    });
  }

  excluir(processo: CtrProcesso): void {
    const anterior = this.ehListaAnteriores;
    const confirmou = confirm(anterior
      ? `Excluir a contratação anterior ao regime do processo ${processo.NumeroProcesso} (${processo.OrgaoSigla})?\n\n`
        + 'Ela sai desta lista e do bloco dos registros históricos do painel, junto com as manifestações dela. '
        + 'O registro continua guardado para auditoria.'
      : `Excluir o processo ${processo.NumeroProcesso} (${processo.OrgaoSigla})?\n\n`
        + 'Ele sai das listas e dos números do painel, junto com as manifestações dele. '
        + 'O registro continua guardado para auditoria.'
    );
    if (!confirmou) return;

    this.processoService.excluir(processo.Id).subscribe({
      next: () => {
        this.notificationService.success(anterior ? 'Contratação excluída.' : 'Processo excluído.');
        this.processos = this.processos.filter(p => p.Id !== processo.Id);
        this.totalItens = Math.max(0, this.totalItens - 1);
      },
      error: erro => this.notificationService.error(mensagemDoErro(erro, 'Não foi possível excluir o processo.'))
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
    this.checkpointDocumento = processo.NotaInformativaDocumentoSei ?? '';
    this.checkpointNaoSeAplica = false;
    this.checkpointLimpar = false;
  }

  fecharCheckpoint(): void {
    this.processoCheckpoint = null;
  }

  /** Campo do processo que guarda a data de uma etapa (a nota e a assinatura têm nome próprio). */
  private static campoDaEtapa(etapa: string): keyof CtrProcesso {
    if (etapa === ETAPA_ASSINATURA) return 'DataAssinaturaContrato';
    if (etapa === ETAPA_NOTA_INFORMATIVA) return 'NotaInformativaEnviadaEm';
    return etapa as keyof CtrProcesso;
  }

  /** Etapas fora da cronologia das cinco do trâmite. */
  private static foraDaCronologia(etapa: string): boolean {
    return etapa === ETAPA_ASSINATURA || etapa === ETAPA_NOTA_INFORMATIVA;
  }

  /**
   * Sugere a primeira etapa ainda em branco (etapa dispensada não conta). A nota
   * informativa não é sugerida: nem todo processo a tem (ela é escolhida de propósito).
   */
  private proximaEtapa(processo: CtrProcesso): string {
    for (const etapa of ETAPAS) {
      if (etapa.valor === ETAPA_NOTA_INFORMATIVA) continue;
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

  /** O documento da nota tem até 25 caracteres, como no servidor. */
  get errCheckpointDocumento(): string | null {
    if (this.checkpointEtapa !== ETAPA_NOTA_INFORMATIVA || this.checkpointLimpar) return null;
    return this.checkpointDocumento.trim().length > 25 ? 'O nº do documento SEI tem até 25 caracteres.' : null;
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

    // A nota informativa só não pode ser anterior à chegada na SGDI.
    if (this.checkpointEtapa === ETAPA_NOTA_INFORMATIVA) {
      if (processo.ChegadaSgdi && this.checkpointData < processo.ChegadaSgdi) {
        return `A nota informativa não pode ser anterior à chegada na SGDI (${this.brasileira(processo.ChegadaSgdi)}).`;
      }
      return null;
    }

    const indice = ETAPAS.findIndex(e => e.valor === this.checkpointEtapa);
    for (let i = 0; i < ETAPAS.length; i++) {
      if (i === indice || CtrProcessosComponent.foraDaCronologia(ETAPAS[i].valor)) continue;
      const valor = processo[ETAPAS[i].valor as keyof CtrProcesso] as string | null | undefined;
      if (!valor) continue;
      if (i < indice && this.checkpointData < valor) {
        return `A data não pode ser anterior à de "${ETAPAS[i].rotulo}" (${this.brasileira(valor)}).`;
      }
      if (i > indice && this.checkpointData > valor) {
        return `A data não pode ser posterior à de "${ETAPAS[i].rotulo}" (${this.brasileira(valor)}).`;
      }
    }

    if (this.checkpointEtapa === 'ChegadaSgdi') {
      // A restituição registrada antes e a nota informativa não acontecem antes da
      // chegada na SGDI.
      if (processo.RestituidoEm && this.checkpointData > processo.RestituidoEm) {
        return `A data não pode ser posterior à da restituição (${this.brasileira(processo.RestituidoEm)}).`;
      }
      if (processo.NotaInformativaEnviadaEm && this.checkpointData > processo.NotaInformativaEnviadaEm) {
        return `A data não pode ser posterior à da nota informativa (${this.brasileira(processo.NotaInformativaEnviadaEm)}).`;
      }
    }

    return null;
  }

  private brasileira(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  salvarCheckpoint(): void {
    const processo = this.processoCheckpoint;
    if (!processo || this.errCheckpoint || this.errCheckpointDocumento) return;

    this.salvandoCheckpoint = true;
    const limpar = this.checkpointLimpar || (this.etapaAceitaNaoSeAplica && this.checkpointNaoSeAplica);
    const corpo: CtrCheckpointForm = {
      Etapa: this.checkpointEtapa,
      Data: limpar ? null : this.checkpointData
    };
    // A chave só vai quando a etapa aceita "não se aplica" E há intenção: o
    // servidor recusa qualquer valor não nulo nas outras etapas (mandar
    // `false` derrubava o primeiro uso do modal, que sugere ChegadaSgdi). E só
    // limpar a data não pode desmarcar o flag; aí a chave também é omitida.
    if (this.etapaAceitaNaoSeAplica && (this.checkpointNaoSeAplica || !this.checkpointLimpar)) {
      corpo.NaoSeAplica = this.checkpointNaoSeAplica;
    }
    // O documento da nota só vai na etapa da nota, com a data (limpar a data limpa os dois)
    if (this.checkpointEtapa === ETAPA_NOTA_INFORMATIVA && !limpar) {
      corpo.DocumentoSei = this.checkpointDocumento.trim() || null;
    }
    this.processoService.registrarCheckpoint(processo.Id, corpo).subscribe({
      next: atualizado => {
        this.salvandoCheckpoint = false;
        this.fecharCheckpoint();
        // Contrato assinado sai da lista, a menos que ela o inclua
        const saiDaLista = atualizado.Situacao === SITUACAO_CONTRATO_ASSINADO
          && !this.filtroAplicado.IncluirConcluidos && this.filtroAplicado.Situacao !== SITUACAO_CONTRATO_ASSINADO;
        if (saiDaLista) {
          this.processos = this.processos.filter(p => p.Id !== atualizado.Id);
          this.totalItens = Math.max(0, this.totalItens - 1);
          this.notificationService.success(
            `Contrato assinado em ${this.brasileira(atualizado.DataAssinaturaContrato || '')}: o processo sai da lista `
            + 'e passa para a relação dos contratos assinados, no painel.');
          return;
        }
        this.processos = this.processos.map(p => p.Id === atualizado.Id ? atualizado : p);
        this.notificationService.success('Andamento registrado.');
      },
      error: erro => {
        this.salvandoCheckpoint = false;
        this.notificationService.error(mensagemDoErro(erro,
          'Não foi possível registrar o andamento. Confira se a data respeita a ordem das etapas.'));
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
      error: erro => {
        this.salvando = false;
        this.notificationService.error(mensagemDoErro(erro,
          'Não foi possível cadastrar. Confira se o número do processo já não está cadastrado, se as datas estão coerentes '
          + 'e se os riscos da contratação estão completos.'
        ));
      }
    });
  }

  /** Registro de uma contratação anterior ao regime (formulário curto). */
  criarAnterior(form: CtrProcessoForm): void {
    this.salvando = true;
    this.processoService.criar(form).subscribe({
      next: criado => {
        this.salvando = false;
        this.notificationService.success('Contratação anterior ao regime registrada.');
        this.router.navigate(['/analises/processos/editar', criado.Id]);
      },
      error: erro => {
        this.salvando = false;
        this.notificationService.error(mensagemDoErro(erro,
          'Não foi possível registrar. Confira se o número do processo já não está cadastrado e se as datas estão coerentes.'
        ));
      }
    });
  }

  /** "Cancelar" de um cadastro: volta à lista dele, com os filtros que estavam aplicados. */
  irParaLista(secao: string = SECAO_LISTA_SUPERVISAO): void {
    const lista = this.processoService.ultimaLista;
    this.router.navigate([`/analises/processos/${secao}`], {
      queryParams: lista?.secao === secao ? lista.params : {}
    });
  }

  readonly secaoListaAnteriores = SECAO_LISTA_ANTERIORES;
}
