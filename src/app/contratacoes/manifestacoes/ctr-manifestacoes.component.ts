import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { acompanharSecao } from '../../pgia/shared/secao-rota';
import { CtrManifestacaoService } from '../services/ctr-manifestacao.service';
import { CtrProcessoService } from '../services/ctr-processo.service';
import { CtrManifestacaoFormComponent } from '../shared/ctr-manifestacao-form.component';
import { badgeEstagio, badgeSituacao } from '../shared/ctr-rotulos';
import {
  CtrManifestacao,
  CtrManifestacaoForm,
  CtrProcesso,
  ESTAGIOS_TCDF
} from '../../../api/contratacoes/interface';

/**
 * Área "Manifestações ao TCDF": a lista geral (com filtro por estágio) e a
 * página de registro de uma manifestação nova.
 *
 * A seção "nova" lê `?processo=ID` — é assim que a página do processo manda o
 * contexto. Sem o parâmetro, a tela oferece um seletor de processo com busca.
 */
@Component({
  selector: 'app-ctr-manifestacoes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CtrManifestacaoFormComponent],
  templateUrl: './ctr-manifestacoes.component.html'
})
export class CtrManifestacoesComponent implements OnInit {
  /** Formulário mostrado nesta página (vem do parâmetro `:secao` da rota). */
  secao = '';

  // Lista
  manifestacoes: CtrManifestacao[] = [];
  carregando = true;
  carregandoMais = false;
  /** Falha de carregamento vira mensagem na própria seção, não toast. */
  erroCarregar: string | null = null;
  paginaAtual = 1;
  totalPaginas = 1;
  totalItens = 0;
  readonly tamanhoPagina = 25;
  filtroEstagio = '';
  filtroTexto = '';
  estagios = ESTAGIOS_TCDF;
  /** Filtros da consulta que está na tela (congelados no Buscar). */
  private filtroAplicado: { Estagio: string | null; Filtro: string | null } = { Estagio: null, Filtro: null };
  /** A lista é buscada na primeira vez que a seção dela abre. */
  private carregouLista = false;
  /** Descarta a resposta de um processo abandonado (troca de processo). */
  private requisicaoProcesso = 0;
  private destroyRef = inject(DestroyRef);

  // Nova manifestação
  processo: CtrProcesso | null = null;
  carregandoProcesso = false;
  erroProcesso: string | null = null;
  salvando = false;

  // Seletor de processo (quando a página abre sem ?processo=)
  buscaProcesso = '';
  resultados: CtrProcesso[] = [];
  buscandoProcessos = false;
  buscouProcessos = false;

  badgeEstagio = badgeEstagio;
  badgeSituacao = badgeSituacao;

  constructor(
    private manifestacaoService: CtrManifestacaoService,
    private processoService: CtrProcessoService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    acompanharSecao(secao => {
      this.secao = secao;
      // Sair de "nova" limpa a busca de processo: voltar depois começa do zero.
      if (secao !== 'nova') this.limparSeletorProcesso();
      // A lista só é buscada quando é ela que está na tela — a mensagem de erro
      // dela mora na própria seção e ficaria muda em "nova manifestação".
      if (secao === 'lista' && !this.carregouLista) this.buscar();
    });
  }

  ngOnInit(): void {
    // O contexto do processo chega por query param e pode mudar sem recriar o
    // componente (a área é uma rota só, com parâmetro de seção).
    const inscricao = this.route.queryParamMap.subscribe(parametros => {
      const id = Number(parametros.get('processo'));
      if (id) {
        if (id !== this.processo?.Id) this.carregarProcesso(id);
        return;
      }
      // Sem processo na URL ("Trocar de processo"): a resposta que estiver em
      // voo é abandonada, senão ela repovoaria a tela já trocada.
      this.requisicaoProcesso++;
      this.processo = null;
      this.carregandoProcesso = false;
      this.erroProcesso = null;
    });
    this.destroyRef.onDestroy(() => inscricao.unsubscribe());
  }

  // ── Lista ─────────────────────────────────────────────────────────────────

  buscar(): void {
    this.carregouLista = true;
    // Congelados aqui: "Carregar mais" continua a consulta que está na tela.
    this.filtroAplicado = {
      Estagio: this.filtroEstagio || null,
      Filtro: this.filtroTexto.trim() || null
    };
    this.carregando = true;
    this.erroCarregar = null;
    this.manifestacaoService.listar({
      ...this.filtroAplicado, Page: 1, PageSize: this.tamanhoPagina
    }).subscribe({
      next: pagina => {
        this.manifestacoes = pagina.Items ?? [];
        this.paginaAtual = pagina.CurrentPage ?? 1;
        this.totalPaginas = pagina.TotalPages ?? 1;
        this.totalItens = pagina.TotalItems ?? this.manifestacoes.length;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.erroCarregar = 'Não foi possível carregar as manifestações. Tente de novo em instantes.';
      }
    });
  }

  filtrarPorEstagio(estagio: string): void {
    this.filtroEstagio = estagio;
    this.buscar();
  }

  get temMais(): boolean {
    return this.paginaAtual < this.totalPaginas;
  }

  carregarMais(): void {
    if (!this.temMais || this.carregandoMais) return;
    this.carregandoMais = true;
    this.manifestacaoService.listar({
      ...this.filtroAplicado, Page: this.paginaAtual + 1, PageSize: this.tamanhoPagina
    }).subscribe({
      next: pagina => {
        this.manifestacoes = [...this.manifestacoes, ...(pagina.Items ?? [])];
        this.paginaAtual = pagina.CurrentPage ?? this.paginaAtual + 1;
        this.totalPaginas = pagina.TotalPages ?? this.totalPaginas;
        this.carregandoMais = false;
      },
      error: () => {
        this.carregandoMais = false;
        this.notificationService.error('Não foi possível carregar mais manifestações.');
      }
    });
  }

  // ── Nova manifestação ─────────────────────────────────────────────────────

  private carregarProcesso(id: number): void {
    const requisicao = ++this.requisicaoProcesso;
    this.carregandoProcesso = true;
    this.erroProcesso = null;
    this.processoService.getProcesso(id).subscribe({
      next: processo => {
        if (requisicao !== this.requisicaoProcesso) return; // pedido abandonado
        this.processo = processo;
        this.carregandoProcesso = false;
      },
      error: () => {
        if (requisicao !== this.requisicaoProcesso) return;
        this.carregandoProcesso = false;
        this.processo = null;
        this.erroProcesso = 'Não foi possível abrir esse processo. Ele pode ter sido excluído.';
      }
    });
  }

  /** Zera a busca de processo da seção "nova". */
  private limparSeletorProcesso(): void {
    this.buscaProcesso = '';
    this.resultados = [];
    this.buscouProcessos = false;
  }

  buscarProcessos(): void {
    const termo = this.buscaProcesso.trim();
    if (!termo) return;
    this.buscandoProcessos = true;
    this.processoService.listar({ Filtro: termo, Page: 1, PageSize: 20 }).subscribe({
      next: pagina => {
        this.resultados = pagina.Items ?? [];
        this.buscandoProcessos = false;
        this.buscouProcessos = true;
      },
      error: () => {
        this.resultados = [];
        this.buscandoProcessos = false;
        this.buscouProcessos = true;
        this.notificationService.error('Não foi possível buscar os processos.');
      }
    });
  }

  /** Escolher o processo põe o contexto na URL: recarregar a página mantém. */
  escolherProcesso(processo: CtrProcesso): void {
    this.router.navigate(['/analises/manifestacoes/nova'], { queryParams: { processo: processo.Id } });
  }

  trocarProcesso(): void {
    this.router.navigate(['/analises/manifestacoes/nova']);
  }

  criar(form: CtrManifestacaoForm): void {
    if (!this.processo) return;
    this.salvando = true;
    this.processoService.criarManifestacao(this.processo.Id, form).subscribe({
      next: criada => {
        this.salvando = false;
        this.notificationService.success('Manifestação registrada.');
        this.router.navigate(['/analises/manifestacoes/editar', criada.Id]);
      },
      error: () => {
        this.salvando = false;
        this.notificationService.error(
          'Não foi possível registrar a manifestação. Confira os campos do inciso escolhido.'
        );
      }
    });
  }

  irParaLista(): void {
    this.router.navigate(['/analises/manifestacoes/lista']);
  }
}
