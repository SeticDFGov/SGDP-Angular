import { AfterViewChecked, Component, DestroyRef, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { PeConfirmacaoService } from '../shared/pe-confirmacao.service';
import { nomeDeQuem } from '../shared/registros/pe-valores';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { PePessoasService } from '../services/pe-pessoas.service';
import { AuthService } from '../../auth/services/auth';
import { NotificationService } from '../../core/services/notification.service';
import { PedidosAcessoFilaComponent } from '../../core/acessos/pedidos-acesso-fila.component';
import { PedidosAcessoService } from '../../core/acessos/pedidos-acesso.service';
import { Modulos } from '../../core/modulos/modulos';
import {
  OPCOES_PAPEL_PLANEJAMENTO, PapeisPlanejamento, papelPlanejamentoDeOrgao, rotuloCurtoPapelPlanejamento
} from '../../core/acessos/papeis-planejamento';
import {
  ErrosPlanejamento, PaginaPePessoas, PeCandidata, PePessoa
} from '../../../api/planejamento/interface';

/** Valor do select da linha que tira o papel e o acesso. */
const TIRAR_ACESSO = '__tirar__';
/** Mínimo de letras da busca de candidatas (o back-end devolve vazio abaixo disso). */
const MINIMO_BUSCA = 3;

/**
 * Pessoas e acessos da Governança Estratégica (administrador do módulo e admin do
 * SGDP): no topo, a fila dos pedidos de acesso ao módulo; embaixo, as pessoas com
 * papel (troca e retirada do papel na linha) e o bloco "Dar acesso a outra
 * pessoa". Papel e acesso ao módulo andam juntos: dar papel libera o módulo, tirar
 * o papel tira o acesso, e o pedido pendente da pessoa se encerra sozinho.
 *
 * Quem não administra o módulo vê um aviso e a tela não faz nenhuma consulta: a
 * permissão sai do `meu-papel` (`pe_admin` ou `EhAdminGeral`), e só depois dele a
 * tela chama pessoas* (o 403 da API faria o interceptor tirar a pessoa do módulo).
 */
@Component({
  selector: 'app-pe-pessoas',
  standalone: true,
  imports: [CommonModule, FormsModule, CitaPlanejamentoDirective, PedidosAcessoFilaComponent],
  templateUrl: './pe-pessoas.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PePessoasComponent implements OnInit, AfterViewChecked {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly pessoasService = inject(PePessoasService);
  private readonly authService = inject(AuthService);
  private readonly notificacoes = inject(NotificationService);
  private readonly pedidosAcesso = inject(PedidosAcessoService);
  private readonly confirmacao = inject(PeConfirmacaoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  /** Id do elemento que recebe o foco depois da próxima renderização (F1, A05 e A13). */
  private focoPendente: string | null = null;

  readonly nomeDeQuem = nomeDeQuem;

  @ViewChild(PedidosAcessoFilaComponent) private fila?: PedidosAcessoFilaComponent;

  readonly opcoesPapel = OPCOES_PAPEL_PLANEJAMENTO;
  readonly tirarAcesso = TIRAR_ACESSO;
  readonly minimoBusca = MINIMO_BUSCA;
  readonly moduloPlanejamento = Modulos.Planejamento;

  /** null enquanto o papel de quem está logado não chegou. */
  pode: boolean | null = null;
  /** A consulta do papel falhou: não dá para saber se a pessoa administra o módulo. */
  erroPapel = false;
  private iniciado = false;
  private meuUserId = '';

  // Lista de pessoas com papel
  filtro = '';
  papelFiltro = '';
  page = 1;
  readonly pageSize = 20;
  pagina: PaginaPePessoas | null = null;
  carregando = false;
  erroCarga = false;

  /** Papel escolhido no select de cada linha (userId → papel ou TIRAR_ACESSO). */
  escolhas: Record<string, string | null> = {};
  salvandoUserId: string | null = null;

  // Dar acesso a outra pessoa
  filtroCandidata = '';
  buscaCurta = false;
  candidatas: PeCandidata[] | null = null;
  buscandoCandidatas = false;
  erroCandidatas = false;
  escolhida: PeCandidata | null = null;
  papelNovo: string | null = null;
  tentouDarAcesso = false;
  dandoAcesso = false;

  ngOnInit(): void {
    this.authService.getUser().subscribe(user => this.meuUserId = (user?.Id ?? '').toLowerCase());
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        // Só com o meu-papel respondido: antes dele, nenhuma consulta de pessoas
        this.pode = this.estadoService.podeGerirPessoas;
        this.erroPapel = estado.consultaPapel === 'erro';
        if (this.pode && !this.iniciado) {
          this.iniciado = true;
          this.buscar();
        }
      });
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const id = this.focoPendente;
    if (!document.getElementById(id)) return;
    this.focoPendente = null;
    // Depois da renderização: com as animações ligadas, o select da linha antiga
    // ainda está na página neste momento, com o mesmo id (F2, A05)
    queueMicrotask(() => document.getElementById(id)?.focus());
  }

  /** As linhas ficam as mesmas quando a lista vem de novo (o foco não se perde). */
  readonly porUserId = (_: number, p: PePessoa): string => p.UserId;

  /** Consulta o papel de novo (a lista abre sozinha quando ele chegar). */
  tentarDeNovo(): void {
    this.estadoService.iniciar();
  }

  // ── Rótulos ───────────────────────────────────────────────────────────────

  rotuloPapel(papel: string | null): string {
    return rotuloCurtoPapelPlanejamento(papel);
  }

  deOrgao(papel: string | null | undefined): boolean {
    return papelPlanejamentoDeOrgao(papel);
  }

  /** O próprio administrador do módulo não troca nem tira o papel dele (o admin do SGDP pode). */
  ehEuAdminDoModulo(p: PePessoa): boolean {
    return !this.estadoService.atual?.adminGeral && p.UserId.toLowerCase() === this.meuUserId
      && p.Papel === PapeisPlanejamento.Admin;
  }

  // ── Lista ─────────────────────────────────────────────────────────────────

  /** `depois`: roda com a página nova aplicada (ex.: o foco num elemento dela). */
  buscar(page = 1, depois?: () => void): void {
    this.page = page;
    this.carregando = true;
    this.erroCarga = false;
    this.pessoasService.listarPessoas({
      Filtro: this.filtro,
      Papel: this.papelFiltro || null,
      Page: this.page,
      PageSize: this.pageSize
    }).subscribe({
      next: pagina => {
        // A última pessoa de uma página perdeu o papel: volta uma página
        if (pagina.Items.length === 0 && this.page > 1) {
          this.buscar(this.page - 1, depois);
          return;
        }
        this.pagina = pagina;
        this.escolhas = Object.fromEntries(pagina.Items.map(p => [p.UserId, p.Papel]));
        this.carregando = false;
        depois?.();
      },
      error: () => {
        this.carregando = false;
        this.erroCarga = true;
      }
    });
  }

  limparFiltros(): void {
    this.filtro = '';
    this.papelFiltro = '';
    this.buscar();
  }

  get inicioPagina(): number {
    return this.pagina && this.pagina.TotalItems > 0 ? (this.pagina.CurrentPage - 1) * this.pagina.PageSize + 1 : 0;
  }

  get fimPagina(): number {
    return this.pagina ? Math.min(this.pagina.CurrentPage * this.pagina.PageSize, this.pagina.TotalItems) : 0;
  }

  get filtrando(): boolean {
    return !!this.filtro.trim() || !!this.papelFiltro;
  }

  mudou(p: PePessoa): boolean {
    return (this.escolhas[p.UserId] ?? p.Papel) !== p.Papel;
  }

  desfazer(p: PePessoa): void {
    this.escolhas = { ...this.escolhas, [p.UserId]: p.Papel };
    // Os botões da linha saem da tela: o foco volta ao papel da pessoa (F1, A05)
    this.focoPendente = `pe-papel-${p.UserId}`;
  }

  /** Papel de órgão escolhido na linha para quem não tem órgão. */
  semOrgaoNaEscolha(p: PePessoa): boolean {
    return p.OrgaoId === null && this.deOrgao(this.escolhas[p.UserId] ?? p.Papel);
  }

  salvarLinha(p: PePessoa): void {
    if (this.salvandoUserId) return;
    const escolha = this.escolhas[p.UserId] ?? p.Papel;
    if (escolha === p.Papel) return;

    const tirar = escolha === TIRAR_ACESSO;
    if (!tirar) {
      this.salvarLinhaSim(p, escolha);
      return;
    }
    // A pergunta vem na janela do módulo (F1, A04)
    this.confirmacao.perguntar({
      titulo: `Tirar o acesso de ${p.Nome || p.Email} à Governança Estratégica?`,
      texto: `A pessoa perde o papel "${this.rotuloPapel(p.Papel)}" e deixa de entrar no módulo.`,
      sim: 'Tirar o acesso',
      perigo: true
    }).then(sim => {
      if (sim && !this.salvandoUserId) this.salvarLinhaSim(p, escolha);
    });
  }

  private salvarLinhaSim(p: PePessoa, escolha: string | null): void {
    const tirar = escolha === TIRAR_ACESSO;
    this.salvandoUserId = p.UserId;
    this.pessoasService.definirPapel(p.UserId, tirar ? null : escolha).subscribe({
      next: resposta => {
        this.salvandoUserId = null;
        if (tirar) {
          this.notificacoes.success(`${p.Nome} não tem mais acesso à Governança Estratégica. Vale no próximo clique da pessoa.`);
        } else {
          this.notificacoes.success(`Papel de ${p.Nome} trocado para "${this.rotuloPapel(escolha)}". Vale no próximo clique da pessoa.`);
          this.avisarSeSemOrgao(resposta, p.Nome, escolha);
        }
        // O foco: no papel da pessoa, que continua na lista; sem ela (acesso tirado), no título da lista (F1, A05)
        this.depoisDeMudarAcesso(() => {
          this.focoPendente = !tirar && this.pagina?.Items.some(x => x.UserId === p.UserId) ? `pe-papel-${p.UserId}` : 'pe-pessoas-titulo';
        });
      },
      error: (err: HttpErrorResponse) => {
        this.salvandoUserId = null;
        this.tratarErro(err, 'Não foi possível salvar o papel. Tente de novo.');
      }
    });
  }

  // ── Dar acesso a outra pessoa ─────────────────────────────────────────────

  buscarCandidatas(): void {
    const filtro = this.filtroCandidata.trim();
    this.buscaCurta = filtro.length < MINIMO_BUSCA;
    this.escolhida = null;
    if (this.buscaCurta) {
      this.candidatas = null;
      return;
    }
    this.buscandoCandidatas = true;
    this.erroCandidatas = false;
    this.pessoasService.candidatas(filtro).subscribe({
      next: lista => {
        this.buscandoCandidatas = false;
        this.candidatas = lista;
      },
      error: () => {
        this.buscandoCandidatas = false;
        this.candidatas = null;
        this.erroCandidatas = true;
      }
    });
  }

  escolher(c: PeCandidata): void {
    this.escolhida = c;
    this.papelNovo = null;
    this.tentouDarAcesso = false;
    // A lista sai da tela: o foco vai para o papel da pessoa escolhida (F1, A05)
    this.focoPendente = 'pe-papel-novo';
  }

  cancelarEscolha(focar = true): void {
    this.escolhida = null;
    this.papelNovo = null;
    this.tentouDarAcesso = false;
    // O bloco da pessoa escolhida sai da tela: o foco volta à busca (F1, A05)
    if (focar) this.focoPendente = 'pe-candidata';
  }

  get papelNovoFaltando(): boolean {
    return this.tentouDarAcesso && !this.papelNovo;
  }

  /** A candidata não tem órgão (a sigla vem da unidade) e o papel escolhido é de órgão. */
  get escolhidaSemOrgao(): boolean {
    return !!this.escolhida && !this.escolhida.OrgaoSigla && this.deOrgao(this.papelNovo);
  }

  darAcesso(): void {
    if (!this.escolhida || this.dandoAcesso) return;
    this.tentouDarAcesso = true;
    if (!this.papelNovo) {
      // O foco vai para o papel, com o erro ligado a ele (F1, A13)
      this.focoPendente = 'pe-papel-novo';
      return;
    }

    const pessoa = this.escolhida;
    const papel = this.papelNovo;
    this.dandoAcesso = true;
    this.pessoasService.definirPapel(pessoa.UserId, papel).subscribe({
      next: resposta => {
        this.dandoAcesso = false;
        this.notificacoes.success(`Acesso liberado para ${pessoa.Nome}, com o papel "${this.rotuloPapel(papel)}". Vale no próximo clique da pessoa.`);
        this.avisarSeSemOrgao(resposta, pessoa.Nome, papel);
        this.cancelarEscolha();
        this.candidatas = this.candidatas?.filter(c => c.UserId !== pessoa.UserId) ?? null;
        this.depoisDeMudarAcesso();
      },
      error: (err: HttpErrorResponse) => {
        this.dandoAcesso = false;
        this.tratarErro(err, 'Não foi possível dar o acesso. Tente de novo.');
      }
    });
  }

  // ── Depois de uma decisão ou mudança ──────────────────────────────────────

  /** A fila decidiu um pedido: a lista e a trilha mostram o resultado. */
  aoDecidirPedido(): void {
    if (this.pagina) this.buscar(this.page);
    this.estadoService.atualizarStatus(true);
  }

  /**
   * Papel dado ou tirado: a lista muda e o pedido pendente da pessoa, se havia, se
   * encerra no servidor (a fila e o contador da trilha precisam ver isso).
   */
  private depoisDeMudarAcesso(depois?: () => void): void {
    this.buscar(this.page, depois);
    this.fila?.buscar(this.fila.page);
    this.estadoService.atualizarStatus(true);
    this.pedidosAcesso.atualizarPendentes();
  }

  /** Papel de órgão grava mesmo sem órgão: a resposta volta com `OrgaoId` nulo, e a tela avisa. */
  private avisarSeSemOrgao(resposta: PePessoa | null, nome: string, papel: string | null): void {
    if (!this.deOrgao(papel) || !resposta || resposta.OrgaoId !== null) return;
    this.notificacoes.warning(`${nome} ficou sem órgão: a unidade da pessoa não está ligada a um órgão, e o papel de órgão exige um. A Administração do SGDP define a unidade.`);
  }

  private tratarErro(err: HttpErrorResponse, padrao: string): void {
    // 403: o interceptor já avisou e levou a pessoa para a tela inicial
    if (err?.status === 403) return;
    const codigo = err?.error?.Code;
    if (err?.status === 409 || codigo === ErrosPlanejamento.AutoRebaixamento) {
      this.notificacoes.warning('Você não pode tirar nem trocar o seu próprio papel de administrador do módulo, para o módulo não ficar sem administrador. Peça a outro administrador.');
      this.buscar(this.page);
      return;
    }
    if (err?.status === 404 || codigo === ErrosPlanejamento.UsuarioNaoEncontrado) {
      this.notificacoes.warning('Essa pessoa não foi encontrada no SGDP. A lista foi atualizada.');
      this.buscar(this.page);
      return;
    }
    this.notificacoes.error(err?.error?.Message || padrao);
  }
}
