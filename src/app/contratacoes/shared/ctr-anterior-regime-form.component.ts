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
import {
  CATEGORIAS_OBJETO,
  CtrProcessoForm,
  ORIGEM_ANTERIOR_REGIME,
  REGEX_NUMERO_SEI,
  TIPOS_CONTRATACAO
} from '../../../api/contratacoes/interface';
import { digitarCaixaAlta, digitarNumeroSei, formatarNumeroReais, lerReais } from './ctr-rotulos';

/** As cinco datas do trâmite da época da autorização, na ordem em que o processo tramitava. */
interface DataTramite {
  campo: 'ChegadaSgdi' | 'ChegadaSubgd' | 'ChegadaUgtic' | 'RetornoGabSgdi' | 'RetornoOrgao';
  rotulo: string;
}

/**
 * Formulário curto do registro histórico ("Registrar contratação anterior ao regime"),
 * usado no cadastro e na página da contratação. Obrigatórios: o processo SEI, o órgão, o
 * objeto, a categoria, a data de assinatura e o nº do contrato. Opcionais: as datas do
 * trâmite da época da autorização (mesma cronologia dos processos), o tipo da contratação,
 * o valor, o documento SEI da autorização e a observação. Sem criticidade, riscos,
 * esclarecimentos, análise técnica nem nota informativa.
 *
 * Na edição, tudo o que este formulário não mostra volta ao servidor como veio (o
 * registro pode ter sido marcado a partir de um processo da supervisão, com mais dados).
 */
@Component({
  selector: 'app-ctr-anterior-regime-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ctr-anterior-regime-form.component.html'
})
export class CtrAnteriorRegimeFormComponent implements OnChanges, AfterViewChecked {
  /** Valor inicial; nulo abre o formulário em branco (cadastro). */
  @Input() valor: CtrProcessoForm | null = null;
  @Input() siglas: string[] = [];
  @Input() salvando = false;
  @Input() rotuloSalvar = 'Salvar';
  /** Rota de "Cancelar"; sem ela o botão não aparece. */
  @Input() rotaCancelar: string | null = null;

  @Output() salvar = new EventEmitter<CtrProcessoForm>();
  @Output() cancelar = new EventEmitter<void>();

  categorias = CATEGORIAS_OBJETO;
  tiposContratacao = TIPOS_CONTRATACAO;

  readonly datas: DataTramite[] = [
    { campo: 'ChegadaSgdi', rotulo: 'Chegada à SGDI' },
    { campo: 'ChegadaSubgd', rotulo: 'Chegada à SUBGD' },
    { campo: 'ChegadaUgtic', rotulo: 'Chegada à UGTIC' },
    { campo: 'RetornoGabSgdi', rotulo: 'Retorno ao Gab SGDI' },
    { campo: 'RetornoOrgao', rotulo: 'Retorno ao órgão' }
  ];

  form: CtrProcessoForm = CtrAnteriorRegimeFormComponent.vazio();
  submetido = false;
  valorTexto = '';
  private retrato = '';

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private irAoProblema = false;

  /** Registro novo: origem histórica, sem criticidade, sem riscos. */
  static vazio(): CtrProcessoForm {
    return {
      NumeroProcesso: '', NumeroSeiFormulario: null, OrgaoNome: '', OrgaoSigla: '', ComplementoArea: null,
      Objeto: '', CategoriaObjeto: '', ValorEstimado: null, HospedagemCetic: null, UsaGdfnet: null,
      TipoContratacao: null,
      ChegadaSgdi: null, ChegadaSubgd: null, ChegadaUgtic: null, UgticNaoSeAplica: false,
      RetornoGabSgdi: null, RetornoOrgao: null, RetornoOrgaoNaoSeAplica: false,
      NotaInformativaEnviadaEm: null, NotaInformativaDocumentoSei: null,
      NumeroContrato: '', AutorizacaoDocumentoSei: null,
      AnaliseTecnicaEncaminhadaEm: null, AnaliseTecnicaArea: null,
      AnaliseTecnicaRetornoEm: null, AnaliseTecnicaRetornoResumo: null,
      EtapaPlanejamento: null, DataAssinaturaContrato: null, Criticidade: null, CriteriosCriticidade: null,
      Origem: ORIGEM_ANTERIOR_REGIME,
      EsclarecimentoSolicitadoEm: null, EsclarecimentoDescricao: null, EsclarecimentoDocumentoSei: null,
      EsclarecimentoRespondidoEm: null,
      Restituido: false, RestituidoEm: null, RestituidoMotivo: null, Observacao: null
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valor']) {
      this.submetido = false;
      this.form = this.valor
        ? { ...CtrAnteriorRegimeFormComponent.vazio(), ...this.valor }
        : CtrAnteriorRegimeFormComponent.vazio();
      this.valorTexto = formatarNumeroReais(this.form.ValorEstimado);
      this.retrato = this.retratoAtual();
    }
  }

  // ── Campos com máscara ────────────────────────────────────────────────────

  aoDigitarNumero(evento: Event): void {
    this.form.NumeroProcesso = digitarNumeroSei(evento.target as HTMLInputElement);
  }

  aoDigitarSigla(evento: Event): void {
    this.form.OrgaoSigla = digitarCaixaAlta(evento.target as HTMLInputElement);
  }

  aoDigitarValor(texto: string): void {
    this.valorTexto = texto;
    const valor = lerReais(texto);
    this.form.ValorEstimado = valor === undefined ? this.form.ValorEstimado : valor;
  }

  aoSairDoValor(): void {
    const valor = lerReais(this.valorTexto);
    if (valor !== undefined) this.valorTexto = formatarNumeroReais(valor);
  }

  dataDe(campo: DataTramite['campo']): string | null {
    return this.form[campo] ?? null;
  }

  /**
   * Informar a data da UGTIC ou do retorno ao órgão desmarca o "não se aplica" que o
   * registro possa ter trazido da supervisão (os dois juntos são recusados).
   */
  definirData(campo: DataTramite['campo'], valor: string): void {
    this.form[campo] = valor || null;
    if (campo === 'ChegadaUgtic' && valor) this.form.UgticNaoSeAplica = false;
    if (campo === 'RetornoOrgao' && valor) this.form.RetornoOrgaoNaoSeAplica = false;
  }

  // ── Validações (as mesmas do servidor; a lista e a cronologia ao vivo) ────

  private get hoje(): string {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${agora.getFullYear()}-${mes}-${dia}`;
  }

  private brasileira(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  get errNumero(): string | null {
    const valor = (this.form.NumeroProcesso || '').trim();
    if (!valor) return 'Informe o número do processo SEI.';
    if (!REGEX_NUMERO_SEI.test(valor)) return 'O número precisa estar no formato 00000-00000000/AAAA-DD.';
    return null;
  }

  get errOrgaoSigla(): string | null {
    return (this.form.OrgaoSigla || '').trim() ? null : 'Informe a sigla do órgão.';
  }

  get errOrgaoNome(): string | null {
    return (this.form.OrgaoNome || '').trim() ? null : 'Informe o nome do órgão.';
  }

  get errObjeto(): string | null {
    return (this.form.Objeto || '').trim() ? null : 'Descreva o objeto da contratação.';
  }

  get errCategoria(): string | null {
    return (this.form.CategoriaObjeto || '').trim() ? null : 'Escolha a categoria do objeto.';
  }

  get errAssinatura(): string | null {
    const data = this.form.DataAssinaturaContrato;
    if (!data) return 'Informe a data de assinatura do contrato.';
    if (data > this.hoje) return 'A data de assinatura do contrato está no futuro.';
    return null;
  }

  get errNumeroContrato(): string | null {
    const valor = (this.form.NumeroContrato || '').trim();
    if (!valor) return 'Informe o nº do contrato.';
    if (valor.length > 60) return 'O nº do contrato tem até 60 caracteres.';
    return null;
  }

  get errValor(): string | null {
    const valor = lerReais(this.valorTexto);
    if (valor === undefined) return 'Informe o valor em reais, por exemplo 1.250.000,00.';
    if (valor !== null && valor < 0) return 'O valor não pode ser negativo.';
    if (valor !== null && valor > 9999999999999999.99) return 'O valor passa do limite aceito.';
    return null;
  }

  get errAutorizacao(): string | null {
    return (this.form.AutorizacaoDocumentoSei || '').trim().length > 25
      ? 'O nº do documento SEI da autorização tem até 25 caracteres.'
      : null;
  }

  /**
   * Cronologia do trâmite da época (lacunas permitidas) e nenhuma data no futuro: as
   * mensagens do quadro e os campos com problema (a data no futuro e a que vem antes de
   * uma etapa anterior), que ficam marcados e recebem o foco na tentativa de salvar.
   */
  private analisarDatas(): { erros: string[]; campos: Set<DataTramite['campo']> } {
    const erros: string[] = [];
    const campos = new Set<DataTramite['campo']>();
    const preenchidas = this.datas
      .map(d => ({ campo: d.campo, rotulo: d.rotulo, data: this.form[d.campo] ?? null }))
      .filter(d => !!d.data) as { campo: DataTramite['campo']; rotulo: string; data: string }[];
    for (const d of preenchidas) {
      if (d.data > this.hoje) {
        erros.push(`A data de "${d.rotulo}" está no futuro.`);
        campos.add(d.campo);
      }
    }
    for (let i = 1; i < preenchidas.length; i++) {
      for (let j = 0; j < i; j++) {
        if (preenchidas[i].data < preenchidas[j].data) {
          erros.push(`"${preenchidas[i].rotulo}" (${this.brasileira(preenchidas[i].data)}) não pode ser anterior a "${preenchidas[j].rotulo}" (${this.brasileira(preenchidas[j].data)}).`);
          campos.add(preenchidas[i].campo);
        }
      }
    }
    return { erros, campos };
  }

  get errDatas(): string[] {
    return this.analisarDatas().erros;
  }

  /** A data do trâmite está no quadro das datas incoerentes. */
  dataComErro(campo: DataTramite['campo']): boolean {
    return this.analisarDatas().campos.has(campo);
  }

  /** O que impede o envio, na ordem da tela (as datas do trâmite ficam no quadro próprio). */
  get problemas(): string[] {
    return [
      this.errNumero, this.errCategoria, this.errOrgaoSigla, this.errOrgaoNome, this.errObjeto,
      this.errAssinatura, this.errNumeroContrato, this.errValor, this.errAutorizacao
    ].filter((e): e is string => !!e);
  }

  get totalProblemas(): number {
    return this.problemas.length + this.errDatas.length;
  }

  /** Só na edição: o que está na tela difere do que foi carregado ou salvo. */
  get alterado(): boolean {
    return !!this.valor && this.retratoAtual() !== this.retrato;
  }

  private retratoAtual(): string {
    return JSON.stringify(Object.entries({ ...this.form, ValorEstimado: this.valorTexto })
      .map(([chave, valor]) => [chave, typeof valor === 'string' ? (valor.trim() || null) : (valor ?? null)])
      .sort(([a], [b]) => String(a).localeCompare(String(b))));
  }

  // ── Envio ─────────────────────────────────────────────────────────────────

  private texto(valor: string | null | undefined): string | null {
    const limpo = (valor || '').trim();
    return limpo ? limpo : null;
  }

  /** Leva a pessoa ao primeiro campo com problema depois que os destaques aparecem. */
  ngAfterViewChecked(): void {
    if (!this.irAoProblema) return;
    this.irAoProblema = false;
    const raiz = this.host.nativeElement;
    const alvo = raiz.querySelector<HTMLElement>('[data-erro="sim"]') ?? raiz.querySelector<HTMLElement>('[role="alert"]');
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (alvo.matches('input, textarea, select')) alvo.focus({ preventScroll: true });
  }

  enviar(): void {
    this.submetido = true;
    if (this.totalProblemas > 0) {
      this.irAoProblema = true;
      return;
    }
    // O que o formulário não mostra volta como veio (na edição) ou vazio (no cadastro);
    // os riscos e os critérios vão nulos, o que no PUT preserva o que estiver gravado.
    this.salvar.emit({
      ...this.form,
      NumeroProcesso: this.form.NumeroProcesso.trim(),
      OrgaoNome: this.form.OrgaoNome.trim(),
      OrgaoSigla: this.form.OrgaoSigla.trim().toUpperCase(),
      Objeto: this.form.Objeto.trim(),
      CategoriaObjeto: this.form.CategoriaObjeto,
      TipoContratacao: this.form.TipoContratacao || null,
      ValorEstimado: lerReais(this.valorTexto) ?? null,
      DataAssinaturaContrato: this.form.DataAssinaturaContrato || null,
      NumeroContrato: this.texto(this.form.NumeroContrato),
      AutorizacaoDocumentoSei: this.texto(this.form.AutorizacaoDocumentoSei),
      ChegadaSgdi: this.form.ChegadaSgdi || null,
      ChegadaSubgd: this.form.ChegadaSubgd || null,
      ChegadaUgtic: this.form.UgticNaoSeAplica ? null : (this.form.ChegadaUgtic || null),
      RetornoGabSgdi: this.form.RetornoGabSgdi || null,
      RetornoOrgao: this.form.RetornoOrgaoNaoSeAplica ? null : (this.form.RetornoOrgao || null),
      Observacao: this.texto(this.form.Observacao),
      Origem: ORIGEM_ANTERIOR_REGIME,
      CriteriosCriticidade: null,
      ClassificacaoRisco: null
    });
  }
}
