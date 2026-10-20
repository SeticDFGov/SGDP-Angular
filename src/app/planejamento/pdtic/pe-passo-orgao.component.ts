import { AfterViewChecked, Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  PeCampoTrilha, PeCiclo, PeFormatoPlanilha, PeNaoSeAplica, PePassoSituacao, PePassoTrilha, PePdtic, PeRegistro, PeSecaoTrilha,
  PeSituacaoPassoPdtic, PeTipoCiclo, PeTrilhaOrgao
} from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PapeisPlanejamento } from '../../core/acessos/papeis-planejamento';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { PeConfirmacaoService } from '../shared/pe-confirmacao.service';
import { mensagemErroDownload, salvarResposta } from '../shared/pe-download';
import { NomesDoModelo, descricaoCampo, rotuloTipoPasso } from '../shared/pe-modelo-rotulos';
import {
  GrupoPassoPdtic, ORIGEM_ART4, SECAO_APROVACAO_AUTORIDADE, SECAO_AVALIACAO_COMITE, SECAO_CRONOGRAMA, SECAO_PRINCIPIOS,
  SECAO_PUBLICACAO, TIPOS_PASSO_COM_SECOES, TIPOS_PASSO_COM_TELA, aceitaNaoSeAplica, classeEstadoPasso, ehPassoSistemasIa,
  grupoDoPasso, iconeEstadoPasso, itemDaSecaoPdtic, motivoLeituraDoPasso, passoTemFluxos, pdticAntesDaPublicacao,
  pdticDepoisDaPublicacao, pdticVigente, situacaoDaVersaoNaFrase, statusDoPassoPdtic, textoDoStatus, textoPrincipiosDoArt4
} from '../shared/pe-pdtic-rotulos';
import {
  PassoDaGrade, SECAO_ACOES, SECAO_INDICADORES_MONITORAMENTO, SECAO_MEDICOES, SECAO_MONITORAMENTO_ACOES, SECAO_RELATORIO_CICLO,
  SECAO_RISCOS_OCORRIDOS, SECOES_DO_RR, SECOES_POR_CICLO, TipoGrade, cicloAceitaDados, cicloAnterior, cicloDoEndereco, cicloMaisRecente,
  cicloPadrao, ciclosEmOrdem, porCicloDaSecao, tipoCicloDoPasso
} from '../shared/pe-ciclos-rotulos';
import { RelatorioDoc } from '../shared/pe-documento-rotulos';
import { hojeIso, textoData } from '../shared/registros/pe-valores';
import { PeSecaoRegistrosComponent } from '../shared/registros/pe-secao-registros.component';
import { CiclosDaFonte, PeFonteRegistros, PeRegistrosService } from '../services/pe-registros.service';
import { PeFluxosService, PeFonteFluxos } from '../services/pe-fluxos.service';
import { PeCiclosService } from '../services/pe-ciclos.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { PeFluxoEditorComponent } from '../fluxos/pe-fluxo-editor.component';
import { CargaPdticPe, PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { StatusPassoPe } from '../trilha/pe-trilha-status.service';
import { BASE_PE, PassoNumeradoPe, TITULO_PASSO_GENERICO, passoDaUrl } from '../trilha/pe-trilhas';
import { PeDocumentoPreviaComponent } from '../documento/pe-documento-previa.component';
import { PeCiclosListaComponent } from '../acompanhamento/pe-ciclos-lista.component';
import { PeGradeCicloComponent } from '../acompanhamento/pe-grade-ciclo.component';
import { PeCicloFechamentoComponent } from '../acompanhamento/pe-ciclo-fechamento.component';
import { PeAcaoPdticComponent } from './pe-acao-pdtic.component';
import { PeComentariosPassoComponent } from './pe-comentarios-passo.component';
import { PeNaoSeAplicaComponent } from './pe-nao-se-aplica.component';
import { PePassoDeliberacaoComponent } from './pe-passo-deliberacao.component';
import { PePassoEnvioComponent } from './pe-passo-envio.component';
import { PePassoPublicacaoComponent } from './pe-passo-publicacao.component';
import { PeSistemasIaPgiaComponent } from './pe-sistemas-ia-pgia.component';
import { PeSugerirCronogramaComponent } from './pe-sugerir-cronograma.component';
import { PeTemasAcoesComponent } from './pe-temas-acoes.component';
import { PeFormaPassoComponent } from './pe-forma-passo.component';
import { PeValidacaoPassoComponent } from './pe-validacao-passo.component';

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
 *   "Começar o PDTIC". Um tipo de passo que esta versão não conhece diz que não
 *   tem tela e manda avisar a equipe que administra o sistema.
 * - Passo do documento (E5): a prévia editável do documento do PDTIC, o PDF e
 *   as versões (`pe-documento-previa`, num pacote próprio que só carrega neste
 *   passo, pelo `@defer`).
 * - Passo da metodologia (ou passo do tipo fluxo, E6): o editor guiado dos
 *   fluxos do órgão, depois das seções, também num pacote próprio pelo `@defer`.
 *   Na seção do cronograma do plano de trabalho, enquanto ela está vazia, o
 *   "Sugerir o cronograma pelos fluxos".
 *
 * - Caminho da aprovação (E7): no passo de aprovação, a seção da decisão com o que
 *   registrar e, na avaliação do comitê (6.1) com a decisão "revisar", "Abrir a
 *   revisão do PDTIC"; na aprovação da autoridade máxima (7.2) com "aprovado",
 *   "Encerrar o PDTIC". No passo do envio, a aprovação do SGTIC e o envio ao CGTIC
 *   (`pe-passo-envio`); no da deliberação, a decisão do comitê
 *   (`pe-passo-deliberacao`); no da publicação, a seção e "Registrar a
 *   publicação" (`pe-passo-publicacao`). Os passos aguardando e os feitos fora do
 *   sistema dizem o porquê no alto.
 *
 * - Acompanhamento (E7 rodada B), depois da publicação: nos passos com seções por
 *   ciclo, os ciclos do tipo do passo (monitoramento ou avaliação), com o ciclo à
 *   vista no endereço (`?ciclo=`; sem ele, o do passo anterior do mesmo tipo, senão
 *   o que pede atenção) e a fonte dos registros levando o `cicloId` nessas seções.
 *   No primeiro passo do tipo, a lista dos ciclos (e "Abrir uma avaliação"); nos
 *   seguintes, a troca compacta. No 5.1, a grade da situação das ações e a das
 *   medições no lugar das tabelas genéricas; os riscos que ocorreram seguem na
 *   tabela genérica. No último passo do tipo, o resumo e o fechamento (e a
 *   reabertura) do ciclo e a prévia do relatório de acompanhamento (RA); no passo
 *   das lições aprendidas (7.1), a do relatório de resultados (RR). Na avaliação
 *   do comitê, a revisão sai da decisão "revisar" da avaliação mais recente. Tudo
 *   isso carrega num pacote próprio, pelo `@defer`, só nesses passos.
 *
 * - E8: a "Planilha deste passo", antes das seções: os dados de todas as seções do
 *   passo num arquivo só (XLSX com uma aba por seção e a Leia-me; CSV, ou um .zip
 *   com um CSV por seção quando há mais de uma), para todo mundo que lê o PDTIC; no
 *   passo por ciclo, a do ciclo à vista. As seções do passo não têm mais os botões
 *   de planilha delas (`[planilha]="false"`).
 *
 * Quem não edita lê (consulta do órgão, papéis globais, PDTIC fora de elaboração):
 * quem decide é o `PodeEditar` do servidor (desde a E7, o do passo), e a tela
 * explica o porquê pela situação do PDTIC e pela etapa do passo. Nenhum botão de
 * gravar aparece sem ele. A mesma instância serve a todos os passos (a rota tem
 * parâmetro). Passo que não está na trilha à vista volta para a visão geral.
 */
/** F2 (C-O3): quanto o aviso de uma gravação espera a situação do passo, para sair junto com o "Passo N.M feito". */
const ESPERA_AVISO_SALVO_MS = 1500;

@Component({
  selector: 'app-pe-passo-orgao',
  standalone: true,
  imports: [
    CommonModule, RouterModule, CitaPlanejamentoDirective, PeSecaoRegistrosComponent, PeNaoSeAplicaComponent,
    PeComentariosPassoComponent, PeSistemasIaPgiaComponent, PeTemasAcoesComponent, PeDocumentoPreviaComponent,
    PeFluxoEditorComponent, PeSugerirCronogramaComponent, PePassoEnvioComponent, PePassoDeliberacaoComponent,
    PePassoPublicacaoComponent, PeAcaoPdticComponent, PeCiclosListaComponent, PeGradeCicloComponent, PeCicloFechamentoComponent,
    PeFormaPassoComponent, PeValidacaoPassoComponent
  ],
  templateUrl: './pe-passo-orgao.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PePassoOrgaoComponent implements OnInit, AfterViewChecked {
  private readonly router = inject(Router);
  private readonly titulo = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly registrosService = inject(PeRegistrosService);
  private readonly fluxosService = inject(PeFluxosService);
  private readonly ciclosService = inject(PeCiclosService);
  private readonly pdticService = inject(PePdticService);
  private readonly notificacoes = inject(NotificationService);
  private readonly confirmacao = inject(PeConfirmacaoService);
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
  /** F2: quantos princípios do art. 4º a tabela dos princípios tem (o texto do passo fala deles). */
  private principiosDoArt4 = 0;
  /** E7: muda quando a aprovação do SGTIC é salva (o envio confere de novo o que falta). */
  recargaEnvio = 0;
  /** Onde o passo fica no caminho do PDTIC (elaboração, deliberação, publicação ou acompanhamento). */
  private grupo: GrupoPassoPdtic = 'elaboracao';

  // ── E7 rodada B: ciclos do acompanhamento ─────────────────────────────────
  /** Os ciclos que o passo usa (monitoramento ou avaliação); null nos demais passos. */
  tipoCiclo: PeTipoCiclo | null = null;
  ciclos: PeCiclo[] = [];
  /** O ciclo à vista (o do endereço, `?ciclo=`). */
  ciclo: PeCiclo | null = null;
  carregandoCiclos = false;
  erroCiclos: string | null = null;
  /** O primeiro passo do tipo na trilha (5.1, 6.1): a lista completa dos ciclos. */
  passoListaCiclos = false;
  /** O último passo do tipo na trilha (5.2, 6.1; 5.1 quando o nível não tem o 5.2): o fechamento e o RA. */
  passoFechaCiclo = false;
  /** O número desse passo (o "reabra no passo N" das seções do ciclo fechado). */
  numeroPassoFecha: string | null = null;
  /** O nível tem o resumo do ciclo (5.2): o fechamento também o exige. */
  exigeResumo = false;
  /** O passo do relatório de resultados (7.1): a prévia do RR. */
  passoRr = false;
  /** Nos passos de aprovação da etapa 7, o passo onde está o relatório de resultados. */
  linkRr: { rota: string; numero: string } | null = null;
  /** Onde as ações e os indicadores de monitoramento se cadastram (o link das grades vazias). */
  passoAcoesGrade: PassoDaGrade | null = null;
  passoIndicadores: PassoDaGrade | null = null;
  /** O relatório de acompanhamento do ciclo à vista e o de resultados (os mesmos objetos enquanto não mudam). */
  relatorioRa: RelatorioDoc | null = null;
  readonly relatorioRr: RelatorioDoc = { tipo: 'rr' };
  private chaveCiclos = '';
  private cargaCiclos?: Subscription;
  /** A troca de ciclo já foi confirmada (a lista pediu com mudança pendente): a leitura do endereço não pergunta de novo. */
  private trocaDeCicloConfirmada = false;
  /** Seções do passo pela chave, com o tipo de ciclo de cada uma. */
  private ciclosDasSecoes = new Map<string, PeTipoCiclo | null>();

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
  /** F2 (C-O3): o aviso da última gravação numa seção, esperando a situação do passo. */
  private avisoSalvo: string | null = null;
  private esperaAvisoSalvo: ReturnType<typeof setTimeout> | undefined;

  /**
   * F2 (C-O3): quem dá o aviso de uma gravação nas seções (como "Quem acompanha"
   * preenchido). Ele espera a situação do passo, que vem logo depois: quando a
   * gravação completa o passo, os dois saem num aviso só ("... preenchido. Passo 4.1
   * feito: ..."). Sem a situação a tempo, ele sai sozinho.
   */
  readonly avisarSalvo = (texto: string): void => {
    this.soltarAvisoSalvo();
    this.avisoSalvo = texto;
    this.esperaAvisoSalvo = setTimeout(() => this.soltarAvisoSalvo(), ESPERA_AVISO_SALVO_MS);
  };

  /** Dá o aviso guardado da gravação, com o texto do passo feito quando há (um toast só). */
  private soltarAvisoSalvo(passoFeito?: string): void {
    clearTimeout(this.esperaAvisoSalvo);
    this.esperaAvisoSalvo = undefined;
    const texto = [this.avisoSalvo, passoFeito].filter(t => !!t).join(' ');
    this.avisoSalvo = null;
    if (texto) this.notificacoes.success(texto);
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.destruida = true;
      this.cargaCiclos?.unsubscribe();
      // Saiu do passo com o aviso de uma gravação ainda esperando a situação: ele sai agora
      this.soltarAvisoSalvo();
    });
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

  /**
   * E7: registro de uma aprovação (as aprovações finais, 7.2 no Avançado) e, desde a versão 9 do
   * modelo, o passo da avaliação intermediária, que termina com a avaliação do comitê (a decisão de
   * seguir ou revisar abre a revisão aqui).
   */
  get passoAprovacao(): boolean {
    return this.passo?.Tipo === 'aprovacao' || !!this.passo?.Secoes.some(s => s.Chave === SECAO_AVALIACAO_COMITE);
  }

  /** E7: aprovação do SGTIC e envio ao CGTIC (3.10). */
  get passoEnvio(): boolean {
    return this.passo?.Tipo === 'envio';
  }

  /** E7: deliberação do CGTIC (3.11), só leitura. */
  get passoDeliberacao(): boolean {
    return this.passo?.Tipo === 'deliberacao';
  }

  /** E7: publicação (3.12). */
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

  // ── Revisão (6.1) e encerramento (7.2) ────────────────────────────────────

  /**
   * "Abrir a revisão do PDTIC": na avaliação do comitê com a decisão "revisar", para
   * a equipe do órgão, na versão vigente, sem outra versão já em revisão.
   */
  get mostraRevisao(): boolean {
    const p = this.pdtic;
    if (!p || !this.estadoService.ehEquipeDoOrgao || !pdticVigente(p.Situacao)) return false;
    if (this.decisoes[SECAO_AVALIACAO_COMITE] !== 'revisar') return false;
    // Rodada B: a revisão vale pela avaliação mais recente (numa mais antiga, a tela só explica)
    if (this.tipoCiclo === 'avaliacao' && !this.avaliacaoMaisRecenteAVista) return false;
    const versoes = this.estadoService.atual?.versoes ?? [];
    return !versoes.some(v => v.Id !== p.Id && pdticAntesDaPublicacao(v.Situacao));
  }

  /** A avaliação à vista é a mais recente (é por ela que a revisão se abre). */
  get avaliacaoMaisRecenteAVista(): boolean {
    return !!this.ciclo && cicloMaisRecente(this.ciclos)?.Id === this.ciclo.Id;
  }

  /** Numa avaliação mais antiga com a decisão "revisar": a revisão se abre pela mais recente. */
  get revisaoEmOutraAvaliacao(): boolean {
    return this.passoAprovacao && this.tipoCiclo === 'avaliacao' && this.decisoes[SECAO_AVALIACAO_COMITE] === 'revisar'
      && !!this.ciclo && !this.avaliacaoMaisRecenteAVista && !!this.pdtic && pdticVigente(this.pdtic.Situacao);
  }

  /**
   * F1 (C22): o comitê decidiu revisar, e a revisão já foi aberta: a versão em
   * revisão (o botão de abrir some, e a tela diz onde ela está).
   */
  get revisaoJaAberta(): PePdtic | null {
    const p = this.pdtic;
    if (!p || !this.passoAprovacao || this.decisoes[SECAO_AVALIACAO_COMITE] !== 'revisar' || !pdticVigente(p.Situacao)) return null;
    return (this.estadoService.atual?.versoes ?? []).find(v => v.Id !== p.Id && pdticAntesDaPublicacao(v.Situacao)) ?? null;
  }

  /** "está em elaboração", "foi devolvida pelo CGTIC para ajustes" (a versão no meio da frase, F2, C-N1). */
  situacaoEmTexto(situacao: string): string {
    return situacaoDaVersaoNaFrase(situacao);
  }

  /** Vai para a versão em revisão (a troca de versão acontece na visão geral, como no seletor do alto da trilha). */
  verRevisao(v: PePdtic): void {
    this.router.navigate([BASE_PE]).then(saiu => {
      if (saiu) this.estadoService.escolherVersao(v.Id);
    });
  }

  /** "Encerrar o PDTIC": na aprovação da autoridade máxima (7.2) com a decisão "aprovado", para a equipe do órgão. */
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

  /**
   * A seção é a única do passo e nada mais no passo precisa ser distinguido dela
   * (revisão de 2026-10-20): o título da seção não aparece, porque o do passo já diz.
   * A região da seção leva o nome do título do passo, e a ajuda dela continua. Com
   * outro bloco ao lado (inventário de IA, temas, fluxos, envio, publicação), o
   * título fica, para separar uma coisa da outra.
   */
  get secaoUnica(): boolean {
    return this.passo?.Secoes.length === 1
      && !this.passoIa && !this.passoTemas && !this.temFluxos && !this.passoEnvio && !this.passoPublicacao;
  }

  get rotuloTipo(): string {
    return rotuloTipoPasso(this.passo?.Tipo);
  }

  /** O bloco do "não se aplica": passo opcional no nível do órgão que aceita (travado nunca). */
  get aceitaNsa(): boolean {
    return aceitaNaoSeAplica(this.passo);
  }

  // ── F3 · Níveis no modo livre e validação da equipe ───────────────────────

  /** O passo a passo do órgão está no modo livre (sem o campo, o definido: tudo como antes). */
  get modoLivre(): boolean {
    return this.estadoService.modoLivre;
  }

  /** O passo opcional ainda sem conteúdo (a situação `opcional`): o quadro curto no alto. */
  get opcionalVazio(): boolean {
    return this.status?.estado === 'opcional';
  }

  /** O quadro do passo opcional sem conteúdo (no modo definido, sem falar do nível alcançado, que ele não mostra). */
  get textoOpcional(): string {
    const inicio = 'Passo opcional: o envio do PDTIC não depende dele.';
    return this.modoLivre
      ? `${inicio} Preencha se o órgão quiser detalhar o plano; ele conta para o nível alcançado.`
      : `${inicio} Preencha se o órgão quiser detalhar o plano.`;
  }

  /** O selo "Obrigatório/Opcional no nível" (no modo livre, sem o nível; some quando repete o selo da situação). */
  get seloSituacaoDoPasso(): string | null {
    const p = this.passo;
    if (!p) return null;
    const rotulo = p.Situacao === 'obrigatorio' ? 'Obrigatório' : 'Opcional';
    if (!this.modoLivre) return `${rotulo}${p.AjustadoParaOrgao ? ' para o órgão' : ' no nível ' + this.nomeNivel}`;
    if (this.opcionalVazio && !p.AjustadoParaOrgao) return null;
    return p.AjustadoParaOrgao ? `${rotulo} para o órgão` : rotulo;
  }

  /** O passo sem seções: no modo livre, fala da forma em uso; no definido, do nível do órgão. */
  get textoSemSecoes(): string {
    const forma = this.passo?.Detalhe?.NivelNome;
    const onde = this.modoLivre ? (forma ? `na forma ${forma}` : 'nesta forma') : `no nível ${this.nomeNivel}`;
    return `Este passo não tem seções ${onde}. Se faltam campos, fale com o administrador do módulo.`;
  }

  /** "Forma deste passo": no modo livre, o passo com duas formas ou mais. */
  get mostraForma(): boolean {
    return this.modoLivre && (this.passo?.OpcoesDetalhe?.length ?? 0) > 1;
  }

  /** Troca a forma: quem grava no passo agora, com papel que grava (a equipe do PDTIC, o administrador do módulo, o admin do SGDP). */
  get podeTrocarForma(): boolean {
    return this.podeEditarPasso && (this.estadoService.ehEquipeDoOrgao || this.estadoService.ehAdministrador);
  }

  /** O órgão do passo a passo à vista (a forma se grava para ele). */
  get orgaoDaTrilha(): number | null {
    return this.estadoService.atual?.trilhaOrgao?.OrgaoId ?? null;
  }

  /** O nível base do modo livre (no passo a passo do modo livre, o nível que vem nele). */
  get nivelBaseId(): number | null {
    return this.estadoService.atual?.trilhaOrgao?.NivelId ?? null;
  }

  /**
   * A forma do passo mudou: o passo a passo do órgão (a resposta) entra no estado, as
   * seções do passo vêm de novo (os campos mudaram) e as mudanças não salvas, que a
   * troca já confirmou, saem.
   */
  aoTrocarForma(trilha: PeTrilhaOrgao): void {
    this.sujas.clear();
    this.estadoService.aplicarTrilha(trilha);
    for (const secao of this.passo?.Secoes ?? []) this.recarregarSecao(secao);
  }

  /** B: o quadro da validação aparece nos passos que aceitam (a resposta anterior da API não traz: nenhum). */
  get aceitaValidacao(): boolean {
    return this.andamento?.AceitaValidacao === true;
  }

  /** B: a validação devolveu a situação do passo: ela entra no estado (a moldura e a visão geral acompanham). */
  aoValidar(situacao: PePassoSituacao): void {
    this.estadoService.aplicarSituacaoDoPasso(situacao);
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

  /** Sem PDTIC atual: a versão anterior encerrada (ou substituída), quando há uma (F2, C08). */
  get ultimaEncerrada(): PePdtic | null {
    return this.estadoService.ultimaEncerrada;
  }

  /** A versão que o "Começar" abre: 1.0 ou a do próximo ciclo (F2, C08). */
  get versaoNova(): string {
    return this.estadoService.versaoNova;
  }

  /** E7: o órgão sem PDTIC pode registrar um aprovado fora do sistema (na visão geral). */
  get podeRegistrarExterno(): boolean {
    return this.estadoService.podeRegistrarExterno;
  }

  readonly secaoMedicoes = SECAO_MEDICOES;
  readonly secaoRiscosOcorridos = SECAO_RISCOS_OCORRIDOS;

  /** As seções da trilha do órgão (todos os passos do nível), pela chave: o mesmo objeto enquanto a trilha não muda. */
  private get secoesDoNivel(): ReadonlySet<string> {
    const passos = this.estadoService.atual?.passos ?? null;
    if (passos !== this.cacheSecoes.passos) {
      this.cacheSecoes = { passos, secoes: new Set((passos ?? []).flatMap(p => p.doOrgao?.Secoes ?? []).map(s => s.Chave)) };
    }
    return this.cacheSecoes.secoes;
  }

  private cacheSecoes: { passos: readonly PassoNumeradoPe[] | null; secoes: ReadonlySet<string> } = { passos: null, secoes: new Set() };

  /** O nível do órgão tem a seção (em algum passo da trilha). */
  nivelTemSecao(chave: string): boolean {
    return this.secoesDoNivel.has(chave);
  }

  /** Como o passo fica feito, para quem preenche. */
  get textoPreencher(): string {
    if (this.tipoCiclo === 'monitoramento') {
      if (this.temGrade) {
        // Só o que o nível tem: no Básico, sem as medições e os riscos que ocorreram (F2)
        const itens = ['a situação das ações'];
        if (this.nivelTemSecao(SECAO_MEDICOES)) itens.push('as medições');
        if (this.nivelTemSecao(SECAO_RISCOS_OCORRIDOS)) itens.push('os riscos que ocorreram');
        const lista = itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}` : itens[0];
        // F3: o fechamento fica no último passo obrigatório do monitoramento (no modo livre, este passo quando o do resumo é opcional)
        const fecha = this.passoFechaCiclo ? ' Feche o ciclo no resumo, abaixo, até o prazo.' : '';
        return `Escolha o ciclo e registre ${lista}. Salve cada grade de uma vez.${fecha} O passo fica feito quando os ciclos já iniciados estão fechados.`;
      }
      if (!this.passoFechaCiclo) {
        const onde = this.numeroPassoFecha ? ` no passo ${this.numeroPassoFecha}` : '';
        return `Preencha o resumo do período e salve. O ciclo se fecha${onde}.`;
      }
      return 'Preencha o resumo do período e feche o ciclo até o prazo. O sistema gera o relatório de acompanhamento (RA), logo '
        + 'abaixo, para você ajustar os textos e baixar.';
    }
    if (this.tipoCiclo === 'avaliacao') {
      return 'Escolha a avaliação (ou abra uma, quando o comitê pedir) e preencha as seções. Campos com asterisco são obrigatórios.';
    }
    if (this.passoEnvio) {
      // D3: depois da devolução do CGTIC, a versão ajustada volta ao comitê interno: a aprovação do SGTIC se registra de novo
      if (this.pdtic?.Situacao === 'devolvido') {
        return 'Registre de novo a aprovação do SGTIC, com a data da nova decisão, e salve. Depois, use "Enviar ao CGTIC", no bloco '
          + 'logo abaixo.';
      }
      return 'Registre a aprovação do SGTIC e salve. Depois, use "Enviar ao CGTIC", no bloco logo abaixo: o passo fica feito com o '
        + 'envio.';
    }
    if (this.passoPublicacao) {
      return 'Preencha a publicação e salve. Depois, use "Registrar a publicação", no bloco logo abaixo: o passo fica feito com o '
        + 'registro.';
    }
    // F2: o PDTIC aberto no sistema já nasce com os princípios do art. 4º na tabela (e o passo, feito)
    const principios = this.passo?.Secoes.find(s => s.Chave === SECAO_PRINCIPIOS);
    if (principios && this.principiosDoArt4 > 0) {
      return textoPrincipiosDoArt4(principios.Campos.some(c => c.Chave === 'criterio_priorizacao'));
    }
    return 'Salve cada seção. O passo fica feito quando as obrigatórias estão preenchidas; os campos com asterisco são obrigatórios.';
  }

  /** O que registrar num passo de aprovação (a avaliação do comitê decide entre seguir e revisar). */
  get textoAprovacao(): string {
    if (this.passo?.Secoes.some(s => s.Chave === SECAO_AVALIACAO_COMITE)) {
      return 'Registre a decisão do comitê. A decisão "revisar" libera a abertura de uma versão nova do PDTIC.';
    }
    return 'Registre a decisão. Se for "devolvido", ajuste o que foi pedido e registre a nova decisão quando vier a aprovação.';
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
      return `Você está lendo o PDTIC do órgão ${this.siglaOrgao}. Quem preenche é a equipe do PDTIC.`;
    }
    if (estado?.meuPapel?.Papel === PapeisPlanejamento.OrgaoConsulta) {
      return `Seu papel é de consulta: você lê o PDTIC e ${baixa}. Quem preenche é a equipe do PDTIC.`;
    }
    if (this.status?.estado === 'externo') {
      return 'Passo feito fora do sistema: consta no PDF do PDTIC registrado.';
    }
    const motivo = pdtic ? motivoLeituraDoPasso(this.grupo, pdtic.Situacao) : null;
    if (motivo) return motivo;
    if (this.status?.estado === 'aguardando' && this.status.motivo) {
      const texto = textoDoStatus(this.status);
      return /[.!?]$/.test(texto) ? texto : `${texto}.`;
    }
    // Rodada B: o passo aceita gravação, mas o ciclo à vista não (fechado ou ainda por começar)
    const ciclo = this.ciclo;
    if (this.podeEditarPasso && ciclo && !cicloAceitaDados(ciclo)) {
      const qual = this.tipoCiclo === 'avaliacao' ? 'Esta avaliação' : 'Este ciclo';
      const onde = this.numeroPassoFecha ? ` no passo ${this.numeroPassoFecha}` : '';
      return ciclo.Situacao === 'fechado'
        ? `${qual} está ${this.tipoCiclo === 'avaliacao' ? 'fechada' : 'fechado'}: só leitura. Para mudar, reabra${onde}.`
        : `${qual} ainda não começou${ciclo.Inicio ? `: os dados entram a partir de ${textoData(ciclo.Inicio)}` : ''}.`;
    }
    return `Você pode consultar e ${baixa.replace('baixa ', 'baixar ')}. Quem preenche é a equipe do PDTIC.`;
  }

  /** O quadro "por que só leio" no alto: passos que gravam algo (seções, documento, fluxos) e que a pessoa não edita agora. */
  get mostraAvisoLeitura(): boolean {
    return this.temTela && !this.passoDeliberacao && !this.podeEditarPasso && !!this.andamento;
  }

  // ── E7 rodada B: ciclos, grades e relatórios ──────────────────────────────

  /** O passo tem uma das grades (5.1): a da situação das ações ou a das medições. */
  get temGrade(): boolean {
    return !!this.passo?.Secoes.some(s => this.gradeDaSecao(s) !== null);
  }

  /** A grade que substitui a tabela genérica da seção (null: a seção usa os componentes genéricos). */
  gradeDaSecao(secao: PeSecaoTrilha): TipoGrade | null {
    if (secao.Chave === SECAO_MONITORAMENTO_ACOES) return 'acoes';
    if (secao.Chave === SECAO_MEDICOES) return 'medicoes';
    return null;
  }

  /** A seção guarda um registro por ciclo (e só carrega com um ciclo à vista). */
  secaoPorCiclo(secao: PeSecaoTrilha): boolean {
    return porCicloDaSecao(secao) !== null;
  }

  /**
   * Os ciclos existem (o PDTIC foi publicado) e o passo usa algum: a lista (ou a
   * troca compacta) aparece. Antes da publicação, o passo aguarda (o servidor diz o
   * motivo) e as seções por ciclo explicam por que ainda não abrem.
   */
  get ciclosDisponiveis(): boolean {
    return !!this.tipoCiclo && !!this.pdtic && pdticDepoisDaPublicacao(this.pdtic.Situacao);
  }

  /** "Abrir uma avaliação": quem grava no passo, sem outra avaliação aberta. */
  get podeAbrirAvaliacao(): boolean {
    return this.tipoCiclo === 'avaliacao' && this.podeEditarPasso && !this.carregandoCiclos
      && !this.ciclos.some(c => cicloAceitaDados(c));
  }

  /** O nome do ciclo anterior ao à vista, para a explicação dos valores ao lado das grades. */
  get rotuloAnterior(): string | null {
    return cicloAnterior(this.ciclos, this.ciclo)?.Rotulo ?? null;
  }

  /**
   * O RA do ciclo à vista, no passo que fecha o ciclo: sempre na avaliação e no
   * monitoramento com o resumo do ciclo (5.2); no nível sem o 5.2, depois que o
   * fechamento gerou o relatório.
   */
  get mostraRa(): boolean {
    const c = this.ciclo;
    if (!this.passoFechaCiclo || !c || c.Situacao === 'futuro' || !this.ciclosDisponiveis) return false;
    return this.tipoCiclo === 'avaliacao' || this.exigeResumo || !!c.Relatorio;
  }

  /** O RR, no passo das lições aprendidas, depois da publicação. */
  get mostraRr(): boolean {
    return this.passoRr && !!this.pdtic && pdticDepoisDaPublicacao(this.pdtic.Situacao);
  }

  /** Por que uma seção por ciclo não carrega (sem ciclo à vista). */
  get textoSemCiclo(): string {
    if (!this.pdtic || !pdticDepoisDaPublicacao(this.pdtic.Situacao)) {
      return 'Esta seção é preenchida a cada ciclo do acompanhamento, que começa depois da publicação do PDTIC.';
    }
    if (this.carregandoCiclos) return 'Carregando os ciclos...';
    if (this.erroCiclos) return 'Sem os ciclos, esta seção não abre. Use "Tentar de novo" na lista dos ciclos.';
    return this.tipoCiclo === 'avaliacao'
      ? 'Esta seção é preenchida numa avaliação. Abra uma avaliação quando o comitê pedir.'
      : 'Esta seção é preenchida a cada ciclo de monitoramento. Ainda não há ciclo para mostrar.';
  }

  /** Quem escolhe na lista: a troca vai para o endereço (com mudança não salva, pergunta antes na janela do módulo). */
  escolherCiclo(id: number): void {
    if (id === this.ciclo?.Id) return;
    this.confirmarTrocaDeCiclo().then(sim => {
      if (!sim) return;
      this.trocaDeCicloConfirmada = true;
      this.sujas.clear();
      this.documentoSujo = false;
      this.irParaCiclo(id);
    });
  }

  /** Mudança não salva no ciclo à vista: pergunta antes de trocar (F1, A04). */
  private confirmarTrocaDeCiclo(): Promise<boolean> {
    if (!this.mudancaNoCiclo) return Promise.resolve(true);
    const outro = this.tipoCiclo === 'avaliacao' ? 'outra avaliação' : 'outro ciclo';
    return this.confirmacao.perguntarDescarte(
      `Há mudanças não salvas neste passo. Se abrir ${outro}, elas se perdem.`, 'Trocar sem salvar', `Ver ${outro} sem salvar?`);
  }

  /** A avaliação nova (aberta na lista): os ciclos vêm de novo, e ela passa a ser a da tela. */
  aoAbrirAvaliacao(ciclo: PeCiclo): void {
    this.carregarCiclos(() => {
      if (ciclo?.Id && this.ciclos.some(c => c.Id === ciclo.Id)) this.escolherCiclo(ciclo.Id);
    });
    this.aoMudarSituacao();
  }

  /** O ciclo foi fechado ou reaberto: ele entra na lista, as seções vêm de novo (o `PodeEditar` mudou) e a situação também. */
  aoMudarCiclo(ciclo: PeCiclo): void {
    if (ciclo && this.ciclo && ciclo.Id === this.ciclo.Id) {
      this.ciclos = this.ciclos.map(c => (c.Id === ciclo.Id ? { ...c, ...ciclo } : c));
      this.ciclo = this.ciclos.find(c => c.Id === ciclo.Id) ?? this.ciclo;
      this.relatorioRa = null;
      this.atualizarRelatorioRa();
      this.atualizarFonte();
    }
    // O resumo e o relatório gerado vêm de novo com a lista
    this.carregarCiclos();
    this.aoMudarSituacao();
  }

  /** Uma grade foi salva: o resumo do ciclo, a situação do passo e, no primeiro dado, a do PDTIC. */
  aoMudarGrade(secao: PeSecaoTrilha): void {
    this.aoMudarSecao(secao);
  }

  recarregarCiclos(): void {
    this.carregarCiclos();
  }

  /** Um PDF do RA foi gerado: o relatório do ciclo (na lista) e a situação do passo vêm de novo. */
  aoGerarRelatorio(): void {
    this.carregarCiclos();
    this.aoMudarSituacao();
  }

  /** Há mudança não salva que a troca de ciclo perderia (seções, grades ou o texto do RA). */
  private get mudancaNoCiclo(): boolean {
    return this.sujas.size > 0 || this.documentoSujo;
  }

  /** Quem vê o órgão sem PDTIC e não pode abrir: o motivo. */
  get quemAbre(): string {
    if (this.estadoService.atual?.orgaoVisto !== null) return 'Quem começa é a equipe do PDTIC.';
    return 'Quem começa é a equipe do PDTIC. Seu papel é de consulta.';
  }

  // ── Seções ────────────────────────────────────────────────────────────────

  nomePlanilha(secao: PeSecaoTrilha): string {
    return `PDTIC_${this.siglaOrgao || 'orgao'}_${secao.Chave}`;
  }

  // ── E8 · Planilha do passo (todas as seções num arquivo só) ───────────────

  /** O formato que está sendo gerado (os dois botões ficam desligados enquanto isso). */
  baixandoPlanilhaPasso: PeFormatoPlanilha | null = null;

  /**
   * As seções do passo que saem na planilha (F1, I06: o `NaPlanilha` de cada seção
   * da trilha; resposta antiga, sem o campo, conta todas).
   */
  get secoesNaPlanilha(): number {
    return this.passo?.Secoes.filter(s => s.NaPlanilha !== false).length ?? 0;
  }

  /** Mais de uma seção na planilha: o CSV vem num .zip, com um CSV por seção. */
  get variasSecoes(): boolean {
    return this.secoesNaPlanilha > 1;
  }

  /** O passo tem seção por ciclo: a planilha leva o ciclo à vista (a API o exige). */
  get planilhaPorCiclo(): boolean {
    return !!this.passo?.Secoes.some(s => this.secaoPorCiclo(s));
  }

  /** O ciclo da planilha (só no passo com seção por ciclo, com o ciclo à vista). */
  get cicloDaPlanilha(): PeCiclo | null {
    return this.planilhaPorCiclo && this.ciclosDisponiveis ? this.ciclo : null;
  }

  /** Com alguma seção na planilha; sem seção por ciclo, sempre; com ela, só com um ciclo à vista. */
  get planilhaDoPassoDisponivel(): boolean {
    return this.secoesNaPlanilha > 0 && (!this.planilhaPorCiclo || !!this.cicloDaPlanilha);
  }

  /** O que a planilha do passo traz, em linguagem simples (contando só as seções que saem na planilha). */
  get textoPlanilhaPasso(): string {
    const n = this.secoesNaPlanilha;
    if (n === 0) return 'Nenhuma seção deste passo sai nas planilhas.';
    const fora = (this.passo?.Secoes.length ?? 0) - n;
    const conteudo = (n > 1
      ? `As ${n} seções num arquivo só: no XLSX, uma aba por seção; no CSV, um .zip com um CSV por seção.`
      : 'Os dados da seção, em XLSX ou CSV.')
      + (fora === 1 ? ' Uma seção do passo não sai na planilha.' : fora > 1 ? ` ${fora} seções do passo não saem na planilha.` : '');
    if (!this.planilhaPorCiclo) return conteudo;
    const c = this.cicloDaPlanilha;
    return c
      ? `${conteudo} Os dados saem ${this.tipoCiclo === 'avaliacao' ? 'da avaliação à vista' : 'do ciclo à vista'}: ${c.Rotulo}.`
      : `${conteudo} Os dados são de cada ciclo: a planilha fica disponível quando houver um ciclo à vista.`;
  }

  /** Baixa a planilha do passo (por blob, com o nome do servidor; no passo por ciclo, a do ciclo à vista). */
  baixarPlanilhaPasso(formato: PeFormatoPlanilha): void {
    const pd = this.pdtic;
    const p = this.passo;
    if (!pd || !p || this.baixandoPlanilhaPasso || !this.planilhaDoPassoDisponivel) return;
    const cicloId = this.cicloDaPlanilha?.Id ?? null;
    const extensao = formato === 'xlsx' ? 'xlsx' : this.variasSecoes ? 'zip' : 'csv';
    const reserva = `PDTIC_${this.siglaOrgao || 'orgao'}_passo-${p.Numero}_${hojeIso()}.${extensao}`;
    this.baixandoPlanilhaPasso = formato;
    this.pdticService.planilhaDoPasso(pd.Id, p.Chave, formato, cicloId).subscribe({
      next: resposta => {
        this.baixandoPlanilhaPasso = null;
        salvarResposta(resposta, reserva);
      },
      error: erro => {
        this.baixandoPlanilhaPasso = null;
        mensagemErroDownload(erro, `Não foi possível gerar a planilha do passo ${p.Numero}. Tente de novo.`).then(m => {
          if (m) this.notificacoes.error(m);
        });
      }
    });
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
    // Rodada B: o resumo do ciclo muda com os registros dele; o primeiro dado de um ciclo (ou a aprovação do plano de
    // acompanhamento) põe o PDTIC em acompanhamento
    if (this.tipoCiclo && this.secaoPorCiclo(secao)) this.carregarCiclos();
    this.conferirSituacaoDoPdtic();
    this.aoMudarSituacao();
  }

  /**
   * O PDTIC publicado passa a "em acompanhamento" com o primeiro dado de um ciclo
   * ou com a aprovação do plano de acompanhamento: ele vem de novo e, se mudou,
   * entra no estado (sem passar por "carregando").
   */
  private conferirSituacaoDoPdtic(): void {
    const p = this.pdtic;
    if (!p || p.Situacao !== 'publicado') return;
    this.pdticService.obter(p.Id).subscribe({
      next: novo => {
        if (novo && novo.Id === this.pdtic?.Id && novo.Situacao !== this.pdtic.Situacao) this.estadoService.aplicarPdtic(novo);
      },
      // Sem a resposta, a situação se atualiza na próxima carga do PDTIC
      error: () => undefined
    });
  }

  /**
   * Os registros de uma seção chegaram (carga terminada ou mudança salva): guarda
   * a decisão das aprovações (E7) e, depois de uma recarga pedida pela tela, leva o
   * foco ao título da seção, que acabou de ser recriado.
   */
  aoCarregarRegistros(secao: PeSecaoTrilha, registros: PeRegistro[]): void {
    const decisao = registros[0]?.Dados?.['decisao'];
    this.decisoes = { ...this.decisoes, [secao.Chave]: typeof decisao === 'string' ? decisao : null };
    if (secao.Chave === SECAO_PRINCIPIOS) this.principiosDoArt4 = registros.filter(r => r.Dados?.['origem'] === ORIGEM_ART4).length;
    if (this.focarSecaoAoCarregar === secao.Chave) {
      this.focarSecaoAoCarregar = null;
      this.focoPendente = `pe-secao-${secao.Chave}-titulo`;
    }
  }

  /** O envio ou a publicação devolveu o PDTIC: ele entra no estado da trilha (a situação vem de novo). */
  aoMudarPdtic(novo: PePdtic): void {
    this.estadoService.aplicarPdtic(novo);
  }

  /** O PDTIC foi encerrado (7.2): entra no estado, e o foco vai para o título do passo (o bloco da ação some). */
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

  /**
   * Guarda de rota: com mudança não salva numa seção do passo, num texto do
   * documento ou num fluxo, ela pergunta antes de sair (na janela do módulo, F1, A04).
   */
  podeSair(): boolean {
    return this.sujas.size === 0 && !this.documentoSujo && !this.fluxosSujos;
  }

  /** Recarregar a página (F1, D07): o texto do documento se salva sozinho e fica de fora da pergunta do navegador. */
  perdeAoRecarregar(): boolean {
    return this.sujas.size > 0 || this.fluxosSujos;
  }

  textoSaida(): string {
    return 'Há mudanças não salvas neste passo. Se sair, elas se perdem.';
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
        // O botão "Começar o PDTIC" some: o foco vai ao título do passo (F1, C11)
        this.focoPendente = 'pe-passo-titulo';
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
      this.soltarAvisoSalvo();
      this.sujas.clear();
      this.documentoSujo = false;
      this.fluxosSujos = false;
      this.esperandoSituacao = false;
      this.focarSecaoAoCarregar = null;
      this.status = null;
      this.decisoes = {};
      this.principiosDoArt4 = 0;
    }
    const etapa = this.numerado ? estado.trilhaOrgao?.Etapas[this.numerado.etapa] : null;
    this.grupo = grupoDoPasso(this.passo.Tipo, etapa?.Chave, this.numerado?.etapa ?? 0);

    this.pdtic = estado.pdtic;
    this.cargaPdtic = estado.cargaPdtic;
    this.erroPdtic = estado.erroPdtic;
    this.lerPassosDoAcompanhamento(estado.passos);
    this.atualizarCiclos();
    this.atualizarFonte();
    this.lerSituacao();
    this.passoAcoes = this.acharPassoAcoes();
    const comFluxos = estado.passos.find(p => passoTemFluxos(p.doOrgao));
    this.passoFluxos = comFluxos ? { numero: comFluxos.numero, rota: comFluxos.rota } : null;

    // Entrada direta pelo endereço: a aba nasceu com o título genérico
    this.corrigirTitulo();
  }

  // ── E7 rodada B: ciclos ───────────────────────────────────────────────────

  /**
   * O que o passo é no acompanhamento, pela trilha à vista: o tipo de ciclo, se é o
   * primeiro do tipo (a lista completa) ou o último (o fechamento e o RA), se o
   * nível tem o resumo do ciclo, onde está o RR e onde se cadastram as ações e os
   * indicadores (os links das grades vazias).
   */
  private lerPassosDoAcompanhamento(passos: PassoNumeradoPe[]): void {
    const passo = this.passo;
    const tipo = tipoCicloDoPasso(passo);
    this.tipoCiclo = tipo;
    this.ciclosDasSecoes = new Map((passo?.Secoes ?? []).map(s => [s.Chave, porCicloDaSecao(s)] as [string, PeTipoCiclo | null]));
    const doTipo = tipo ? passos.filter(p => tipoCicloDoPasso(p.doOrgao) === tipo) : [];
    this.passoListaCiclos = doTipo.length > 0 && doTipo[0].doOrgao?.Chave === passo?.Chave;
    // F3: o fechamento fica no último passo OBRIGATÓRIO do tipo (no modo livre, o 5.2 pode ser opcional); sem obrigatório, no último
    const obrigatorios = doTipo.filter(p => this.passoObrigatorio(p));
    const fecha = obrigatorios[obrigatorios.length - 1] ?? doTipo[doTipo.length - 1] ?? null;
    this.passoFechaCiclo = !!fecha && fecha.doOrgao?.Chave === passo?.Chave;
    this.numeroPassoFecha = fecha?.numero ?? null;
    // O fechamento exige o resumo do ciclo só quando o passo dele é obrigatório para o órgão (F3, C4)
    this.exigeResumo = passos.some(p => this.passoObrigatorio(p) && p.doOrgao?.Secoes.some(s => s.Chave === SECAO_RELATORIO_CICLO));

    const comRr = passos.find(p => p.doOrgao?.Secoes.some(s => s.Chave === SECOES_DO_RR[0]))
      ?? passos.find(p => p.doOrgao?.Secoes.some(s => SECOES_DO_RR.includes(s.Chave)));
    this.passoRr = !!comRr && comRr.doOrgao?.Chave === passo?.Chave;
    const etapaDoRr = comRr?.etapa ?? -1;
    this.linkRr = comRr && !this.passoRr && this.passoAprovacao && this.numerado?.etapa === etapaDoRr
      ? { rota: comRr.rota, numero: comRr.numero }
      : null;

    const achar = (secao: string): PassoDaGrade | null => {
      const p = passos.find(x => x.doOrgao?.Secoes.some(s => s.Chave === secao));
      return p ? { rota: p.rota, numero: p.numero } : null;
    };
    this.passoAcoesGrade = achar(SECAO_ACOES);
    this.passoIndicadores = achar(SECAO_INDICADORES_MONITORAMENTO);
  }

  /** F3: o passo é obrigatório para o órgão (a situação do passo diz; sem ela, a trilha). */
  private passoObrigatorio(p: PassoNumeradoPe): boolean {
    const doServidor = p.doOrgao ? this.estadoService.andamentoDoPasso(p.doOrgao.Chave)?.Obrigatorio : undefined;
    return typeof doServidor === 'boolean' ? doServidor : p.doOrgao?.Situacao === 'obrigatorio';
  }

  /**
   * Os ciclos do tipo do passo: buscados quando o PDTIC ou o tipo muda (o passo
   * seguinte do mesmo tipo reaproveita a lista); depois, o ciclo à vista sai do
   * endereço. Antes da publicação não há ciclos.
   */
  private atualizarCiclos(): void {
    const p = this.pdtic;
    const tipo = this.tipoCiclo;
    if (!p || !tipo || !pdticDepoisDaPublicacao(p.Situacao)) {
      this.cargaCiclos?.unsubscribe();
      this.chaveCiclos = '';
      this.ciclos = [];
      this.ciclo = null;
      this.carregandoCiclos = false;
      this.erroCiclos = null;
      this.relatorioRa = null;
      return;
    }
    const chave = `${p.Id}:${tipo}`;
    if (chave !== this.chaveCiclos) {
      this.chaveCiclos = chave;
      this.ciclos = [];
      this.ciclo = null;
      this.relatorioRa = null;
      this.carregarCiclos();
      return;
    }
    this.resolverCiclo();
  }

  /** A lista dos ciclos de novo (o resumo e o relatório gerado mudam); `depois` roda com a lista nova. */
  carregarCiclos(depois?: () => void): void {
    const p = this.pdtic;
    const tipo = this.tipoCiclo;
    if (!p || !tipo || !this.chaveCiclos) return;
    const chave = this.chaveCiclos;
    this.cargaCiclos?.unsubscribe();
    this.carregandoCiclos = true;
    this.erroCiclos = null;
    this.cargaCiclos = this.ciclosService.listar(p.Id, tipo).subscribe({
      next: lista => {
        if (chave !== this.chaveCiclos) return;
        this.carregandoCiclos = false;
        this.ciclos = ciclosEmOrdem(lista);
        this.resolverCiclo();
        depois?.();
      },
      error: erro => {
        if (chave !== this.chaveCiclos) return;
        this.carregandoCiclos = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, `Não foi possível carregar ${this.tipoCiclo === 'avaliacao' ? 'as avaliações' : 'os ciclos'}.`);
        if (mensagem !== null) this.erroCiclos = mensagem;
      }
    });
  }

  /**
   * O ciclo à vista: o do endereço (`?ciclo=`); sem ele, o escolhido antes no
   * mesmo PDTIC e tipo (o passo anterior); senão o que pede atenção. O endereço
   * acompanha a escolha. Endereço mudado por fora com mudança não salva pergunta
   * antes (sem trocar, o endereço volta ao ciclo à vista).
   */
  private resolverCiclo(): void {
    const p = this.pdtic;
    const tipo = this.tipoCiclo;
    if (!p || !tipo || !this.ciclos.length) {
      if (!this.carregandoCiclos) this.ciclo = null;
      return;
    }
    const daUrl = cicloDoEndereco(this.router.url);
    let escolhido = daUrl !== null ? this.ciclos.find(c => c.Id === daUrl) ?? null : null;
    if (!escolhido) {
      const lembrado = this.ciclosService.lembrado(p.Id, tipo);
      escolhido = (lembrado !== null ? this.ciclos.find(c => c.Id === lembrado) : undefined) ?? cicloPadrao(this.ciclos);
    }
    const confirmada = this.trocaDeCicloConfirmada;
    this.trocaDeCicloConfirmada = false;
    const atual = this.ciclo;
    if (atual && escolhido && escolhido.Id !== atual.Id && !confirmada && this.mudancaNoCiclo && this.noNavegador) {
      // O endereço mudou por fora (o voltar do navegador): volta ao ciclo à vista e pergunta na janela do módulo
      const pedido = escolhido.Id;
      this.irParaCiclo(atual.Id);
      this.confirmarTrocaDeCiclo().then(sim => {
        if (!sim) return;
        this.trocaDeCicloConfirmada = true;
        this.sujas.clear();
        this.documentoSujo = false;
        this.irParaCiclo(pedido);
      });
      return;
    }
    if (atual && escolhido && escolhido.Id !== atual.Id) {
      this.sujas.clear();
      this.documentoSujo = false;
    }
    this.ciclo = escolhido;
    this.atualizarRelatorioRa();
    if (escolhido) {
      this.ciclosService.lembrar(p.Id, tipo, escolhido.Id);
      if (daUrl !== escolhido.Id) this.irParaCiclo(escolhido.Id);
    }
    this.atualizarFonte();
  }

  /** Põe o ciclo no endereço (troca a entrada do histórico: o voltar do navegador sai do passo). */
  private irParaCiclo(id: number): void {
    if (!this.noNavegador) return;
    const arvore = this.router.parseUrl(this.router.url);
    if (arvore.queryParams['ciclo'] === String(id)) return;
    arvore.queryParams = { ...arvore.queryParams, ciclo: String(id) };
    this.router.navigateByUrl(arvore, { replaceUrl: true });
  }

  /** O RA do ciclo à vista (o mesmo objeto enquanto o ciclo, a situação e o relatório gerado não mudam). */
  private atualizarRelatorioRa(): void {
    const c = this.ciclo;
    if (!c) {
      this.relatorioRa = null;
      return;
    }
    const antes = this.relatorioRa?.tipo === 'ra' ? this.relatorioRa.ciclo : null;
    if (antes && antes.Id === c.Id && antes.Situacao === c.Situacao && (antes.Relatorio?.Numero ?? 0) === (c.Relatorio?.Numero ?? 0)) return;
    this.relatorioRa = { tipo: 'ra', ciclo: c };
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
   * Rodada B: nos passos com ciclo, a fonte leva o `cicloId` do ciclo à vista nas
   * seções por ciclo do tipo do passo (o ciclo e a situação dele entram na chave:
   * outro ciclo, ou o mesmo fechado ou reaberto, e as seções vêm de novo).
   */
  private atualizarFonte(): void {
    const p = this.pdtic;
    const tipo = this.tipoCiclo;
    const ciclo = this.ciclo;
    const chaveCiclo = tipo && ciclo ? `${tipo}:${ciclo.Id}:${ciclo.Situacao}` : '';
    const chave = p ? `${p.Id}:${p.Situacao}:${p.PodeEditar}|${chaveCiclo}` : '';
    if (chave === this.chaveFonte) return;
    const mesmoPdtic = this.chaveFonte.split('|')[0] === chave.split('|')[0];
    this.chaveFonte = chave;
    // Outro ciclo: as decisões lidas das seções eram do anterior (e os princípios, de outro PDTIC)
    this.decisoes = {};
    this.principiosDoArt4 = 0;
    const ciclos: CiclosDaFonte | null = tipo && ciclo
      ? { chave: chaveCiclo, daSecao: secao => (this.tipoDaSecao(secao) === tipo ? ciclo.Id : null) }
      : null;
    this.fonte = p ? this.registrosService.fonte({ tipo: 'pdtic', id: p.Id }, `${p.Situacao}:${p.PodeEditar}`, ciclos) : null;
    // O editor dos fluxos não depende do ciclo
    if (!mesmoPdtic || !this.fonteFluxos) this.fonteFluxos = p ? this.fluxosService.fonteDoPdtic(p) : null;
  }

  /** O tipo de ciclo de uma seção (as do passo pela trilha; as demais, pelo modelo inicial). */
  private tipoDaSecao(secao: string): PeTipoCiclo | null {
    return this.ciclosDasSecoes.has(secao) ? this.ciclosDasSecoes.get(secao) ?? null : SECOES_POR_CICLO[secao] ?? null;
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
      // O toast fica numa região lida pelo leitor de tela: um aviso só, junto com o da gravação que completou o passo
      // (F2, C-O3). Passo sem seções (o documento, feito pelo PDF gerado; os fluxos) não fala de seções (F1, B15)
      const feito = this.status?.estado === 'feito' && antes?.estado !== 'feito'
        ? (passo.Secoes.length > 0 ? `Passo ${passo.Numero} feito: as seções obrigatórias estão preenchidas.` : `Passo ${passo.Numero} feito.`)
        : undefined;
      if (this.avisoSalvo !== null || feito) this.soltarAvisoSalvo(feito);
    }
  }

  /** O passo da trilha com a seção das ações (o link da conferência dos temas). */
  private acharPassoAcoes(): { numero: string; rota: string; titulo: string } | null {
    if (!this.passoTemas) return null;
    const achado = this.estadoService.atual?.passos.find(p => p.doOrgao?.Secoes.some(s => s.Chave === 'acoes'));
    return achado ? { numero: achado.numero, rota: achado.rota, titulo: achado.titulo } : null;
  }
}
