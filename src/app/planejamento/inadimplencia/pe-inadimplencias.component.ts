import { AfterViewChecked, Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription } from 'rxjs';
import {
  PeInadimplencia, PeMotivoInadimplencia, PeOrgaoNivel, PeSituacaoInadimplencia
} from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { mensagemErroPe } from '../shared/pe-erros';
import {
  LIMITES_INADIMPLENCIA, MOTIVOS_INADIMPLENCIA, OBRIGACAO_PADRAO, SITUACOES_INADIMPLENCIA, quandoPodeRegistrar,
  rotuloSituacaoInadimplencia, situacaoInadimplenciaValida, textoPrazoInadimplencia
} from '../shared/pe-inadimplencia-rotulos';
import { idDoParametro, orgaosEmOrdem } from '../shared/pe-paineis-rotulos';
import { dataValida, hojeIso, textoData } from '../shared/registros/pe-valores';
import { PeInadimplenciasService } from '../services/pe-inadimplencias.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import { BASE_PE, rotaPaginaOrgao } from '../trilha/pe-trilhas';
import { PeInadimplenciaDetalheComponent } from './pe-inadimplencia-detalhe.component';
import { PeInadimplenciasOrgaoComponent } from './pe-inadimplencias-orgao.component';

/** As quatro ações, cada uma na sua janela. */
type Janela = 'notificar' | 'justificar' | 'registrar' | 'sanear';

type CampoInad =
  | 'orgao' | 'obrigacao' | 'prazo' | 'data' | 'documento' | 'sei'
  | 'justificativa' | 'motivo' | 'nota' | 'controle' | 'saneado' | 'observacao';

/** Os campos de cada janela, na ordem da tela (o foco vai para o primeiro com problema). */
const CAMPOS: Record<Janela, CampoInad[]> = {
  notificar: ['orgao', 'obrigacao', 'prazo', 'data', 'documento', 'sei'],
  justificar: ['justificativa'],
  registrar: ['motivo', 'nota', 'controle'],
  sanear: ['saneado', 'observacao']
};

/** Id do controle de cada campo (o do motivo é o grupo dos botões de opção). */
const IDS: Record<CampoInad, string> = {
  orgao: 'pe-inad-orgao',
  obrigacao: 'pe-inad-obrigacao',
  prazo: 'pe-inad-prazo',
  data: 'pe-inad-data',
  documento: 'pe-inad-documento',
  sei: 'pe-inad-sei',
  justificativa: 'pe-inad-justificativa',
  motivo: 'pe-inad-motivo',
  nota: 'pe-inad-nota',
  controle: 'pe-inad-controle',
  saneado: 'pe-inad-saneado',
  observacao: 'pe-inad-observacao'
};

/** A chave do 400 com `Campos` (o nome da propriedade do corpo, sem caixa) para o campo da tela. */
const DO_SERVIDOR: Record<string, CampoInad> = {
  orgaoid: 'orgao',
  obrigacao: 'obrigacao',
  prazodescumprido: 'prazo',
  notificadoem: 'data',
  documento: 'documento',
  sei: 'sei',
  justificativa: 'justificativa',
  motivo: 'motivo',
  notamotivacao: 'nota',
  comunicadocontroleem: 'controle',
  saneadoem: 'saneado',
  observacao: 'observacao'
};

interface FormInad {
  orgao: string;
  obrigacao: string;
  prazo: string;
  data: string;
  documento: string;
  sei: string;
  justificativa: string;
  motivo: PeMotivoInadimplencia | '';
  nota: string;
  controle: string;
  saneado: string;
  observacao: string;
}

const TAMANHO_PAGINA = 20;

function formVazio(): FormInad {
  return {
    orgao: '', obrigacao: '', prazo: '', data: '', documento: '', sei: '', justificativa: '', motivo: '', nota: '', controle: '',
    saneado: '', observacao: ''
  };
}

/**
 * Notificações e inadimplências (E8; passo 4.4 do administrador e 3.1 da SGDI):
 * o art. 11 do Decreto nº 48.899/2026 na tela.
 *
 * - A lista (GET inadimplencias, as em aberto primeiro, "Carregar mais"), com a
 *   situação em selo de texto e ícone, o prazo e os dias úteis restantes; filtros
 *   pela situação e pelo órgão no endereço (`?situacao=`, `?orgao=`), que valem na
 *   hora (o painel abre a lista dos inadimplentes por aqui).
 * - As ações, só para o administrador do módulo, a SGDI e o admin do SGDP, cada
 *   uma numa janela da `DialogoDirective` (foco preso, Esc fecha, foco de volta; o
 *   botão da janela é a confirmação, nunca `confirm`): registrar a notificação
 *   (o órgão, a comunicação pendente, o prazo descumprido, a data, o documento e
 *   o SEI; o servidor conta os 5 dias úteis), aceitar a justificativa (encerra),
 *   registrar a inadimplência (o motivo e a nota de motivação; só com o prazo
 *   vencido: o botão diz desde quando fica disponível) e registrar o saneamento
 *   (a data; a marca sai do painel). Erro por campo, ligado ao campo, com o foco
 *   no primeiro; o 400 com `Campos` volta para os mesmos campos; o 409 fica na
 *   janela e a lista vem de novo.
 * - A Secretaria do CGTIC só lê. A equipe e a consulta do órgão veem as
 *   notificações do próprio órgão (só leitura) e a tela não consulta a lista geral
 *   (o 403 tiraria a pessoa do módulo).
 */
@Component({
  selector: 'app-pe-inadimplencias',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective, DialogoDirective,
    PeInadimplenciaDetalheComponent, PeInadimplenciasOrgaoComponent
  ],
  templateUrl: './pe-inadimplencias.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeInadimplenciasComponent implements OnInit, AfterViewChecked {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly inadimplenciasService = inject(PeInadimplenciasService);
  private readonly notificacoes = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly base = BASE_PE;
  readonly ids = IDS;
  readonly limites = LIMITES_INADIMPLENCIA;
  readonly situacoes = SITUACOES_INADIMPLENCIA;
  readonly motivos = MOTIVOS_INADIMPLENCIA;
  readonly hoje = hojeIso();

  podeVer: boolean | null = null;
  podeRegistrar = false;
  erroPapel = false;
  /** Papel de órgão: as notificações do próprio órgão, só para ler. */
  meuOrgao: number | null = null;
  siglaMeuOrgao = '';
  private iniciado = false;

  /** Os órgãos (a lista que a moldura carrega); null enquanto não chegou. */
  orgaos: PeOrgaoNivel[] | null = null;

  /** Os filtros aplicados (os do endereço) e as listas da tela. */
  filtroSituacao: PeSituacaoInadimplencia | null = null;
  filtroOrgao: number | null = null;
  situacaoEscolhida = '';
  orgaoEscolhido = '';

  itens: PeInadimplencia[] = [];
  total = 0;
  pagina = 1;
  temMais = false;
  carregando = false;
  carregou = false;
  erroLista: string | null = null;
  private carga?: Subscription;

  // A janela da ação
  janela: Janela | null = null;
  alvo: PeInadimplencia | null = null;
  form: FormInad = formVazio();
  tentou = false;
  gravando = false;
  errosServidor: Partial<Record<CampoInad, string>> = {};
  erroJanela: string | null = null;
  private focoPendente: string | null = null;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.erroPapel = estado.consultaPapel === 'erro';
        this.podeVer = this.estadoService.veTodosOsOrgaos;
        this.podeRegistrar = this.estadoService.podeRegistrarInadimplencia === true;
        this.meuOrgao = this.estadoService.orgaoDoPapel;
        this.siglaMeuOrgao = estado.meuPapel?.OrgaoSigla ?? '';
        if (this.podeVer && !this.iniciado) {
          this.iniciado = true;
          this.estadoService.orgaos$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(orgaos => this.orgaos = orgaos ? orgaosEmOrdem(orgaos) : null);
          this.rota.queryParamMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(params => this.lerFiltros(params.get('situacao'), params.get('orgao')));
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

  tentarPapelDeNovo(): void {
    this.estadoService.iniciar();
  }

  paginaDoMeuOrgao(): string | null {
    return this.meuOrgao ? rotaPaginaOrgao(this.meuOrgao) : null;
  }

  // ── Filtros no endereço ───────────────────────────────────────────────────

  private lerFiltros(situacaoBruta: string | null, orgaoBruto: string | null): void {
    const situacao = situacaoInadimplenciaValida(situacaoBruta);
    const orgao = idDoParametro(orgaoBruto);
    const mudou = situacao !== this.filtroSituacao || orgao !== this.filtroOrgao || !this.carregou;
    this.filtroSituacao = situacao;
    this.filtroOrgao = orgao;
    this.situacaoEscolhida = situacao ?? '';
    this.orgaoEscolhido = orgao !== null ? String(orgao) : '';
    if (mudou) this.buscar();
  }

  aplicarFiltros(): void {
    this.router.navigate([], {
      relativeTo: this.rota,
      queryParams: {
        situacao: situacaoInadimplenciaValida(this.situacaoEscolhida),
        orgao: idDoParametro(this.orgaoEscolhido) !== null ? this.orgaoEscolhido : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  limparFiltros(): void {
    this.situacaoEscolhida = '';
    this.orgaoEscolhido = '';
    this.aplicarFiltros();
  }

  get filtrosAtivos(): boolean {
    return this.filtroSituacao !== null || this.filtroOrgao !== null;
  }

  /** "Situação: Inadimplente e órgão SES", para dizer o que está filtrado. */
  get descricaoFiltros(): string {
    const partes: string[] = [];
    if (this.filtroSituacao) partes.push(`situação ${rotuloSituacaoInadimplencia(this.filtroSituacao).toLowerCase()}`);
    if (this.filtroOrgao !== null) partes.push(`órgão ${this.siglaDoOrgao(this.filtroOrgao)}`);
    return partes.join(' e ');
  }

  private siglaDoOrgao(id: number): string {
    return this.orgaos?.find(o => o.OrgaoId === id)?.Sigla ?? 'escolhido';
  }

  // ── Lista ─────────────────────────────────────────────────────────────────

  buscar(): void {
    this.itens = [];
    this.pagina = 1;
    this.carregar();
  }

  carregarMais(): void {
    if (!this.temMais || this.carregando) return;
    this.pagina++;
    this.carregar();
  }

  carregar(): void {
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erroLista = null;
    const pagina = this.pagina;
    this.carga = this.inadimplenciasService.listar({
      Situacao: this.filtroSituacao, OrgaoId: this.filtroOrgao, Page: pagina, PageSize: TAMANHO_PAGINA
    }).subscribe({
      next: resposta => {
        this.carregando = false;
        this.carregou = true;
        const novos = resposta?.Items ?? [];
        this.itens = pagina === 1 ? [...novos] : [...this.itens, ...novos];
        this.total = resposta?.TotalItems ?? this.itens.length;
        this.temMais = !!resposta?.HasNextPage;
      },
      error: erro => {
        this.carregando = false;
        this.carregou = true;
        if (pagina > 1) this.pagina--;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, 'Não foi possível carregar as notificações e inadimplências. Tente de novo em alguns instantes.');
        if (mensagem !== null) this.erroLista = mensagem;
      }
    });
  }

  quandoPodeRegistrar(i: PeInadimplencia): string | null {
    return quandoPodeRegistrar(i);
  }

  porId(_: number, i: PeInadimplencia): number {
    return i.Id;
  }

  porOrgao(_: number, o: PeOrgaoNivel): number {
    return o.OrgaoId;
  }

  porValor(_: number, x: { valor: string }): string {
    return x.valor;
  }

  // ── Janela da ação ────────────────────────────────────────────────────────

  get tituloJanela(): string {
    switch (this.janela) {
      case 'notificar': return 'Registrar uma notificação';
      case 'justificar': return 'Aceitar a justificativa do órgão';
      case 'registrar': return 'Registrar a inadimplência';
      case 'sanear': return 'Registrar o saneamento';
      default: return '';
    }
  }

  get botaoJanela(): string {
    switch (this.janela) {
      case 'notificar': return this.gravando ? 'Registrando...' : 'Registrar a notificação';
      case 'justificar': return this.gravando ? 'Registrando...' : 'Aceitar a justificativa';
      case 'registrar': return this.gravando ? 'Registrando...' : 'Registrar a inadimplência';
      case 'sanear': return this.gravando ? 'Registrando...' : 'Registrar o saneamento';
      default: return '';
    }
  }

  /** O órgão e a notificação da janela, em texto (contexto da ação). */
  prazoDoAlvo(): string {
    return this.alvo ? textoPrazoInadimplencia(this.alvo) : '';
  }

  dataDoAlvo(): string {
    return this.alvo ? textoData(this.alvo.NotificadoEm) : '';
  }

  abrir(janela: Janela, alvo: PeInadimplencia | null = null): void {
    if (!this.podeRegistrar) return;
    if (janela === 'registrar' && alvo && !alvo.Vencido) return;
    this.janela = janela;
    this.alvo = alvo;
    this.form = formVazio();
    this.tentou = false;
    this.errosServidor = {};
    this.erroJanela = null;
    if (janela === 'notificar') {
      this.form.orgao = this.filtroOrgao !== null ? String(this.filtroOrgao) : '';
      this.form.obrigacao = OBRIGACAO_PADRAO;
      this.form.data = this.hoje;
    }
    if (janela === 'sanear') this.form.saneado = this.hoje;
  }

  fechar(): void {
    if (!this.gravando) this.janela = null;
  }

  recarregarOrgaos(): void {
    this.estadoService.carregarOrgaos();
  }

  // ── Conferência ───────────────────────────────────────────────────────────

  erro(campo: CampoInad): string | null {
    const servidor = this.errosServidor[campo];
    if (servidor) return servidor;
    if (!this.tentou) return null;
    const f = this.form;
    const notificado = this.alvo?.NotificadoEm ?? '';
    switch (campo) {
      case 'orgao':
        return idDoParametro(f.orgao) !== null ? null : 'Escolha o órgão notificado.';
      case 'obrigacao':
        return this.texto(f.obrigacao, LIMITES_INADIMPLENCIA.obrigacao, 'Diga qual comunicação está pendente.');
      case 'prazo':
        return this.texto(f.prazo, LIMITES_INADIMPLENCIA.prazoDescumprido, 'Informe o prazo que o órgão descumpriu.');
      case 'data':
        return this.data(f.data, true, 'Informe a data da notificação.', 'A data da notificação não pode ser depois de hoje.', '');
      case 'documento':
        return this.texto(f.documento, LIMITES_INADIMPLENCIA.documento, 'Informe o documento da notificação (o ofício, por exemplo).');
      case 'sei':
        return f.sei.trim().length > LIMITES_INADIMPLENCIA.sei ? `Escreva até ${LIMITES_INADIMPLENCIA.sei} caracteres.` : null;
      case 'justificativa':
        return this.texto(f.justificativa, LIMITES_INADIMPLENCIA.justificativa, 'Escreva a justificativa que o órgão apresentou e a SGDI aceitou.');
      case 'motivo':
        return f.motivo ? null : 'Escolha o motivo da inadimplência.';
      case 'nota':
        return this.texto(f.nota, LIMITES_INADIMPLENCIA.nota, 'Escreva a nota de motivação.');
      case 'controle':
        return this.data(f.controle, false, '', 'A comunicação ao controle interno não pode ser depois de hoje.', notificado,
          'A comunicação ao controle interno vem depois da notificação.');
      case 'saneado':
        return this.data(f.saneado, true, 'Informe a data do saneamento.', 'A data do saneamento não pode ser depois de hoje.', notificado,
          'O saneamento vem depois da notificação.');
      case 'observacao':
        return f.observacao.trim().length > LIMITES_INADIMPLENCIA.observacao ? `Escreva até ${LIMITES_INADIMPLENCIA.observacao} caracteres.` : null;
      default:
        return null;
    }
  }

  private texto(valor: string, limite: number, vazio: string): string | null {
    const t = valor.trim();
    if (!t) return vazio;
    return t.length > limite ? `Escreva até ${limite} caracteres (agora são ${t.length}).` : null;
  }

  /** Data pura: obrigatória ou não, válida, até hoje e, quando há, não antes de `depoisDe`. */
  private data(valor: string, obrigatoria: boolean, vazio: string, futura: string, depoisDe: string, antes = ''): string | null {
    if (!valor) return obrigatoria ? vazio : null;
    if (!dataValida(valor)) return 'Informe uma data válida (dia, mês e ano).';
    if (valor > this.hoje) return futura;
    if (depoisDe && antes && valor < depoisDe) return antes;
    return null;
  }

  get errosForm(): { campo: CampoInad; mensagem: string }[] {
    if (!this.janela) return [];
    return CAMPOS[this.janela].map(campo => ({ campo, mensagem: this.erro(campo) ?? '' })).filter(e => !!e.mensagem);
  }

  /** `aria-describedby` do controle: a ajuda (quando há) e o erro. */
  descritores(campo: CampoInad, ajuda?: string): string | null {
    const ids = [ajuda, this.erro(campo) ? `${IDS[campo]}-erro` : null].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  /** O campo mudou: a mensagem do servidor para ele sai (a conferência da tela continua). */
  mudou(campo: CampoInad): void {
    if (this.errosServidor[campo]) {
      const resto = { ...this.errosServidor };
      delete resto[campo];
      this.errosServidor = resto;
    }
  }

  focar(campo: CampoInad): void {
    this.focoPendente = IDS[campo];
  }

  // ── Envio ─────────────────────────────────────────────────────────────────

  confirmar(): void {
    const janela = this.janela;
    if (!janela || this.gravando) return;
    this.tentou = true;
    this.erroJanela = null;
    const erros = this.errosForm;
    if (erros.length) {
      this.focoPendente = IDS[erros[0].campo];
      return;
    }
    const pedido = this.pedido(janela);
    if (!pedido) return;
    const alvo = this.alvo;
    this.gravando = true;
    pedido.subscribe({
      next: resultado => {
        this.gravando = false;
        this.janela = null;
        this.notificacoes.success(this.mensagemSucesso(janela, resultado));
        if (janela === 'notificar' || !resultado) this.buscar();
        else this.itens = this.itens.map(i => (i.Id === resultado.Id ? resultado : i));
        // O passo da inadimplência mostra as notificações com o prazo vencido
        this.estadoService.atualizarStatus(true);
      },
      error: erro => {
        this.gravando = false;
        const padrao = 'Não foi possível registrar. Confira os dados e tente de novo.';
        const mensagem = mensagemErroPe(erro, padrao);
        if (mensagem === null) {
          this.janela = null;
          return;
        }
        const status = (erro as { status?: number } | null)?.status;
        if (status === 409) {
          // A notificação mudou por fora, ou o prazo ainda não venceu: a mensagem fica na janela, e a lista vem de novo
          this.erroJanela = mensagem;
          this.focoPendente = 'pe-inad-erro-janela';
          if (alvo) this.buscar();
          return;
        }
        this.errosServidor = this.errosDoServidor(erro);
        const primeiro = CAMPOS[janela].find(c => !!this.errosServidor[c]);
        if (primeiro) {
          this.focoPendente = IDS[primeiro];
        } else {
          this.erroJanela = mensagem;
          this.focoPendente = 'pe-inad-erro-janela';
        }
      }
    });
  }

  private pedido(janela: Janela): Observable<PeInadimplencia> | null {
    const f = this.form;
    const texto = (v: string) => v.trim() || null;
    switch (janela) {
      case 'notificar': {
        const orgao = idDoParametro(f.orgao);
        if (orgao === null) return null;
        return this.inadimplenciasService.notificar(orgao, {
          Obrigacao: f.obrigacao.trim(),
          PrazoDescumprido: texto(f.prazo),
          NotificadoEm: f.data,
          Documento: f.documento.trim(),
          Sei: texto(f.sei)
        });
      }
      case 'justificar':
        return this.alvo ? this.inadimplenciasService.justificar(this.alvo.Id, { Justificativa: f.justificativa.trim() }) : null;
      case 'registrar':
        return this.alvo && f.motivo
          ? this.inadimplenciasService.registrar(this.alvo.Id, {
            Motivo: f.motivo, NotaMotivacao: f.nota.trim(), ComunicadoControleEm: f.controle || null
          })
          : null;
      case 'sanear':
        return this.alvo ? this.inadimplenciasService.sanear(this.alvo.Id, { SaneadoEm: f.saneado, Observacao: texto(f.observacao) }) : null;
    }
  }

  private mensagemSucesso(janela: Janela, i: PeInadimplencia | null): string {
    const sigla = i?.OrgaoSigla ?? this.alvo?.OrgaoSigla ?? '';
    const orgao = sigla ? ` do órgão ${sigla}` : '';
    switch (janela) {
      case 'notificar':
        return i?.Prazo
          ? `Notificação${orgao} registrada. O prazo de 5 dias úteis vai até ${textoData(i.Prazo)}.`
          : `Notificação${orgao} registrada. O órgão tem 5 dias úteis para regularizar ou se justificar.`;
      case 'justificar': return `Justificativa${orgao} aceita. A notificação está encerrada.`;
      case 'registrar': return `Inadimplência${orgao} registrada. Ela fica no painel até o saneamento.`;
      case 'sanear': return `Saneamento${orgao} registrado. A marca sai do painel.`;
    }
  }

  private errosDoServidor(erro: unknown): Partial<Record<CampoInad, string>> {
    const campos = (erro as { error?: { Campos?: unknown } } | null)?.error?.Campos;
    const erros: Partial<Record<CampoInad, string>> = {};
    if (!campos || typeof campos !== 'object') return erros;
    for (const [chave, mensagem] of Object.entries(campos as Record<string, unknown>)) {
      const campo = DO_SERVIDOR[chave.toLowerCase()];
      const texto = Array.isArray(mensagem) ? mensagem.filter(m => typeof m === 'string').join(' ') : mensagem;
      if (campo && typeof texto === 'string' && texto.trim()) erros[campo] = texto.trim();
    }
    return erros;
  }
}
