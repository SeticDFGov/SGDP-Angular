import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PeNivel, PeOrgaoNivel, PeOrgaoNivelHistorico } from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import { PeModeloService } from '../services/pe-modelo.service';
import { PeOrgaosService } from '../services/pe-orgaos.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { BASE_PE } from '../trilha/pe-trilhas';
import { PeOrgaoAjustesComponent } from './pe-orgao-ajustes.component';

interface TrocaNivel {
  orgao: PeOrgaoNivel;
  nivelId: number | null;
  justificativa: string;
  tentou: boolean;
}

/** Tamanho da justificativa (o servidor confere de novo). */
const MAX_JUSTIFICATIVA = 1000;

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
  templateUrl: './pe-orgaos-niveis.component.html'
})
export class PeOrgaosNiveisComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly modeloService = inject(PeModeloService);
  private readonly orgaosService = inject(PeOrgaosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(PeOrgaoAjustesComponent) private ajustesTela?: PeOrgaoAjustesComponent;

  readonly maxJustificativa = MAX_JUSTIFICATIVA;

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

  ngOnInit(): void {
    this.rota.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = Number(params.get('orgao'));
        this.orgaoPedido = Number.isInteger(id) && id > 0 ? id : null;
        this.abrirAjustesPedidos();
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
    if (this.ajustesTela && !this.ajustesTela.podeSair()) return;
    this.router.navigate([], { relativeTo: this.rota, queryParams: { orgao: null }, queryParamsHandling: 'merge' });
  }

  /** Esperando a lista para abrir os ajustes do órgão pedido no endereço. */
  get abrindoAjustes(): boolean {
    return this.orgaoPedido !== null && !this.orgaoAjustes && this.carregando;
  }

  nivelEscolhido(t: TrocaNivel): PeNivel | null {
    return this.niveis.find(n => n.Id === t.nivelId) ?? null;
  }

  /** Os ajustes foram salvos: a contagem da lista acompanha. */
  ajustesSalvos(total: number): void {
    const orgao = this.orgaoAjustes;
    if (!orgao || !this.orgaos) return;
    this.orgaos = this.orgaos.map(o => (o.OrgaoId === orgao.OrgaoId ? { ...o, Ajustes: total } : o));
    this.orgaoAjustes = this.orgaos.find(o => o.OrgaoId === orgao.OrgaoId) ?? orgao;
  }

  /** Guarda de rota: ajustes mudados e não salvos perguntam antes de sair (uma vez só). */
  podeSair(): boolean {
    if (this.saidaConfirmada) return true;
    return this.ajustesTela?.podeSair() ?? true;
  }

  // ── Ver como o órgão vê ───────────────────────────────────────────────────

  verComoOrgao(orgao: PeOrgaoNivel): void {
    // A pergunta vem antes de trocar a trilha; a guarda de rota não pergunta de novo
    if (this.ajustesTela && !this.ajustesTela.podeSair()) return;
    this.saidaConfirmada = true;
    this.estadoService.verOrgao(orgao.OrgaoId);
    this.router.navigate([BASE_PE]);
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

  get errosTroca(): string[] {
    const t = this.troca;
    if (!t || !t.tentou) return [];
    const erros: string[] = [];
    if (t.nivelId === null) erros.push('Escolha o nível.');
    else if (t.nivelId === t.orgao.NivelId && !t.orgao.NivelPadrao) erros.push('O órgão já está nesse nível: escolha outro.');
    if (!t.justificativa.trim()) erros.push('Escreva a justificativa: ela fica no histórico e ajuda no Relatório de Maturidade.');
    return erros;
  }

  salvarTroca(): void {
    const t = this.troca;
    if (!t || this.salvandoNivel) return;
    t.tentou = true;
    if (this.errosTroca.length || t.nivelId === null) return;
    this.salvandoNivel = true;
    this.orgaosService.definirNivel(t.orgao.OrgaoId, { NivelId: t.nivelId, Justificativa: t.justificativa.trim() }).subscribe({
      next: atualizado => {
        this.salvandoNivel = false;
        this.troca = null;
        const novo: PeOrgaoNivel = { ...t.orgao, ...atualizado };
        this.orgaos = (this.orgaos ?? []).map(o => (o.OrgaoId === novo.OrgaoId ? novo : o));
        if (this.orgaoAjustes?.OrgaoId === novo.OrgaoId) this.orgaoAjustes = novo;
        this.notificacoes.success(`${novo.Sigla} agora está no nível ${novo.NivelNome}. A trilha do órgão já mudou.`);
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
