import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import {
  PeCampoTrilha, PeNaoSeAplica, PePassoTrilha, PePdtic, PeSecaoTrilha, PeSituacaoPassoPdtic
} from '../../../api/planejamento/interface';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { NotificationService } from '../../core/services/notification.service';
import { PapeisPlanejamento } from '../../core/acessos/papeis-planejamento';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { NomesDoModelo, citacaoTravado, descricaoCampo, rotuloTipoPasso } from '../shared/pe-modelo-rotulos';
import {
  TIPOS_PASSO_COM_TELA, aceitaNaoSeAplica, ehPassoSistemasIa, itemDaSecaoPdtic, pdticEmEdicao, rotuloSituacaoPdtic,
  statusDoPassoPdtic
} from '../shared/pe-pdtic-rotulos';
import { PeSecaoRegistrosComponent } from '../shared/registros/pe-secao-registros.component';
import { PeFonteRegistros, PeRegistrosService } from '../services/pe-registros.service';
import { CargaPdticPe, PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { StatusPassoPe } from '../trilha/pe-trilha-status.service';
import { BASE_PE, PassoNumeradoPe, TITULO_PASSO_GENERICO, passoDaUrl, rotuloGuia } from '../trilha/pe-trilhas';
import { PeComentariosPassoComponent } from './pe-comentarios-passo.component';
import { PeNaoSeAplicaComponent } from './pe-nao-se-aplica.component';
import { PeSistemasIaPgiaComponent } from './pe-sistemas-ia-pgia.component';
import { PeTemasAcoesComponent } from './pe-temas-acoes.component';

/**
 * Tela de um passo da trilha do órgão (/planejamento/pdtic/{chave}), lida da
 * trilha resolvida pelo back-end (nível do órgão e ajustes) e do PDTIC atual.
 *
 * - Passo de dados (e o de conferência dos temas): as seções do passo com os
 *   componentes genéricos de registros (formulário ou tabela), com a fonte do
 *   PDTIC (`pdtic/{id}`), os obrigatórios marcados e os botões de planilha da
 *   seção. A situação do passo e os avisos do guia vêm do servidor.
 * - "Não se aplica" com a justificativa, só onde o passo aceita (opcional no
 *   nível do órgão, não travado), e os comentários do passo (a SGDI comenta; a
 *   equipe do órgão responde e resolve).
 * - Passo dos sistemas de IA (inciso VIII): o inventário do PGIA antes das seções.
 *   Passo de conferência dos temas (V, VI e IX): as ações por tema antes da seção
 *   das justificativas.
 * - Sem PDTIC aberto: a prévia do que o passo pede e, para a equipe do órgão,
 *   "Começar o PDTIC". Os demais tipos de passo seguem "em construção".
 *
 * Quem não edita lê (consulta do órgão, papéis globais, PDTIC fora de elaboração):
 * quem decide é o `PodeEditar` do servidor, e a tela explica o porquê.
 * A mesma instância serve a todos os passos (a rota tem parâmetro). Passo que não
 * está na trilha à vista volta para a visão geral.
 */
@Component({
  selector: 'app-pe-passo-orgao',
  standalone: true,
  imports: [
    CommonModule, RouterModule, CitaPlanejamentoDirective, PeSecaoRegistrosComponent, PeNaoSeAplicaComponent,
    PeComentariosPassoComponent, PeSistemasIaPgiaComponent, PeTemasAcoesComponent
  ],
  templateUrl: './pe-passo-orgao.component.html'
})
export class PePassoOrgaoComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly titulo = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly registrosService = inject(PeRegistrosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);

  readonly base = BASE_PE;

  numerado: PassoNumeradoPe | null = null;
  passo: PePassoTrilha | null = null;
  siglaOrgao = '';
  nomeNivel = '';

  pdtic: PePdtic | null = null;
  cargaPdtic: CargaPdticPe | null = null;
  erroPdtic: string | null = null;
  andamento: PeSituacaoPassoPdtic | null = null;
  status: StatusPassoPe | null = null;
  fonte: PeFonteRegistros | null = null;
  /** O passo onde ficam as ações (link da conferência dos temas). */
  passoAcoes: { numero: string; rota: string; titulo: string } | null = null;
  /** Muda para os temas virem de novo (a justificativa foi salva). */
  recargaTemas = 0;
  abrindo = false;

  private chaveFonte = '';
  private chavePasso = '';
  /** Seções com mudança não salva (pela chave). */
  private sujas = new Set<string>();
  /** Uma mudança foi salva: a próxima situação que chegar é comparada com a de antes. */
  private esperandoSituacao = false;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ler());
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ler());
  }

  // ── Tipo do passo ─────────────────────────────────────────────────────────

  /** O passo tem tela nesta entrega (dados e conferência dos temas). */
  get temTela(): boolean {
    return !!this.passo && TIPOS_PASSO_COM_TELA.has(this.passo.Tipo);
  }

  get passoIa(): boolean {
    return ehPassoSistemasIa(this.passo);
  }

  get passoTemas(): boolean {
    return this.passo?.Tipo === 'conferencia_temas';
  }

  get rotuloTipo(): string {
    return rotuloTipoPasso(this.passo?.Tipo);
  }

  get citacaoTravado(): string {
    return citacaoTravado(this.passo?.IncisoDecreto);
  }

  get guia(): string {
    return rotuloGuia(this.passo?.ReferenciaGuia ?? undefined);
  }

  /** O bloco do "não se aplica": passo opcional no nível do órgão que aceita (travado nunca). */
  get aceitaNsa(): boolean {
    return aceitaNaoSeAplica(this.passo);
  }

  get naoSeAplica(): PeNaoSeAplica | null {
    return this.andamento?.NaoSeAplica ?? null;
  }

  get avisos(): string[] {
    return this.andamento?.Avisos ?? [];
  }

  // ── Quem faz o quê ────────────────────────────────────────────────────────

  get podeAbrirPdtic(): boolean {
    return this.estadoService.podeAbrirPdtic;
  }

  get podeComentar(): boolean {
    return this.estadoService.podeComentarPdtic;
  }

  get podeResponder(): boolean {
    return this.estadoService.podeResponderComentario;
  }

  get email(): string | null {
    return this.estadoService.emailUsuario;
  }

  get podeEditar(): boolean {
    return !!this.pdtic?.PodeEditar;
  }

  /** Por que a pessoa só lê este PDTIC (aparece em cada seção e no alto da tela). */
  get avisoLeitura(): string {
    const estado = this.estadoService.atual;
    const pdtic = this.pdtic;
    if (estado?.orgaoVisto !== null) {
      return `Você está lendo o PDTIC do órgão ${this.siglaOrgao}. Quem preenche é a equipe do órgão.`;
    }
    if (estado?.meuPapel?.Papel === PapeisPlanejamento.OrgaoConsulta) {
      return 'O seu papel é de consulta: você lê o PDTIC e baixa as planilhas. Quem preenche é a equipe do órgão.';
    }
    if (pdtic && !pdticEmEdicao(pdtic.Situacao)) {
      return `O PDTIC está "${rotuloSituacaoPdtic(pdtic.Situacao).toLowerCase()}": só muda em elaboração ou quando o CGTIC devolve.`;
    }
    return 'Você pode consultar e baixar as planilhas. Quem preenche é a equipe do órgão.';
  }

  /** Quem vê o órgão sem PDTIC e não pode abrir: o motivo. */
  get quemAbre(): string {
    if (this.estadoService.atual?.orgaoVisto !== null) return 'Quem começa o PDTIC é a equipe do órgão.';
    return 'Quem começa o PDTIC é a equipe do órgão. O seu papel de consulta só lê.';
  }

  // ── Seções ────────────────────────────────────────────────────────────────

  nomePlanilha(secao: PeSecaoTrilha): string {
    return `PDTIC_${this.siglaOrgao || 'orgao'}_${secao.Chave}`;
  }

  rotuloItem(secao: PeSecaoTrilha): string {
    return itemDaSecaoPdtic(secao.Chave);
  }

  obrigatorios(secao: PeSecaoTrilha): number {
    return secao.Campos.filter(c => c.Obrigatorio).length;
  }

  descricao(campo: PeCampoTrilha, secao: PeSecaoTrilha): string {
    return descricaoCampo(campo, this.nomes(secao));
  }

  porId(_: number, item: { Id: number }): number {
    return item.Id;
  }

  aoAlterar(secao: PeSecaoTrilha, sujo: boolean): void {
    if (sujo) this.sujas.add(secao.Chave);
    else this.sujas.delete(secao.Chave);
  }

  /** Uma seção mudou: a situação do passo (e a da trilha) vem de novo. */
  aoMudarSecao(secao: PeSecaoTrilha): void {
    if (this.passoTemas && secao.Chave === 'temas_sem_acao') this.recargaTemas++;
    this.aoMudarSituacao();
  }

  /** "Não se aplica", comentário ou registro: busca a situação de novo. */
  aoMudarSituacao(): void {
    this.esperandoSituacao = true;
    this.estadoService.atualizarStatus(true);
  }

  /** Guarda de rota: mudança não salva numa seção do passo. */
  podeSair(): boolean {
    if (this.sujas.size === 0) return true;
    const sair = confirm('Há mudanças que ainda não foram salvas neste passo. Sair assim mesmo? Elas vão se perder.');
    if (sair) this.sujas.clear();
    return sair;
  }

  // ── PDTIC ─────────────────────────────────────────────────────────────────

  abrirPdtic(): void {
    if (this.abrindo || !this.podeAbrirPdtic) return;
    this.abrindo = true;
    this.estadoService.abrirPdtic().subscribe({
      next: pdtic => {
        this.abrindo = false;
        this.notificacoes.success(`PDTIC ${pdtic.Versao} aberto. Já dá para preencher este passo.`);
        this.acessibilidade.anunciar(`PDTIC ${pdtic.Versao} aberto.`);
      },
      error: erro => {
        this.abrindo = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível começar o PDTIC. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
        if ((erro as { status?: number } | null)?.status === 409) this.estadoService.recarregarPdtic();
      }
    });
  }

  tentarPdticDeNovo(): void {
    this.estadoService.recarregarPdtic();
  }

  // ── Leitura do estado ─────────────────────────────────────────────────────

  /** Nomes das seções ligadas e dos campos do cálculo, procurados na trilha do órgão (prévia sem PDTIC). */
  private nomes(secao: PeSecaoTrilha): NomesDoModelo {
    const trilha = this.estadoService.atual?.trilhaOrgao;
    const secoes = trilha?.Etapas.flatMap(e => e.Passos.flatMap(p => p.Secoes)) ?? [];
    return {
      secao: chave => secoes.find(s => s.Chave === chave)?.Titulo ?? null,
      campo: chave => secao.Campos.find(c => c.Chave === chave)?.Rotulo
        ?? secoes.flatMap(s => s.Campos).find(c => c.Chave === chave)?.Rotulo ?? null
    };
  }

  private ler(): void {
    const estado = this.estadoService.atual;
    // Trocando de trilha: a moldura tira a tela do ar; nada a fazer aqui
    if (!estado || estado.carga !== 'pronta') return;

    this.numerado = passoDaUrl(estado.passos, this.router.url);
    this.passo = this.numerado?.doOrgao ?? null;
    this.siglaOrgao = estado.trilhaOrgao?.OrgaoSigla ?? '';
    this.nomeNivel = estado.trilhaOrgao?.NivelNome ?? '';

    if (!this.passo) {
      // Passo que não está nesta trilha: volta para a visão geral
      this.router.navigate([BASE_PE], { replaceUrl: true });
      return;
    }
    if (this.passo.Chave !== this.chavePasso) {
      // Outro passo: as mudanças pendentes do anterior já passaram pela guarda de rota
      this.chavePasso = this.passo.Chave;
      this.sujas.clear();
      this.esperandoSituacao = false;
      this.status = null;
    }

    this.pdtic = estado.pdtic;
    this.cargaPdtic = estado.cargaPdtic;
    this.erroPdtic = estado.erroPdtic;
    this.atualizarFonte();
    this.lerSituacao();
    this.passoAcoes = this.acharPassoAcoes();

    // Entrada direta pelo endereço: a aba nasceu com o título genérico
    const atual = this.titulo.getTitle();
    if (atual.startsWith(TITULO_PASSO_GENERICO)) {
      this.titulo.setTitle(this.passo.Titulo + atual.slice(TITULO_PASSO_GENERICO.length));
    }
  }

  /** A fonte dos registros do PDTIC; a situação e o `PodeEditar` entram na chave (mudou, as seções buscam de novo). */
  private atualizarFonte(): void {
    const p = this.pdtic;
    const chave = p ? `${p.Id}:${p.Situacao}:${p.PodeEditar}` : '';
    if (chave === this.chaveFonte) return;
    this.chaveFonte = chave;
    this.fonte = p ? this.registrosService.fonte({ tipo: 'pdtic', id: p.Id }, `${p.Situacao}:${p.PodeEditar}`) : null;
  }

  /**
   * A situação deste passo. Depois de uma mudança salva, quando o passo fica
   * feito, a tela avisa em linguagem simples (e o leitor de tela ouve).
   */
  private lerSituacao(): void {
    const passo = this.passo;
    if (!passo) return;
    const andamento = this.estadoService.andamentoDoPasso(passo.Chave);
    if (andamento === this.andamento) return;
    const antes = this.status;
    this.andamento = andamento;
    this.status = andamento ? statusDoPassoPdtic(andamento) : null;
    if (this.esperandoSituacao && andamento) {
      this.esperandoSituacao = false;
      if (this.status?.estado === 'feito' && antes?.estado !== 'feito') {
        const texto = `Passo ${passo.Numero} feito: as seções obrigatórias estão preenchidas.`;
        this.notificacoes.success(texto);
        this.acessibilidade.anunciar(texto);
      }
    }
  }

  /** O passo da trilha com a seção das ações (o link da conferência dos temas). */
  private acharPassoAcoes(): { numero: string; rota: string; titulo: string } | null {
    if (!this.passoTemas) return null;
    const achado = this.estadoService.atual?.passos.find(p => p.doOrgao?.Secoes.some(s => s.Chave === 'acoes'));
    return achado ? { numero: achado.numero, rota: achado.rota, titulo: achado.titulo } : null;
  }
}
