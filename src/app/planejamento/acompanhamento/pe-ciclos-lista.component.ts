import {
  AfterViewChecked, Component, EventEmitter, Input, OnChanges, Output, PLATFORM_ID, SimpleChanges, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeCiclo, PeTipoCiclo } from '../../../api/planejamento/interface';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../core/services/notification.service';
import { PeCiclosService } from '../services/pe-ciclos.service';
import {
  ciclosEmOrdem, classeSituacaoCiclo, iconeSituacaoCiclo, periodoCiclo, resumoDoCiclo, rotuloAvaliacaoNova, rotuloSituacaoCiclo
} from '../shared/pe-ciclos-rotulos';
import { rotuloSituacaoVersao } from '../shared/pe-documento-rotulos';
import { mensagemErroPe } from '../shared/pe-erros';
import { textoData, textoDataHora } from '../shared/registros/pe-valores';

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
  templateUrl: './pe-ciclos-lista.component.html'
})
export class PeCiclosListaComponent implements OnChanges, AfterViewChecked {
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

  ngOnChanges(mudancas: SimpleChanges): void {
    this.montar();
    // Outro ciclo à vista depois de uma escolha: o foco fica no botão, e o leitor de tela ouve a troca
    const m = mudancas['escolhido'];
    const antes = (m?.previousValue as PeCiclo | null | undefined)?.Id ?? null;
    const agora = this.escolhido;
    if (m && !m.firstChange && antes !== null && agora && agora.Id !== antes) {
      this.acessibilidade.anunciar(`${this.rotuloCiclo} ${agora.Rotulo} à vista.`);
    }
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
      : 'Os ciclos seguem a periodicidade do plano de monitoramento (trimestral, se o órgão não mudou). Em cada ciclo, a equipe registra a '
        + 'situação das ações, as medições e os riscos que ocorreram e fecha o ciclo até o prazo.';
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
        this.notificacoes.success(`Avaliação "${ciclo?.Rotulo ?? this.rotulo.trim()}" aberta. Preencha os resultados intermediários nos passos da avaliação.`);
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
