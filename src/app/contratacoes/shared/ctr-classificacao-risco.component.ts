import { AfterViewChecked, Component, ElementRef, Input, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Só a escala 5×5 da CGDF, dado puro da fonte estática do PGIA (nada de tela).
// O arquivo não importa o texto do decreto (`pgia/shared/decreto-48901.ts`) nem
// a diretiva `citaDecreto`: o decreto não entra no chunk deste módulo.
import {
  CONSEQUENCIAS_CGDF,
  MATRIZ_RISCO_CGDF,
  PROBABILIDADES_CGDF
} from '../../../api/pgia/interface';
import {
  CtrClassificacaoRisco,
  CtrClassificacaoRiscoForm,
  CtrProcessoForm,
  CtrRiscoDeclaradoForm,
  MAX_RISCOS_DECLARADOS,
  NIVEIS_RISCO
} from '../../../api/contratacoes/interface';
import { badgeNivelRisco } from './ctr-rotulos';

/** Código de cor da célula do mapa da CGDF: v verde, a amarelo, l laranja, r vermelho. */
type CorCelula = 'v' | 'a' | 'l' | 'r';

/** Campos de um risco que a tela confere (e destaca quando falta algo). */
export type CampoRisco =
  'DescricaoRisco' | 'AcaoMitigacao' | 'ResponsavelNome' | 'ResponsavelEmail' | 'Probabilidade' | 'Consequencia';

/** Cor da célula → nível do risco, em ordem crescente. */
const NIVEL_DA_COR: Record<CorCelula, string> = {
  v: NIVEIS_RISCO[0],
  a: NIVEIS_RISCO[1],
  l: NIVEIS_RISCO[2],
  r: NIVEIS_RISCO[3]
};

/**
 * Nível de um risco pela célula do mapa da CGDF, com a mesma disposição do
 * servidor (`CtrClassificacaoRisco.CalcularNivel`): linhas da Catastrófica
 * (topo) à Desprezível, colunas do Improvável ao Quase certo. Nulo enquanto
 * faltar um dos dois eixos.
 */
export function nivelDoRisco(
  probabilidade: string | null | undefined,
  consequencia: string | null | undefined
): string | null {
  const coluna = (PROBABILIDADES_CGDF as readonly string[]).indexOf(probabilidade || '');
  const posicao = (CONSEQUENCIAS_CGDF as readonly string[]).indexOf(consequencia || '');
  if (coluna < 0 || posicao < 0) return null;
  const linha = CONSEQUENCIAS_CGDF.length - 1 - posicao;
  return NIVEL_DA_COR[MATRIZ_RISCO_CGDF[linha][coluna]];
}

/**
 * Normaliza o e-mail do responsável como ele vai ser gravado (o servidor
 * também grava em minúsculas): apara, tira um `;` ou `,` final e os `< >` que
 * envolvem o endereço, o que vem junto ao colar um endereço do Outlook.
 */
export function normalizarEmail(valor: string | null | undefined): string {
  let email = (valor || '').trim();
  if (email.endsWith(';') || email.endsWith(',')) email = email.slice(0, -1).trim();
  if (email.startsWith('<') && email.endsWith('>')) email = email.slice(1, -1).trim();
  return email.toLowerCase();
}

/**
 * E-mail válido, aplicado DEPOIS de `normalizarEmail`; espelha o servidor
 * (`System.Net.Mail.MailAddress` + domínio com ponto): um só `@`; usuário e
 * domínio não vazios e sem começar com ponto; ponto no domínio; e nenhum
 * espaço, caractere de controle ou `( ) , ; : < > [ ] \ "` em ponto algum.
 * A regex do PGIA (`^[^\s@]+@[^\s@]+\.[^\s@]+$`) aceitava casos que o servidor
 * recusa com 500, por isso este módulo não a reaproveita.
 */
const REGEX_EMAIL = /^(?!\.)[^\s\x00-\x1f\x7f@(),;:<>[\]\\"]+@(?!\.)[^\s\x00-\x1f\x7f@(),;:<>[\]\\"]+\.[^\s\x00-\x1f\x7f@(),;:<>[\]\\"]+$/;

/**
 * Estado de edição dos riscos da contratação de um processo.
 *
 * Pertence ao formulário do processo (é ele que monta o corpo do POST/PUT e
 * confere se dá para salvar) e é entregue à seção (`app-ctr-classificacao-risco`),
 * que o altera pelos métodos daqui. Assim a conferência é lida ao vivo pelos
 * dois lados, sem `@ViewChild` e sem evento emitido durante a detecção de
 * mudanças.
 *
 * Rastreia alteração: cada instância nasce de uma carga (a da página ou a
 * resposta de um salvamento bem-sucedido) e guarda o retrato dela; `envio()`
 * só manda a lista quando a tela difere desse retrato.
 */
export class CtrClassificacaoRiscoEdicao {
  riscos: CtrRiscoDeclaradoForm[] = [];
  /**
   * Retrato normalizado da lista carregada (textos aparados, e-mail em
   * minúsculas, sem Ids nem derivados), com os riscos em ordem canônica.
   */
  private readonly retrato: string;

  /** `gravada` são os riscos que vieram do servidor; nula = processo sem riscos. */
  constructor(readonly gravada: CtrClassificacaoRisco | null = null) {
    this.riscos = (gravada?.RiscosDeclarados ?? []).map(r => ({
      DescricaoRisco: r.DescricaoRisco || '',
      AcaoMitigacao: r.AcaoMitigacao || '',
      ResponsavelNome: r.ResponsavelNome || '',
      ResponsavelEmail: r.ResponsavelEmail || '',
      Probabilidade: r.Probabilidade || '',
      Consequencia: r.Consequencia || ''
    }));
    this.retrato = this.retratoAtual();
  }

  private static riscoVazio(): CtrRiscoDeclaradoForm {
    return {
      DescricaoRisco: '', AcaoMitigacao: '', ResponsavelNome: '', ResponsavelEmail: '',
      Probabilidade: '', Consequencia: ''
    };
  }

  // ── Lista ─────────────────────────────────────────────────────────────────

  get podeAdicionar(): boolean {
    return this.riscos.length < MAX_RISCOS_DECLARADOS;
  }

  /** Acrescenta um risco em branco no fim; devolve a posição dele (-1 no limite). */
  adicionarRisco(): number {
    if (!this.podeAdicionar) return -1;
    this.riscos = [...this.riscos, CtrClassificacaoRiscoEdicao.riscoVazio()];
    return this.riscos.length - 1;
  }

  removerRisco(indice: number): void {
    this.riscos = this.riscos.filter((_, i) => i !== indice);
  }

  /** Algo foi digitado ou escolhido no risco (remover pede confirmação). */
  static temConteudo(r: CtrRiscoDeclaradoForm): boolean {
    return [r.DescricaoRisco, r.AcaoMitigacao, r.ResponsavelNome, r.ResponsavelEmail, r.Probabilidade, r.Consequencia]
      .some(valor => !!(valor || '').trim());
  }

  /** Maior nível entre os riscos com os dois eixos escolhidos; nulo sem nenhum. */
  get nivelMaximo(): string | null {
    let maior = -1;
    for (const r of this.riscos) {
      const nivel = nivelDoRisco(r.Probabilidade, r.Consequencia);
      if (nivel) maior = Math.max(maior, (NIVEIS_RISCO as readonly string[]).indexOf(nivel));
    }
    return maior < 0 ? null : NIVEIS_RISCO[maior];
  }

  /** Quantos riscos caem na célula (linha 0 = Catastrófica, coluna 0 = Improvável). */
  contagemNaCelula(linha: number, coluna: number): number {
    const consequencia = CONSEQUENCIAS_CGDF[CONSEQUENCIAS_CGDF.length - 1 - linha];
    const probabilidade = PROBABILIDADES_CGDF[coluna];
    return this.riscos.filter(r => r.Consequencia === consequencia && r.Probabilidade === probabilidade).length;
  }

  // ── Conferência (espelha a validação do servidor) ─────────────────────────

  /** Valida o e-mail já normalizado, o mesmo valor que `montar()` envia. */
  static emailValido(email: string | null | undefined): boolean {
    return REGEX_EMAIL.test(normalizarEmail(email));
  }

  /** Mensagem do campo com problema, em linguagem simples; nula = campo certo. */
  static erroDoCampo(r: CtrRiscoDeclaradoForm, campo: CampoRisco): string | null {
    switch (campo) {
      case 'DescricaoRisco':
        return (r.DescricaoRisco || '').trim() ? null : 'Descreva o risco.';
      case 'AcaoMitigacao':
        return (r.AcaoMitigacao || '').trim() ? null : 'Diga o que será feito para reduzir o risco.';
      case 'ResponsavelNome':
        return (r.ResponsavelNome || '').trim() ? null : 'Informe quem acompanha a ação.';
      case 'ResponsavelEmail': {
        const email = normalizarEmail(r.ResponsavelEmail);
        if (!email) return 'Informe o e-mail do responsável.';
        return REGEX_EMAIL.test(email) ? null : 'Informe um e-mail válido, como nome@orgao.df.gov.br.';
      }
      case 'Probabilidade':
        return (PROBABILIDADES_CGDF as readonly string[]).includes(r.Probabilidade) ? null : 'Escolha a probabilidade.';
      case 'Consequencia':
        return (CONSEQUENCIAS_CGDF as readonly string[]).includes(r.Consequencia) ? null : 'Escolha a consequência.';
    }
  }

  /** O que falta num risco, em frases curtas e na ordem dos campos da tela. */
  static faltasDoRisco(r: CtrRiscoDeclaradoForm): string[] {
    const faltas: string[] = [];
    if (CtrClassificacaoRiscoEdicao.erroDoCampo(r, 'DescricaoRisco')) faltas.push('a descrição do risco');
    if (CtrClassificacaoRiscoEdicao.erroDoCampo(r, 'AcaoMitigacao')) faltas.push('a ação de mitigação');
    if (CtrClassificacaoRiscoEdicao.erroDoCampo(r, 'ResponsavelNome')) faltas.push('o nome do responsável');
    const email = normalizarEmail(r.ResponsavelEmail);
    if (!email) faltas.push('o e-mail do responsável');
    else if (!REGEX_EMAIL.test(email)) faltas.push('um e-mail válido do responsável');
    if (CtrClassificacaoRiscoEdicao.erroDoCampo(r, 'Probabilidade')) faltas.push('a probabilidade');
    if (CtrClassificacaoRiscoEdicao.erroDoCampo(r, 'Consequencia')) faltas.push('a consequência');
    return faltas;
  }

  private static juntar(itens: string[]): string {
    if (itens.length <= 1) return itens.join('');
    return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
  }

  /**
   * Tudo o que impede o envio, um item por risco, espelhando o servidor: cada
   * risco completo (escala completa da CGDF) e no máximo 20. Risco deixado em
   * branco também conta: é preencher ou remover.
   */
  get problemas(): string[] {
    const problemas: string[] = [];
    if (this.riscos.length > MAX_RISCOS_DECLARADOS) {
      problemas.push(`Registre no máximo ${MAX_RISCOS_DECLARADOS} riscos da contratação.`);
    }
    this.riscos.forEach((r, i) => {
      if (!CtrClassificacaoRiscoEdicao.temConteudo(r)) {
        problemas.push(`O risco ${i + 1} está em branco: preencha ou remova.`);
        return;
      }
      const faltas = CtrClassificacaoRiscoEdicao.faltasDoRisco(r);
      if (faltas.length > 0) {
        problemas.push(`No risco ${i + 1}, ${faltas.length === 1 ? 'falta' : 'faltam'} `
          + `${CtrClassificacaoRiscoEdicao.juntar(faltas)}.`);
      }
    });
    return problemas;
  }

  get completa(): boolean {
    return this.problemas.length === 0;
  }

  /**
   * Corpo `ClassificacaoRisco` do POST/PUT, e também a normalização do
   * retrato: textos aparados, e-mail normalizado (minúsculas) e nenhum Id ou
   * campo derivado. Os riscos vão na ordem da tela.
   */
  montar(): CtrClassificacaoRiscoForm {
    return {
      RiscosDeclarados: this.riscos.map(r => ({
        DescricaoRisco: (r.DescricaoRisco || '').trim(),
        AcaoMitigacao: (r.AcaoMitigacao || '').trim(),
        ResponsavelNome: (r.ResponsavelNome || '').trim(),
        ResponsavelEmail: normalizarEmail(r.ResponsavelEmail),
        Probabilidade: r.Probabilidade || '',
        Consequencia: r.Consequencia || ''
      }))
    };
  }

  // ── Rastreio de alteração ─────────────────────────────────────────────────

  /**
   * O que está na tela, na forma do retrato. Os riscos entram em ordem
   * canônica (ordenados pela chave de conteúdo): o servidor compara a lista como
   * multiconjunto e a devolve ordenada por Id, então reordenar não é alteração.
   */
  private retratoAtual(): string {
    return JSON.stringify(this.montar().RiscosDeclarados
      .map(r => JSON.stringify([
        r.DescricaoRisco, r.AcaoMitigacao, r.ResponsavelNome, r.ResponsavelEmail, r.Probabilidade, r.Consequencia
      ]))
      .sort());
  }

  get alterada(): boolean {
    return this.retratoAtual() !== this.retrato;
  }

  /**
   * Chave dos riscos no corpo do POST/PUT: a lista inteira quando difere da
   * carregada (inclusive vazia, que tira todos os riscos gravados); sem
   * mudança, `ClassificacaoRisco: null`, que no PUT preserva os gravados, os
   * Ids e quem/quando, e no POST cria o processo sem riscos.
   */
  envio(): Pick<CtrProcessoForm, 'ClassificacaoRisco'> {
    return { ClassificacaoRisco: this.alterada ? this.montar() : null };
  }
}

/**
 * Seção "Riscos da contratação" do formulário do processo: a lista de riscos,
 * cada um com a ação que o reduz, quem responde por ela e onde cai no mapa de
 * riscos da CGDF (escala completa), com o nível ao vivo; e o mapa com a
 * contagem por célula quando já há risco posicionado. O título e o texto de
 * apoio da seção ficam no formulário do processo.
 */
@Component({
  selector: 'app-ctr-classificacao-risco',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ctr-classificacao-risco.component.html'
})
export class CtrClassificacaoRiscoComponent implements AfterViewChecked {
  /** Estado de edição; pertence ao formulário do processo, que lê dele o envio. */
  @Input({ required: true }) edicao!: CtrClassificacaoRiscoEdicao;
  /** Destaca os campos com problema (o formulário liga na primeira tentativa de salvar). */
  @Input() mostrarErros = false;

  @ViewChildren('campoDescricao') private camposDescricao!: QueryList<ElementRef<HTMLTextAreaElement>>;
  /** Risco recém-adicionado que ainda vai receber o foco, quando o cartão dele aparecer. */
  private focarRisco: number | null = null;

  readonly probabilidades = PROBABILIDADES_CGDF;
  readonly consequencias = CONSEQUENCIAS_CGDF;
  /** Linhas do mapa de cima para baixo: Catastrófica → Desprezível. */
  readonly consequenciasMapa = [...CONSEQUENCIAS_CGDF].reverse();
  readonly mapa = MATRIZ_RISCO_CGDF;
  readonly niveis = NIVEIS_RISCO;
  readonly maxRiscos = MAX_RISCOS_DECLARADOS;

  badgeNivelRisco = badgeNivelRisco;

  /** Risco novo em branco no fim da lista, já com o cursor na descrição. */
  adicionar(): void {
    const indice = this.edicao.adicionarRisco();
    if (indice >= 0) this.focarRisco = indice;
  }

  /**
   * O foco vai depois que o cartão novo aparecer: com eventCoalescing, um
   * setTimeout pode rodar antes da renderização. (`afterNextRender` também
   * serviria, mas traz código do núcleo do Angular para o pacote inicial.)
   */
  ngAfterViewChecked(): void {
    if (this.focarRisco === null) return;
    const campo = this.camposDescricao.get(this.focarRisco);
    if (!campo) return;
    this.focarRisco = null;
    campo.nativeElement.focus();
  }

  remover(indice: number): void {
    const risco = this.edicao.riscos[indice];
    if (risco && CtrClassificacaoRiscoEdicao.temConteudo(risco)) {
      const confirmou = confirm(
        `Remover o risco ${indice + 1} da lista?\n\n`
        + 'Ele sai do processo quando você salvar. Antes disso, dá para desistir saindo sem salvar.'
      );
      if (!confirmou) return;
    }
    this.edicao.removerRisco(indice);
  }

  /** Nível ao vivo do risco em edição (nulo até escolher os dois eixos). */
  nivel(risco: CtrRiscoDeclaradoForm): string | null {
    return nivelDoRisco(risco.Probabilidade, risco.Consequencia);
  }

  /**
   * Problema do campo para mostrar na tela. Depois da primeira tentativa de
   * salvar, todos aparecem; antes disso só o e-mail digitado errado, que é o
   * único que dá para julgar enquanto a pessoa ainda preenche.
   */
  erro(risco: CtrRiscoDeclaradoForm, campo: CampoRisco): string | null {
    if (!this.mostrarErros) {
      const digitado = campo === 'ResponsavelEmail' && !!normalizarEmail(risco.ResponsavelEmail);
      if (!digitado) return null;
    }
    return CtrClassificacaoRiscoEdicao.erroDoCampo(risco, campo);
  }

  /** O cartão do risco ganha borda de erro quando algum campo dele tem problema. */
  riscoComProblema(risco: CtrRiscoDeclaradoForm): boolean {
    return this.mostrarErros && CtrClassificacaoRiscoEdicao.faltasDoRisco(risco).length > 0;
  }

  /**
   * Ao sair do campo o e-mail fica como vai ser gravado: sem o `;`/`,` final e
   * os `< >` de um endereço colado do Outlook, e em minúsculas.
   */
  aoSairDoEmail(risco: CtrRiscoDeclaradoForm): void {
    const normalizado = normalizarEmail(risco.ResponsavelEmail);
    if (normalizado !== risco.ResponsavelEmail) risco.ResponsavelEmail = normalizado;
  }

  /** O mapa aparece quando pelo menos um risco já tem os dois eixos escolhidos. */
  get temRiscoNoMapa(): boolean {
    return this.edicao.riscos.some(r => !!this.nivel(r));
  }

  /** A célula usa a mesma cor do badge do nível. */
  corCelula(cor: CorCelula): string {
    return badgeNivelRisco(NIVEL_DA_COR[cor]);
  }

  contagem(linha: number, coluna: number): number {
    return this.edicao.contagemNaCelula(linha, coluna);
  }

  tituloCelula(linha: number, coluna: number, cor: CorCelula): string {
    const quantidade = this.contagem(linha, coluna);
    return `Consequência ${this.consequenciasMapa[linha]} × probabilidade ${this.probabilidades[coluna]}: `
      + `nível ${NIVEL_DA_COR[cor]}` + (quantidade > 0 ? `, ${quantidade} risco(s)` : '');
  }
}
