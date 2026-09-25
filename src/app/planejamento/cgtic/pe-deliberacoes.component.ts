import { AfterViewChecked, Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { PeDecisaoForm, PeDeliberacao, PeObjetoDeliberacao, PeSituacaoDeliberacao } from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { mensagemErroDownload, salvarResposta } from '../shared/pe-download';
import { baixarPdfDoPdtic } from '../shared/pe-pdf-pdtic';
import {
  classeSituacaoDeliberacao, quandoEQuem, rotuloSituacaoDeliberacao, textoAto
} from '../shared/pe-referenciais-rotulos';
import { dataValida, hojeIso } from '../shared/registros/pe-valores';
import { PeDeliberacoesService } from '../services/pe-petic.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { PeRegistrosService } from '../services/pe-registros.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { BASE_PE } from '../trilha/pe-trilhas';

/** fila: o que chegou (passo 1.1 da Secretaria do CGTIC) · decisao: registrar (2.1) · historico: consultar (3.1). */
export type ModoDeliberacoes = 'fila' | 'decisao' | 'historico';

type Decisao = PeDecisaoForm['Decisao'];

interface FormDecisao {
  decisao: Decisao | '';
  atoTipo: string;
  atoNumero: string;
  atoData: string;
  sei: string;
  observacao: string;
  tentou: boolean;
}

type CampoDecisao = 'decisao' | 'atoNumero' | 'atoData' | 'observacao';

/** Tipos de ato do comitê (texto livre no servidor). */
export const TIPOS_ATO = ['Resolução', 'Ata de reunião', 'Deliberação', 'Outro ato'];

const LIMITES = { atoNumero: 50, sei: 50, observacao: 2000 } as const;

/** Página do histórico. */
const TAMANHO_PAGINA = 20;

/** A fila inteira numa página (volume pequeno: o PETIC-DF e os PDTICs dos órgãos enviados). */
const TAMANHO_FILA = 100;

const FILTROS: { valor: PeSituacaoDeliberacao | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'aguardando', rotulo: 'Aguardando a decisão' },
  { valor: 'aprovado', rotulo: 'Aprovadas' },
  { valor: 'devolvido', rotulo: 'Devolvidas' }
];

/** Filtro pelo que foi enviado (E7): os PDTICs dos órgãos e o PETIC-DF chegam na mesma fila. */
const TIPOS: { valor: PeObjetoDeliberacao | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Tudo' },
  { valor: 'pdtic', rotulo: 'PDTICs dos órgãos' },
  { valor: 'petic', rotulo: 'PETIC-DF' }
];

/**
 * Deliberações do CGTIC (Secretaria Executiva do comitê, art. 9º), uma tela por
 * passo da trilha da Secretaria (a rota diz o modo):
 *
 * - fila: o que foi enviado e espera a decisão (o PETIC-DF e, desde a E7, os
 *   PDTICs dos órgãos), da mais antiga para a mais nova, com o filtro pelo tipo, o
 *   link para ler o PETIC-DF e a planilha completa, ou, no PDTIC, o PDF enviado e a
 *   trilha do órgão.
 * - decisao: registrar a decisão tomada em reunião: aprovado, com o ato e a data,
 *   ou devolvido, com o que precisa ser ajustado (`?deliberacao=` abre uma). A
 *   confirmação é numa janela da `DialogoDirective` (não `confirm`).
 * - historico: todas, com filtro por situação e pelo tipo e "Carregar mais".
 *
 * Os papéis globais (administrador do módulo, SGDI e CGTIC) e o admin do SGDP
 * veem; decidir é da Secretaria do CGTIC e do admin do SGDP. Papel de órgão vê um
 * aviso e a tela não faz consulta (o 403 tiraria a pessoa do módulo).
 */
@Component({
  selector: 'app-pe-deliberacoes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective, DialogoDirective],
  templateUrl: './pe-deliberacoes.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeDeliberacoesComponent implements OnInit, AfterViewChecked {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly deliberacoesService = inject(PeDeliberacoesService);
  private readonly registrosService = inject(PeRegistrosService);
  private readonly pdticService = inject(PePdticService);
  private readonly notificacoes = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly tiposAto = TIPOS_ATO;
  readonly limites = LIMITES;
  readonly filtros = FILTROS;
  readonly tipos = TIPOS;
  readonly hoje = hojeIso();

  modo: ModoDeliberacoes = 'fila';
  /** Pode ver (papel global ou admin do SGDP); null enquanto o papel não chegou. */
  ve: boolean | null = null;
  podeDecidir = false;
  erroPapel = false;
  private iniciado = false;

  // Fila (fila e decisão)
  aguardando: PeDeliberacao[] = [];
  carregandoFila = false;
  erroFila: string | null = null;
  private escolhidaId: number | null = null;
  form: FormDecisao = this.formVazio();
  decidindo = false;
  /** A janela que confirma a decisão (no lugar do `confirm`). */
  janelaDecisao = false;
  /** Filtro da fila pelo tipo (feito aqui: a fila vem inteira). */
  tipoFila: PeObjetoDeliberacao | '' = '';
  /** A fila filtrada pelo tipo (refeita só quando a fila ou o filtro mudam). */
  filaVisivel: PeDeliberacao[] = [];

  // Histórico
  filtro: PeSituacaoDeliberacao | '' = '';
  /** Filtro do histórico pelo tipo (vai ao servidor, como a situação). */
  tipoHistorico: PeObjetoDeliberacao | '' = '';
  itens: PeDeliberacao[] = [];
  pagina = 0;
  total = 0;
  temMais = false;
  carregandoHistorico = false;
  erroHistorico: string | null = null;
  private cargaHistorico?: Subscription;

  baixando: number | null = null;
  /** A deliberação cujo PDF enviado está baixando (E7). */
  baixandoPdf: number | null = null;
  private focoPendente: string | null = null;

  ngOnInit(): void {
    const modo = this.rota.snapshot.data['modo'] as ModoDeliberacoes | undefined;
    this.modo = modo === 'decisao' || modo === 'historico' ? modo : 'fila';
    this.rota.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = Number(params.get('deliberacao'));
        const antes = this.escolhidaId;
        this.escolhidaId = Number.isInteger(id) && id > 0 ? id : null;
        if (this.escolhidaId !== antes) this.form = this.formVazio();
      });
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.ve = this.estadoService.veDeliberacoes;
        this.podeDecidir = this.estadoService.podeDeliberar === true;
        this.erroPapel = estado.consultaPapel === 'erro';
        if (this.ve && !this.iniciado) {
          this.iniciado = true;
          if (this.modo === 'historico') this.carregarHistorico(1);
          else this.carregarFila();
        }
      });
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  tentarPapelDeNovo(): void {
    this.estadoService.iniciar();
  }

  // ── Textos ────────────────────────────────────────────────────────────────

  rotuloSituacao(d: PeDeliberacao): string {
    return rotuloSituacaoDeliberacao(d.Situacao);
  }

  classeSituacao(d: PeDeliberacao): string {
    return classeSituacaoDeliberacao(d.Situacao);
  }

  enviado(d: PeDeliberacao): string {
    return quandoEQuem(d.EnviadoEm, d.EnviadoPor);
  }

  decidido(d: PeDeliberacao): string {
    return d.DecididoEm ? quandoEQuem(d.DecididoEm, d.DecididoPor) : '-';
  }

  ato(d: PeDeliberacao): string {
    return textoAto(d) || '-';
  }

  /** "PETIC-DF 1.0" ou "PDTIC SES 1.0". */
  objeto(d: PeDeliberacao): string {
    return d.Titulo || (d.ObjetoTipo === 'petic' ? `PETIC-DF ${d.VersaoObjeto}` : `PDTIC ${d.OrgaoSigla ?? ''} ${d.VersaoObjeto}`.trim());
  }

  ehPetic(d: PeDeliberacao): boolean {
    return d.ObjetoTipo === 'petic';
  }

  /** PDTIC com o PDF enviado (E7). */
  temPdf(d: PeDeliberacao): boolean {
    return d.ObjetoTipo === 'pdtic' && !!d.Documento && d.Documento.Numero > 0;
  }

  porId(_: number, d: PeDeliberacao): number {
    return d.Id;
  }

  // ── Fila ──────────────────────────────────────────────────────────────────

  carregarFila(): void {
    this.carregandoFila = true;
    this.erroFila = null;
    this.deliberacoesService.listar({ Situacao: 'aguardando', Page: 1, PageSize: TAMANHO_FILA }).subscribe({
      next: pagina => {
        this.carregandoFila = false;
        this.aguardando = pagina.Items.filter(d => d.Situacao === 'aguardando');
        this.filtrarFila();
      },
      error: erro => {
        this.carregandoFila = false;
        this.erroFila = mensagemErroPe(erro, 'Não foi possível carregar o que chegou para o comitê.');
      }
    });
  }

  /** Quantos esperam a decisão, por tipo (os botões do filtro dizem). */
  contagemTipo(tipo: PeObjetoDeliberacao | ''): number {
    return tipo ? this.aguardando.filter(d => d.ObjetoTipo === tipo).length : this.aguardando.length;
  }

  filtrarTipoFila(tipo: PeObjetoDeliberacao | ''): void {
    this.tipoFila = tipo;
    this.filtrarFila();
  }

  private filtrarFila(): void {
    const tipo = this.tipoFila;
    this.filaVisivel = tipo ? this.aguardando.filter(d => d.ObjetoTipo === tipo) : [...this.aguardando];
  }

  /** O PDF enviado com o PDTIC (a versão do documento guardada no envio). */
  baixarPdf(d: PeDeliberacao): void {
    const doc = d.Documento;
    if (!doc || this.baixandoPdf !== null) return;
    this.baixandoPdf = d.Id;
    const pdf = { pdticId: doc.PdticId || d.ObjetoId, numero: doc.Numero, sigla: d.OrgaoSigla ?? '', versao: d.VersaoObjeto };
    baixarPdfDoPdtic(this.pdticService, pdf).then(mensagem => {
      this.baixandoPdf = null;
      if (mensagem) this.notificacoes.error(mensagem);
    });
  }

  /**
   * Abre a trilha do órgão do PDTIC enviado (só para ler), na visão geral. O PDTIC
   * vem antes, para saber o órgão (a deliberação traz só a sigla).
   */
  abrirTrilha(d: PeDeliberacao): void {
    if (d.ObjetoTipo !== 'pdtic') return;
    this.pdticService.obter(d.ObjetoId).subscribe({
      next: pdtic => {
        this.estadoService.verOrgao(pdtic.OrgaoId);
        this.router.navigate([BASE_PE]);
      },
      error: erro => {
        const mensagem = mensagemErroPe(erro, 'Não foi possível abrir a trilha do órgão. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  /** A deliberação aberta para decidir (`?deliberacao=`), se ainda está na fila. */
  get escolhida(): PeDeliberacao | null {
    return this.aguardando.find(d => d.Id === this.escolhidaId) ?? null;
  }

  /** Pediu uma deliberação que não está (mais) na fila. */
  get escolhidaSumiu(): boolean {
    return this.escolhidaId !== null && !this.carregandoFila && !this.erroFila && !this.escolhida;
  }

  registrar(d: PeDeliberacao): void {
    this.router.navigate(['/planejamento/cgtic/deliberacao'], { queryParams: { deliberacao: d.Id } });
  }

  voltarParaFila(): void {
    this.router.navigate([], { relativeTo: this.rota, queryParams: { deliberacao: null }, queryParamsHandling: 'merge' });
  }

  // ── Decisão ───────────────────────────────────────────────────────────────

  private formVazio(): FormDecisao {
    return { decisao: '', atoTipo: TIPOS_ATO[0], atoNumero: '', atoData: '', sei: '', observacao: '', tentou: false };
  }

  get aprovar(): boolean {
    return this.form.decisao === 'aprovado';
  }

  get devolver(): boolean {
    return this.form.decisao === 'devolvido';
  }

  erroDe(campo: CampoDecisao): string | null {
    const f = this.form;
    if (!f.tentou) return null;
    switch (campo) {
      case 'decisao':
        return f.decisao ? null : 'Escolha a decisão do comitê.';
      case 'atoNumero':
        return this.aprovar && !f.atoNumero.trim() ? 'Informe o número do ato que aprovou.' : null;
      case 'atoData':
        if (!f.atoData) return this.aprovar ? 'Informe a data do ato.' : null;
        if (!dataValida(f.atoData)) return 'Informe uma data válida (dia, mês e ano).';
        return f.atoData > this.hoje ? 'A data do ato não pode ser depois de hoje.' : null;
      case 'observacao':
        return this.devolver && !f.observacao.trim() ? 'Diga o que precisa ser ajustado.' : null;
    }
  }

  get errosForm(): { campo: CampoDecisao; mensagem: string }[] {
    return (['decisao', 'atoNumero', 'atoData', 'observacao'] as CampoDecisao[])
      .map(campo => ({ campo, mensagem: this.erroDe(campo) ?? '' }))
      .filter(e => !!e.mensagem);
  }

  focarCampo(campo: CampoDecisao): void {
    this.focoPendente = campo === 'decisao' ? 'pe-dec-decisao' : `pe-dec-${campo === 'atoNumero' ? 'numero' : campo === 'atoData' ? 'data' : 'observacao'}`;
  }

  descritores(campo: CampoDecisao, ajuda?: string): string | null {
    const ids = [ajuda, this.erroDe(campo) ? `pe-dec-${campo}-erro` : null].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  /** Confere o formulário e abre a janela que confirma a decisão (a decisão registrada não muda depois). */
  decidir(): void {
    const d = this.escolhida;
    if (!d || !this.podeDecidir || this.decidindo) return;
    this.form.tentou = true;
    if (this.errosForm.length) {
      this.focoPendente = 'pe-dec-erros';
      return;
    }
    this.janelaDecisao = true;
  }

  fecharJanelaDecisao(): void {
    if (!this.decidindo) this.janelaDecisao = false;
  }

  /** "Aprovou" ou "devolveu", para o título da janela. */
  get verboDecisao(): string {
    return this.form.decisao === 'aprovado' ? 'aprovou' : 'devolveu para ajustes';
  }

  confirmarDecisao(): void {
    const d = this.escolhida;
    if (!d || !this.podeDecidir || this.decidindo || this.errosForm.length) return;
    const f = this.form;
    const texto = (v: string) => v.trim() || null;
    const decisao = f.decisao as Decisao;
    const corpo: PeDecisaoForm = {
      Decisao: decisao,
      AtoTipo: (f.atoNumero.trim() || f.atoData) ? f.atoTipo : null,
      AtoNumero: texto(f.atoNumero),
      AtoData: f.atoData || null,
      Sei: texto(f.sei),
      Observacao: texto(f.observacao)
    };
    const resumo = decisao === 'aprovado' ? 'aprovado' : 'devolvido para ajustes';
    this.decidindo = true;
    this.deliberacoesService.decidir(d.Id, corpo).subscribe({
      next: () => {
        this.decidindo = false;
        this.janelaDecisao = false;
        const efeito = decisao === 'aprovado'
          ? (this.ehPetic(d) ? ' A versão passou a ser a vigente.' : ' O órgão já pode registrar a publicação.')
          : (this.ehPetic(d)
            ? ' A versão voltou a rascunho para o administrador do módulo ajustar.'
            : ' O PDTIC voltou ao órgão para ajustar e enviar de novo.');
        // O toast fica numa região lida pelo leitor de tela: um aviso só
        this.notificacoes.success(`Decisão registrada: ${this.objeto(d)} ${resumo}.${efeito}`);
        this.aguardando = this.aguardando.filter(x => x.Id !== d.Id);
        this.filtrarFila();
        this.estadoService.atualizarStatus(true);
        this.voltarParaFila();
        this.focoPendente = 'pe-dec-fila';
      },
      error: erro => {
        this.decidindo = false;
        this.janelaDecisao = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível registrar a decisão. Confira os dados e tente de novo.');
        if (!mensagem) return;
        this.notificacoes.error(mensagem);
        // 409: já decidida por outra pessoa; a fila vem de novo
        if ((erro as { status?: number } | null)?.status === 409) this.carregarFila();
      }
    });
  }

  // ── Histórico ─────────────────────────────────────────────────────────────

  filtrar(valor: PeSituacaoDeliberacao | ''): void {
    if (valor === this.filtro && this.pagina > 0) return;
    this.filtro = valor;
    this.carregarHistorico(1);
  }

  filtrarTipoHistorico(valor: PeObjetoDeliberacao | ''): void {
    if (valor === this.tipoHistorico && this.pagina > 0) return;
    this.tipoHistorico = valor;
    this.carregarHistorico(1);
  }

  carregarMais(): void {
    if (!this.carregandoHistorico) this.carregarHistorico(this.pagina + 1);
  }

  carregarHistorico(pagina: number): void {
    this.cargaHistorico?.unsubscribe();
    this.carregandoHistorico = true;
    this.erroHistorico = null;
    if (pagina === 1) this.itens = [];
    this.cargaHistorico = this.deliberacoesService.listar({
      Situacao: this.filtro || null, ObjetoTipo: this.tipoHistorico || null, Page: pagina, PageSize: TAMANHO_PAGINA
    }).subscribe({
      next: resposta => {
        this.carregandoHistorico = false;
        this.itens = pagina === 1 ? resposta.Items : [...this.itens, ...resposta.Items];
        this.pagina = resposta.CurrentPage || pagina;
        this.total = resposta.TotalItems ?? this.itens.length;
        this.temMais = resposta.HasNextPage;
      },
      error: erro => {
        this.carregandoHistorico = false;
        this.erroHistorico = mensagemErroPe(erro, 'Não foi possível carregar o histórico das deliberações.');
      }
    });
  }

  get contagemHistorico(): string {
    if (this.total === 0) return 'Nenhuma deliberação.';
    const mostradas = this.itens.length;
    const base = this.total === 1 ? '1 deliberação' : `${this.total} deliberações`;
    return mostradas < this.total ? `${base}; mostrando ${mostradas}.` : `${base}.`;
  }

  // ── Planilha do que foi enviado ───────────────────────────────────────────

  baixarPlanilha(d: PeDeliberacao): void {
    if (!this.ehPetic(d) || this.baixando !== null) return;
    this.baixando = d.Id;
    this.registrosService.planilhaCompleta({ tipo: 'petic', id: d.ObjetoId }).subscribe({
      next: resposta => {
        this.baixando = null;
        salvarResposta(resposta, `PETIC-DF_${d.VersaoObjeto}.xlsx`);
      },
      error: erro => {
        this.baixando = null;
        mensagemErroDownload(erro, 'Não foi possível gerar a planilha. Tente de novo.').then(m => {
          if (m) this.notificacoes.error(m);
        });
      }
    });
  }
}
