import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
export class PedidosAcessoFilaComponent implements OnInit {
  /** Mostra só os pedidos deste módulo e esconde o filtro de módulo. */
  @Input() moduloFixo: string | null = null;

  /** Um pedido foi aprovado ou recusado: a tela que embute a fila atualiza o que depende dele. */
  @Output() decidiu = new EventEmitter<PedidoAcesso>();

  private readonly pedidos = inject(PedidosAcessoService);
  private readonly notificacoes = inject(NotificationService);

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

  // ── Listagem ──────────────────────────────────────────────────────────────

  buscar(page = 1): void {
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
          this.buscar(this.page - 1);
          return;
        }
        this.pagina = pagina;
        this.carregando = false;
        if (this.decisao && !pagina.Items.some(p => p.Id === this.decisao!.pedido.Id)) this.decisao = null;
      },
      error: () => {
        this.carregando = false;
        this.erroCarga = true;
      }
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

  // ── Decisão ───────────────────────────────────────────────────────────────

  abrirDecisao(pedido: PedidoAcesso, tipo: 'aprovar' | 'recusar'): void {
    if (this.decisao?.pedido.Id === pedido.Id && this.decisao.tipo === tipo) {
      this.decisao = null;
      return;
    }
    this.decisao = { pedido, tipo, papelPgia: null, papelPlanejamento: null, motivo: '', tentouEnviar: false };
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
    if (decisao.tipo === 'recusar' && !decisao.motivo.trim()) return;
    if (this.papelPlanejamentoFaltando) return;

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
        const nomeModulo = this.modulo(decidido.Modulo)?.nome ?? decidido.Modulo;
        if (decidido.Situacao === SituacoesPedidoAcesso.Aprovado) {
          this.notificacoes.success(`Acesso a ${nomeModulo} liberado para ${decidido.Nome}. Vale no próximo clique da pessoa, sem precisar sair e entrar de novo.`);
        } else {
          this.notificacoes.success(`Pedido recusado. ${decidido.Nome} vai ver o motivo no card do módulo.`);
        }
        this.pedidos.atualizarPendentes();
        this.decidiu.emit(decidido);
        this.buscar(this.page);
      },
      error: err => {
        this.salvando = false;
        const mensagem = err?.error?.Message || 'Não foi possível registrar a decisão. Tente de novo.';
        if (err?.status === 409) {
          // Outra pessoa decidiu antes: mostra a fila como está agora
          this.notificacoes.warning(mensagem);
          this.decisao = null;
          this.pedidos.atualizarPendentes();
          this.buscar(this.page);
        } else {
          this.notificacoes.error(mensagem);
        }
      }
    });
  }
}
