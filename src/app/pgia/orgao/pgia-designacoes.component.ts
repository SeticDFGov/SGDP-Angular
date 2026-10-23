import { AfterViewChecked, Component, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NOMES_DESIGNACAO,
  PgiaDesignacao,
  PgiaOrgao,
  PgiaPessoa,
  PgiaPosicaoDesignacao,
  PgiaTipoDesignacao,
  POSICOES_DESIGNACAO
} from '../../../api/pgia/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaAnexoComponent } from '../shared/pgia-anexo.component';
import { mensagemDoErro } from '../shared/mensagem-erro';
import { PgiaTrilhaEstadoService } from '../trilha/pgia-trilha-estado.service';
import { ModoFormDesignacao, PgiaDesignacaoFormComponent } from './pgia-designacao-form.component';

interface FormAberto {
  modo: ModoFormDesignacao;
  posicao: PgiaPosicaoDesignacao;
  designacao: PgiaDesignacao | null;
  /** Botão que abriu: o foco volta a ele no "Cancelar". */
  origem: string;
}

/** Posição da designação (a resposta antiga não traz o campo: vale titular). */
export function posicaoDe(d: PgiaDesignacao): PgiaPosicaoDesignacao {
  return d.Posicao ?? 'Titular';
}

/**
 * Uma designação do órgão (Responsável de IA, Encarregado de Dados ou Curador de
 * Dados de Negócio): titular e suplente vigentes lado a lado, cada um com o
 * botão de designar ou trocar e o de completar ou corrigir o ato, e o histórico
 * com a posição.
 */
@Component({
  selector: 'app-pgia-designacoes',
  standalone: true,
  imports: [CommonModule, PgiaAnexoComponent, PgiaDesignacaoFormComponent],
  host: { class: 'block' },
  templateUrl: './pgia-designacoes.component.html'
})
export class PgiaDesignacoesComponent implements OnChanges, AfterViewChecked {
  @Input({ required: true }) tipo!: PgiaTipoDesignacao;
  @Input({ required: true }) orgao!: PgiaOrgao;
  @Input() pessoas: PgiaPessoa[] = [];
  /** POST: equipe do órgão e admin. */
  @Input() podeDesignar = false;
  /** PUT do ato: equipe do órgão, SGDI e admin. */
  @Input() podeCompletar = false;

  readonly posicoes = POSICOES_DESIGNACAO;

  carregando = true;
  erroCarga: string | null = null;
  lista: PgiaDesignacao[] = [];
  vigentes: Partial<Record<PgiaPosicaoDesignacao, PgiaDesignacao | null>> = {};
  historico: PgiaDesignacao[] = [];
  form: FormAberto | null = null;
  private focoPendente: string | null = null;

  constructor(
    private orgaoService: PgiaOrgaoService,
    private notificationService: NotificationService,
    private trilhaEstado: PgiaTrilhaEstadoService,
    private elemento: ElementRef<HTMLElement>
  ) {}

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['orgao'] || mudancas['tipo']) this.carregar();
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente) return;
    const alvo = this.elemento.nativeElement.querySelector<HTMLElement>('#' + this.focoPendente);
    this.focoPendente = null;
    alvo?.focus();
  }

  get nome(): string {
    return NOMES_DESIGNACAO[this.tipo];
  }

  /** Prefixo dos ids desta designação (as três ficam na mesma página). */
  get base(): string {
    return 'des-' + this.tipo;
  }

  carregar(): void {
    if (!this.orgao) return;
    this.carregando = true;
    this.erroCarga = null;
    this.orgaoService.listarDesignacoes(this.orgao.Id, this.tipo).subscribe({
      next: lista => {
        this.aplicarLista(lista);
        this.carregando = false;
      },
      error: err => {
        this.carregando = false;
        this.erroCarga = mensagemDoErro(err, `Não foi possível carregar as designações de ${this.nome}.`);
      }
    });
  }

  private aplicarLista(lista: PgiaDesignacao[]): void {
    this.lista = lista;
    this.vigentes = {
      Titular: lista.find(d => d.Ativo && posicaoDe(d) === 'Titular') ?? null,
      Suplente: lista.find(d => d.Ativo && posicaoDe(d) === 'Suplente') ?? null
    };
    this.historico = lista.filter(d => !d.Ativo);
  }

  posicaoDe(d: PgiaDesignacao): PgiaPosicaoDesignacao {
    return posicaoDe(d);
  }

  idBotao(acao: string, chave: string | number): string {
    return `${this.base}-${acao}-${chave}`;
  }

  // ── Formulários ───────────────────────────────────────────────────────────

  abrirDesignar(posicao: PgiaPosicaoDesignacao): void {
    this.form = { modo: 'designar', posicao, designacao: null, origem: this.idBotao('designar', posicao) };
    this.focoPendente = `${this.base}-form-titulo`;
  }

  abrirAto(designacao: PgiaDesignacao, origem: string): void {
    this.form = { modo: 'ato', posicao: posicaoDe(designacao), designacao, origem };
    this.focoPendente = `${this.base}-form-titulo`;
  }

  cancelarForm(): void {
    const origem = this.form?.origem ?? null;
    this.form = null;
    this.focoPendente = origem;
  }

  aoSalvar(designacao: PgiaDesignacao): void {
    const modo = this.form?.modo;
    this.form = null;
    const posicao = posicaoDe(designacao).toLowerCase();
    this.notificationService.success(modo === 'ato'
      ? `Ato da designação de ${designacao.AgenteNome} (${posicao}) salvo.`
      : `${designacao.AgenteNome} designado(a) ${posicao}: ${this.nome}. A comunicação à SGDI fica registrada no processo SEI informado.`);
    // O foco vai para o bloco da posição salva, que mostra o resultado
    this.focoPendente = `${this.base}-bloco-${posicaoDe(designacao)}`;
    this.trilhaEstado.atualizarStatus(true);
    this.orgaoService.listarDesignacoes(this.orgao.Id, this.tipo).subscribe({
      next: lista => this.aplicarLista(lista),
      error: () => this.carregar()
    });
  }
}
