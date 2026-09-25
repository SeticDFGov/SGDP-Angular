import { AfterViewChecked, Component, DestroyRef, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { PeNivel, PeOrgaoNivel, PeOrgaoNivelHistorico } from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { nomeDeQuem } from '../shared/registros/pe-valores';
import { PeConfirmacaoService } from '../shared/pe-confirmacao.service';
import { PeModeloService } from '../services/pe-modelo.service';
import { PeOrgaosService } from '../services/pe-orgaos.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { BASE_PE } from '../trilha/pe-trilhas';
import { PeOrgaoAjustesComponent } from './pe-orgao-ajustes.component';

/** F1 (A21): a escolha "Voltar ao nível padrão" na lista da troca (vai como `NivelId` nulo). */
const NIVEL_PADRAO = 'padrao';

interface TrocaNivel {
  orgao: PeOrgaoNivel;
  nivelId: number | typeof NIVEL_PADRAO | null;
  justificativa: string;
  tentou: boolean;
}

type CampoTroca = 'nivel' | 'justificativa';

/** Tamanho da justificativa (o servidor confere de novo). */
const MAX_JUSTIFICATIVA = 1000;

const TEXTO_SAIDA_AJUSTES = 'Há ajustes do órgão que ainda não foram salvos. Se sair agora, eles se perdem.';

/** O título da rota; com os ajustes de um órgão abertos, a aba diz "Ajustes do órgão SES" no lugar (F1, A20). */
const TITULO_TELA = 'Nível de cada órgão';

/**
 * Nível de cada órgão (passo 3.2 do administrador do módulo): a lista dos órgãos
 * com o nível de maturidade (ou "padrão", enquanto o administrador não definiu),
 * trocar o nível com justificativa (janela), o histórico dos níveis (janela), os
 * ajustes do órgão por cima do nível (`?orgao={id}`, a mesma árvore do modelo com
 * a coluna do ajuste) e "Ver como o órgão vê", que abre a trilha resolvida do
 * órgão na moldura, só para ler. Só o administrador do módulo e o admin do SGDP;
 * os demais veem um aviso e a tela não faz consulta nenhuma.
 */
@Component({
  selector: 'app-pe-orgaos-niveis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective, DialogoDirective, PeOrgaoAjustesComponent],
  templateUrl: './pe-orgaos-niveis.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeOrgaosNiveisComponent implements OnInit, AfterViewChecked {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly modeloService = inject(PeModeloService);
  private readonly orgaosService = inject(PeOrgaosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmacao = inject(PeConfirmacaoService);
  private readonly titulo = inject(Title);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private destruida = false;

  @ViewChild(PeOrgaoAjustesComponent) private ajustesTela?: PeOrgaoAjustesComponent;

  readonly maxJustificativa = MAX_JUSTIFICATIVA;
  readonly nivelPadrao = NIVEL_PADRAO;
  readonly nomeDeQuem = nomeDeQuem;

  pode: boolean | null = null;
  erroPapel = false;
  private iniciado = false;

  niveis: PeNivel[] = [];
  orgaos: PeOrgaoNivel[] | null = null;
  filtro = '';
  filtroAplicado = '';
  carregando = false;
  erroCarga = false;

  /** Órgão com os ajustes abertos (`?orgao=`). */
  orgaoAjustes: PeOrgaoNivel | null = null;
  private orgaoPedido: number | null = null;
  /** A pessoa já confirmou sair com ajustes não salvos ("Ver como o órgão vê"). */
  private saidaConfirmada = false;

  troca: TrocaNivel | null = null;
  salvandoNivel = false;

  historicoDe: PeOrgaoNivel | null = null;
  historico: PeOrgaoNivelHistorico[] | null = null;
  erroHistorico = false;

  /** Id do elemento que recebe o foco depois da próxima renderização (F1, A13). */
  private focoPendente: string | null = null;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.destruida = true);
    this.rota.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = Number(params.get('orgao'));
        this.orgaoPedido = Number.isInteger(id) && id > 0 ? id : null;
        this.abrirAjustesPedidos();
      });
    // A estratégia de títulos roda depois do NavigationEnd e, na troca só da query (?orgao=), volta
    // ao título da rota: o dos ajustes entra depois dela (F1, A20)
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.noNavegador) setTimeout(() => this.aplicarTitulo());
      });
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.pode = this.estadoService.podeConfigurar;
        this.erroPapel = estado.consultaPapel === 'erro';
        if (this.pode && !this.iniciado) {
          this.iniciado = true;
          this.carregarNiveis();
          this.buscar();
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

  tentarDeNovo(): void {
    this.estadoService.iniciar();
  }

  private carregarNiveis(): void {
    this.modeloService.modelo().subscribe({
      next: modelo => this.niveis = [...modelo.Niveis].sort((a, b) => a.Ordem - b.Ordem),
      error: () => this.niveis = []
    });
  }

  buscar(): void {
    this.carregando = true;
    this.erroCarga = false;
    const filtro = this.filtro.trim();
    this.orgaosService.listar(filtro).subscribe({
      next: lista => {
        this.orgaos = [...lista].sort((a, b) => a.Sigla.localeCompare(b.Sigla, 'pt-BR'));
        this.filtroAplicado = filtro;
        this.carregando = false;
        this.abrirAjustesPedidos();
      },
      error: () => {
        this.carregando = false;
        this.erroCarga = true;
      }
    });
  }

  limparFiltro(): void {
    this.filtro = '';
    this.buscar();
  }

  porOrgao(_: number, o: PeOrgaoNivel): number {
    return o.OrgaoId;
  }

  // ── Ajustes (?orgao=) ─────────────────────────────────────────────────────

  private abrirAjustesPedidos(): void {
    if (this.orgaoPedido === null) {
      this.orgaoAjustes = null;
      return;
    }
    if (!this.orgaos) return;
    const orgao = this.orgaos.find(o => o.OrgaoId === this.orgaoPedido);
    if (orgao) {
      this.orgaoAjustes = orgao;
      this.aplicarTitulo();
    } else if (this.filtroAplicado) {
      // O órgão pedido ficou de fora do filtro: busca a lista inteira
      this.filtro = '';
      this.buscar();
    } else {
      this.notificacoes.warning('Esse órgão não foi encontrado. A lista mostra todos os órgãos.');
      this.voltarParaLista();
    }
  }

  abrirAjustes(orgao: PeOrgaoNivel): void {
    this.router.navigate([], { relativeTo: this.rota, queryParams: { orgao: orgao.OrgaoId }, queryParamsHandling: 'merge' });
  }

  voltarParaLista(): void {
    // Sair dos ajustes com mudança não salva pergunta antes (a guarda de rota não vê troca de parâmetro)
    this.confirmarDescarteDosAjustes().then(sim => {
      if (sim) this.router.navigate([], { relativeTo: this.rota, queryParams: { orgao: null }, queryParamsHandling: 'merge' });
    });
  }

  /**
   * O título da aba igual ao da tela (F1, A20): com os ajustes de um órgão abertos,
   * "Ajustes do órgão SES · Governança Estratégica · SGDP"; na lista, o da rota.
   */
  private aplicarTitulo(): void {
    if (!this.noNavegador || this.destruida) return;
    const atual = this.titulo.getTitle();
    const o = this.orgaoAjustes;
    const prefixoAjustes = 'Ajustes do órgão ';
    const resto = atual.startsWith(TITULO_TELA) ? atual.slice(TITULO_TELA.length)
      : atual.startsWith(prefixoAjustes) ? atual.slice(atual.indexOf(' · ') >= 0 ? atual.indexOf(' · ') : atual.length) : null;
    if (resto === null) return;
    const novo = (o ? `${prefixoAjustes}${o.Sigla}` : TITULO_TELA) + resto;
    if (novo !== atual) this.titulo.setTitle(novo);
  }

  /** Ajustes mudados e não salvos: pergunta na janela do módulo (F1, A04). */
  private confirmarDescarteDosAjustes(): Promise<boolean> {
    if (!this.ajustesTela?.alterado) return Promise.resolve(true);
    return this.confirmacao.perguntarDescarte(TEXTO_SAIDA_AJUSTES);
  }

  /** Esperando a lista para abrir os ajustes do órgão pedido no endereço. */
  get abrindoAjustes(): boolean {
    return this.orgaoPedido !== null && !this.orgaoAjustes && this.carregando;
  }

  nivelEscolhido(t: TrocaNivel): PeNivel | null {
    if (t.nivelId === NIVEL_PADRAO) return this.nivelPadraoAtual;
    return this.niveis.find(n => n.Id === t.nivelId) ?? null;
  }

  /** O nível que vale para quem não tem nível escolhido: o primeiro ativo da lista. */
  get nivelPadraoAtual(): PeNivel | null {
    return this.niveis.find(n => n.Ativo) ?? null;
  }

  /** A ajuda embaixo da lista da troca: o que o nível escolhido pede. */
  ajudaNivel(t: TrocaNivel): string {
    if (t.nivelId === NIVEL_PADRAO) {
      const padrao = this.nivelPadraoAtual;
      return 'Sem nível escolhido, vale o padrão: o primeiro nível ativo da lista' + (padrao ? ` (hoje, ${padrao.Nome})` : '')
        + '. Se a lista dos níveis mudar, o nível do órgão acompanha.';
    }
    return this.nivelEscolhido(t)?.Descricao || 'O nível diz os passos e os campos que o órgão preenche.';
  }

  /**
   * F1 (A21): o nível no histórico, com "(padrão)" quando era o padrão. Aceita o
   * nome já com a marca, a marca à parte ou o nome nulo (antes valia o padrão).
   */
  rotuloNivelHistorico(nome: string | null, padrao: boolean | null | undefined): string {
    if (!nome?.trim()) return 'Nível padrão';
    return padrao && !nome.includes('(padrão)') ? `${nome} (padrão)` : nome;
  }

  /** Os ajustes foram salvos: a contagem da lista acompanha. */
  ajustesSalvos(total: number): void {
    const orgao = this.orgaoAjustes;
    if (!orgao || !this.orgaos) return;
    this.orgaos = this.orgaos.map(o => (o.OrgaoId === orgao.OrgaoId ? { ...o, Ajustes: total } : o));
    this.orgaoAjustes = this.orgaos.find(o => o.OrgaoId === orgao.OrgaoId) ?? orgao;
  }

  /** Guarda de rota: com ajustes mudados e não salvos, ela pergunta antes de sair (uma vez só). */
  podeSair(): boolean {
    return this.saidaConfirmada || !this.ajustesTela?.alterado;
  }

  textoSaida(): string {
    return TEXTO_SAIDA_AJUSTES;
  }

  // ── Ver como o órgão vê ───────────────────────────────────────────────────

  verComoOrgao(orgao: PeOrgaoNivel): void {
    // A pergunta vem antes de trocar a trilha; a guarda de rota não pergunta de novo
    this.confirmarDescarteDosAjustes().then(sim => {
      if (!sim) return;
      this.saidaConfirmada = true;
      this.estadoService.verOrgao(orgao.OrgaoId);
      this.router.navigate([BASE_PE]);
    });
  }

  // ── Trocar o nível ────────────────────────────────────────────────────────

  /** Níveis que a lista oferece: os ativos, mais o atual do órgão (mesmo desativado). */
  niveisParaTroca(orgao: PeOrgaoNivel): PeNivel[] {
    return this.niveis.filter(n => n.Ativo || (n.Id === orgao.NivelId && !orgao.NivelPadrao));
  }

  abrirTroca(orgao: PeOrgaoNivel): void {
    this.troca = { orgao, nivelId: orgao.NivelPadrao ? null : orgao.NivelId, justificativa: '', tentou: false };
  }

  fecharTroca(): void {
    if (!this.salvandoNivel) this.troca = null;
  }

  /** O erro de um campo da troca, depois da primeira tentativa (F1, A13: ligado ao campo). */
  erroTroca(campo: CampoTroca): string | null {
    const t = this.troca;
    if (!t || !t.tentou) return null;
    if (campo === 'nivel') {
      if (t.nivelId === null) return 'Escolha o nível.';
      if (t.nivelId !== NIVEL_PADRAO && t.nivelId === t.orgao.NivelId && !t.orgao.NivelPadrao) return 'O órgão já está nesse nível: escolha outro.';
      return null;
    }
    return t.justificativa.trim() ? null : 'Escreva a justificativa: ela fica no histórico e ajuda no Relatório de Maturidade.';
  }

  descritoresTroca(campo: CampoTroca, ajuda: string): string {
    return this.erroTroca(campo) ? `${ajuda} pe-troca-${campo}-erro` : ajuda;
  }

  focarCampoTroca(campo: CampoTroca): void {
    this.focoPendente = campo === 'nivel' ? 'pe-troca-nivel' : 'pe-troca-justificativa';
  }

  get errosTroca(): { campo: CampoTroca; mensagem: string }[] {
    return (['nivel', 'justificativa'] as CampoTroca[])
      .map(campo => ({ campo, mensagem: this.erroTroca(campo) ?? '' }))
      .filter(e => !!e.mensagem);
  }

  salvarTroca(): void {
    const t = this.troca;
    if (!t || this.salvandoNivel) return;
    t.tentou = true;
    if (this.errosTroca.length || t.nivelId === null) {
      // F1 (A13): o resumo recebe o foco, e cada item leva ao campo
      this.focoPendente = 'pe-troca-erros';
      return;
    }
    const voltaAoPadrao = t.nivelId === NIVEL_PADRAO;
    this.salvandoNivel = true;
    this.orgaosService.definirNivel(t.orgao.OrgaoId, {
      NivelId: voltaAoPadrao ? null : (t.nivelId as number),
      Justificativa: t.justificativa.trim()
    }).subscribe({
      next: atualizado => {
        this.salvandoNivel = false;
        this.troca = null;
        const novo: PeOrgaoNivel = { ...t.orgao, ...atualizado };
        this.orgaos = (this.orgaos ?? []).map(o => (o.OrgaoId === novo.OrgaoId ? novo : o));
        if (this.orgaoAjustes?.OrgaoId === novo.OrgaoId) this.orgaoAjustes = novo;
        // Sem artigo antes da sigla: o gênero muda de órgão para órgão (F1, A11)
        this.notificacoes.success(novo.NivelPadrao
          ? `O órgão ${novo.Sigla} voltou ao nível padrão (hoje, ${novo.NivelNome}). A trilha do órgão já mudou.`
          : `O órgão ${novo.Sigla} agora está no nível ${novo.NivelNome}. A trilha do órgão já mudou.`);
        // O "Ver a trilha de" da moldura mostra os órgãos com o nível
        this.estadoService.carregarOrgaos();
      },
      error: erro => {
        this.salvandoNivel = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível trocar o nível. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  // ── Histórico do nível ────────────────────────────────────────────────────

  abrirHistorico(orgao: PeOrgaoNivel): void {
    this.historicoDe = orgao;
    this.historico = null;
    this.erroHistorico = false;
    this.orgaosService.historicoNivel(orgao.OrgaoId).subscribe({
      next: lista => {
        if (this.historicoDe?.OrgaoId !== orgao.OrgaoId) return;
        this.historico = [...lista].sort((a, b) => (b.DefinidoEm ?? '').localeCompare(a.DefinidoEm ?? ''));
      },
      error: () => {
        if (this.historicoDe?.OrgaoId === orgao.OrgaoId) this.erroHistorico = true;
      }
    });
  }

  fecharHistorico(): void {
    this.historicoDe = null;
  }
}
