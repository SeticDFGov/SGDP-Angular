import {
  AfterViewChecked, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, PLATFORM_ID, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import {
  PeAcaoCiclo, PeAcaoCicloForm, PeCiclo, PeMedicaoCiclo, PeMedicaoCicloForm, PeSecaoTrilha
} from '../../../api/planejamento/interface';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { NotificationService } from '../../core/services/notification.service';
import { PeCiclosService } from '../services/pe-ciclos.service';
import {
  ColunaGrade, LinhaGrade, PassoDaGrade, TipoGrade, cicloAceitaDados, colunasDaGrade, copiarDoAnterior, errosDaLinha,
  errosDoServidorNaGrade, itemDaLinha, linhaMudou, linhasDaGrade, linhasParaCopiar, periodoCiclo, textoDoValorGrade, valorParaTela
} from '../shared/pe-ciclos-rotulos';
import { mensagemErroPe } from '../shared/pe-erros';
import { lerNumero } from '../shared/registros/pe-valores';

/** Um erro listado no resumo: a linha, o campo e a mensagem (o botão leva à célula). */
interface ErroListado {
  id: string;
  texto: string;
}

/**
 * A grade de um ciclo (E7 rodada B), no passo 5.1: a situação de cada ação no
 * ciclo (`acoes`) ou a medição de cada indicador de monitoramento (`medicoes`),
 * em vez de incluir registro por registro.
 *
 * - Uma linha por ação (ou indicador), com o cabeçalho de linha (código,
 *   descrição, metas e prazos previstos; nas medições, o valor de referência) e uma
 *   coluna por campo que o nível do órgão liga na seção (no Básico, só a
 *   situação). Cada controle tem o rótulo com a linha ("Situação da ação A03"),
 *   o valor do ciclo anterior ao lado (ligado por `aria-describedby`) e o erro da
 *   célula, também ligado.
 * - "Copiar do ciclo anterior" põe os valores do ciclo anterior nas linhas ainda
 *   vazias (o que já foi digitado nunca é trocado).
 * - "Salvar a grade" grava de uma vez as linhas mudadas (PUT ciclos/{id}/acoes ou
 *   medicoes); antes, confere cada célula como o motor confere (obrigatório no
 *   nível, percentual de 0 a 100, número, data); com problema, o resumo lista os
 *   erros e o foco vai para a primeira célula com erro. O 400 com `Campos`
 *   ("<id>.<campo>") volta para as mesmas células.
 *
 * Só grava quem pode (o passo aceita gravação e o ciclo está aberto, mesmo com o
 * prazo vencido); os demais leem os valores em texto.
 */
@Component({
  selector: 'app-pe-grade-ciclo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pe-grade-ciclo.component.html'
})
export class PeGradeCicloComponent implements OnChanges, AfterViewChecked, OnDestroy {
  private readonly ciclosService = inject(PeCiclosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) tipo!: TipoGrade;
  @Input({ required: true }) ciclo!: PeCiclo;
  /** A seção da trilha (título, ajuda e os campos que o nível liga, com o obrigatório). */
  @Input({ required: true }) secao!: PeSecaoTrilha;
  /** O passo aceita gravação agora (o `PodeEditar` do passo); o ciclo aberto é conferido aqui. */
  @Input() podeEditar = false;
  /** O nome do ciclo anterior ("2026 · 4º trimestre"), para a explicação dos valores ao lado. */
  @Input() rotuloAnterior: string | null = null;
  /** O passo onde as ações (ou os indicadores de monitoramento) se cadastram. */
  @Input() passoOrigem: PassoDaGrade | null = null;
  /** A grade foi salva (o resumo do ciclo e a situação do passo mudam). */
  @Output() readonly mudou = new EventEmitter<void>();
  /** Há mudança não salva na grade. */
  @Output() readonly alterado = new EventEmitter<boolean>();

  colunas: ColunaGrade[] = [];
  linhas: LinhaGrade[] = [];
  carregando = false;
  erroCarga: string | null = null;
  salvando = false;
  /** Tentou salvar: a partir daí, cada mudança confere a célula de novo. */
  tentou = false;
  /** O que o servidor disse sem apontar uma célula. */
  errosGerais: string[] = [];
  /** Quantas linhas mudaram (o texto do pé da grade). */
  mudadas = 0;
  paraCopiar = 0;

  private chave = '';
  private carga?: Subscription;
  private envio?: Subscription;
  private sujo = false;
  private focoPendente: string | null = null;

  ngOnChanges(): void {
    this.colunas = colunasDaGrade(this.tipo, this.secao);
    // Outro ciclo (ou o mesmo fechado ou reaberto): a grade vem de novo
    const chave = `${this.tipo}:${this.ciclo.Id}:${this.ciclo.Situacao}`;
    if (chave === this.chave) return;
    const outroCiclo = !this.chave.startsWith(`${this.tipo}:${this.ciclo.Id}:`);
    this.chave = chave;
    if (outroCiclo) this.linhas = [];
    this.carregar();
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.scrollIntoView({ block: 'center' });
    alvo.focus();
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
    this.envio?.unsubscribe();
  }

  // ── Leitura ───────────────────────────────────────────────────────────────

  get idBase(): string {
    return `pe-grade-${this.tipo}`;
  }

  /** Grava agora: o passo aceita e o ciclo está aberto (mesmo com o prazo vencido). */
  get editavel(): boolean {
    return this.podeEditar && cicloAceitaDados(this.ciclo);
  }

  get titulo(): string {
    return this.secao?.Titulo || (this.tipo === 'acoes' ? 'Situação das ações no ciclo' : 'Medições dos indicadores');
  }

  get rotuloLinha(): string {
    return this.tipo === 'acoes' ? 'Ação' : 'Indicador';
  }

  get periodo(): string {
    return periodoCiclo(this.ciclo);
  }

  /** Por que a grade só se lê (o passo aceita gravação, mas o ciclo não). */
  get avisoCiclo(): string | null {
    if (!this.podeEditar) return null;
    if (this.ciclo.Situacao === 'fechado') return 'Este ciclo está fechado: os dados só se leem. Para mudar, reabra o ciclo.';
    if (this.ciclo.Situacao === 'futuro') return 'Este ciclo ainda não começou: os dados entram a partir do início do período.';
    return null;
  }

  get vazio(): string {
    return this.tipo === 'acoes'
      ? 'O PDTIC ainda não tem ações. As ações se cadastram com as metas'
      : 'O plano de monitoramento ainda não tem indicadores. Os indicadores se cadastram no plano de monitoramento';
  }

  get temAnterior(): boolean {
    return this.linhas.some(l => Object.keys(l.anterior).length > 0);
  }

  get temObrigatorio(): boolean {
    return this.colunas.some(c => c.campo.Obrigatorio);
  }

  /** Os erros de todas as células, na ordem da grade (o resumo acima da grade). */
  get errosListados(): ErroListado[] {
    const lista: ErroListado[] = [];
    for (const l of this.linhas) {
      for (const c of this.colunas) {
        const erro = l.erros[c.chave];
        if (erro) lista.push({ id: this.idCelula(l, c), texto: `${l.codigo} · ${c.campo.Rotulo}: ${erro}` });
      }
    }
    return lista;
  }

  idCelula(l: LinhaGrade, c: ColunaGrade): string {
    return `${this.idBase}-${l.id}-${c.chave}`;
  }

  /** "Situação da ação A03" (o rótulo do controle, com a linha). */
  rotuloCelula(l: LinhaGrade, c: ColunaGrade): string {
    return `${c.campo.Rotulo} ${this.tipo === 'acoes' ? 'da ação' : 'do indicador'} ${l.codigo}`;
  }

  /**
   * O que o leitor de tela ouve depois do rótulo: nas medições, o valor de
   * referência (a célula ao lado); o valor do ciclo anterior; e o erro.
   */
  descritores(l: LinhaGrade, c: ColunaGrade): string | null {
    const ids: string[] = [];
    if (this.tipo === 'medicoes' && c.chave === 'valor_apurado' && l.referencia) ids.push(`${this.idBase}-${l.id}-ref`);
    if (l.anterior[c.chave]) ids.push(`${this.idCelula(l, c)}-antes`);
    if (l.erros[c.chave]) ids.push(`${this.idCelula(l, c)}-erro`);
    return ids.length ? ids.join(' ') : null;
  }

  texto(l: LinhaGrade, c: ColunaGrade): string {
    return textoDoValorGrade(c.campo, this.valorBruto(l, c));
  }

  porId(_: number, l: LinhaGrade): number {
    return l.id;
  }

  porChave(_: number, c: ColunaGrade): string {
    return c.chave;
  }

  /** O valor da tela como vai no PUT (para o texto de leitura). */
  private valorBruto(l: LinhaGrade, c: ColunaGrade): unknown {
    const texto = l.valores[c.chave] ?? '';
    if (c.campo.Tipo === 'numero' || c.campo.Tipo === 'percentual') return lerNumero(texto).valor;
    return texto || null;
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  carregar(): void {
    const cicloId = this.ciclo.Id;
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erroCarga = null;
    const pedido: Observable<(PeAcaoCiclo | PeMedicaoCiclo)[]> = this.tipo === 'acoes'
      ? this.ciclosService.acoes(cicloId)
      : this.ciclosService.medicoes(cicloId);
    this.carga = pedido.subscribe({
      next: itens => {
        this.carregando = false;
        if (this.ciclo.Id !== cicloId) return;
        this.aplicar(itens);
      },
      error: erro => {
        this.carregando = false;
        // 403: o interceptor já tirou a pessoa do módulo
        const mensagem = mensagemErroPe(erro, this.tipo === 'acoes'
          ? 'Não foi possível carregar a situação das ações neste ciclo.'
          : 'Não foi possível carregar as medições deste ciclo.');
        if (mensagem !== null) this.erroCarga = mensagem;
      }
    });
  }

  private aplicar(itens: (PeAcaoCiclo | PeMedicaoCiclo)[]): void {
    this.linhas = linhasDaGrade(this.tipo, itens, this.colunas);
    this.tentou = false;
    this.errosGerais = [];
    this.recontar();
  }

  // ── Edição ────────────────────────────────────────────────────────────────

  mudar(l: LinhaGrade, c: ColunaGrade, valor: unknown): void {
    l.valores[c.chave] = typeof valor === 'string' ? valor : valor === null || valor === undefined ? '' : String(valor);
    if (this.tentou) {
      const erros = errosDaLinha(l, this.colunas);
      l.erros = { ...l.erros };
      if (erros[c.chave]) l.erros[c.chave] = erros[c.chave];
      else delete l.erros[c.chave];
    }
    this.recontar();
  }

  /** Ao sair de um campo de número, o texto fica no jeito brasileiro ("12,5"); a contagem das linhas mudadas acompanha. */
  arrumarNumero(l: LinhaGrade, c: ColunaGrade): void {
    const lido = lerNumero(l.valores[c.chave] ?? '');
    if (lido.valor === null || lido.invalido) return;
    const arrumado = valorParaTela(c.campo, lido.valor);
    if (arrumado !== l.valores[c.chave]) this.mudar(l, c, arrumado);
  }

  copiarAnterior(): void {
    if (!this.editavel) return;
    const quantas = copiarDoAnterior(this.linhas, this.colunas);
    this.recontar();
    // O foco fica no botão (ou no "Salvar a grade", se o botão sumiu); um aviso só, pelo toast
    const texto = quantas === 1
      ? 'O valor do ciclo anterior entrou em 1 linha que estava vazia. Confira e salve a grade.'
      : `Os valores do ciclo anterior entraram em ${quantas} linhas que estavam vazias. Confira e salve a grade.`;
    if (quantas > 0) this.notificacoes.info(texto);
    if (this.paraCopiar === 0) this.focoPendente = `${this.idBase}-salvar`;
  }

  desfazer(): void {
    for (const l of this.linhas) {
      l.valores = { ...l.originais };
      l.erros = {};
    }
    this.tentou = false;
    this.errosGerais = [];
    this.recontar();
    this.acessibilidade.anunciar('As mudanças da grade foram desfeitas.');
  }

  focar(id: string): void {
    this.focoPendente = id;
  }

  // ── Salvar ────────────────────────────────────────────────────────────────

  salvar(): void {
    if (!this.editavel || this.salvando) return;
    const mudadas = this.linhas.filter(l => linhaMudou(l, this.colunas));
    if (!mudadas.length) {
      this.notificacoes.info('Nada mudou na grade: não há o que salvar.');
      return;
    }
    this.tentou = true;
    this.errosGerais = [];
    let primeiro: string | null = null;
    for (const l of this.linhas) {
      l.erros = linhaMudou(l, this.colunas) ? errosDaLinha(l, this.colunas) : {};
      if (!primeiro) {
        const coluna = this.colunas.find(c => !!l.erros[c.chave]);
        if (coluna) primeiro = this.idCelula(l, coluna);
      }
    }
    if (primeiro) {
      // O foco vai para a primeira célula com erro; o leitor de tela ouve o rótulo e o erro dela
      this.focoPendente = primeiro;
      return;
    }
    const enviados = mudadas.map(l => l.id);
    const cicloId = this.ciclo.Id;
    this.salvando = true;
    const pedido: Observable<(PeAcaoCiclo | PeMedicaoCiclo)[]> = this.tipo === 'acoes'
      ? this.ciclosService.salvarAcoes(cicloId, mudadas.map(l => itemDaLinha('acoes', l, this.colunas) as PeAcaoCicloForm))
      : this.ciclosService.salvarMedicoes(cicloId, mudadas.map(l => itemDaLinha('medicoes', l, this.colunas) as PeMedicaoCicloForm));
    this.envio = pedido.subscribe({
      next: itens => {
        this.salvando = false;
        if (this.ciclo.Id !== cicloId) return;
        this.aplicar(itens);
        this.notificacoes.success(mudadas.length === 1
          ? 'Grade salva: 1 linha atualizada.'
          : `Grade salva: ${mudadas.length} linhas atualizadas.`);
        this.mudou.emit();
      },
      error: erro => {
        this.salvando = false;
        // 403: o interceptor já avisou e tirou a pessoa da tela
        const mensagem = mensagemErroPe(erro, 'Não foi possível salvar a grade. Confira os dados e tente de novo.');
        if (mensagem === null) return;
        const doServidor = errosDoServidorNaGrade(erro, this.linhas, this.colunas, enviados);
        let alvo: string | null = null;
        for (const l of this.linhas) {
          const erros = doServidor.porLinha[l.id];
          if (!erros) continue;
          l.erros = { ...l.erros, ...erros };
          if (!alvo) {
            const coluna = this.colunas.find(c => !!erros[c.chave]);
            if (coluna) alvo = this.idCelula(l, coluna);
          }
        }
        const soltos = doServidor.soltos;
        // A mensagem geral só quando não repete a das células
        const repetida = Object.values(doServidor.porLinha).some(e => Object.values(e).includes(mensagem));
        this.errosGerais = [...soltos, ...(repetida || soltos.includes(mensagem) ? [] : [mensagem])];
        this.focoPendente = alvo ?? `${this.idBase}-erros-gerais`;
      }
    });
  }

  private recontar(): void {
    this.mudadas = this.linhas.filter(l => linhaMudou(l, this.colunas)).length;
    this.paraCopiar = this.editavel ? linhasParaCopiar(this.linhas, this.colunas) : 0;
    const sujo = this.mudadas > 0;
    if (sujo !== this.sujo) {
      this.sujo = sujo;
      this.alterado.emit(sujo);
    }
  }
}
