import { AfterViewChecked, Component, EventEmitter, Input, OnInit, Output, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosAcessoService } from './pedidos-acesso.service';
import { OPCOES_PAPEL_PGIA, rotuloCurtoPapelPgia } from './papeis-pgia';
import {
  OPCOES_PAPEL_PLANEJAMENTO, papelPlanejamentoDeOrgao, rotuloCurtoPapelPlanejamento
} from './papeis-planejamento';
import { NotificationService } from '../services/notification.service';
import { MODULOS, Modulos, ModuloSgdp, moduloPorId } from '../modulos/modulos';
import { PapeisPgia } from '../../auth/services/auth';
import {
  PaginaPedidosAcesso,
  PedidoAcesso,
  SituacoesPedidoAcesso
} from '../../../api/acessos/interface';

/** Aprovação ou recusa aberta na linha de um pedido. */
interface Decisao {
  pedido: PedidoAcesso;
  tipo: 'aprovar' | 'recusar';
  /** Só no PGIA; null = agente público. */
  papelPgia: string | null;
  /** Só na Governança Estratégica, e obrigatório nela. */
  papelPlanejamento: string | null;
  motivo: string;
  tentouEnviar: boolean;
}

const FILTROS_SITUACAO: { valor: string; rotulo: string }[] = [
  { valor: SituacoesPedidoAcesso.Pendente, rotulo: 'Aguardando' },
  { valor: SituacoesPedidoAcesso.Aprovado, rotulo: 'Aprovados' },
  { valor: SituacoesPedidoAcesso.Recusado, rotulo: 'Recusados' },
  { valor: '', rotulo: 'Todos' }
];

/** Tamanho máximo do motivo da recusa (o backend guarda até 500). */
export const TAMANHO_MOTIVO = 500;

/**
 * O exemplo do motivo da recusa, pelo módulo do pedido (F2: o exemplo falava do PGIA
 * em qualquer módulo). Sem módulo conhecido, um exemplo que vale para todos.
 */
const EXEMPLO_MOTIVO: Record<string, string> = {
  [Modulos.Pgia]: 'Ex.: o PGIA é liberado pelo Responsável de IA do seu órgão. Fale com ele.',
  [Modulos.Planejamento]: 'Ex.: a Governança Estratégica é da equipe que elabora o PDTIC do seu órgão. Fale com a unidade de TIC do órgão.',
  [Modulos.Contratacoes]: 'Ex.: a Supervisão Contínua das Contratações é da equipe de análise da SGDI.',
  [Modulos.Demandas]: 'Ex.: Demandas e Projetos é de quem acompanha as demandas da sua unidade. Fale com o gestor da unidade.'
};
const EXEMPLO_MOTIVO_GERAL = 'Ex.: diga por que o acesso não foi liberado e com quem a pessoa pode falar.';

/**
 * Fila dos pedidos de acesso: quem decide aprova (no PGIA e na Governança
 * Estratégica, já escolhendo o papel) ou recusa com motivo, sem sair da linha. A
 * mesma fila serve à Administração (todos os módulos), à SGDI, na tela de pessoas
 * do PGIA (`moduloFixo = 'pgia'`), e ao administrador da Governança Estratégica,
 * na tela Pessoas e acessos do módulo (`moduloFixo = 'planejamento'`). O backend
 * limita cada um aos módulos que decide.
 */
@Component({
  selector: 'app-pedidos-acesso-fila',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedidos-acesso-fila.component.html'
})
export class PedidosAcessoFilaComponent implements OnInit, AfterViewChecked {
  /** Mostra só os pedidos deste módulo e esconde o filtro de módulo. */
  @Input() moduloFixo: string | null = null;

  /** Um pedido foi aprovado ou recusado: a tela que embute a fila atualiza o que depende dele. */
  @Output() decidiu = new EventEmitter<PedidoAcesso>();

  private readonly pedidos = inject(PedidosAcessoService);
  private readonly notificacoes = inject(NotificationService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  /** Id do campo que recebe o foco depois da próxima renderização (o que falta na decisão). */
  private focoPendente: string | null = null;

  readonly filtrosSituacao = FILTROS_SITUACAO;
  readonly opcoesPapelPgia = OPCOES_PAPEL_PGIA;
  readonly opcoesPapelPlanejamento = OPCOES_PAPEL_PLANEJAMENTO;
  readonly modulosLiberaveis: ModuloSgdp[] = MODULOS.filter(m => m.id !== Modulos.Administracao);
  readonly tamanhoMotivo = TAMANHO_MOTIVO;
  readonly M = Modulos;
  readonly S = SituacoesPedidoAcesso;

  situacao: string = SituacoesPedidoAcesso.Pendente;
  moduloFiltro = '';
  filtro = '';
  page = 1;
  readonly pageSize = 20;

  pagina: PaginaPedidosAcesso | null = null;
  carregando = false;
  erroCarga = false;

  decisao: Decisao | null = null;
  salvando = false;

  ngOnInit(): void {
    this.buscar();
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const id = this.focoPendente;
    if (!document.getElementById(id)) return;
    this.focoPendente = null;
    // Depois da renderização: com as animações ligadas, a linha que saiu da lista
    // ainda está na página neste momento e pode ter o mesmo id (F2, A05)
    queueMicrotask(() => document.getElementById(id)?.focus());
  }

  /** As linhas ficam as mesmas entre uma busca e outra (o foco não se perde com a lista nova). */
  readonly porId = (_: number, p: PedidoAcesso): number => p.Id;

  // ── Listagem ──────────────────────────────────────────────────────────────

  /** `depois`: roda com a página nova aplicada (`ok` verdadeiro) ou com a falha da busca. */
  buscar(page = 1, depois?: (ok: boolean) => void): void {
    this.page = page;
    this.carregando = true;
    this.erroCarga = false;
    this.pedidos.listar({
      Situacao: this.situacao || null,
      Modulo: this.moduloFixo ?? (this.moduloFiltro || null),
      Filtro: this.filtro,
      Page: this.page,
      PageSize: this.pageSize
    }).subscribe({
      next: pagina => {
        // A última linha de uma página saiu da fila: volta uma página
        if (pagina.Items.length === 0 && this.page > 1) {
          this.buscar(this.page - 1, depois);
          return;
        }
        this.pagina = pagina;
        this.carregando = false;
        if (this.decisao && !pagina.Items.some(p => p.Id === this.decisao!.pedido.Id)) this.decisao = null;
        depois?.(true);
      },
      error: () => {
        this.carregando = false;
        this.erroCarga = true;
        depois?.(false);
      }
    });
  }

  /**
   * Depois de uma decisão, a lista vem de novo e o foco vai para o pedido que
   * ficou no lugar do decidido (o seguinte, ou o anterior se era o último); se o
   * decidido continua na lista (filtro "Todos"), para ele; sem pedidos, para o
   * aviso de lista vazia (F2, A05).
   */
  private buscarDepoisDaDecisao(idDecidido: number): void {
    const indice = this.pagina?.Items.findIndex(p => p.Id === idDecidido) ?? -1;
    this.buscar(this.page, ok => {
      if (!ok) {
        this.focoPendente = 'pedidos-acesso-erro';
        return;
      }
      const itens = this.pagina?.Items ?? [];
      if (itens.some(p => p.Id === idDecidido)) {
        this.focoPendente = `pedido-acesso-${idDecidido}`;
        return;
      }
      const alvo = itens[Math.min(Math.max(indice, 0), itens.length - 1)];
      this.focoPendente = alvo ? `pedido-acesso-${alvo.Id}` : 'pedidos-acesso-vazio';
    });
  }

  trocarSituacao(valor: string): void {
    if (this.situacao === valor) return;
    this.situacao = valor;
    this.decisao = null;
    this.buscar();
  }

  get inicioPagina(): number {
    return this.pagina && this.pagina.TotalItems > 0 ? (this.pagina.CurrentPage - 1) * this.pagina.PageSize + 1 : 0;
  }

  get fimPagina(): number {
    return this.pagina ? Math.min(this.pagina.CurrentPage * this.pagina.PageSize, this.pagina.TotalItems) : 0;
  }

  get vendoPendentes(): boolean {
    return this.situacao === SituacoesPedidoAcesso.Pendente;
  }

  modulo(id: string): ModuloSgdp | undefined {
    return moduloPorId(id);
  }

  rotuloPapel(papel: string | null): string {
    return rotuloCurtoPapelPgia(papel);
  }

  rotuloPapelPlanejamento(papel: string | null | undefined): string {
    return rotuloCurtoPapelPlanejamento(papel);
  }

  /** O exemplo do motivo da recusa, do módulo do pedido. */
  exemploMotivo(modulo: string): string {
    return EXEMPLO_MOTIVO[modulo] ?? EXEMPLO_MOTIVO_GERAL;
  }

  // ── Decisão ───────────────────────────────────────────────────────────────

  abrirDecisao(pedido: PedidoAcesso, tipo: 'aprovar' | 'recusar'): void {
    if (this.decisao?.pedido.Id === pedido.Id && this.decisao.tipo === tipo) {
      this.decisao = null;
      return;
    }
    this.decisao = { pedido, tipo, papelPgia: null, papelPlanejamento: null, motivo: '', tentouEnviar: false };
  }

  /** "Cancelar" tira o painel da tela: o foco volta ao botão que o abriu (F2, A05). */
  cancelarDecisao(): void {
    const decisao = this.decisao;
    this.decisao = null;
    if (decisao) this.focoPendente = `pedido-acesso-${decisao.tipo}-${decisao.pedido.Id}`;
  }

  /** Papel de órgão sem unidade: a unidade é que liga a pessoa ao órgão. */
  get papelOrgaoSemUnidade(): boolean {
    return !!this.decisao && this.decisao.papelPgia === PapeisPgia.Orgao && !this.decisao.pedido.UnidadeNome;
  }

  /** Governança Estratégica: papel de órgão (equipe ou consulta) para quem não tem unidade. */
  get papelPlanejamentoOrgaoSemUnidade(): boolean {
    return !!this.decisao && papelPlanejamentoDeOrgao(this.decisao.papelPlanejamento) && !this.decisao.pedido.UnidadeNome;
  }

  /** Aprovar um pedido da Governança Estratégica exige o papel. */
  get papelPlanejamentoFaltando(): boolean {
    return !!this.decisao && this.decisao.tipo === 'aprovar' && this.decisao.tentouEnviar
      && this.decisao.pedido.Modulo === Modulos.Planejamento && !this.decisao.papelPlanejamento;
  }

  get motivoFaltando(): boolean {
    return !!this.decisao && this.decisao.tipo === 'recusar' && this.decisao.tentouEnviar && !this.decisao.motivo.trim();
  }

  confirmar(): void {
    if (!this.decisao || this.salvando) return;
    const decisao = this.decisao;
    decisao.tentouEnviar = true;
    // O que falta recebe o foco, com o erro ligado ao campo
    if (decisao.tipo === 'recusar' && !decisao.motivo.trim()) {
      this.focoPendente = `motivo-${decisao.pedido.Id}`;
      return;
    }
    if (this.papelPlanejamentoFaltando) {
      this.focoPendente = `papel-pe-${decisao.pedido.Id}`;
      return;
    }

    this.salvando = true;
    const modulo = decisao.pedido.Modulo;
    const chamada = decisao.tipo === 'aprovar'
      ? this.pedidos.aprovar(
          decisao.pedido.Id,
          modulo === Modulos.Pgia ? decisao.papelPgia : null,
          modulo === Modulos.Planejamento ? decisao.papelPlanejamento : null)
      : this.pedidos.recusar(decisao.pedido.Id, decisao.motivo.trim());

    chamada.subscribe({
      next: decidido => {
        this.salvando = false;
        this.decisao = null;
        // "ao módulo X", como no card da tela inicial (F2, A12)
        const nomeModulo = this.modulo(decidido.Modulo)?.nome ?? decidido.Modulo;
        if (decidido.Situacao === SituacoesPedidoAcesso.Aprovado) {
          this.notificacoes.success(`Acesso ao módulo ${nomeModulo} liberado para ${decidido.Nome}. Vale no próximo clique da pessoa, sem precisar sair e entrar de novo.`);
        } else {
          this.notificacoes.success(`Pedido recusado. ${decidido.Nome} vai ver o motivo no card do módulo.`);
        }
        this.pedidos.atualizarPendentes();
        this.decidiu.emit(decidido);
        this.buscarDepoisDaDecisao(decisao.pedido.Id);
      },
      error: err => {
        this.salvando = false;
        const mensagem = err?.error?.Message || 'Não foi possível registrar a decisão. Tente de novo.';
        if (err?.status === 409) {
          // Outra pessoa decidiu antes: mostra a fila como está agora
          this.notificacoes.warning(mensagem);
          this.decisao = null;
          this.pedidos.atualizarPendentes();
          this.buscarDepoisDaDecisao(decisao.pedido.Id);
        } else {
          this.notificacoes.error(mensagem);
        }
      }
    });
  }
}
