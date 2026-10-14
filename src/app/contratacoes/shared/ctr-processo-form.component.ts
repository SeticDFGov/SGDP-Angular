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
  AREAS_TECNICAS,
  CATEGORIAS_OBJETO,
  CtrClassificacaoRisco,
  CtrProcessoForm,
  ETAPAS_PLANEJAMENTO,
  HOSPEDAGENS_CETIC,
  ORIGEM_PADRAO,
  ORIGEM_TCDF,
  REGEX_NUMERO_SEI,
  TIPOS_CONTRATACAO
} from '../../../api/contratacoes/interface';
import {
  CRITERIOS_CRITICIDADE,
  PERGUNTA_ANTERIOR_II,
  RespostasCriticidade,
  calcularCriticidade,
  completarRespostas,
  ehRespostaAnteriorII,
  pontosCriticidade,
  respostaAnteriorII,
  respostasPadrao,
  valorNoLimite
} from '../../../api/contratacoes/criticidade';
import { CtrClassificacaoRiscoComponent, CtrClassificacaoRiscoEdicao } from './ctr-classificacao-risco.component';
import { CtrComposicaoCriticidadeComponent } from './ctr-composicao-criticidade.component';
import {
  badgeCriticidade,
  digitarCaixaAlta,
  digitarNumeroSei,
  formatarNumeroReais,
  formatarReais,
  lerReais
} from './ctr-rotulos';

/**
 * As seis datas do trâmite, na ordem em que o processo tramita. A assinatura do
 * contrato é a última: fora da cronologia das outras cinco (o TCDF também analisa
 * contrato já assinado), mas é a data que conclui o processo.
 */
interface CampoCheckpoint {
  campo: 'ChegadaSgdi' | 'ChegadaSubgd' | 'ChegadaUgtic' | 'RetornoGabSgdi' | 'RetornoOrgao' | 'DataAssinaturaContrato';
  rotulo: string;
  ajuda: string;
}

/** O campo da assinatura: o único fora da cronologia e o que conclui o processo. */
const CAMPO_ASSINATURA: CampoCheckpoint['campo'] = 'DataAssinaturaContrato';

/**
 * Formulário do processo, reaproveitado por "Novo processo" e pela página de
 * edição. Recebe o valor inicial e devolve o formulário já normalizado.
 *
 * As validações são repetidas aqui de propósito: a API devolve 500 sem corpo
 * quando uma regra de negócio falha, então é o front que precisa explicar o
 * erro ao usuário antes do envio.
 */
@Component({
  selector: 'app-ctr-processo-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CtrClassificacaoRiscoComponent, CtrComposicaoCriticidadeComponent],
  templateUrl: './ctr-processo-form.component.html'
})
export class CtrProcessoFormComponent implements OnChanges, AfterViewChecked {
  /** Valor inicial; nulo abre o formulário em branco (cadastro). */
  @Input() valor: CtrProcessoForm | null = null;
  /** Siglas já usadas, para o autocompletar do campo. */
  @Input() siglas: string[] = [];
  @Input() salvando = false;
  /** Texto do botão principal. */
  @Input() rotuloSalvar = 'Salvar processo';
  /** Rota de "Cancelar"; sem ela o botão não aparece. */
  @Input() rotaCancelar: string | null = null;
  /**
   * Riscos da contratação gravados (vêm aninhados na resposta do GET/PUT do
   * processo). Nulo = processo sem riscos.
   */
  @Input() classificacao: CtrClassificacaoRisco | null = null;

  @Output() salvar = new EventEmitter<CtrProcessoForm>();
  @Output() cancelar = new EventEmitter<void>();

  categorias = CATEGORIAS_OBJETO;
  etapasPlanejamento = ETAPAS_PLANEJAMENTO;
  hospedagens = HOSPEDAGENS_CETIC;
  tiposContratacao = TIPOS_CONTRATACAO;
  areasTecnicas = AREAS_TECNICAS;
  formatarReais = formatarReais;
  /** Os sete critérios do art. 11, § 3º, da IN, com as respostas possíveis. */
  criterios = CRITERIOS_CRITICIDADE;
  readonly perguntaAnteriorII = PERGUNTA_ANTERIOR_II;
  badgeCriticidade = badgeCriticidade;
  readonly campoAssinatura = CAMPO_ASSINATURA;
  readonly origemTcdf = ORIGEM_TCDF;

  readonly checkpoints: CampoCheckpoint[] = [
    { campo: 'ChegadaSgdi', rotulo: 'Chegada da análise · SGDI', ajuda: 'Quando o processo chegou para análise na SGDI.' },
    { campo: 'ChegadaSubgd', rotulo: 'Chegada da análise · SUBGD', ajuda: 'Quando seguiu para a SUBGD.' },
    { campo: 'ChegadaUgtic', rotulo: 'Chegada da análise · UGTIC', ajuda: 'Quando seguiu para a UGTIC. Marque "não se aplica" se a etapa foi pulada.' },
    { campo: 'RetornoGabSgdi', rotulo: 'Retorno ao Gab SGDI', ajuda: 'Quando o processo voltou ao gabinete da SGDI.' },
    { campo: 'RetornoOrgao', rotulo: 'Retorno ao órgão comunicante', ajuda: 'Quando o processo foi devolvido ao órgão de origem. Marque "não se aplica" quando o processo não é devolvido.' },
    { campo: CAMPO_ASSINATURA, rotulo: 'Assinatura do Contrato', ajuda: 'Quando o contrato foi assinado. É a data final: preenchida, a situação passa a Contrato assinado e o processo sai da lista (vai para a relação do painel). Pode ser anterior às outras datas (o Tribunal também analisa contrato já assinado); só não pode ser futura.' }
  ];

  form: CtrProcessoForm = CtrProcessoFormComponent.vazio();
  submetido = false;
  /** O que está escrito no campo do valor (o número vai no form.ValorEstimado). */
  valorTexto = '';
  /**
   * Estado da seção "Riscos da contratação". Mora aqui, e não no componente
   * da seção, porque é este formulário que monta o corpo do envio e confere,
   * antes de mandar, se cada risco está completo.
   */
  risco = new CtrClassificacaoRiscoEdicao();
  /** O formulário como chegou (carga da página ou resposta do salvamento), para o aviso de alteração. */
  private retratoForm = CtrProcessoFormComponent.retratoDe(CtrProcessoFormComponent.vazio());

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Tentativa de salvar recusada: levar a pessoa ao primeiro problema na próxima renderização. */
  private irAoProblema = false;

  static vazio(): CtrProcessoForm {
    return {
      NumeroProcesso: '', NumeroSeiFormulario: null, OrgaoNome: '', OrgaoSigla: '', ComplementoArea: null,
      Objeto: '', CategoriaObjeto: 'Sem objeto / Indefinido',
      ValorEstimado: null, HospedagemCetic: null, UsaGdfnet: null,
      // Vazio = ainda não escolhido (obrigatório); nulo = "Não informado", escolhido de propósito
      TipoContratacao: '',
      ChegadaSgdi: null, ChegadaSubgd: null, ChegadaUgtic: null, UgticNaoSeAplica: false,
      RetornoGabSgdi: null, RetornoOrgao: null, RetornoOrgaoNaoSeAplica: false,
      NotaInformativaEnviadaEm: null, NotaInformativaDocumentoSei: null,
      NumeroContrato: null, AutorizacaoDocumentoSei: null,
      AnaliseTecnicaEncaminhadaEm: null, AnaliseTecnicaArea: null,
      AnaliseTecnicaRetornoEm: null, AnaliseTecnicaRetornoResumo: null,
      EtapaPlanejamento: null, DataAssinaturaContrato: null, Criticidade: null,
      // Processo novo já nasce com os critérios respondidos no padrão (Baixa)
      CriteriosCriticidade: respostasPadrao(),
      Origem: ORIGEM_PADRAO,
      EsclarecimentoSolicitadoEm: null, EsclarecimentoDescricao: null, EsclarecimentoDocumentoSei: null,
      EsclarecimentoRespondidoEm: null,
      // A restituição não é mais pedida na tela: vai o que veio do servidor (processo novo, nada)
      Restituido: false, RestituidoEm: null, RestituidoMotivo: null, Observacao: null
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valor']) {
      this.submetido = false;
      this.form = this.valor
        ? { ...CtrProcessoFormComponent.vazio(), ...this.valor }
        : CtrProcessoFormComponent.vazio();
      this.retratoForm = CtrProcessoFormComponent.retratoDe(this.form);
      this.valorTexto = formatarNumeroReais(this.form.ValorEstimado);
    }
    // Valor novo do servidor (carga da página ou resposta de um PUT
    // bem-sucedido): a seção de riscos recomeça do que está gravado, com o
    // retrato tirado dele; depois de salvar, o retrato passa a ser o estado
    // salvo. Erro no envio não passa por aqui: o que foi preenchido e a
    // alteração pendente continuam valendo para a nova tentativa.
    if (changes['valor'] || changes['classificacao']) {
      this.risco = new CtrClassificacaoRiscoEdicao(this.classificacao);
    }
  }

  // ── Criticidade: derivada dos critérios do art. 11, § 3º, da IN ──────────

  /**
   * Criticidade registrada antes da regra automática (processo sem respostas
   * gravadas): vale até a primeira resposta, quando o cálculo passa a mandar.
   */
  get criticidadeAnterior(): string | null {
    return this.form.CriteriosCriticidade ? null : (this.form.Criticidade ?? null);
  }

  /** O que o servidor vai gravar: a calculada das respostas ou, sem elas, a anterior. */
  get criticidadeAtual(): string | null {
    return this.form.CriteriosCriticidade
      ? calcularCriticidade(this.form.CriteriosCriticidade)
      : this.criticidadeAnterior;
  }

  get pontosAtuais(): number | null {
    return this.form.CriteriosCriticidade ? pontosCriticidade(this.form.CriteriosCriticidade) : null;
  }

  get valorNoLimite(): boolean {
    return !!this.form.CriteriosCriticidade && valorNoLimite(this.form.CriteriosCriticidade);
  }

  /**
   * A resposta marcada no critério. No II, enquanto só houver a resposta à pergunta
   * anterior, nenhuma opção fica marcada: ela aparece à parte, como referência.
   */
  respostaDe(codigo: string): string {
    const resposta = completarRespostas(this.form.CriteriosCriticidade)[codigo];
    return codigo === 'II' && ehRespostaAnteriorII(resposta) ? '' : resposta;
  }

  /**
   * Resposta à pergunta que o II fazia até 2026-09-24 (Nenhum a Alto), guardada até
   * alguém responder à pergunta nova; conta como Desconhecido.
   */
  get respostaAnteriorII(): string | null {
    return respostaAnteriorII(this.form.CriteriosCriticidade);
  }

  /** A primeira resposta avalia os sete critérios (os demais ficam no padrão). */
  responderCriterio(codigo: string, resposta: string): void {
    const respostas: RespostasCriticidade = {
      ...completarRespostas(this.form.CriteriosCriticidade),
      [codigo]: resposta
    };
    this.form.CriteriosCriticidade = respostas;
  }

  // ── Máscara do número SEI ─────────────────────────────────────────────────

  /** Formata enquanto o usuário digita: 00000-00000000/AAAA-DD (ver `digitarNumeroSei`). */
  aoDigitarNumero(evento: Event): void {
    this.form.NumeroProcesso = digitarNumeroSei(evento.target as HTMLInputElement);
  }

  /**
   * O Nº SEI do Formulário é o número de um documento dentro do processo SEI (como 213807905), e os
   * formatos variam: texto livre, sem máscara (as pontas são aparadas no envio).
   */
  aoDigitarFormulario(evento: Event): void {
    this.form.NumeroSeiFormulario = (evento.target as HTMLInputElement).value || null;
  }

  // ── Valor estimado ────────────────────────────────────────────────────────

  /** Guarda o número a cada tecla; o texto só é reformatado ao sair do campo. */
  aoDigitarValor(texto: string): void {
    this.valorTexto = texto;
    const valor = lerReais(texto);
    this.form.ValorEstimado = valor === undefined ? this.form.ValorEstimado : valor;
  }

  aoSairDoValor(): void {
    const valor = lerReais(this.valorTexto);
    if (valor !== undefined) this.valorTexto = formatarNumeroReais(valor);
  }

  /** Sigla sempre em caixa alta, pelo mesmo motivo do campo mascarado. */
  aoDigitarSigla(evento: Event): void {
    this.form.OrgaoSigla = digitarCaixaAlta(evento.target as HTMLInputElement);
  }

  /** "Não se aplica" na UGTIC limpa a data: os dois juntos são recusados. */
  aoMarcarUgticNaoSeAplica(marcado: boolean): void {
    this.form.UgticNaoSeAplica = marcado;
    if (marcado) this.form.ChegadaUgtic = null;
  }

  /**
   * Mesma simetria no retorno ao órgão: nem todo processo é devolvido, e marcar
   * "não se aplica" com a data preenchida é recusado pelo servidor. Desmarcar
   * não apaga nada; quem decide é o usuário.
   */
  aoMarcarRetornoOrgaoNaoSeAplica(marcado: boolean): void {
    this.form.RetornoOrgaoNaoSeAplica = marcado;
    if (marcado) this.form.RetornoOrgao = null;
  }

  /**
   * Limpar a data do pedido anula a descrição e a resposta, mesma
   * normalização da restituição, e o que o CHECK do servidor exige (resposta
   * sem pedido não existe).
   */
  aoTrocarEsclarecimentoSolicitado(valor: string): void {
    this.form.EsclarecimentoSolicitadoEm = valor || null;
    if (!this.form.EsclarecimentoSolicitadoEm) {
      this.form.EsclarecimentoDescricao = null;
      this.form.EsclarecimentoDocumentoSei = null;
      this.form.EsclarecimentoRespondidoEm = null;
    }
  }

  /**
   * Análise técnica: limpar a data do encaminhamento limpa a área, o retorno e o resumo
   * (sem encaminhamento não há para onde nem de onde voltar), como o servidor faz com a
   * área e o resumo; o retorno sem encaminhamento ele recusaria.
   */
  aoTrocarEncaminhamentoTecnico(valor: string): void {
    this.form.AnaliseTecnicaEncaminhadaEm = valor || null;
    if (!this.form.AnaliseTecnicaEncaminhadaEm) {
      this.form.AnaliseTecnicaArea = null;
      this.form.AnaliseTecnicaRetornoEm = null;
      this.form.AnaliseTecnicaRetornoResumo = null;
    }
  }

  /** O documento da nota só existe com a data: limpar a data limpa o documento (CHECK do servidor). */
  aoTrocarNotaInformativa(valor: string): void {
    this.form.NotaInformativaEnviadaEm = valor || null;
    if (!this.form.NotaInformativaEnviadaEm) this.form.NotaInformativaDocumentoSei = null;
  }

  /** O resumo acompanha a data do retorno: limpar a data limpa o resumo. */
  aoTrocarRetornoTecnico(valor: string): void {
    this.form.AnaliseTecnicaRetornoEm = valor || null;
    if (!this.form.AnaliseTecnicaRetornoEm) this.form.AnaliseTecnicaRetornoResumo = null;
  }

  dataDoCheckpoint(campo: CampoCheckpoint['campo']): string | null {
    return this.form[campo] ?? null;
  }

  definirCheckpoint(campo: CampoCheckpoint['campo'], valor: string): void {
    this.form[campo] = valor || null;
    // Informar a data do retorno ao órgão desmarca o "não se aplica", como o
    // servidor faz: os dois juntos são recusados.
    if (campo === 'RetornoOrgao' && valor) this.form.RetornoOrgaoNaoSeAplica = false;
  }

  // ── Validações ────────────────────────────────────────────────────────────

  private get hoje(): string {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${agora.getFullYear()}-${mes}-${dia}`;
  }

  get errNumero(): string | null {
    const valor = (this.form.NumeroProcesso || '').trim();
    if (!valor) return 'Informe o número do processo SEI.';
    if (!REGEX_NUMERO_SEI.test(valor)) return 'O número precisa estar no formato 00000-00000000/AAAA-DD.';
    return null;
  }

  /** Opcional e sem formato: só o tamanho do campo (25 caracteres, como no servidor). */
  get errNumeroSeiFormulario(): string | null {
    const valor = (this.form.NumeroSeiFormulario || '').trim();
    if (valor.length <= 25) return null;
    return 'O Nº SEI do Formulário tem até 25 caracteres.';
  }

  /** Com a data do encaminhamento, a área técnica é obrigatória. */
  get errAnaliseTecnicaArea(): string | null {
    if (!this.form.AnaliseTecnicaEncaminhadaEm || this.form.AnaliseTecnicaArea) return null;
    return 'Escolha a área técnica para onde o processo foi encaminhado: SUBSIS ou SUBINFRA.';
  }

  get errOrgaoNome(): string | null {
    return (this.form.OrgaoNome || '').trim() ? null : 'Informe o nome do órgão.';
  }

  get errOrgaoSigla(): string | null {
    return (this.form.OrgaoSigla || '').trim() ? null : 'Informe a sigla do órgão.';
  }

  get errObjeto(): string | null {
    return (this.form.Objeto || '').trim() ? null : 'Descreva o objeto da contratação.';
  }

  /**
   * Obrigatório escolher: um dos tipos ou "Não informado" (nulo). Só o vazio, o processo
   * novo antes da escolha, é recusado. O processo gravado sem tipo chega como nulo e já
   * aparece em "Não informado".
   */
  get errTipoContratacao(): string | null {
    return this.form.TipoContratacao === '' ? 'Escolha o tipo da contratação (ou "Não informado").' : null;
  }

  get errCategoria(): string | null {
    return (this.form.CategoriaObjeto || '').trim() ? null : 'Escolha a categoria do objeto.';
  }

  /** Mesmas regras do servidor: número em reais, sem negativo, até o limite do numeric(18,2). */
  get errValor(): string | null {
    const valor = lerReais(this.valorTexto);
    if (valor === undefined) return 'Informe o valor estimado em reais, por exemplo 1.250.000,00.';
    if (valor !== null && valor < 0) return 'O valor estimado não pode ser negativo.';
    if (valor !== null && valor > 9999999999999999.99) return 'O valor estimado passa do limite aceito.';
    return null;
  }

  /** A data do pedido exige dizer o que foi pedido (CHECK do servidor). */
  get errEsclarecimentoDescricao(): string | null {
    if (!this.form.EsclarecimentoSolicitadoEm) return null;
    return (this.form.EsclarecimentoDescricao || '').trim()
      ? null
      : 'Descreva o que foi pedido ao órgão.';
  }

  /**
   * Cronologia e datas futuras: as mesmas regras do `ValidarProcesso` do
   * backend: cada checkpoint preenchido tem de ser maior ou igual a todos os
   * anteriores preenchidos (lacunas são permitidas) e nenhuma data pode estar
   * no futuro.
   */
  get errDatas(): string[] {
    const erros: string[] = [];
    const hoje = this.hoje;

    const preenchidos = this.checkpoints
      // A assinatura fica fora da cronologia (só não pode ser futura, abaixo)
      .filter(c => c.campo !== CAMPO_ASSINATURA)
      .map(c => ({ rotulo: c.rotulo, data: this.form[c.campo] ?? null }))
      .filter(c => !!c.data) as { rotulo: string; data: string }[];

    for (const atual of preenchidos) {
      if (atual.data > hoje) erros.push(`A data de "${atual.rotulo}" está no futuro.`);
    }

    for (let i = 1; i < preenchidos.length; i++) {
      for (let j = 0; j < i; j++) {
        if (preenchidos[i].data < preenchidos[j].data) {
          erros.push(`"${preenchidos[i].rotulo}" (${this.brasileira(preenchidos[i].data)}) não pode ser anterior a "${preenchidos[j].rotulo}" (${this.brasileira(preenchidos[j].data)}).`);
        }
      }
    }

    // A restituição não é mais pedida na tela, mas a registrada antes continua valendo
    // no servidor: a chegada na SGDI não pode passar dela
    const restituidoEm = this.form.Restituido ? (this.form.RestituidoEm ?? null) : null;
    if (restituidoEm) {
      const chegada = this.form.ChegadaSgdi ?? null;
      if (chegada && restituidoEm < chegada) {
        erros.push(`A chegada na SGDI (${this.brasileira(chegada)}) não pode ser depois da restituição registrada antes (${this.brasileira(restituidoEm)}).`);
      }
    }

    if (this.form.UgticNaoSeAplica && this.form.ChegadaUgtic) {
      erros.push('Na UGTIC, marque "não se aplica" ou informe a data, não os dois.');
    }

    if (this.form.RetornoOrgaoNaoSeAplica && this.form.RetornoOrgao) {
      erros.push('No retorno ao órgão, marque "não se aplica" ou informe a data, não os dois.');
    }

    // A assinatura NÃO entra na cronologia do trâmite: o TCDF também analisa
    // contrato já assinado, então assinatura anterior à chegada é legítima.
    // A única regra é não ser futura.
    if (this.form.DataAssinaturaContrato && this.form.DataAssinaturaContrato > hoje) {
      erros.push('A data de assinatura do contrato está no futuro.');
    }

    // Nota informativa: fora da cronologia das cinco etapas; só não pode ser futura nem
    // anterior à chegada na SGDI (quando houver)
    const nota = this.form.NotaInformativaEnviadaEm ?? null;
    if (nota) {
      if (nota > hoje) erros.push('A data de envio da nota informativa está no futuro.');
      const chegada = this.form.ChegadaSgdi ?? null;
      if (chegada && nota < chegada) {
        erros.push(`A nota informativa (${this.brasileira(nota)}) não pode ser anterior à chegada na SGDI (${this.brasileira(chegada)}).`);
      }
    }

    // Esclarecimento: sinal paralelo ao trâmite, com cronologia própria.
    const pedido = this.form.EsclarecimentoSolicitadoEm ?? null;
    const resposta = this.form.EsclarecimentoRespondidoEm ?? null;
    if (pedido && pedido > hoje) erros.push('A data do pedido de esclarecimento está no futuro.');
    if (resposta) {
      if (resposta > hoje) erros.push('A data da resposta ao esclarecimento está no futuro.');
      if (!pedido) {
        erros.push('Informe a data do pedido de esclarecimento antes da data da resposta.');
      } else if (resposta < pedido) {
        erros.push(`A resposta ao esclarecimento (${this.brasileira(resposta)}) não pode ser anterior ao pedido (${this.brasileira(pedido)}).`);
      }
    }

    // Análise técnica: também fora da cronologia do trâmite, com as regras do servidor
    const encaminhamento = this.form.AnaliseTecnicaEncaminhadaEm ?? null;
    const retornoTecnico = this.form.AnaliseTecnicaRetornoEm ?? null;
    if (encaminhamento && encaminhamento > hoje) erros.push('A data do encaminhamento para análise técnica está no futuro.');
    if (retornoTecnico) {
      if (retornoTecnico > hoje) erros.push('A data do retorno da área técnica está no futuro.');
      if (!encaminhamento) {
        erros.push('Informe a data do encaminhamento para análise técnica antes da data do retorno.');
      } else if (retornoTecnico < encaminhamento) {
        erros.push(`O retorno da área técnica (${this.brasileira(retornoTecnico)}) não pode ser anterior ao encaminhamento (${this.brasileira(encaminhamento)}).`);
      }
    }

    return erros;
  }

  private brasileira(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  get formValido(): boolean {
    return !this.errNumero && !this.errNumeroSeiFormulario && !this.errOrgaoNome && !this.errOrgaoSigla
      && !this.errObjeto && !this.errCategoria && !this.errTipoContratacao && !this.errValor
      && !this.errEsclarecimentoDescricao && !this.errAnaliseTecnicaArea
      && this.errDatas.length === 0;
  }

  get riscosProntos(): boolean {
    return this.risco.completa;
  }

  /**
   * O que impede o envio, na ordem da tela, para o resumo que aparece na
   * primeira tentativa de salvar. As datas incoerentes ficam no quadro próprio,
   * logo acima do resumo, e entram só na contagem (`totalProblemas`).
   */
  get problemas(): string[] {
    const itens = [
      this.errNumero, this.errCategoria, this.errTipoContratacao, this.errOrgaoNome, this.errOrgaoSigla, this.errObjeto, this.errValor,
      this.errNumeroSeiFormulario
    ].filter((e): e is string => !!e);
    itens.push(...this.risco.problemas);
    for (const e of [this.errAnaliseTecnicaArea, this.errEsclarecimentoDescricao]) {
      if (e) itens.push(e);
    }
    return itens;
  }

  get totalProblemas(): number {
    return this.problemas.length + this.errDatas.length;
  }

  /** Só na edição: o que está na tela difere do que foi carregado ou salvo. */
  get alterado(): boolean {
    if (!this.valor) return false;
    return CtrProcessoFormComponent.retratoDe(this.form) !== this.retratoForm || this.risco.alterada;
  }

  /** Campos em ordem fixa, textos aparados e vazio igual a nulo: apagar o que se digitou não é alteração. */
  private static retratoDe(form: CtrProcessoForm): string {
    return JSON.stringify(Object.entries(form)
      .filter(([chave]) => chave !== 'ClassificacaoRisco')
      .map(([chave, valor]) => [chave, typeof valor === 'string' ? (valor.trim() || null) : (valor ?? null)])
      .sort(([a], [b]) => String(a).localeCompare(String(b))));
  }

  // ── Envio ─────────────────────────────────────────────────────────────────

  private texto(valor: string | null | undefined): string | null {
    const limpo = (valor || '').trim();
    return limpo ? limpo : null;
  }

  /**
   * Leva a pessoa ao primeiro campo com problema (ou ao quadro das datas),
   * depois que os destaques aparecerem na tela: roda na verificação da view que
   * segue a tentativa de salvar. (`afterNextRender` também serviria, mas traz
   * código do núcleo do Angular para o pacote inicial.)
   */
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
    if (!this.formValido || !this.riscosProntos) {
      this.irAoProblema = true;
      return;
    }

    const encaminhado = !!this.form.AnaliseTecnicaEncaminhadaEm;
    const retornou = encaminhado && !!this.form.AnaliseTecnicaRetornoEm;
    this.salvar.emit({
      NumeroProcesso: this.form.NumeroProcesso.trim(),
      NumeroSeiFormulario: this.texto(this.form.NumeroSeiFormulario),
      OrgaoNome: this.form.OrgaoNome.trim(),
      OrgaoSigla: this.form.OrgaoSigla.trim().toUpperCase(),
      ComplementoArea: this.texto(this.form.ComplementoArea),
      Objeto: this.form.Objeto.trim(),
      CategoriaObjeto: this.form.CategoriaObjeto,
      ValorEstimado: lerReais(this.valorTexto) ?? null,
      HospedagemCetic: this.form.HospedagemCetic || null,
      TipoContratacao: this.form.TipoContratacao || null,
      UsaGdfnet: this.form.UsaGdfnet ?? null,
      ChegadaSgdi: this.form.ChegadaSgdi || null,
      ChegadaSubgd: this.form.ChegadaSubgd || null,
      ChegadaUgtic: this.form.UgticNaoSeAplica ? null : (this.form.ChegadaUgtic || null),
      UgticNaoSeAplica: this.form.UgticNaoSeAplica,
      RetornoGabSgdi: this.form.RetornoGabSgdi || null,
      RetornoOrgao: this.form.RetornoOrgaoNaoSeAplica ? null : (this.form.RetornoOrgao || null),
      RetornoOrgaoNaoSeAplica: this.form.RetornoOrgaoNaoSeAplica,
      // Nota informativa: o documento só vai com a data
      NotaInformativaEnviadaEm: this.form.NotaInformativaEnviadaEm || null,
      NotaInformativaDocumentoSei: this.form.NotaInformativaEnviadaEm
        ? this.texto(this.form.NotaInformativaDocumentoSei) : null,
      NumeroContrato: this.texto(this.form.NumeroContrato),
      // A autorização do regime anterior não aparece aqui: vai como veio
      AutorizacaoDocumentoSei: this.texto(this.form.AutorizacaoDocumentoSei),
      // Análise técnica: sem encaminhamento não vai nada; o resumo acompanha a data do retorno
      AnaliseTecnicaEncaminhadaEm: this.form.AnaliseTecnicaEncaminhadaEm || null,
      AnaliseTecnicaArea: encaminhado ? (this.form.AnaliseTecnicaArea || null) : null,
      AnaliseTecnicaRetornoEm: retornou ? this.form.AnaliseTecnicaRetornoEm : null,
      AnaliseTecnicaRetornoResumo: retornou ? this.texto(this.form.AnaliseTecnicaRetornoResumo) : null,
      // A etapa do planejamento continua registrada depois da assinatura: é
      // onde o planejamento parou. Não anular.
      EtapaPlanejamento: this.form.EtapaPlanejamento || null,
      DataAssinaturaContrato: this.form.DataAssinaturaContrato || null,
      // Com respostas, o servidor calcula a criticidade e ignora o valor; sem elas
      // (processo anterior à regra automática) o valor gravado volta como veio. A
      // resposta à pergunta anterior do II vai de volta como veio, até alguém responder
      // à pergunta nova.
      Criticidade: this.form.Criticidade || null,
      CriteriosCriticidade: this.form.CriteriosCriticidade ? { ...this.form.CriteriosCriticidade } : null,
      // A origem não se escolhe na tela: vai a gravada (processo novo = órgão comunicante)
      Origem: this.form.Origem ?? ORIGEM_PADRAO,
      // Sem pedido não há descrição nem resposta (o servidor recusa).
      EsclarecimentoSolicitadoEm: this.form.EsclarecimentoSolicitadoEm || null,
      EsclarecimentoDescricao: this.form.EsclarecimentoSolicitadoEm
        ? this.texto(this.form.EsclarecimentoDescricao) : null,
      EsclarecimentoDocumentoSei: this.form.EsclarecimentoSolicitadoEm
        ? this.texto(this.form.EsclarecimentoDocumentoSei) : null,
      EsclarecimentoRespondidoEm: this.form.EsclarecimentoSolicitadoEm
        ? (this.form.EsclarecimentoRespondidoEm || null) : null,
      // A restituição não é mais pedida na tela (2026-09-24): vai de volta o que veio do
      // servidor, para não apagar o que está gravado
      Restituido: this.form.Restituido,
      RestituidoEm: this.form.Restituido ? (this.form.RestituidoEm || null) : null,
      RestituidoMotivo: this.form.Restituido ? (this.form.RestituidoMotivo || null) : null,
      Observacao: this.texto(this.form.Observacao),
      // Riscos: só a lista alterada vai (vazia tira os gravados); sem mudança,
      // `ClassificacaoRisco: null` (ver `CtrClassificacaoRiscoEdicao.envio()`)
      ...this.risco.envio()
    });
  }
}
