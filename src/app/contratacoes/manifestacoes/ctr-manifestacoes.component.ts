import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CitaInDirective } from '../shared/cita-in.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { acompanharSecao } from '../../pgia/shared/secao-rota';
import { CtrManifestacaoService } from '../services/ctr-manifestacao.service';
import { CtrProcessoService } from '../services/ctr-processo.service';
import { CtrManifestacaoFormComponent } from '../shared/ctr-manifestacao-form.component';
import { badgeEstagio, badgeStatusTcdf, rotuloAtoTcdf } from '../shared/ctr-rotulos';
import {
  CtrComunicacaoTcdfForm,
  CtrManifestacao,
  CtrProcesso,
  ESTAGIOS_TCDF
} from '../../../api/contratacoes/interface';

/**
 * Área "Manifestações ao TCDF": a lista geral (com filtro por estágio) e a
 * página de registro de uma comunicação nova do TCDF.
 *
 * A seção "nova" lê `?processo=ID`: é assim que a página do processo manda o
 * contexto, e é onde o processo escolhido na busca do formulário fica guardado
 * (recarregar a página mantém a escolha). Sem processo, a comunicação traz os
 * dados da contratação, que o servidor cadastra como processo de origem TCDF.
 */
@Component({
  selector: 'app-ctr-manifestacoes',
  standalone: true,
  imports: [CitaInDirective, CommonModule, FormsModule, RouterModule, CtrManifestacaoFormComponent],
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

  // Nova comunicação
  processo: CtrProcesso | null = null;
  carregandoProcesso = false;
  erroProcesso: string | null = null;
  salvando = false;
  siglas: string[] = [];
  private carregouSiglas = false;

  badgeEstagio = badgeEstagio;
  badgeStatusTcdf = badgeStatusTcdf;
  rotuloAtoTcdf = rotuloAtoTcdf;

  constructor(
    private manifestacaoService: CtrManifestacaoService,
    private processoService: CtrProcessoService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    acompanharSecao(secao => {
      this.secao = secao;
      // A lista só é buscada quando é ela que está na tela: a mensagem de erro
      // dela mora na própria seção e ficaria muda em "nova manifestação".
      if (secao === 'lista' && !this.carregouLista) this.buscar();
      if (secao === 'nova') this.carregarSiglas();
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
      // Sem processo na URL ("Trocar"): a resposta que estiver em voo é
      // abandonada, senão ela repovoaria a tela já trocada.
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

  // ── Nova comunicação ──────────────────────────────────────────────────────

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

  /** Autocompletar da sigla da contratação nova: conveniência, falha não bloqueia. */
  private carregarSiglas(): void {
    if (this.carregouSiglas) return;
    this.processoService.listarSiglas().subscribe({
      // Só marca no sucesso: falhando, entrar de novo tenta de novo
      next: siglas => {
        this.siglas = siglas;
        this.carregouSiglas = true;
      },
      error: () => this.siglas = []
    });
  }

  /**
   * Processo escolhido na busca do formulário: entra no contexto antes da
   * navegação (a assinatura do queryParam vê o mesmo id e não refaz o GET) e a
   * URL ganha o `?processo=`, para recarregar a página manter a escolha. O que
   * já foi digitado no formulário continua lá.
   */
  escolherProcesso(processo: CtrProcesso): void {
    this.processo = processo;
    this.erroProcesso = null;
    this.router.navigate(['/analises/manifestacoes/nova'], { queryParams: { processo: processo.Id }, replaceUrl: true });
  }

  trocarProcesso(): void {
    this.router.navigate(['/analises/manifestacoes/nova'], { replaceUrl: true });
  }

  criar(form: CtrComunicacaoTcdfForm): void {
    this.salvando = true;
    this.manifestacaoService.criar(form).subscribe({
      next: criada => {
        this.salvando = false;
        this.notificationService.success(form.Contratacao
          ? 'Comunicação registrada. A contratação foi cadastrada como processo de origem TCDF.'
          : 'Comunicação registrada.');
        this.router.navigate(['/analises/manifestacoes/editar', criada.Id]);
      },
      error: () => {
        this.salvando = false;
        this.notificationService.error(form.Contratacao
          ? 'Não foi possível registrar. Confira os campos e se o processo de comunicação já não está cadastrado.'
          : 'Não foi possível registrar. Confira os campos do inciso escolhido.');
      }
    });
  }

  irParaLista(): void {
    this.router.navigate(['/analises/manifestacoes/lista']);
  }
}
