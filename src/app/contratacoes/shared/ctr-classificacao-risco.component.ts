import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Fontes estáticas de domínio do PGIA — só dados puros, nada de tela: os
// quesitos e os pesos dos arts. 15 a 17 do Decreto nº 48.901/2026 e a escala
// 5×5 da CGDF. Nenhum dos dois arquivos importa o texto do decreto
// (`pgia/shared/decreto-48901.ts`) nem a diretiva `citaDecreto`: o decreto não
// entra no chunk deste módulo (conferido no build). Nada do PGIA é alterado.
import {
  CONSEQUENCIAS_CGDF,
  MATRIZ_RISCO_CGDF,
  PESOS_QUESITOS,
  PROBABILIDADES_CGDF
} from '../../../api/pgia/interface';
import { GRUPOS_QUESITOS, ROMANOS } from '../../pgia/sistemas/quesitos';
import {
  CtrClassificacaoRisco,
  CtrClassificacaoRiscoForm,
  CtrProcessoForm,
  CtrRiscoDeclaradoForm,
  MAX_RISCOS_DECLARADOS,
  NAO_CLASSIFICADO,
  NIVEIS_RISCO,
  RISCOS_CLASSIFICADOS
} from '../../../api/contratacoes/interface';
import { badgeNivelRisco, badgeRiscoClassificado } from './ctr-rotulos';

/** Código de cor da célula do mapa da CGDF: v verde, a amarelo, l laranja, r vermelho. */
type CorCelula = 'v' | 'a' | 'l' | 'r';

type Artigo = 15 | 16 | 17;

/** Quesito de um grupo, com o peso da matriz do PGIA. */
export interface CtrQuesitoRisco {
  inciso: string;
  texto: string;
  peso: number;
}

/** Um dos três grupos de quesitos, na ordem da tela (que é a da precedência). */
export interface CtrGrupoRisco {
  artigo: Artigo;
  /** Rótulo curto, o mesmo do PGIA: Risco Excessivo, Alto Risco, Risco Moderado. */
  rotulo: string;
  /** Título da tela, em texto simples (este módulo não usa chips de citação). */
  titulo: string;
  /** Risco classificado quando este é o primeiro grupo com inciso marcado. */
  resultado: string;
  /** Incisos na ordem do artigo — o primeiro marcado é o enquadramento. */
  quesitos: CtrQuesitoRisco[];
}

const TITULOS_GRUPOS: Record<Artigo, string> = {
  15: 'Risco Excessivo — art. 15 do Decreto nº 48.901/2026',
  16: 'Alto Risco — art. 16',
  17: 'Risco Moderado — art. 17'
};

/** Precedência do servidor: art. 15 → Excessivo; 16 → Alto; 17 → Moderado. */
const RESULTADO_DO_ARTIGO: Record<Artigo, string> = {
  15: RISCOS_CLASSIFICADOS[0],
  16: RISCOS_CLASSIFICADOS[1],
  17: RISCOS_CLASSIFICADOS[2]
};

/** Sem inciso marcado em grupo nenhum. */
const BAIXO_RISCO: string = RISCOS_CLASSIFICADOS[3];

/**
 * Os três grupos com textos e pesos do PGIA. Ordenados de novo por artigo e por
 * inciso de propósito: a precedência do resultado e o enquadramento ("primeiro
 * inciso na ordem do artigo") dependem dessa ordem, não da ordem de exibição
 * que o PGIA escolher para a tela dele.
 */
export const GRUPOS_RISCO: CtrGrupoRisco[] = [...GRUPOS_QUESITOS]
  .sort((a, b) => a.artigo - b.artigo)
  .map(g => ({
    artigo: g.artigo,
    rotulo: g.rotulo,
    titulo: TITULOS_GRUPOS[g.artigo],
    resultado: RESULTADO_DO_ARTIGO[g.artigo],
    quesitos: [...g.quesitos]
      .sort((a, b) => ROMANOS.indexOf(a.inciso) - ROMANOS.indexOf(b.inciso))
      .map(q => ({
        inciso: q.inciso,
        texto: q.texto,
        peso: PESOS_QUESITOS.find(p => p.Artigo === g.artigo && p.Inciso === q.inciso)?.Peso ?? 0
      }))
  }));

/** Cor da célula → nível do risco declarado, em ordem crescente. */
const NIVEL_DA_COR: Record<CorCelula, string> = {
  v: NIVEIS_RISCO[0],
  a: NIVEIS_RISCO[1],
  l: NIVEIS_RISCO[2],
  r: NIVEIS_RISCO[3]
};

/**
 * Nível de um risco declarado pela célula do mapa da CGDF, com a mesma
 * disposição do servidor (`CtrClassificacaoRisco.CalcularNivel`): linhas da
 * Catastrófica (topo) à Desprezível, colunas do Improvável ao Quase certo.
 * Nulo enquanto faltar um dos dois eixos.
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
 * envolvem o endereço — o que vem junto ao colar um endereço do Outlook.
 */
export function normalizarEmail(valor: string | null | undefined): string {
  let email = (valor || '').trim();
  if (email.endsWith(';') || email.endsWith(',')) email = email.slice(0, -1).trim();
  if (email.startsWith('<') && email.endsWith('>')) email = email.slice(1, -1).trim();
  return email.toLowerCase();
}

/**
 * E-mail válido, aplicado DEPOIS de `normalizarEmail` — espelha o servidor
 * (`System.Net.Mail.MailAddress` + domínio com ponto): um só `@`; usuário e
 * domínio não vazios e sem começar com ponto; ponto no domínio; e nenhum
 * espaço, caractere de controle ou `( ) , ; : < > [ ] \ "` em ponto algum.
 * A regex do PGIA (`^[^\s@]+@[^\s@]+\.[^\s@]+$`) aceitava casos que o servidor
 * recusa com 500, por isso este módulo não a reaproveita.
 */
const REGEX_EMAIL = /^(?!\.)[^\s\x00-\x1f\x7f@(),;:<>[\]\\"]+@(?!\.)[^\s\x00-\x1f\x7f@(),;:<>[\]\\"]+\.[^\s\x00-\x1f\x7f@(),;:<>[\]\\"]+$/;

interface RespostaGrupo {
  marcados: boolean[];
  nenhuma: boolean;
}

/**
 * Estado de edição da classificação de riscos de um processo.
 *
 * Pertence ao formulário do processo — é ele que monta o corpo do POST/PUT e
 * decide se o botão de salvar fica liberado — e é entregue à seção
 * (`app-ctr-classificacao-risco`), que o altera pelos métodos daqui. Assim a
 * completude é lida ao vivo pelos dois lados, sem `@ViewChild` e sem evento
 * emitido durante a detecção de mudanças.
 *
 * Rastreia alteração: cada instância nasce de uma carga — a da página ou a
 * resposta de um salvamento bem-sucedido — e guarda o retrato dela; `envio()`
 * só manda a classificação quando a tela difere desse retrato.
 */
export class CtrClassificacaoRiscoEdicao {
  /** Seção aberta: a classificação está sendo preenchida ou revisada. */
  aberta = false;
  /** O usuário removeu a classificação gravada: o envio leva `LimparClassificacaoRisco`. */
  removida = false;
  respostas: RespostaGrupo[] = CtrClassificacaoRiscoEdicao.respostasVazias();
  riscos: CtrRiscoDeclaradoForm[] = [];
  /**
   * Retrato normalizado da classificação carregada — checklist + riscos
   * declarados, sem Ids nem derivados —, serializado na forma do envio, com os
   * riscos em ordem canônica. Nulo = o processo chegou sem classificação.
   */
  private readonly retrato: string | null;

  /** `gravada` é a classificação que veio do servidor; nula = não classificado. */
  constructor(readonly gravada: CtrClassificacaoRisco | null = null) {
    if (gravada) this.carregarGravada();
    this.retrato = this.retratoAtual();
  }

  private static respostasVazias(): RespostaGrupo[] {
    return GRUPOS_RISCO.map(g => ({ marcados: g.quesitos.map(() => false), nenhuma: false }));
  }

  private static riscoVazio(): CtrRiscoDeclaradoForm {
    return {
      DescricaoRisco: '', AcaoMitigacao: '', ResponsavelNome: '', ResponsavelEmail: '',
      Probabilidade: '', Consequencia: ''
    };
  }

  /** Com classificação gravada, a seção abre preenchida com ela. */
  private carregarGravada(): void {
    const g = this.gravada;
    if (!g) return;
    const porArtigo: Record<Artigo, { incisos: string[]; nenhuma: boolean }> = {
      15: { incisos: g.Q15 ?? [], nenhuma: !!g.Q15Nenhuma },
      16: { incisos: g.Q16 ?? [], nenhuma: !!g.Q16Nenhuma },
      17: { incisos: g.Q17 ?? [], nenhuma: !!g.Q17Nenhuma }
    };
    this.respostas = GRUPOS_RISCO.map(grupo => ({
      marcados: grupo.quesitos.map(q => porArtigo[grupo.artigo].incisos.includes(q.inciso)),
      nenhuma: porArtigo[grupo.artigo].nenhuma
    }));
    this.riscos = (g.RiscosDeclarados ?? []).map(r => ({
      DescricaoRisco: r.DescricaoRisco || '',
      AcaoMitigacao: r.AcaoMitigacao || '',
      ResponsavelNome: r.ResponsavelNome || '',
      ResponsavelEmail: r.ResponsavelEmail || '',
      Probabilidade: r.Probabilidade || '',
      Consequencia: r.Consequencia || ''
    }));
    this.aberta = true;
    this.removida = false;
  }

  // ── Ciclo da seção ────────────────────────────────────────────────────────

  /** "Classificar riscos": abre a seção em branco (e desfaz remoção pendente). */
  classificar(): void {
    this.respostas = CtrClassificacaoRiscoEdicao.respostasVazias();
    this.riscos = [];
    this.removida = false;
    this.aberta = true;
  }

  /** Fecha a seção sem classificar (só oferecido quando nada está gravado). */
  descartar(): void {
    this.respostas = CtrClassificacaoRiscoEdicao.respostasVazias();
    this.riscos = [];
    this.aberta = false;
  }

  /** Remove a classificação gravada — vale quando o processo for salvo. */
  remover(): void {
    this.respostas = CtrClassificacaoRiscoEdicao.respostasVazias();
    this.riscos = [];
    this.aberta = false;
    this.removida = !!this.gravada;
  }

  desfazerRemocao(): void {
    this.carregarGravada();
  }

  // ── Grupos de quesitos ────────────────────────────────────────────────────

  /** Marcar um inciso desfaz o "nenhuma" do grupo (as opções são exclusivas). */
  aoMarcarQuesito(indiceGrupo: number): void {
    const resposta = this.respostas[indiceGrupo];
    if (resposta.marcados.some(m => m)) resposta.nenhuma = false;
  }

  /** Marcar "nenhuma" limpa (e a tela desabilita) os incisos do grupo. */
  aoMarcarNenhuma(indiceGrupo: number): void {
    const resposta = this.respostas[indiceGrupo];
    if (resposta.nenhuma) resposta.marcados = resposta.marcados.map(() => false);
  }

  /** Respondido = inciso marcado XOR "nenhuma" (a exclusividade é garantida acima). */
  grupoRespondido(indiceGrupo: number): boolean {
    const resposta = this.respostas[indiceGrupo];
    return resposta.nenhuma || resposta.marcados.some(m => m);
  }

  get todosRespondidos(): boolean {
    return this.respostas.every((_, i) => this.grupoRespondido(i));
  }

  get todosNenhuma(): boolean {
    return this.respostas.every(r => r.nenhuma);
  }

  /** Contratação sem risco algum não existe: tudo "nenhuma" exige risco declarado. */
  get riscosObrigatorios(): boolean {
    return this.todosNenhuma;
  }

  subtotal(indiceGrupo: number): number {
    return GRUPOS_RISCO[indiceGrupo].quesitos
      .reduce((soma, q, i) => soma + (this.respostas[indiceGrupo].marcados[i] ? q.peso : 0), 0);
  }

  /** Soma dos pesos marcados; "nenhuma" e riscos declarados não pontuam. */
  get pontuacao(): number {
    return GRUPOS_RISCO.reduce((soma, _, i) => soma + this.subtotal(i), 0);
  }

  /** Primeiro grupo, na ordem 15 → 16 → 17, com inciso marcado; -1 sem nenhum. */
  private get grupoDeterminante(): number {
    return this.respostas.findIndex(r => r.marcados.some(m => m));
  }

  /** Mesma regra do servidor (replicada de `PgiaSistemaService` no backend). */
  get resultado(): string {
    const grupo = this.grupoDeterminante;
    return grupo < 0 ? BAIXO_RISCO : GRUPOS_RISCO[grupo].resultado;
  }

  /** "art. 16, II": primeiro inciso marcado do grupo determinante; nulo em Baixo Risco. */
  get enquadramento(): string | null {
    const grupo = this.grupoDeterminante;
    if (grupo < 0) return null;
    const primeiro = GRUPOS_RISCO[grupo].quesitos.find((_, i) => this.respostas[grupo].marcados[i]);
    return primeiro ? `art. ${GRUPOS_RISCO[grupo].artigo}, ${primeiro.inciso}` : null;
  }

  // ── Riscos da contratação ─────────────────────────────────────────────────

  adicionarRisco(): void {
    if (this.riscos.length >= MAX_RISCOS_DECLARADOS) return;
    this.riscos = [...this.riscos, CtrClassificacaoRiscoEdicao.riscoVazio()];
  }

  removerRisco(indice: number): void {
    this.riscos = this.riscos.filter((_, i) => i !== indice);
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

  /** Quantos riscos declarados caem na célula (linha 0 = Catastrófica, coluna 0 = Improvável). */
  contagemNaCelula(linha: number, coluna: number): number {
    const consequencia = CONSEQUENCIAS_CGDF[CONSEQUENCIAS_CGDF.length - 1 - linha];
    const probabilidade = PROBABILIDADES_CGDF[coluna];
    return this.riscos.filter(r => r.Consequencia === consequencia && r.Probabilidade === probabilidade).length;
  }

  /** Valida o e-mail já normalizado — o mesmo valor que `montar()` envia. */
  static emailValido(email: string | null | undefined): boolean {
    return REGEX_EMAIL.test(normalizarEmail(email));
  }

  /** O que falta num risco, em linguagem simples e na ordem dos campos da tela. */
  static faltasDoRisco(r: CtrRiscoDeclaradoForm): string[] {
    const faltas: string[] = [];
    if (!(r.DescricaoRisco || '').trim()) faltas.push('a descrição do risco');
    if (!(r.AcaoMitigacao || '').trim()) faltas.push('a ação de mitigação');
    if (!(r.ResponsavelNome || '').trim()) faltas.push('o nome do responsável');
    const email = normalizarEmail(r.ResponsavelEmail);
    if (!email) faltas.push('o e-mail do responsável');
    else if (!REGEX_EMAIL.test(email)) faltas.push('um e-mail válido do responsável');
    if (!(PROBABILIDADES_CGDF as readonly string[]).includes(r.Probabilidade)) faltas.push('a probabilidade');
    if (!(CONSEQUENCIAS_CGDF as readonly string[]).includes(r.Consequencia)) faltas.push('a consequência');
    return faltas;
  }

  private static juntar(itens: string[]): string {
    if (itens.length <= 1) return itens.join('');
    return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
  }

  /**
   * O que ainda impede o envio, espelhando a validação do servidor: os três
   * grupos respondidos, tudo "nenhuma" exige ao menos um risco declarado, cada
   * risco completo (escala completa da CGDF) e no máximo 20. Nulo = completa.
   */
  get falta(): string | null {
    const grupoSemResposta = GRUPOS_RISCO
      .filter((_, i) => !this.grupoRespondido(i))
      .map(g => `"${g.rotulo}"`);
    const comoResponder = 'marque as situações que se aplicam ou "Nenhuma das alternativas acima"';
    if (grupoSemResposta.length === GRUPOS_RISCO.length) {
      return `Responda os três grupos de quesitos: ${comoResponder}.`;
    }
    if (grupoSemResposta.length > 0) {
      return grupoSemResposta.length === 1
        ? `Responda o grupo ${grupoSemResposta[0]}: ${comoResponder}.`
        : `Responda os grupos ${CtrClassificacaoRiscoEdicao.juntar(grupoSemResposta)}: ${comoResponder}.`;
    }
    if (this.riscosObrigatorios && this.riscos.length === 0) {
      return 'Como nenhuma das situações dos três grupos se aplica, declare ao menos um risco da contratação.';
    }
    if (this.riscos.length > MAX_RISCOS_DECLARADOS) {
      return `Declare no máximo ${MAX_RISCOS_DECLARADOS} riscos da contratação.`;
    }
    for (let i = 0; i < this.riscos.length; i++) {
      const faltas = CtrClassificacaoRiscoEdicao.faltasDoRisco(this.riscos[i]);
      if (faltas.length > 0) {
        return `Complete o risco ${i + 1} da contratação: ${faltas.length === 1 ? 'falta' : 'faltam'} `
          + `${CtrClassificacaoRiscoEdicao.juntar(faltas)}.`;
      }
    }
    return null;
  }

  get completa(): boolean {
    return this.falta === null;
  }

  /** Algo já foi marcado ou preenchido (descartar pede confirmação). */
  get temConteudo(): boolean {
    return this.respostas.some(r => r.nenhuma || r.marcados.some(m => m)) || this.riscos.length > 0;
  }

  /**
   * Corpo `ClassificacaoRisco` do POST/PUT — e também a normalização do
   * retrato: incisos na ordem do artigo, "nenhuma" como booleano, textos
   * aparados, e-mail normalizado (minúsculas) e nenhum Id ou campo derivado.
   * Os riscos vão na ordem da tela; só o retrato os põe em ordem canônica.
   */
  montar(): CtrClassificacaoRiscoForm {
    const doArtigo = (artigo: Artigo) => {
      const indice = GRUPOS_RISCO.findIndex(g => g.artigo === artigo);
      return {
        incisos: GRUPOS_RISCO[indice].quesitos
          .filter((_, i) => !!this.respostas[indice].marcados[i])
          .map(q => q.inciso),
        nenhuma: !!this.respostas[indice].nenhuma
      };
    };
    const q15 = doArtigo(15);
    const q16 = doArtigo(16);
    const q17 = doArtigo(17);
    return {
      Q15: q15.incisos, Q16: q16.incisos, Q17: q17.incisos,
      Q15Nenhuma: q15.nenhuma, Q16Nenhuma: q16.nenhuma, Q17Nenhuma: q17.nenhuma,
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
   * O que está na tela, na forma do retrato; nulo sem classificação aberta.
   * Os riscos entram em ordem canônica (ordenados pela chave de conteúdo): o
   * servidor compara a lista como multiconjunto e a devolve ordenada por Id,
   * então reordenar não é alteração. A tela mantém a ordem do usuário.
   */
  private retratoAtual(): string | null {
    if (!this.aberta) return null;
    const corpo = this.montar();
    const riscos = corpo.RiscosDeclarados
      .map(r => JSON.stringify([
        r.DescricaoRisco, r.AcaoMitigacao, r.ResponsavelNome, r.ResponsavelEmail, r.Probabilidade, r.Consequencia
      ]))
      .sort();
    return JSON.stringify({ ...corpo, RiscosDeclarados: riscos });
  }

  /**
   * A classificação aberta difere da carregada. Com retrato nulo, abrir já é
   * alteração: é a primeira classificação do processo.
   */
  get alterada(): boolean {
    return this.aberta && this.retratoAtual() !== this.retrato;
  }

  /**
   * Chaves da classificação no corpo do POST/PUT — nunca as duas juntas:
   * - gravada removida pelo usuário: só `LimparClassificacaoRisco: true`;
   * - aberta e diferente do retrato (inclui a primeira classificação):
   *   `ClassificacaoRisco` completa — o servidor recalcula, substitui os riscos
   *   e registra quem classificou e quando;
   * - sem mudança (inclusive depois de "Desfazer a remoção" ou de descartar):
   *   `ClassificacaoRisco: null` — no PUT preserva a gravada, os Ids dos riscos
   *   e `ClassificadoEm/Por`; no POST o processo nasce não classificado.
   */
  envio(): Pick<CtrProcessoForm, 'ClassificacaoRisco' | 'LimparClassificacaoRisco'> {
    if (this.removida && this.gravada) return { LimparClassificacaoRisco: true };
    if (this.alterada) return { ClassificacaoRisco: this.montar() };
    return { ClassificacaoRisco: null };
  }
}

/**
 * Seção "Classificação de riscos" do formulário do processo: os três grupos de
 * quesitos com pesos e "Nenhuma das alternativas acima" exclusiva, os riscos
 * da contratação na escala completa da CGDF com o nível ao vivo, o mapa 5×5
 * sempre visível com a contagem por célula e o resumo das duas escalas.
 *
 * Quem preenche é a SGDI (módulo interno): ao contrário do questionário do
 * órgão no PGIA, aqui o resultado, o enquadramento, a pontuação e o nível de
 * cada risco aparecem enquanto se preenche.
 */
@Component({
  selector: 'app-ctr-classificacao-risco',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ctr-classificacao-risco.component.html'
})
export class CtrClassificacaoRiscoComponent {
  /** Estado de edição — pertence ao formulário do processo, que lê dele o envio. */
  @Input({ required: true }) edicao!: CtrClassificacaoRiscoEdicao;

  readonly grupos = GRUPOS_RISCO;
  readonly probabilidades = PROBABILIDADES_CGDF;
  readonly consequencias = CONSEQUENCIAS_CGDF;
  /** Linhas do mapa de cima para baixo: Catastrófica → Desprezível. */
  readonly consequenciasMapa = [...CONSEQUENCIAS_CGDF].reverse();
  readonly mapa = MATRIZ_RISCO_CGDF;
  readonly niveis = NIVEIS_RISCO;
  readonly maxRiscos = MAX_RISCOS_DECLARADOS;
  readonly naoClassificado = NAO_CLASSIFICADO;

  badgeNivelRisco = badgeNivelRisco;
  badgeRiscoClassificado = badgeRiscoClassificado;

  classificar(): void {
    this.edicao.classificar();
  }

  descartar(): void {
    if (this.edicao.temConteudo) {
      const confirmou = confirm(
        'Descartar a classificação de riscos?\n\n'
        + 'O que foi marcado e os riscos preenchidos nesta seção serão perdidos, e o processo continua sem classificação.'
      );
      if (!confirmou) return;
    }
    this.edicao.descartar();
  }

  remover(): void {
    const confirmou = confirm(
      'Remover a classificação de riscos deste processo?\n\n'
      + 'As respostas dos três grupos e os riscos da contratação serão apagados quando você salvar o processo.'
    );
    if (!confirmou) return;
    this.edicao.remover();
  }

  desfazerRemocao(): void {
    this.edicao.desfazerRemocao();
  }

  /** Nível ao vivo do risco em edição (nulo até escolher os dois eixos). */
  nivel(risco: CtrRiscoDeclaradoForm): string | null {
    return nivelDoRisco(risco.Probabilidade, risco.Consequencia);
  }

  /** O e-mail só acusa erro depois de digitado — vazio é tratado no "o que falta". */
  emailInvalido(risco: CtrRiscoDeclaradoForm): boolean {
    return !!normalizarEmail(risco.ResponsavelEmail) && !CtrClassificacaoRiscoEdicao.emailValido(risco.ResponsavelEmail);
  }

  /**
   * Ao sair do campo o e-mail fica como vai ser gravado: sem o `;`/`,` final e
   * os `< >` de um endereço colado do Outlook, e em minúsculas.
   */
  aoSairDoEmail(risco: CtrRiscoDeclaradoForm): void {
    const normalizado = normalizarEmail(risco.ResponsavelEmail);
    if (normalizado !== risco.ResponsavelEmail) risco.ResponsavelEmail = normalizado;
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
      + `nível ${NIVEL_DA_COR[cor]}` + (quantidade > 0 ? ` — ${quantidade} risco(s) declarado(s)` : '');
  }
}
