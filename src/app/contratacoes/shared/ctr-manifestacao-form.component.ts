import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  ATOS_TCDF,
  CATEGORIAS_OBJETO,
  CtrComunicacaoTcdfForm,
  CtrManifestacaoForm,
  CtrProcesso,
  ORIGEM_TCDF,
  PRAZO_REGULARIZACAO_PADRAO,
  REGEX_NUMERO_SEI,
  STATUS_TCDF
} from '../../../api/contratacoes/interface';
import { semCarregamento } from '../../core/carregamento/sem-carregamento';
import { CtrProcessoService } from '../services/ctr-processo.service';
import {
  badgeCriticidade,
  badgeSituacao,
  digitarCaixaAlta,
  digitarNumeroSei,
  formatarNumeroReais,
  formatarReais,
  lerReais
} from './ctr-rotulos';

/**
 * A contratação à qual a comunicação se liga (um processo já cadastrado), com o
 * que o resumo mostra. Um `CtrProcesso` serve; na página da manifestação o resumo
 * é montado com os espelhos que a resposta dela traz.
 */
export interface CtrContratacaoResumo {
  /** Id do PROCESSO. */
  Id: number;
  NumeroProcesso: string;
  OrgaoNome: string;
  OrgaoSigla: string;
  Objeto: string;
  CategoriaObjeto?: string | null;
  ValorEstimado?: number | null;
  Criticidade?: string | null;
  Origem?: string | null;
  Situacao?: string | null;
}

/** A contratação que o módulo ainda não tem, como está sendo digitada. */
interface ContratacaoNova {
  OrgaoNome: string;
  OrgaoSigla: string;
  Objeto: string;
  CategoriaObjeto: string;
}

/**
 * Formulário da comunicação do TCDF e da manifestação da SGDI, reaproveitado por
 * "nova" e por "editar". Quatro partes, na ordem pedida pela equipe da SGDI em
 * 2026-09-23:
 *
 * 1. **Comunicação do TCDF**: o processo SEI de comunicação à SGDI, o ofício, o
 *    ato (Despacho Singular ou Decisão, com o número) e a data de recebimento.
 * 2. **Contratação auditada**: na "nova", o órgão, o objeto, a categoria e o valor
 *    da contratação que o módulo ainda não tem (o servidor a grava como processo de
 *    origem TCDF, sem os critérios de criticidade que o Tribunal não traz), ou o
 *    processo já cadastrado, achado pela busca. Na "editar", só o resumo.
 * 3. **Situação no Portfólio**: o despacho padrão, na literalidade (textos das
 *    alternativas iguais aos do documento), com os blocos exclusivos dos incisos I
 *    e II. O que não vale para o inciso escolhido é enviado como nulo: o backend
 *    recusa campo de bloco inativo preenchido.
 * 4. **Acompanhamento**: status no TCDF, esclarecimentos adicionais e observação,
 *    que não entram no despacho.
 *
 * A criticidade **não é editada aqui**: é atributo da contratação e mora no
 * cadastro do processo. Por isso o inciso I (que a reporta) exige a comunicação
 * ligada ao processo já acompanhado.
 *
 * As citações de artigos da IN viram chips pela diretiva `citaIn`, no raiz das
 * páginas que embutem este formulário.
 */
@Component({
  selector: 'app-ctr-manifestacao-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ctr-manifestacao-form.component.html'
})
export class CtrManifestacaoFormComponent implements OnChanges, AfterViewChecked {
  @Input() valor: CtrManifestacaoForm | null = null;
  @Input() salvando = false;
  @Input() rotuloSalvar = 'Salvar manifestação';
  /** Processo da contratação a que a comunicação se liga; nulo = contratação nova. */
  @Input() contratacao: CtrContratacaoResumo | null = null;
  /**
   * Na "nova": dá para buscar e trocar o processo ou informar uma contratação
   * nova. Na "editar" a contratação é só consulta (a manifestação não muda de
   * processo).
   */
  @Input() permitirVincular = false;
  /**
   * Os quatro dados da comunicação são obrigatórios? Sim na "nova" e nas
   * manifestações que já os têm; as registradas antes deles (2026-09-23) podem
   * seguir com os quatro em branco, ou com os quatro preenchidos.
   */
  @Input() exigirComunicacao = true;
  /** Siglas já usadas, para o autocompletar da contratação nova. */
  @Input() siglas: string[] = [];

  @Output() salvar = new EventEmitter<CtrComunicacaoTcdfForm>();
  @Output() cancelar = new EventEmitter<void>();
  /** Escolheu um processo na busca (a página põe o contexto na URL). */
  @Output() vincular = new EventEmitter<CtrProcesso>();
  /** Tirou o processo escolhido (volta a valer a contratação nova). */
  @Output() desvincular = new EventEmitter<void>();

  readonly atos = ATOS_TCDF;
  readonly categorias = CATEGORIAS_OBJETO;
  readonly statusTcdf = STATUS_TCDF;
  readonly origemTcdf = ORIGEM_TCDF;
  readonly prazoPadrao = PRAZO_REGULARIZACAO_PADRAO;
  badgeCriticidade = badgeCriticidade;
  badgeSituacao = badgeSituacao;
  formatarReais = formatarReais;

  form: CtrManifestacaoForm = CtrManifestacaoFormComponent.vazio();
  nova: ContratacaoNova = CtrManifestacaoFormComponent.contratacaoVazia();
  /** O que está escrito no campo do valor (o número sai de `lerReais` no envio). */
  valorTexto = '';
  submetido = false;

  // Busca de processo já cadastrado (só na "nova")
  buscaAberta = false;
  termoBusca = '';
  resultados: CtrProcesso[] = [];
  buscando = false;
  buscou = false;
  erroBusca = false;
  /** Processo ativo com o mesmo número do processo de comunicação digitado. */
  sugestao: CtrProcesso | null = null;
  private consultaSugestao = 0;
  private numeroConsultado = '';

  private readonly processoService = inject(CtrProcessoService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Tentativa de salvar recusada: levar a pessoa ao primeiro problema na próxima renderização. */
  private irAoProblema = false;

  static vazio(): CtrManifestacaoForm {
    return {
      OficioTcdf: '', DataOficio: '',
      ProcessoComunicacaoTcdf: '', DataRecebimento: null, AtoTcdf: null, NumeroAtoTcdf: '',
      // Sem inciso marcado: a escolha é de quem registra (o inciso I pede o processo já acompanhado)
      SituacaoPortfolio: '',
      ComunicadaDesde: null, ResultadoAnalise: null,
      RecomendouSuspensao: false, ComunicouControleInterno: false, DesfechoRisco: null,
      PrazoRegularizacaoDias: null, EsclarecimentosAdicionais: null, StatusTcdf: null, Observacao: null
    };
  }

  private static contratacaoVazia(): ContratacaoNova {
    return { OrgaoNome: '', OrgaoSigla: '', Objeto: '', CategoriaObjeto: '' };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valor']) {
      this.submetido = false;
      this.form = this.valor
        ? { ...CtrManifestacaoFormComponent.vazio(), ...this.valor }
        : CtrManifestacaoFormComponent.vazio();
    }
    if (changes['contratacao']) {
      if (this.contratacao) {
        // Com o processo escolhido não há o que sugerir nem buscar
        this.sugestao = null;
        this.fecharBusca();
      } else if (!changes['contratacao'].firstChange) {
        // Voltou a ser contratação nova ("Trocar"): o número digitado pode ser de processo cadastrado
        this.numeroConsultado = '';
        this.procurarMesmoNumero();
      }
    }
  }

  // ── Comunicação do TCDF ───────────────────────────────────────────────────

  aoDigitarProcessoTcdf(evento: Event): void {
    this.form.ProcessoComunicacaoTcdf = digitarNumeroSei(evento.target as HTMLInputElement);
    this.procurarMesmoNumero();
  }

  /**
   * Número completo e contratação nova: procura um processo ativo com o mesmo
   * número (ofício novo sobre uma contratação que o módulo já tem). Achando, a
   * tela sugere usar o processo; cadastrar de novo seria recusado pelo servidor.
   */
  private procurarMesmoNumero(): void {
    const numero = (this.form.ProcessoComunicacaoTcdf || '').trim();
    if (!this.permitirVincular || this.contratacao || !REGEX_NUMERO_SEI.test(numero)) {
      this.sugestao = null;
      this.numeroConsultado = '';
      return;
    }
    if (numero === this.numeroConsultado) return;
    this.numeroConsultado = numero;
    const consulta = ++this.consultaSugestao;
    // Os concluídos (contrato assinado) também contam: ficam fora da lista por padrão
    // Segundo plano, enquanto a pessoa digita: o aviso com o processo achado é o sinal
    this.processoService.listar({ Filtro: numero, IncluirConcluidos: true, Page: 1, PageSize: 5 }, semCarregamento()).subscribe({
      next: pagina => {
        if (consulta !== this.consultaSugestao) return; // número mudou no meio
        this.sugestao = (pagina.Items ?? []).find(p => p.NumeroProcesso === numero) ?? null;
      },
      // Sem a sugestão o servidor ainda recusa o número repetido, com mensagem
      error: () => {
        if (consulta === this.consultaSugestao) this.sugestao = null;
      }
    });
  }

  // ── Contratação ───────────────────────────────────────────────────────────

  get contratacaoNova(): boolean {
    return this.permitirVincular && !this.contratacao;
  }

  aoDigitarSigla(evento: Event): void {
    this.nova.OrgaoSigla = digitarCaixaAlta(evento.target as HTMLInputElement);
  }

  aoSairDoValor(): void {
    const valor = lerReais(this.valorTexto);
    if (valor !== undefined && valor !== null) this.valorTexto = formatarNumeroReais(valor);
  }

  abrirBusca(): void {
    this.buscaAberta = true;
    // Começa pelo número da comunicação, que costuma ser o do processo procurado
    if (!this.termoBusca) this.termoBusca = (this.form.ProcessoComunicacaoTcdf || '').trim();
  }

  fecharBusca(): void {
    this.buscaAberta = false;
    this.resultados = [];
    this.buscou = false;
    this.erroBusca = false;
  }

  buscarProcessos(): void {
    const termo = this.termoBusca.trim();
    if (!termo || this.buscando) return;
    this.buscando = true;
    this.erroBusca = false;
    this.processoService.listar({ Filtro: termo, IncluirConcluidos: true, Page: 1, PageSize: 20 }).subscribe({
      next: pagina => {
        this.resultados = pagina.Items ?? [];
        this.buscando = false;
        this.buscou = true;
      },
      error: () => {
        this.resultados = [];
        this.buscando = false;
        this.buscou = true;
        this.erroBusca = true;
      }
    });
  }

  escolher(processo: CtrProcesso): void {
    this.vincular.emit(processo);
  }

  // ── Blocos condicionais do despacho ───────────────────────────────────────

  get incisoI(): boolean {
    return this.form.SituacaoPortfolio === 'Comunicada previamente';
  }

  get incisoII(): boolean {
    return this.form.SituacaoPortfolio === 'Não comunicada previamente';
  }

  get temRiscos(): boolean {
    return this.incisoI && this.form.ResultadoAnalise === 'Riscos significativos';
  }

  /**
   * Trocar de inciso limpa o bloco que deixou de valer. O inciso II já chega com
   * o prazo do art. 40, parágrafo único, da IN (5 dias úteis), que dá para mudar.
   */
  aoTrocarInciso(valor: string): void {
    this.form.SituacaoPortfolio = valor;
    if (this.incisoII) {
      this.form.ComunicadaDesde = null;
      this.form.ResultadoAnalise = null;
      this.limparRiscos();
      if (this.form.PrazoRegularizacaoDias == null || `${this.form.PrazoRegularizacaoDias}` === '') {
        this.form.PrazoRegularizacaoDias = PRAZO_REGULARIZACAO_PADRAO;
      }
    } else {
      this.form.PrazoRegularizacaoDias = null;
    }
  }

  /** Resultado diferente de "riscos significativos" desliga o bloco de risco. */
  aoTrocarResultado(valor: string): void {
    this.form.ResultadoAnalise = valor;
    if (valor !== 'Riscos significativos') this.limparRiscos();
  }

  private limparRiscos(): void {
    this.form.RecomendouSuspensao = false;
    this.form.ComunicouControleInterno = false;
    this.form.DesfechoRisco = null;
  }

  // ── Validações (as mesmas do servidor, que responde 500 sem corpo) ─────────

  private get hoje(): string {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${agora.getFullYear()}-${mes}-${dia}`;
  }

  private texto(valor: string | null | undefined): string | null {
    const limpo = (valor || '').trim();
    return limpo ? limpo : null;
  }

  /** Algum dos quatro dados da comunicação preenchido. */
  private get temComunicacao(): boolean {
    return !!(this.texto(this.form.ProcessoComunicacaoTcdf) || this.form.DataRecebimento
      || this.form.AtoTcdf || this.texto(this.form.NumeroAtoTcdf));
  }

  /** Tudo ou nada: preencher um deles numa manifestação antiga pede os demais. */
  get comunicacaoObrigatoria(): boolean {
    return this.exigirComunicacao || this.temComunicacao;
  }

  get errProcessoTcdf(): string | null {
    if (!this.comunicacaoObrigatoria) return null;
    const valor = this.texto(this.form.ProcessoComunicacaoTcdf);
    if (!valor) return 'Informe o número do processo de comunicação do TCDF.';
    if (!REGEX_NUMERO_SEI.test(valor)) return 'O número precisa estar no formato 00000-00000000/AAAA-DD.';
    return null;
  }

  get errOficio(): string | null {
    const valor = (this.form.OficioTcdf || '').trim();
    if (!valor) return 'Informe o número do ofício do TCDF.';
    if (valor.length > 60) return 'O número do ofício passa de 60 caracteres.';
    return null;
  }

  get errDataOficio(): string | null {
    if (!this.form.DataOficio) return 'Informe a data do ofício.';
    if (this.form.DataOficio > this.hoje) return 'A data do ofício está no futuro.';
    return null;
  }

  get errDataRecebimento(): string | null {
    if (!this.comunicacaoObrigatoria) return null;
    const data = this.form.DataRecebimento;
    if (!data) return 'Informe quando o processo chegou à SGDI.';
    if (data > this.hoje) return 'A data de recebimento está no futuro.';
    // O processo chega à SGDI depois de o TCDF expedir o ofício
    if (this.form.DataOficio && data < this.form.DataOficio) {
      return 'A data de recebimento não pode ser anterior à data do ofício.';
    }
    return null;
  }

  get errAto(): string | null {
    if (!this.comunicacaoObrigatoria) return null;
    return this.form.AtoTcdf ? null : 'Escolha se é Despacho Singular ou Decisão.';
  }

  get errNumeroAto(): string | null {
    if (!this.comunicacaoObrigatoria) return null;
    if (this.texto(this.form.NumeroAtoTcdf)) return null;
    if (this.form.AtoTcdf === 'Decisão') return 'Informe o número da Decisão.';
    if (this.form.AtoTcdf === 'Despacho Singular') return 'Informe o número do Despacho Singular.';
    return 'Informe o número do ato.';
  }

  get errOrgaoNome(): string | null {
    if (!this.contratacaoNova) return null;
    return this.texto(this.nova.OrgaoNome) ? null : 'Informe o órgão auditado.';
  }

  get errOrgaoSigla(): string | null {
    if (!this.contratacaoNova) return null;
    return this.texto(this.nova.OrgaoSigla) ? null : 'Informe a sigla do órgão auditado.';
  }

  get errObjeto(): string | null {
    if (!this.contratacaoNova) return null;
    return this.texto(this.nova.Objeto) ? null : 'Descreva o objeto da contratação.';
  }

  get errCategoria(): string | null {
    if (!this.contratacaoNova) return null;
    return this.nova.CategoriaObjeto ? null : 'Escolha a categoria do objeto.';
  }

  /** Mesmas regras do servidor: número em reais, sem negativo, até o limite do numeric(18,2). */
  get errValor(): string | null {
    if (!this.contratacaoNova) return null;
    const valor = lerReais(this.valorTexto);
    if (valor === undefined) return 'Informe o valor estimado em reais, por exemplo 1.250.000,00.';
    if (valor !== null && valor < 0) return 'O valor estimado não pode ser negativo.';
    if (valor !== null && valor > 9999999999999999.99) return 'O valor estimado passa do limite aceito.';
    return null;
  }

  /** O servidor recusa cadastrar de novo um número que já é de processo ativo. */
  get errNumeroJaCadastrado(): string | null {
    if (!this.contratacaoNova || !this.sugestao) return null;
    return 'Já existe processo cadastrado com o número do processo de comunicação: use esse processo.';
  }

  get errSituacao(): string | null {
    return this.incisoI || this.incisoII ? null : 'Escolha a situação da contratação no portfólio (inciso I ou II).';
  }

  get errComunicadaDesde(): string | null {
    if (!this.incisoI) return null;
    if (!this.form.ComunicadaDesde) return 'Informe desde quando a contratação está no monitoramento contínuo.';
    if (this.form.ComunicadaDesde > this.hoje) return 'A data está no futuro.';
    // Mesma regra do servidor: a contratação já estava comunicada quando o
    // ofício do TCDF chegou.
    if (this.form.DataOficio && this.form.ComunicadaDesde > this.form.DataOficio) {
      return 'A data não pode ser posterior à do ofício do TCDF.';
    }
    return null;
  }

  /**
   * O inciso I reporta a criticidade da contratação, que é do processo: sem o
   * processo escolhido, ou com ele sem criticidade, o inciso I não é registrado.
   */
  get errCriticidade(): string | null {
    if (!this.incisoI) return null;
    if (!this.contratacao) {
      return 'O inciso I é para contratação já acompanhada pela SGDI: escolha o processo dela em "Contratação auditada".';
    }
    return this.contratacao.Criticidade
      ? null
      : 'Defina a criticidade no cadastro do processo antes de registrar a manifestação do inciso I.';
  }

  get errResultado(): string | null {
    if (!this.incisoI) return null;
    return this.form.ResultadoAnalise ? null : 'Escolha o resultado da análise e a providência adotada.';
  }

  get errDesfecho(): string | null {
    if (!this.temRiscos) return null;
    return this.form.DesfechoRisco ? null : 'Escolha em que ponto está o tratamento dos riscos.';
  }

  get errPrazo(): string | null {
    if (!this.incisoII) return null;
    const dias = this.form.PrazoRegularizacaoDias;
    if (dias === null || dias === undefined || `${dias}` === '') return 'Informe os dias para regularização.';
    if (!Number.isInteger(Number(dias))) return 'Os dias para regularização são um número inteiro.';
    if (Number(dias) < 1 || Number(dias) > 365) return 'Os dias para regularização precisam estar entre 1 e 365.';
    return null;
  }

  /** O que impede o envio, na ordem da tela (resumo da tentativa de salvar). */
  get problemas(): string[] {
    return [
      this.errProcessoTcdf, this.errDataRecebimento, this.errOficio, this.errDataOficio, this.errAto,
      this.errNumeroAto, this.errNumeroJaCadastrado, this.errOrgaoNome, this.errOrgaoSigla, this.errObjeto,
      this.errCategoria, this.errValor, this.errSituacao, this.errComunicadaDesde, this.errCriticidade,
      this.errResultado, this.errDesfecho, this.errPrazo
    ].filter((e): e is string => !!e);
  }

  // ── Envio ─────────────────────────────────────────────────────────────────

  /**
   * Leva a pessoa ao primeiro campo com problema, depois que os destaques
   * aparecerem na tela (mesmo recurso do formulário do processo).
   */
  ngAfterViewChecked(): void {
    if (!this.irAoProblema) return;
    this.irAoProblema = false;
    const alvo = this.host.nativeElement.querySelector<HTMLElement>('[data-erro="sim"]');
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (alvo.matches('input, textarea, select')) alvo.focus({ preventScroll: true });
  }

  enviar(): void {
    this.submetido = true;
    if (this.problemas.length > 0) {
      this.irAoProblema = true;
      return;
    }

    const envio: CtrComunicacaoTcdfForm = {
      OficioTcdf: this.form.OficioTcdf.trim(),
      DataOficio: this.form.DataOficio,
      // Tudo ou nada (a manifestação antiga pode seguir com os quatro em branco)
      ProcessoComunicacaoTcdf: this.texto(this.form.ProcessoComunicacaoTcdf),
      DataRecebimento: this.form.DataRecebimento || null,
      AtoTcdf: this.form.AtoTcdf || null,
      NumeroAtoTcdf: this.texto(this.form.NumeroAtoTcdf),
      SituacaoPortfolio: this.form.SituacaoPortfolio,
      // Bloco do inciso I: nulo quando a contratação não era comunicada.
      // A criticidade não vai no corpo: é do processo.
      ComunicadaDesde: this.incisoI ? this.form.ComunicadaDesde : null,
      ResultadoAnalise: this.incisoI ? this.form.ResultadoAnalise : null,
      // Bloco de risco: só existe com "riscos significativos".
      RecomendouSuspensao: this.temRiscos ? this.form.RecomendouSuspensao : false,
      ComunicouControleInterno: this.temRiscos ? this.form.ComunicouControleInterno : false,
      DesfechoRisco: this.temRiscos ? this.form.DesfechoRisco : null,
      // Bloco do inciso II.
      PrazoRegularizacaoDias: this.incisoII ? Number(this.form.PrazoRegularizacaoDias) : null,
      // Registros de acompanhamento: valem em qualquer inciso, não entram em
      // bloco nenhum (nem no despacho). Vazio vira nulo.
      EsclarecimentosAdicionais: this.texto(this.form.EsclarecimentosAdicionais),
      StatusTcdf: this.form.StatusTcdf || null,
      Observacao: this.texto(this.form.Observacao)
    };

    // Só a "nova" diz a que processo a comunicação vai: o escolhido ou a
    // contratação nova, que o servidor cadastra com origem TCDF
    if (this.permitirVincular) {
      if (this.contratacao) {
        envio.ProcessoId = this.contratacao.Id;
      } else {
        envio.Contratacao = {
          OrgaoNome: this.nova.OrgaoNome.trim(),
          OrgaoSigla: this.nova.OrgaoSigla.trim().toUpperCase(),
          Objeto: this.nova.Objeto.trim(),
          CategoriaObjeto: this.nova.CategoriaObjeto,
          ValorEstimado: lerReais(this.valorTexto) ?? null
        };
      }
    }

    this.salvar.emit(envio);
  }
}
