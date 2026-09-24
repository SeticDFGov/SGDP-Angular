import { AfterViewChecked, Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import {
  PeCampoTrilha, PeNaoSeAplica, PePassoTrilha, PePdtic, PeRegistro, PeSecaoTrilha, PeSituacaoPassoPdtic
} from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PapeisPlanejamento } from '../../core/acessos/papeis-planejamento';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { NomesDoModelo, citacaoTravado, descricaoCampo, rotuloTipoPasso } from '../shared/pe-modelo-rotulos';
import {
  GrupoPassoPdtic, SECAO_APROVACAO_AUTORIDADE, SECAO_AVALIACAO_COMITE, SECAO_CRONOGRAMA, SECAO_PUBLICACAO,
  TIPOS_PASSO_COM_SECOES, TIPOS_PASSO_COM_TELA, aceitaNaoSeAplica, classeEstadoPasso, ehPassoSistemasIa, grupoDoPasso,
  iconeEstadoPasso, itemDaSecaoPdtic, motivoLeituraDoPasso, passoTemFluxos, pdticAntesDaPublicacao, pdticVigente, statusDoPassoPdtic,
  textoDoStatus
} from '../shared/pe-pdtic-rotulos';
import { PeSecaoRegistrosComponent } from '../shared/registros/pe-secao-registros.component';
import { PeFonteRegistros, PeRegistrosService } from '../services/pe-registros.service';
import { PeFluxosService, PeFonteFluxos } from '../services/pe-fluxos.service';
import { PeFluxoEditorComponent } from '../fluxos/pe-fluxo-editor.component';
import { CargaPdticPe, PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { StatusPassoPe } from '../trilha/pe-trilha-status.service';
import { BASE_PE, PassoNumeradoPe, TITULO_PASSO_GENERICO, passoDaUrl, rotuloGuia } from '../trilha/pe-trilhas';
import { PeDocumentoPreviaComponent } from '../documento/pe-documento-previa.component';
import { PeAcaoPdticComponent } from './pe-acao-pdtic.component';
import { PeComentariosPassoComponent } from './pe-comentarios-passo.component';
import { PeNaoSeAplicaComponent } from './pe-nao-se-aplica.component';
import { PePassoDeliberacaoComponent } from './pe-passo-deliberacao.component';
import { PePassoEnvioComponent } from './pe-passo-envio.component';
import { PePassoPublicacaoComponent } from './pe-passo-publicacao.component';
import { PeSistemasIaPgiaComponent } from './pe-sistemas-ia-pgia.component';
import { PeSugerirCronogramaComponent } from './pe-sugerir-cronograma.component';
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
 * - Passo do documento (E5): a prévia editável do documento do PDTIC, o PDF e
 *   as versões (`pe-documento-previa`, num pacote próprio que só carrega neste
 *   passo, pelo `@defer`).
 * - Passo da metodologia (ou passo do tipo fluxo, E6): o editor guiado dos
 *   fluxos do órgão, depois das seções, também num pacote próprio pelo `@defer`.
 *   Na seção do cronograma do plano de trabalho, enquanto ela está vazia, o
 *   "Sugerir o cronograma pelos fluxos".
 *
 * - Caminho da aprovação (E7): no passo de aprovação, a seção da decisão com o que
 *   registrar e, na avaliação do comitê (6.3) com a decisão "revisar", "Abrir a
 *   revisão do PDTIC"; na aprovação da autoridade máxima (7.4) com "aprovado",
 *   "Encerrar o PDTIC". No passo do envio, a aprovação do SGTIC e o envio ao CGTIC
 *   (`pe-passo-envio`); no da deliberação, a decisão do comitê
 *   (`pe-passo-deliberacao`); no da publicação, a seção e "Registrar a
 *   publicação" (`pe-passo-publicacao`). Os passos aguardando e os feitos fora do
 *   sistema dizem o porquê no alto.
 *
 * Quem não edita lê (consulta do órgão, papéis globais, PDTIC fora de elaboração):
 * quem decide é o `PodeEditar` do servidor (desde a E7, o do passo), e a tela
 * explica o porquê pela situação do PDTIC e pela etapa do passo. Nenhum botão de
 * gravar aparece sem ele. A mesma instância serve a todos os passos (a rota tem
 * parâmetro). Passo que não está na trilha à vista volta para a visão geral.
 */
@Component({
  selector: 'app-pe-passo-orgao',
  standalone: true,
  imports: [
    CommonModule, RouterModule, CitaPlanejamentoDirective, PeSecaoRegistrosComponent, PeNaoSeAplicaComponent,
    PeComentariosPassoComponent, PeSistemasIaPgiaComponent, PeTemasAcoesComponent, PeDocumentoPreviaComponent,
    PeFluxoEditorComponent, PeSugerirCronogramaComponent, PePassoEnvioComponent, PePassoDeliberacaoComponent,
    PePassoPublicacaoComponent, PeAcaoPdticComponent
  ],
  templateUrl: './pe-passo-orgao.component.html'
})
export class PePassoOrgaoComponent implements OnInit, AfterViewChecked {
  private readonly router = inject(Router);
  private readonly titulo = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly registrosService = inject(PeRegistrosService);
  private readonly fluxosService = inject(PeFluxosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

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
  /** Os fluxos do órgão para o editor (E6): a cópia do órgão neste PDTIC. */
  fonteFluxos: PeFonteFluxos | null = null;
  /** O passo onde o órgão adapta os fluxos (link da sugestão do cronograma). */
  passoFluxos: { numero: string; rota: string } | null = null;
  /** Recarga de cada seção (pela chave): a sugestão do cronograma cria registros por fora. */
  private readonly recargas = new Map<string, number>();
  /** E7: a decisão gravada em cada seção de aprovação do passo (pela chave da seção). */
  decisoes: Record<string, string | null> = {};
  /** E7: muda quando a aprovação do SGTIC é salva (o envio confere de novo o que falta). */
  recargaEnvio = 0;
  /** Onde o passo fica no caminho do PDTIC (elaboração, deliberação, publicação ou acompanhamento). */
  private grupo: GrupoPassoPdtic = 'elaboracao';

  private chaveFonte = '';
  private chavePasso = '';
  /** Seções com mudança não salva (pela chave). */
  private sujas = new Set<string>();
  /** Texto do documento mudado e ainda não salvo (passo do documento). */
  private documentoSujo = false;
  /** Fluxo mudado e ainda não salvo (passo da metodologia). */
  private fluxosSujos = false;
  private focoPendente: string | null = null;
  /**
   * A seção que recebe o foco no título quando terminar de carregar de novo (a
   * sugestão do cronograma): o título é recriado na recarga, e o foco dado antes
   * ficaria num elemento que sai da tela.
   */
  private focarSecaoAoCarregar: string | null = null;
  /** Uma mudança foi salva: a próxima situação que chegar é comparada com a de antes. */
  private esperandoSituacao = false;
  private destruida = false;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.destruida = true);
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ler());
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.ler();
        // A estratégia de títulos roda depois do NavigationEnd e, numa navegação que só muda a query
        // (?fluxo=...), aplica de novo o título que a rota resolveu na entrada, quando a trilha ainda
        // não tinha chegado ("Passo do PDTIC"): o título do passo volta depois dela
        if (this.noNavegador) setTimeout(() => this.corrigirTitulo());
      });
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  // ── Tipo do passo ─────────────────────────────────────────────────────────

  /** O passo tem tela (dados, conferência dos temas, documento, fluxo e, desde a E7, o caminho da aprovação). */
  get temTela(): boolean {
    return !!this.passo && TIPOS_PASSO_COM_TELA.has(this.passo.Tipo);
  }

  /** O passo tem seções de dados (os componentes genéricos de registros): dados, temas, aprovação, envio e publicação. */
  get temSecoes(): boolean {
    return !!this.passo && TIPOS_PASSO_COM_SECOES.has(this.passo.Tipo);
  }

  /** E7: registro de uma aprovação (1.10, 2.12, 4.6, 6.3, 7.3 e 7.4 no Avançado). */
  get passoAprovacao(): boolean {
    return this.passo?.Tipo === 'aprovacao';
  }

  /** E7: aprovação do SGTIC e envio ao CGTIC (3.11). */
  get passoEnvio(): boolean {
    return this.passo?.Tipo === 'envio';
  }

  /** E7: deliberação do CGTIC (3.12), só leitura. */
  get passoDeliberacao(): boolean {
    return this.passo?.Tipo === 'deliberacao';
  }

  /** E7: publicação (3.13). */
  get passoPublicacao(): boolean {
    return this.passo?.Tipo === 'publicacao';
  }

  /** A seção da publicação no passo (o 400 do "Registrar a publicação" cita os campos dela). */
  get secaoPublicacao(): PeSecaoTrilha | null {
    return this.passo?.Secoes.find(s => s.Chave === SECAO_PUBLICACAO) ?? null;
  }

  /**
   * E7: quem está logado grava neste passo agora: o `PodeEditar` do passo (pela
   * situação do PDTIC e pela etapa do passo). Sem a situação ainda, nada de
   * gravar; a resposta antiga (sem o campo) vale pelo `PodeEditar` do PDTIC.
   */
  get podeEditarPasso(): boolean {
    const a = this.andamento;
    if (!a) return false;
    return typeof a.PodeEditar === 'boolean' ? a.PodeEditar : !!this.pdtic?.PodeEditar;
  }

  /** Há mudança não salva numa seção do passo (o envio e a publicação esperam). */
  get mudancaPendente(): boolean {
    return this.sujas.size > 0;
  }

  /** O porquê de aguardando, atrasado e feito fora do sistema, no alto do passo. */
  get motivoStatus(): string {
    return this.status?.motivo ? textoDoStatus(this.status) : '';
  }

  classeStatus(estado: string): string {
    return classeEstadoPasso(estado);
  }

  iconeStatus(estado: string): string {
    return iconeEstadoPasso(estado);
  }

  // ── Revisão (6.3) e encerramento (7.4) ────────────────────────────────────

  /**
   * "Abrir a revisão do PDTIC": na avaliação do comitê com a decisão "revisar", para
   * a equipe do órgão, na versão vigente, sem outra versão já em revisão.
   */
  get mostraRevisao(): boolean {
    const p = this.pdtic;
    if (!p || !this.estadoService.ehEquipeDoOrgao || !pdticVigente(p.Situacao)) return false;
    if (this.decisoes[SECAO_AVALIACAO_COMITE] !== 'revisar') return false;
    const versoes = this.estadoService.atual?.versoes ?? [];
    return !versoes.some(v => v.Id !== p.Id && pdticAntesDaPublicacao(v.Situacao));
  }

  /** "Encerrar o PDTIC": na aprovação da autoridade máxima (7.4) com a decisão "aprovado", para a equipe do órgão. */
  get mostraEncerrar(): boolean {
    const p = this.pdtic;
    return !!p && this.estadoService.ehEquipeDoOrgao && pdticVigente(p.Situacao)
      && this.decisoes[SECAO_APROVACAO_AUTORIDADE] === 'aprovado';
  }

  /** Passo do documento: a prévia editável, o PDF e as versões. */
  get passoDocumento(): boolean {
    return this.passo?.Tipo === 'documento';
  }

  get passoIa(): boolean {
    return ehPassoSistemasIa(this.passo);
  }

  get passoTemas(): boolean {
    return this.passo?.Tipo === 'conferencia_temas';
  }

  /** O passo mostra o editor dos fluxos do órgão (o da metodologia ou um passo do tipo fluxo). */
  get temFluxos(): boolean {
    return passoTemFluxos(this.passo);
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

  /** E7: o órgão sem PDTIC pode registrar um aprovado fora do sistema (na visão geral). */
  get podeRegistrarExterno(): boolean {
    return this.estadoService.podeRegistrarExterno;
  }

  /** Como o passo fica feito, para quem preenche. */
  get textoPreencher(): string {
    if (this.passoEnvio) {
      return 'Registre a aprovação do SGTIC abaixo e salve. Depois, envie ao CGTIC no bloco "Envio ao CGTIC", logo depois dela: o '
        + 'passo fica feito com o envio. Os campos com asterisco são obrigatórios.';
    }
    if (this.passoPublicacao) {
      return 'Preencha a publicação abaixo e salve. Depois, use "Registrar a publicação", no bloco logo depois dela: o passo fica '
        + 'feito com o registro. Os campos com asterisco são obrigatórios.';
    }
    return 'Preencha as seções abaixo e salve cada uma. O passo fica feito quando as seções obrigatórias estão preenchidas; os campos '
      + 'com asterisco são obrigatórios.';
  }

  /** O que registrar num passo de aprovação (a avaliação do comitê decide entre seguir e revisar). */
  get textoAprovacao(): string {
    if (this.passo?.Secoes.some(s => s.Chave === SECAO_AVALIACAO_COMITE)) {
      return 'Registre a decisão do comitê como foi tomada: seguir com o PDTIC como está ou revisar, com a data, o ato e o processo SEI, '
        + 'e anexe o documento, se houver. A decisão "revisar" deixa a equipe abrir a revisão do PDTIC, numa versão nova.';
    }
    return 'Registre a decisão como foi tomada: aprovado ou devolvido para ajustes, a data, quem decidiu, o ato e o processo SEI, e '
      + 'anexe o documento, se houver. Se a decisão for "devolvido", ajuste o que foi pedido e registre a nova decisão quando vier a aprovação.';
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

  /**
   * Por que a pessoa só lê este passo (aparece em cada seção e no alto da tela):
   * quem vê de fora do órgão, o papel de consulta ou, para a equipe, a situação do
   * PDTIC e a etapa do passo (E7: a elaboração muda em elaboração ou devolvido; a
   * publicação, depois da aprovação; o acompanhamento, depois da publicação).
   */
  get avisoLeitura(): string {
    const estado = this.estadoService.atual;
    const pdtic = this.pdtic;
    // No passo do documento, o que se baixa são as versões em PDF
    const baixa = this.passoDocumento ? 'baixa as versões em PDF' : 'baixa as planilhas';
    if (estado?.orgaoVisto !== null) {
      return `Você está lendo o PDTIC do órgão ${this.siglaOrgao}. Quem preenche é a equipe do órgão.`;
    }
    if (estado?.meuPapel?.Papel === PapeisPlanejamento.OrgaoConsulta) {
      return `O seu papel é de consulta: você lê o PDTIC e ${baixa}. Quem preenche é a equipe do órgão.`;
    }
    if (this.status?.estado === 'externo') {
      return 'Este passo foi feito fora do sistema: ele está no PDF do PDTIC registrado já aprovado.';
    }
    const motivo = pdtic ? motivoLeituraDoPasso(this.grupo, pdtic.Situacao) : null;
    if (motivo) return motivo;
    if (this.status?.estado === 'aguardando' && this.status.motivo) {
      const texto = textoDoStatus(this.status);
      return /[.!?]$/.test(texto) ? texto : `${texto}.`;
    }
    return `Você pode consultar e ${baixa.replace('baixa ', 'baixar ')}. Quem preenche é a equipe do órgão.`;
  }

  /** O quadro "por que só leio" no alto: passos que gravam algo (seções, documento, fluxos) e que a pessoa não edita agora. */
  get mostraAvisoLeitura(): boolean {
    return this.temTela && !this.passoDeliberacao && !this.podeEditarPasso && !!this.andamento;
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

  /** Uma seção mudou: a situação do passo (e a da trilha) vem de novo; no envio, o que falta também. */
  aoMudarSecao(secao: PeSecaoTrilha): void {
    if (this.passoTemas && secao.Chave === 'temas_sem_acao') this.recargaTemas++;
    if (this.passoEnvio) this.recargaEnvio++;
    this.aoMudarSituacao();
  }

  /**
   * Os registros de uma seção chegaram (carga terminada ou mudança salva): guarda
   * a decisão das aprovações (E7) e, depois de uma recarga pedida pela tela, leva o
   * foco ao título da seção, que acabou de ser recriado.
   */
  aoCarregarRegistros(secao: PeSecaoTrilha, registros: PeRegistro[]): void {
    const decisao = registros[0]?.Dados?.['decisao'];
    this.decisoes = { ...this.decisoes, [secao.Chave]: typeof decisao === 'string' ? decisao : null };
    if (this.focarSecaoAoCarregar === secao.Chave) {
      this.focarSecaoAoCarregar = null;
      this.focoPendente = `pe-secao-${secao.Chave}-titulo`;
    }
  }

  /** O envio ou a publicação devolveu o PDTIC: ele entra no estado da trilha (a situação vem de novo). */
  aoMudarPdtic(novo: PePdtic): void {
    this.estadoService.aplicarPdtic(novo);
  }

  /** O PDTIC foi encerrado (7.4): entra no estado, e o foco vai para o título do passo (o bloco da ação some). */
  aoEncerrar(novo: PePdtic): void {
    this.estadoService.aplicarPdtic(novo);
    this.focoPendente = 'pe-passo-titulo';
  }

  /** A revisão abriu a versão nova: ela passa a ser a da trilha, e a visão geral explica o que muda. */
  aoAbrirRevisao(novo: PePdtic): void {
    this.estadoService.aplicarPdtic(novo);
    this.router.navigate([BASE_PE]);
  }

  /** "Não se aplica", comentário ou registro: busca a situação de novo. */
  aoMudarSituacao(): void {
    this.esperandoSituacao = true;
    this.estadoService.atualizarStatus(true);
  }

  /** O texto do documento ficou com mudança pendente (ou terminou de salvar). */
  aoAlterarDocumento(sujo: boolean): void {
    this.documentoSujo = sujo;
  }

  /** Um fluxo ficou com mudança não salva (ou foi salvo). */
  aoAlterarFluxos(sujo: boolean): void {
    this.fluxosSujos = sujo;
  }

  /** Guarda de rota: mudança não salva numa seção do passo, num texto do documento ou num fluxo. */
  podeSair(): boolean {
    if (this.sujas.size === 0 && !this.documentoSujo && !this.fluxosSujos) return true;
    const sair = confirm('Há mudanças que ainda não foram salvas neste passo. Sair assim mesmo? Elas vão se perder.');
    if (sair) {
      this.sujas.clear();
      this.documentoSujo = false;
      this.fluxosSujos = false;
    }
    return sair;
  }

  // ── Cronograma sugerido pelos fluxos (E6) ─────────────────────────────────

  /** A seção do cronograma do plano de trabalho ganha a sugestão pelos fluxos enquanto está vazia. */
  ehCronograma(secao: PeSecaoTrilha): boolean {
    return secao.Chave === SECAO_CRONOGRAMA;
  }

  recargaDe(secao: PeSecaoTrilha): number {
    return this.recargas.get(secao.Chave) ?? 0;
  }

  /** A seção vem de novo (os registros foram criados por fora). */
  recarregarSecao(secao: PeSecaoTrilha): void {
    this.recargas.set(secao.Chave, this.recargaDe(secao) + 1);
  }

  /**
   * O servidor criou as linhas: a seção vem de novo, a situação do passo também,
   * e o foco vai para o título da seção quando ela terminar de carregar (o título é
   * recriado na recarga: o foco dado antes cairia no corpo da página). O aviso é
   * só o do toast, que já fica numa região lida pelo leitor de tela.
   */
  aoSugerirCronograma(secao: PeSecaoTrilha, quantas: number): void {
    const texto = quantas === 1
      ? 'O cronograma ganhou 1 atividade sugerida pelos fluxos. Complete o início e o término.'
      : `O cronograma ganhou ${quantas} atividades sugeridas pelos fluxos. Complete o início e o término de cada uma.`;
    this.notificacoes.success(texto);
    this.focarSecaoAoCarregar = secao.Chave;
    this.recarregarSecao(secao);
    this.aoMudarSecao(secao);
  }

  // ── PDTIC ─────────────────────────────────────────────────────────────────

  abrirPdtic(): void {
    if (this.abrindo || !this.podeAbrirPdtic) return;
    this.abrindo = true;
    this.estadoService.abrirPdtic().subscribe({
      next: pdtic => {
        this.abrindo = false;
        // O toast fica numa região lida pelo leitor de tela: um aviso só
        this.notificacoes.success(`PDTIC ${pdtic.Versao} aberto. Já dá para preencher este passo.`);
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
      this.documentoSujo = false;
      this.fluxosSujos = false;
      this.esperandoSituacao = false;
      this.focarSecaoAoCarregar = null;
      this.status = null;
      this.decisoes = {};
    }
    const etapa = this.numerado ? estado.trilhaOrgao?.Etapas[this.numerado.etapa] : null;
    this.grupo = grupoDoPasso(this.passo.Tipo, etapa?.Chave, this.numerado?.etapa ?? 0);

    this.pdtic = estado.pdtic;
    this.cargaPdtic = estado.cargaPdtic;
    this.erroPdtic = estado.erroPdtic;
    this.atualizarFonte();
    this.lerSituacao();
    this.passoAcoes = this.acharPassoAcoes();
    const comFluxos = estado.passos.find(p => passoTemFluxos(p.doOrgao));
    this.passoFluxos = comFluxos ? { numero: comFluxos.numero, rota: comFluxos.rota } : null;

    // Entrada direta pelo endereço: a aba nasceu com o título genérico
    this.corrigirTitulo();
  }

  /**
   * O título da aba com o título do passo, quando ela ficou com o genérico ("Passo
   * do PDTIC"): na entrada direta pelo endereço (a trilha chega depois) e depois de
   * cada navegação que só muda a query (a estratégia de títulos reaplica o título
   * resolvido na entrada). Não mexe nas guardas nem nos resolvedores da rota.
   */
  private corrigirTitulo(): void {
    const passo = this.passo;
    if (!passo || this.destruida) return;
    const atual = this.titulo.getTitle();
    if (atual.startsWith(TITULO_PASSO_GENERICO)) {
      this.titulo.setTitle(passo.Titulo + atual.slice(TITULO_PASSO_GENERICO.length));
    }
  }

  /**
   * A fonte dos registros e a dos fluxos do PDTIC; a situação e o `PodeEditar`
   * entram na chave (mudou, as seções e o editor dos fluxos buscam de novo).
   */
  private atualizarFonte(): void {
    const p = this.pdtic;
    const chave = p ? `${p.Id}:${p.Situacao}:${p.PodeEditar}` : '';
    if (chave === this.chaveFonte) return;
    this.chaveFonte = chave;
    this.fonte = p ? this.registrosService.fonte({ tipo: 'pdtic', id: p.Id }, `${p.Situacao}:${p.PodeEditar}`) : null;
    this.fonteFluxos = p ? this.fluxosService.fonteDoPdtic(p) : null;
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
        // O toast fica numa região lida pelo leitor de tela: um aviso só
        this.notificacoes.success(`Passo ${passo.Numero} feito: as seções obrigatórias estão preenchidas.`);
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
