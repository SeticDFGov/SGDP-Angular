import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CATEGORIAS_OBJETO,
  CRITICIDADES,
  CtrProcessoForm,
  ETAPAS_PLANEJAMENTO,
  ORIGEM_PADRAO,
  ORIGEM_TCDF,
  REGEX_NUMERO_SEI
} from '../../../api/contratacoes/interface';

/** Os cinco checkpoints, na ordem cronológica em que o processo tramita. */
interface CampoCheckpoint {
  campo: 'ChegadaSgdi' | 'ChegadaSubgd' | 'ChegadaUgtic' | 'RetornoGabSgdi' | 'RetornoOrgao';
  rotulo: string;
  ajuda: string;
}

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
  imports: [CommonModule, FormsModule],
  templateUrl: './ctr-processo-form.component.html'
})
export class CtrProcessoFormComponent implements OnChanges {
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
   * Modo compacto: o formulário é usado embutido em outra tela (o cadastro do
   * processo do TCDF, dentro da nova manifestação). Fica só o essencial —
   * identificação, fase e observação: processo de origem TCDF costuma nascer
   * sem nenhuma data de trâmite e sem restituição.
   */
  @Input() compacto = false;
  /**
   * Origem imposta pela tela que embute o formulário (hoje só `TCDF`). Com ela
   * o campo não é escolhido pelo usuário: é fixado e explicado num hint.
   */
  @Input() origemFixa: string | null = null;

  @Output() salvar = new EventEmitter<CtrProcessoForm>();
  @Output() cancelar = new EventEmitter<void>();

  categorias = CATEGORIAS_OBJETO;
  criticidades = CRITICIDADES;
  etapasPlanejamento = ETAPAS_PLANEJAMENTO;
  readonly origemTcdf = ORIGEM_TCDF;

  readonly checkpoints: CampoCheckpoint[] = [
    { campo: 'ChegadaSgdi', rotulo: 'Chegada da análise · SGDI', ajuda: 'Quando o processo chegou para análise na SGDI.' },
    { campo: 'ChegadaSubgd', rotulo: 'Chegada da análise · SUBGD', ajuda: 'Quando seguiu para a SUBGD.' },
    { campo: 'ChegadaUgtic', rotulo: 'Chegada da análise · UGTIC', ajuda: 'Quando seguiu para a UGTIC. Marque "não se aplica" se a etapa foi pulada.' },
    { campo: 'RetornoGabSgdi', rotulo: 'Retorno ao Gab SGDI', ajuda: 'Quando o processo voltou ao gabinete da SGDI.' },
    { campo: 'RetornoOrgao', rotulo: 'Retorno ao órgão comunicante', ajuda: 'Quando o processo foi devolvido ao órgão de origem. Marque "não se aplica" quando o processo não é devolvido.' }
  ];

  form: CtrProcessoForm = CtrProcessoFormComponent.vazio();
  submetido = false;

  static vazio(): CtrProcessoForm {
    return {
      NumeroProcesso: '', OrgaoNome: '', OrgaoSigla: '', ComplementoArea: null,
      Objeto: '', CategoriaObjeto: 'Sem objeto / Indefinido',
      ChegadaSgdi: null, ChegadaSubgd: null, ChegadaUgtic: null, UgticNaoSeAplica: false,
      RetornoGabSgdi: null, RetornoOrgao: null, RetornoOrgaoNaoSeAplica: false,
      EtapaPlanejamento: null, DataAssinaturaContrato: null, Criticidade: null,
      Origem: ORIGEM_PADRAO,
      EsclarecimentoSolicitadoEm: null, EsclarecimentoDescricao: null, EsclarecimentoRespondidoEm: null,
      Restituido: false, RestituidoEm: null, RestituidoMotivo: null, Observacao: null
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valor']) {
      this.submetido = false;
      this.form = this.valor
        ? { ...CtrProcessoFormComponent.vazio(), ...this.valor }
        : CtrProcessoFormComponent.vazio();
    }
    if (changes['origemFixa'] && this.origemFixa) {
      this.form.Origem = this.origemFixa;
    }
  }

  /** Origem que vai no envio: a imposta pela tela ou a que já estava gravada. */
  get origemAtual(): string {
    return this.origemFixa ?? this.form.Origem ?? ORIGEM_PADRAO;
  }

  // ── Máscara do número SEI ─────────────────────────────────────────────────

  /**
   * Formata enquanto o usuário digita: 00000-00000000/AAAA-DD.
   *
   * O campo mascarado usa `[value]` + `(input)`, não `ngModel`: quando o que foi
   * digitado é descartado pela máscara (uma letra, por exemplo), o modelo não
   * muda, o Angular não reescreve a caixa de texto e a tela ficaria mostrando o
   * caractere recusado. Escrevendo direto no elemento, os dois ficam iguais.
   *
   * O cursor é reposicionado pela contagem de dígitos à esquerda dele: sem isso
   * qualquer correção no meio do número jogaria o cursor para o fim.
   */
  aoDigitarNumero(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const bruto = input.value || '';
    const cursor = input.selectionStart ?? bruto.length;
    const digitosAntes = bruto.slice(0, cursor).replace(/\D/g, '').length;
    const formatado = CtrProcessoFormComponent.mascaraSei(bruto);

    // Só reescrever quando a máscara mudou algo: reescrever à toa mexe no cursor.
    if (bruto !== formatado) {
      input.value = formatado;
      const posicao = CtrProcessoFormComponent.depoisDoDigito(formatado, digitosAntes);
      input.setSelectionRange(posicao, posicao);
    }
    this.form.NumeroProcesso = formatado;
  }

  /** 19 dígitos com a pontuação do SEI: 00000-00000000/AAAA-DD. */
  private static mascaraSei(valor: string): string {
    const digitos = (valor || '').replace(/\D/g, '').slice(0, 19);
    let saida = digitos.slice(0, 5);
    if (digitos.length > 5) saida += '-' + digitos.slice(5, 13);
    if (digitos.length > 13) saida += '/' + digitos.slice(13, 17);
    if (digitos.length > 17) saida += '-' + digitos.slice(17, 19);
    return saida;
  }

  /** Posição logo depois do n-ésimo dígito do texto já mascarado. */
  private static depoisDoDigito(texto: string, digitos: number): number {
    if (digitos <= 0) return 0;
    let vistos = 0;
    for (let i = 0; i < texto.length; i++) {
      if (texto[i] >= '0' && texto[i] <= '9') {
        vistos++;
        if (vistos === digitos) return i + 1;
      }
    }
    return texto.length;
  }

  /** Sigla sempre em caixa alta, pelo mesmo motivo do campo mascarado. */
  aoDigitarSigla(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const saida = (input.value || '').toUpperCase();
    if (input.value !== saida) {
      // A caixa alta não muda o tamanho do texto: o cursor fica onde estava.
      const cursor = input.selectionStart;
      input.value = saida;
      if (cursor !== null) input.setSelectionRange(cursor, cursor);
    }
    this.form.OrgaoSigla = saida;
  }

  /** "Não se aplica" na UGTIC limpa a data — os dois juntos são recusados. */
  aoMarcarUgticNaoSeAplica(marcado: boolean): void {
    this.form.UgticNaoSeAplica = marcado;
    if (marcado) this.form.ChegadaUgtic = null;
  }

  /**
   * Mesma simetria no retorno ao órgão: nem todo processo é devolvido, e marcar
   * "não se aplica" com a data preenchida é recusado pelo servidor. Desmarcar
   * não apaga nada — quem decide é o usuário.
   */
  aoMarcarRetornoOrgaoNaoSeAplica(marcado: boolean): void {
    this.form.RetornoOrgaoNaoSeAplica = marcado;
    if (marcado) this.form.RetornoOrgao = null;
  }

  /**
   * Limpar a data do pedido anula a descrição e a resposta — mesma
   * normalização da restituição, e o que o CHECK do servidor exige (resposta
   * sem pedido não existe).
   */
  aoTrocarEsclarecimentoSolicitado(valor: string): void {
    this.form.EsclarecimentoSolicitadoEm = valor || null;
    if (!this.form.EsclarecimentoSolicitadoEm) {
      this.form.EsclarecimentoDescricao = null;
      this.form.EsclarecimentoRespondidoEm = null;
    }
  }

  aoMarcarRestituido(marcado: boolean): void {
    this.form.Restituido = marcado;
    if (!marcado) {
      this.form.RestituidoEm = null;
      this.form.RestituidoMotivo = null;
    }
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

  get errOrgaoNome(): string | null {
    return (this.form.OrgaoNome || '').trim() ? null : 'Informe o nome do órgão.';
  }

  get errOrgaoSigla(): string | null {
    return (this.form.OrgaoSigla || '').trim() ? null : 'Informe a sigla do órgão.';
  }

  get errObjeto(): string | null {
    return (this.form.Objeto || '').trim() ? null : 'Descreva o objeto da contratação.';
  }

  get errCategoria(): string | null {
    return (this.form.CategoriaObjeto || '').trim() ? null : 'Escolha a categoria do objeto.';
  }

  /** A data do pedido exige dizer o que foi pedido (CHECK do servidor). */
  get errEsclarecimentoDescricao(): string | null {
    if (!this.form.EsclarecimentoSolicitadoEm) return null;
    return (this.form.EsclarecimentoDescricao || '').trim()
      ? null
      : 'Descreva o que foi pedido ao órgão.';
  }

  get errRestituidoEm(): string | null {
    if (!this.form.Restituido) return null;
    return this.form.RestituidoEm ? null : 'Informe a data da restituição.';
  }

  get errRestituidoMotivo(): string | null {
    if (!this.form.Restituido) return null;
    return (this.form.RestituidoMotivo || '').trim() ? null : 'Descreva o motivo da restituição.';
  }

  /**
   * Cronologia e datas futuras — as mesmas regras do `ValidarProcesso` do
   * backend: cada checkpoint preenchido tem de ser maior ou igual a todos os
   * anteriores preenchidos (lacunas são permitidas) e nenhuma data pode estar
   * no futuro.
   */
  get errDatas(): string[] {
    const erros: string[] = [];
    const hoje = this.hoje;

    const preenchidos = this.checkpoints
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

    const restituidoEm = this.form.RestituidoEm ?? null;
    if (restituidoEm) {
      if (restituidoEm > hoje) erros.push('A data da restituição está no futuro.');
      const chegada = this.form.ChegadaSgdi ?? null;
      if (chegada && restituidoEm < chegada) {
        erros.push(`A data da restituição (${this.brasileira(restituidoEm)}) não pode ser anterior à chegada na SGDI (${this.brasileira(chegada)}).`);
      }
    }

    if (this.form.UgticNaoSeAplica && this.form.ChegadaUgtic) {
      erros.push('Na UGTIC, marque "não se aplica" ou informe a data — não os dois.');
    }

    if (this.form.RetornoOrgaoNaoSeAplica && this.form.RetornoOrgao) {
      erros.push('No retorno ao órgão, marque "não se aplica" ou informe a data — não os dois.');
    }

    // A assinatura NÃO entra na cronologia do trâmite: o TCDF também analisa
    // contrato já assinado, então assinatura anterior à chegada é legítima.
    // A única regra é não ser futura.
    if (this.form.DataAssinaturaContrato && this.form.DataAssinaturaContrato > hoje) {
      erros.push('A data de assinatura do contrato está no futuro.');
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

    return erros;
  }

  private brasileira(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  get formValido(): boolean {
    return !this.errNumero && !this.errOrgaoNome && !this.errOrgaoSigla
      && !this.errObjeto && !this.errCategoria
      && !this.errEsclarecimentoDescricao
      && !this.errRestituidoEm && !this.errRestituidoMotivo
      && this.errDatas.length === 0;
  }

  // ── Envio ─────────────────────────────────────────────────────────────────

  private texto(valor: string | null | undefined): string | null {
    const limpo = (valor || '').trim();
    return limpo ? limpo : null;
  }

  enviar(): void {
    this.submetido = true;
    if (!this.formValido) return;

    this.salvar.emit({
      NumeroProcesso: this.form.NumeroProcesso.trim(),
      OrgaoNome: this.form.OrgaoNome.trim(),
      OrgaoSigla: this.form.OrgaoSigla.trim().toUpperCase(),
      ComplementoArea: this.texto(this.form.ComplementoArea),
      Objeto: this.form.Objeto.trim(),
      CategoriaObjeto: this.form.CategoriaObjeto,
      ChegadaSgdi: this.form.ChegadaSgdi || null,
      ChegadaSubgd: this.form.ChegadaSubgd || null,
      ChegadaUgtic: this.form.UgticNaoSeAplica ? null : (this.form.ChegadaUgtic || null),
      UgticNaoSeAplica: this.form.UgticNaoSeAplica,
      RetornoGabSgdi: this.form.RetornoGabSgdi || null,
      RetornoOrgao: this.form.RetornoOrgaoNaoSeAplica ? null : (this.form.RetornoOrgao || null),
      RetornoOrgaoNaoSeAplica: this.form.RetornoOrgaoNaoSeAplica,
      // A etapa do planejamento continua registrada depois da assinatura: é
      // onde o planejamento parou. Não anular.
      EtapaPlanejamento: this.form.EtapaPlanejamento || null,
      DataAssinaturaContrato: this.form.DataAssinaturaContrato || null,
      Criticidade: this.form.Criticidade || null,
      Origem: this.origemAtual,
      // Sem pedido não há descrição nem resposta (o servidor recusa).
      EsclarecimentoSolicitadoEm: this.form.EsclarecimentoSolicitadoEm || null,
      EsclarecimentoDescricao: this.form.EsclarecimentoSolicitadoEm
        ? this.texto(this.form.EsclarecimentoDescricao) : null,
      EsclarecimentoRespondidoEm: this.form.EsclarecimentoSolicitadoEm
        ? (this.form.EsclarecimentoRespondidoEm || null) : null,
      Restituido: this.form.Restituido,
      RestituidoEm: this.form.Restituido ? (this.form.RestituidoEm || null) : null,
      RestituidoMotivo: this.form.Restituido ? this.texto(this.form.RestituidoMotivo) : null,
      Observacao: this.texto(this.form.Observacao)
    });
  }
}
