import { AfterViewChecked, Component, EventEmitter, Input, OnChanges, Output, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PeCampoRegistro, PeRegistro, PeRegistrosDaSecao } from '../../../../api/planejamento/interface';
import { AcessibilidadeService } from '../../../core/acessibilidade/acessibilidade.service';
import { DialogoDirective } from '../../../core/acessibilidade/dialogo.directive';
import { NotificationService } from '../../../core/services/notification.service';
import { PeFonteRegistros } from '../../services/pe-registros.service';
import { mensagemErroPe } from '../pe-erros';
import { PeConfirmacaoService } from '../pe-confirmacao.service';
import { PeRegistroEdicaoComponent } from './pe-registro-edicao.component';
import { PeRegistroLeituraComponent } from './pe-registro-leitura.component';
import { classeLargura, colunasDaTabela, cortar, textoDoValor } from './pe-valores';

/** Tamanho do texto da primeira coluna (a principal); as demais usam o padrão de `cortar`. */
const LIMITE_PRINCIPAL = 280;

interface Painel {
  /** null: registro novo. */
  registro: PeRegistro | null;
  /** Só para ler (quem não edita, ou registro do sistema). */
  leitura: boolean;
}

/**
 * Seção do tipo tabela: vários registros, cada um com o código que o servidor dá
 * (prefixo da seção e sequência: OE01, OE02...). Lista com o código e as colunas
 * principais; incluir e editar num painel lateral (janela com `DialogoDirective`);
 * apagar com confirmação, mostrando a mensagem do servidor quando outro registro
 * liga a este (409); subir e descer para mudar a ordem (grava a ordem inteira).
 * Registro do sistema (os princípios do decreto) só se lê.
 *
 * Recebe a seção e os registros do contrato (GET .../registros) e a fonte do
 * dono, sem saber quem ele é. Quem não pode editar (`PodeEditar` falso) vê a
 * tabela e abre cada registro para ler.
 */
@Component({
  selector: 'app-pe-tabela-registros',
  standalone: true,
  imports: [CommonModule, DialogoDirective, PeRegistroEdicaoComponent, PeRegistroLeituraComponent],
  templateUrl: './pe-tabela-registros.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeTabelaRegistrosComponent implements OnChanges, AfterViewChecked {
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly confirmacao = inject(PeConfirmacaoService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) dados!: PeRegistrosDaSecao;
  @Input({ required: true }) fonte!: PeFonteRegistros;
  @Input() prefixoId = 'pe-tab';
  /** Nome de um item ("princípio", "objetivo"): o botão diz "Incluir princípio". */
  @Input() rotuloItem = 'registro';
  /** A lista depois de cada inclusão, alteração, exclusão ou mudança de ordem. */
  @Output() readonly mudou = new EventEmitter<PeRegistro[]>();
  /** Há mudança não salva no painel aberto. */
  @Output() readonly alterado = new EventEmitter<boolean>();

  registros: PeRegistro[] = [];
  colunas: PeCampoRegistro[] = [];
  painel: Painel | null = null;
  private painelSujo = false;
  movendo = false;
  apagando: number | null = null;
  /** Por que não deu para apagar (o 409 diz quem liga ao registro). */
  avisoApagar: string | null = null;
  private focoPendente: string | null = null;

  ngOnChanges(): void {
    this.registros = [...this.dados.Registros].sort((a, b) => a.Ordem - b.Ordem || a.Id - b.Id);
    this.colunas = colunasDaTabela(this.dados.Secao);
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  get contagem(): string {
    const n = this.registros.length;
    return n === 0 ? 'Nenhum registro.' : n === 1 ? '1 registro.' : `${n} registros.`;
  }

  get podeMover(): boolean {
    return this.dados.PodeEditar && this.registros.length > 1;
  }

  get tituloPainel(): string {
    const p = this.painel;
    if (!p) return '';
    if (!p.registro) return `Incluir ${this.rotuloItem}`;
    return `${p.leitura ? 'Ver' : 'Editar'} ${this.nome(p.registro)}`;
  }

  /** "PR12" ou "o registro 3" (sem código). */
  nome(r: PeRegistro): string {
    return r.Codigo || `o registro ${this.registros.indexOf(r) + 1}`;
  }

  editavel(r: PeRegistro): boolean {
    return this.dados.PodeEditar && !r.Sistema;
  }

  /** Texto da célula, cortado (o campo principal cabe mais: é a descrição do registro). */
  celula(campo: PeCampoRegistro, r: PeRegistro): string {
    return cortar(textoDoValor(campo, r), campo === this.colunas[0] ? LIMITE_PRINCIPAL : undefined);
  }

  larguraDe(campo: PeCampoRegistro): string {
    return classeLargura(campo);
  }

  porId(_: number, r: PeRegistro): number {
    return r.Id;
  }

  porChave(_: number, c: PeCampoRegistro): string {
    return c.Chave;
  }

  // ── Painel ────────────────────────────────────────────────────────────────

  incluir(): void {
    if (!this.dados.PodeEditar) return;
    this.painel = { registro: null, leitura: false };
  }

  abrir(r: PeRegistro): void {
    this.painel = { registro: r, leitura: !this.editavel(r) };
  }

  /** Fecha o painel (Esc, "Cancelar", "Fechar"); com mudança não salva, pergunta antes (na janela do módulo, F1, A04). */
  fecharPainel(): void {
    if (!this.painelSujo) {
      this.fecharPainelSim();
      return;
    }
    const painel = this.painel;
    this.confirmacao.perguntarDescarte('Há mudanças que ainda não foram salvas neste registro. Elas se perdem.', 'Fechar sem salvar', 'Fechar sem salvar?')
      .then(sim => {
        if (sim && this.painel === painel) this.fecharPainelSim();
      });
  }

  private fecharPainelSim(): void {
    this.painel = null;
    this.aoAlterar(false);
  }

  aoAlterar(sujo: boolean): void {
    if (sujo === this.painelSujo) return;
    this.painelSujo = sujo;
    this.alterado.emit(sujo);
  }

  aoSalvar(salvo: PeRegistro): void {
    const novo = !this.painel?.registro;
    const i = this.registros.findIndex(r => r.Id === salvo.Id);
    if (i >= 0) this.registros = this.registros.map(r => (r.Id === salvo.Id ? salvo : r));
    else this.registros = [...this.registros, salvo];
    this.painelSujo = false;
    this.painel = null;
    this.alterado.emit(false);
    // "Registro A03 incluído": neutro no gênero, que muda de item para item (F1, C16)
    const nome = salvo.Codigo ? `Registro ${salvo.Codigo}` : 'Registro';
    this.notificacoes.success(novo ? `${nome} incluído.` : `${nome} salvo.`);
    this.mudou.emit(this.registros);
  }

  // ── Apagar ────────────────────────────────────────────────────────────────

  apagar(r: PeRegistro): void {
    if (!this.editavel(r) || this.apagando !== null) return;
    const nome = this.nome(r);
    const codigo = r.Codigo ? ` O código ${r.Codigo} não volta a ser usado.` : '';
    this.confirmacao.perguntar({ titulo: `Apagar ${nome}?`, texto: `Não dá para desfazer.${codigo}`, sim: 'Apagar', perigo: true }).then(sim => {
      if (sim && this.apagando === null && this.registros.some(x => x.Id === r.Id)) this.apagarSim(r, nome);
    });
  }

  private apagarSim(r: PeRegistro, nome: string): void {
    this.apagando = r.Id;
    this.avisoApagar = null;
    this.fonte.apagar(this.dados.Secao.Chave, r.Id).subscribe({
      next: () => {
        this.apagando = null;
        const indice = this.registros.findIndex(x => x.Id === r.Id);
        this.registros = this.registros.filter(x => x.Id !== r.Id);
        // Um aviso só: o toast já é lido pelo leitor de tela (F1, B05); neutro no gênero (F1, C16)
        this.notificacoes.success(r.Codigo ? `Registro ${r.Codigo} apagado.` : 'Registro apagado.');
        // O foco vai para a linha que ficou no lugar (ou para o botão de incluir)
        const vizinho = this.registros[Math.min(indice, this.registros.length - 1)];
        this.focoPendente = vizinho ? `${this.prefixoId}-abrir-${vizinho.Id}` : `${this.prefixoId}-incluir`;
        this.mudou.emit(this.registros);
      },
      error: erro => {
        this.apagando = null;
        const mensagem = mensagemErroPe(erro, 'Não foi possível apagar. Tente de novo.');
        if (mensagem === null) return;
        this.avisoApagar = `Não foi possível apagar ${nome}. ${mensagem}`;
        this.focoPendente = `${this.prefixoId}-aviso-apagar`;
      }
    });
  }

  // ── Ordem ─────────────────────────────────────────────────────────────────

  mover(r: PeRegistro, delta: -1 | 1): void {
    const indice = this.registros.indexOf(r);
    const destino = indice + delta;
    if (!this.podeMover || this.movendo || indice < 0 || destino < 0 || destino >= this.registros.length) return;
    const nova = [...this.registros];
    [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
    this.movendo = true;
    this.fonte.ordenar(this.dados.Secao.Chave, nova.map(x => x.Id)).subscribe({
      next: () => {
        this.movendo = false;
        this.registros = nova.map((x, i) => ({ ...x, Ordem: i + 1 }));
        // O foco fica no botão usado; na ponta da lista ele desliga, e o foco vai ao outro
        const naPonta = destino === 0 || destino === nova.length - 1;
        const botao = naPonta ? (delta < 0 ? 'descer' : 'subir') : (delta < 0 ? 'subir' : 'descer');
        this.focoPendente = `${this.prefixoId}-${botao}-${r.Id}`;
        this.acessibilidade.anunciar(`${this.nome(r)} agora na posição ${destino + 1} de ${nova.length}.`);
        this.mudou.emit(this.registros);
      },
      error: erro => {
        this.movendo = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível mudar a ordem. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }
}
