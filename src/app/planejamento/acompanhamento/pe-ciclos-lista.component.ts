import {
  AfterViewChecked, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, PLATFORM_ID, SimpleChanges, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { PeCiclo, PeTipoCiclo } from '../../../api/planejamento/interface';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { PeCiclosService } from '../services/pe-ciclos.service';
import {
  ciclosEmOrdem, classeSituacaoCiclo, iconeSituacaoCiclo, periodoCiclo, resumoDaAvaliacao, resumoDoCiclo, rotuloAvaliacaoNova,
  rotuloSituacaoCiclo
} from '../shared/pe-ciclos-rotulos';
import { rotuloSituacaoVersao } from '../shared/pe-documento-rotulos';
import { mensagemErroPe } from '../shared/pe-erros';
import { nomeDeQuem, textoData, textoDataHora } from '../shared/registros/pe-valores';

/** Tamanho do nome da avaliação (o servidor confere de novo). */
const MAX_ROTULO = 100;

/**
 * Os ciclos de um passo do acompanhamento (E7 rodada B):
 *
 * - `lista` (o primeiro passo do tipo: 5.1 no monitoramento, 6.1 na avaliação):
 *   a tabela dos ciclos com o rótulo, o período, o prazo para fechar, a situação
 *   em texto (não só na cor), o que o ciclo já tem e o relatório gerado; cada
 *   linha tem o botão para ver o ciclo (o que está à vista, com `aria-current`).
 *   Os ciclos que ainda vão começar ficam escondidos, menos o primeiro, até a
 *   pessoa pedir. Na avaliação, "Abrir uma avaliação", com a confirmação numa
 *   janela da `DialogoDirective`, quando nenhuma está aberta.
 * - `compacta` (os passos seguintes): o ciclo à vista e a troca por uma lista de
 *   escolha que só vale no botão "Ver" (as setas do teclado não trocam o ciclo).
 *
 * Quem decide o ciclo à vista é a tela do passo (o endereço guarda `?ciclo=`):
 * este componente só pede a troca (`escolher`).
 */
@Component({
  selector: 'app-pe-ciclos-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogoDirective],
  templateUrl: './pe-ciclos-lista.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeCiclosListaComponent implements OnChanges, AfterViewChecked, OnDestroy {
  private readonly ciclosService = inject(PeCiclosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) tipo!: PeTipoCiclo;
  @Input() ciclos: PeCiclo[] = [];
  @Input() escolhido: PeCiclo | null = null;
  @Input() modo: 'lista' | 'compacta' = 'lista';
  @Input() carregando = false;
  @Input() erro: string | null = null;
  /** A equipe pode abrir uma avaliação agora (o passo aceita gravação e nenhuma está aberta). */
  @Input() podeAbrirAvaliacao = false;
  @Input() pdticId: number | null = null;
  /** O que a equipe registra em cada ciclo, pelas seções que o nível do órgão tem (F2: no Básico, só a situação das ações). */
  @Input() oQueSeRegistra = 'a situação das ações, as medições e os riscos que ocorreram';
  /** Pede para ver outro ciclo (a tela do passo troca o endereço). */
  @Output() readonly escolher = new EventEmitter<number>();
  /** A avaliação nova foi aberta (a tela busca os ciclos de novo e passa a mostrá-la). */
  @Output() readonly abriu = new EventEmitter<PeCiclo>();
  @Output() readonly recarregar = new EventEmitter<void>();

  readonly maxRotulo = MAX_ROTULO;

  /** Os ciclos da tabela (os futuros depois do primeiro ficam escondidos até a pessoa pedir). */
  visiveis: PeCiclo[] = [];
  futurosEscondidos = 0;
  mostrarFuturos = false;
  /** A escolha da lista compacta, ainda não confirmada no "Ver". */
  escolhaCompacta: number | null = null;

  janela = false;
  rotulo = '';
  tentou = false;
  abrindo = false;
  erroServidor: string | null = null;
  private focoPendente: string | null = null;

  /**
   * F1 (I04): na lista das avaliações, o que cada uma tem (os resultados das metas,
   * a análise e a decisão do comitê), pelo Id; o resumo do monitoramento (ações com
   * situação) não diz nada de uma avaliação.
   */
  resumosAvaliacao = new Map<number, string>();
  private cargaResumos?: Subscription;

  ngOnDestroy(): void {
    this.cargaResumos?.unsubscribe();
  }

  /** O que cada avaliação tem, buscado quando a lista chega (as avaliações são poucas). */
  private carregarResumos(): void {
    this.cargaResumos?.unsubscribe();
    const pdticId = this.pdticId;
    const lista = this.ciclos;
    if (this.tipo !== 'avaliacao' || this.modo !== 'lista' || pdticId === null || !lista.length) return;
    this.cargaResumos = forkJoin(lista.map(c => this.ciclosService.resumoDaAvaliacao(pdticId, c.Id, c.Resumo)
      .pipe(map(r => [c.Id, resumoDaAvaliacao(r)] as [number, string]))))
      .subscribe(pares => this.resumosAvaliacao = new Map(pares));
  }

  /** O que o ciclo tem, na coluna da lista: na avaliação, o resumo dela (F1, I04). */
  registradoNo(c: PeCiclo): string {
    if (this.tipo === 'avaliacao') return this.resumosAvaliacao.get(c.Id) || '-';
    return this.resumo(c) || '-';
  }

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['ciclos'] || mudancas['pdticId']) this.carregarResumos();
    const m = mudancas['escolhido'];
    const antes = (m?.previousValue as PeCiclo | null | undefined)?.Id ?? null;
    const agora = this.escolhido;
    const trocou = !!m && (agora?.Id ?? null) !== antes;
    // Outro ciclo à vista: a lista de escolha da forma compacta passa a mostrar ele (F1, C20)
    if (trocou) this.escolhaCompacta = agora?.Id ?? null;
    this.montar();
    // Outro ciclo à vista depois de uma escolha: o foco fica no botão, e o leitor de tela ouve a troca.
    // Depois de abrir uma avaliação, não: o aviso da abertura já diz que ela está à vista (um aviso só, F1, C21)
    if (m && !m.firstChange && antes !== null && agora && agora.Id !== antes) {
      if (this.silenciarTroca === agora.Id) this.silenciarTroca = null;
      else this.acessibilidade.anunciar(`${this.nomeDoCiclo(agora)} à vista.`);
    }
  }

  /** A avaliação que acabou de ser aberta: a troca para ela não é anunciada de novo. */
  private silenciarTroca: number | null = null;

  /** "Ciclo 2027 · 1º trimestre" ou só o nome da avaliação, quando ele já diz que é uma avaliação (sem "Avaliação Avaliação"). */
  private nomeDoCiclo(c: PeCiclo): string {
    const rotulo = c.Rotulo.trim();
    return rotulo.toLowerCase().startsWith(this.rotuloCiclo.toLowerCase()) ? rotulo : `${this.rotuloCiclo} ${rotulo}`;
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  private montar(): void {
    const lista = ciclosEmOrdem(this.ciclos);
    const futuros = lista.filter(c => c.Situacao === 'futuro');
    const primeiroFuturo = futuros[0]?.Id ?? null;
    const escolhido = this.escolhido?.Id ?? null;
    this.visiveis = this.mostrarFuturos
      ? lista
      : lista.filter(c => c.Situacao !== 'futuro' || c.Id === primeiroFuturo || c.Id === escolhido);
    this.futurosEscondidos = lista.length - this.visiveis.length;
    if (this.escolhaCompacta === null || !lista.some(c => c.Id === this.escolhaCompacta)) this.escolhaCompacta = escolhido;
  }

  // ── Rótulos ───────────────────────────────────────────────────────────────

  get idBase(): string {
    return `pe-ciclos-${this.tipo}`;
  }

  get titulo(): string {
    return this.tipo === 'avaliacao' ? 'Avaliações intermediárias' : 'Ciclos de monitoramento';
  }

  get explicacao(): string {
    return this.tipo === 'avaliacao'
      ? 'A avaliação intermediária consolida os resultados no meio da vigência, compara com as metas e leva ao comitê, que decide seguir '
        + 'com o PDTIC ou revisá-lo. A equipe abre uma avaliação quando o comitê pedir; só uma fica aberta por vez.'
      : 'Os ciclos seguem a periodicidade do plano de monitoramento (trimestral, se o órgão não mudou). Em cada ciclo, a equipe registra '
        + `${this.oQueSeRegistra} e fecha o ciclo até o prazo.`;
  }

  get vazio(): string {
    return this.tipo === 'avaliacao'
      ? 'Nenhuma avaliação intermediária aberta ainda. Abra uma quando o comitê pedir.'
      : 'Nenhum ciclo de monitoramento ainda. Os ciclos aparecem depois da publicação do PDTIC, pela vigência e pela periodicidade.';
  }

  get rotuloCiclo(): string {
    return this.tipo === 'avaliacao' ? 'Avaliação' : 'Ciclo';
  }

  get nomeTabela(): string {
    return this.tipo === 'avaliacao' ? 'avaliações intermediárias' : 'ciclos de monitoramento';
  }

  /** O botão dos ciclos futuros escondidos ("Mostrar também o ciclo que ainda vai começar"). */
  get textoFuturos(): string {
    if (this.mostrarFuturos) return 'Esconder os ciclos que ainda vão começar';
    return this.futurosEscondidos === 1
      ? 'Mostrar também o ciclo que ainda vai começar'
      : `Mostrar também os ${this.futurosEscondidos} ciclos que ainda vão começar`;
  }

  rotuloSituacao(c: PeCiclo): string {
    return rotuloSituacaoCiclo(c.Situacao);
  }

  classeSituacao(c: PeCiclo): string {
    return classeSituacaoCiclo(c.Situacao);
  }

  iconeSituacao(c: PeCiclo): string {
    return iconeSituacaoCiclo(c.Situacao);
  }

  periodo(c: PeCiclo): string {
    return periodoCiclo(c);
  }

  data(valor: string | null): string {
    return textoData(valor);
  }

  quando(valor: string | null): string {
    return textoDataHora(valor);
  }

  /** "24/09/2026 às 14:05 por Tereza do Teste" (o nome, F1; sem ele, o e-mail). */
  fechadoEm(c: PeCiclo): string {
    const quem = nomeDeQuem(c.FechadoPorNome, c.FechadoPor);
    return quem ? `${textoDataHora(c.FechadoEm)} por ${quem}` : textoDataHora(c.FechadoEm);
  }

  resumo(c: PeCiclo): string {
    return resumoDoCiclo(c);
  }

  rotuloVersao(situacao: string): string {
    return rotuloSituacaoVersao(situacao).toLowerCase();
  }

  /** "2027 · 1º trimestre · Aberto" (a lista de escolha da forma compacta). */
  opcao(c: PeCiclo): string {
    return `${c.Rotulo} · ${rotuloSituacaoCiclo(c.Situacao)}`;
  }

  ehEscolhido(c: PeCiclo): boolean {
    return c.Id === this.escolhido?.Id;
  }

  porId(_: number, c: PeCiclo): number {
    return c.Id;
  }

  // ── Escolha ───────────────────────────────────────────────────────────────

  ver(c: PeCiclo): void {
    if (this.ehEscolhido(c)) return;
    this.escolher.emit(c.Id);
  }

  alternarFuturos(): void {
    this.mostrarFuturos = !this.mostrarFuturos;
    this.montar();
  }

  verEscolhaCompacta(): void {
    const id = this.escolhaCompacta;
    if (id === null || id === this.escolhido?.Id) return;
    this.escolher.emit(id);
  }

  // ── Abrir uma avaliação ───────────────────────────────────────────────────

  get erroRotulo(): string | null {
    if (!this.tentou) return null;
    const t = this.rotulo.trim();
    if (!t) return 'Dê um nome à avaliação.';
    return t.length > MAX_ROTULO ? `Escreva até ${MAX_ROTULO} caracteres (agora são ${t.length}).` : null;
  }

  abrirJanela(): void {
    if (!this.podeAbrirAvaliacao) return;
    this.rotulo = rotuloAvaliacaoNova(this.ciclos);
    this.tentou = false;
    this.erroServidor = null;
    this.janela = true;
    this.focoPendente = `${this.idBase}-rotulo`;
  }

  fecharJanela(): void {
    if (!this.abrindo) this.janela = false;
  }

  abrirAvaliacao(): void {
    if (this.abrindo || this.pdticId === null) return;
    this.tentou = true;
    this.erroServidor = null;
    if (this.erroRotulo) {
      this.focoPendente = `${this.idBase}-rotulo`;
      return;
    }
    this.abrindo = true;
    this.ciclosService.abrirAvaliacao(this.pdticId, this.rotulo.trim()).subscribe({
      next: ciclo => {
        this.abrindo = false;
        this.janela = false;
        // Um aviso só (F1, C21): a troca para a avaliação nova não é anunciada de novo, e o nome não repete "Avaliação"
        this.silenciarTroca = ciclo?.Id ?? null;
        this.notificacoes.success(`"${ciclo?.Rotulo ?? this.rotulo.trim()}" foi aberta e está à vista. Preencha os resultados intermediários nos passos da avaliação.`);
        // O botão "Abrir uma avaliação" some com a avaliação aberta: o foco vai ao título da lista (F1, C11)
        this.focoPendente = `${this.idBase}-titulo`;
        this.abriu.emit(ciclo);
      },
      error: erro => {
        this.abrindo = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível abrir a avaliação. Tente de novo.');
        if (mensagem === null) {
          this.janela = false;
          return;
        }
        if ((erro as { status?: number } | null)?.status === 409) {
          // Outra pessoa abriu antes (só uma avaliação aberta por vez): a lista vem de novo
          this.janela = false;
          this.notificacoes.error(mensagem);
          this.recarregar.emit();
          return;
        }
        this.erroServidor = mensagem;
        this.focoPendente = `${this.idBase}-erro-servidor`;
      }
    });
  }
}
