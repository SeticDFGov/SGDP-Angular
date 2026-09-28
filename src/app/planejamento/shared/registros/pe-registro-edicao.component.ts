import {
  AfterViewChecked, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, PLATFORM_ID, SimpleChanges, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PeCampoRegistro, PeRegistro, PeSecaoDoDono, PeVinculo } from '../../../../api/planejamento/interface';
import { PeFonteRegistros } from '../../services/pe-registros.service';
import { mensagemErroPe } from '../pe-erros';
import { PeCampoComponent } from './pe-campo.component';
import { EstadoRegistro, erroDoCampo, errosDoServidor, estadoInicial, larguraNoFormulario, montarForm } from './pe-valores';

interface ErroListado {
  chave: string;
  rotulo: string;
  mensagem: string;
}

const SEM_VINCULOS: PeVinculo[] = [];

/** A classe da célula de cada largura (as regras ficam no CSS deste componente, que vai no pacote lazy). */
const CLASSE_CELULA = { estreita: 'pe-campo-estreita', media: 'pe-campo-media', larga: 'pe-campo-larga' } as const;

/**
 * Os campos em grade (só leiaute, sem cor: os temas não mudam). No celular, um por
 * linha; a partir de 40rem, 6 colunas (estreito ocupa 2, médio 3, largo a linha
 * inteira) ou, no painel lateral da tabela, 2 colunas (estreito e médio ocupam 1).
 * A ordem do DOM é a do modelo (sem reordenar nem encaixar): o Tab e o leitor de
 * tela seguem o modelo, e o campo que não cabe vai para a linha seguinte. Tudo
 * alinhado no alto da célula.
 */
const CSS_GRADE = `
.pe-grade-campos { display: grid; grid-template-columns: minmax(0, 1fr); column-gap: 1rem; row-gap: 1.25rem; align-items: start; }
@media (min-width: 40rem) {
  .pe-grade-campos { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .pe-campo-estreita { grid-column: span 2 / span 2; }
  .pe-campo-media { grid-column: span 3 / span 3; }
  .pe-campo-larga { grid-column: 1 / -1; }
  .pe-grade-painel { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pe-grade-painel > .pe-campo-estreita, .pe-grade-painel > .pe-campo-media { grid-column: span 1 / span 1; }
}
`;

/**
 * Os campos de um registro para preencher e salvar: o formulário de uma seção do
 * tipo formulário e o painel de uma linha da tabela usam este mesmo componente.
 * Cria (POST, sem `registro`) ou altera (PUT) pela fonte, sem saber quem é o dono.
 *
 * - Obrigatórios marcados; a conferência roda ao salvar (e, depois da primeira
 *   tentativa, a cada mudança) com mensagens em linguagem simples por campo,
 *   ligadas por `aria-describedby`, e um resumo no alto ("Antes de salvar,
 *   corrija:") que recebe o foco e leva a cada campo.
 * - O 400 do servidor (`Campos`) vai para os mesmos lugares; a `Message` sem
 *   campo aparece no alto. No formulário, 409 no POST (alguém criou antes) pede
 *   à tela para recarregar (`conflito`).
 * - `alterado` avisa a tela quando há mudança não salva (para perguntar antes de sair).
 * - E8: os campos em grade, pela largura de cada um (`larguraNoFormulario`: a do
 *   modelo, senão a do tipo), com até 2 por linha no painel lateral (`emPainel`).
 */
@Component({
  selector: 'app-pe-registro-edicao',
  standalone: true,
  imports: [CommonModule, FormsModule, PeCampoComponent],
  templateUrl: './pe-registro-edicao.component.html',
  styles: [CSS_GRADE],
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeRegistroEdicaoComponent implements OnChanges, AfterViewChecked, OnDestroy {
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input({ required: true }) secao!: PeSecaoDoDono;
  /** null: registro novo. */
  @Input() registro: PeRegistro | null = null;
  @Input({ required: true }) fonte!: PeFonteRegistros;
  /** Prefixo dos ids (a tela pode ter mais de um formulário). */
  @Input() prefixoId = 'pe-reg';
  @Input() rotuloSalvar = 'Salvar';
  @Input() mostrarCancelar = false;
  /** No painel lateral da tabela: até 2 campos por linha. */
  @Input() emPainel = false;
  @Output() readonly salvou = new EventEmitter<PeRegistro>();
  @Output() readonly cancelou = new EventEmitter<void>();
  @Output() readonly alterado = new EventEmitter<boolean>();
  /** 409 ao criar: outra pessoa criou o formulário antes (a tela recarrega). */
  @Output() readonly conflito = new EventEmitter<string>();

  estado: EstadoRegistro = { valores: {}, vinculos: {} };
  erros: Record<string, string> = {};
  erroGeral: string | null = null;
  tentou = false;
  salvando = false;
  private retrato = '';
  private sujo = false;
  private focoPendente: string | null = null;
  private envio?: Subscription;

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['secao'] || mudancas['registro']) this.reiniciar();
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
    this.envio?.unsubscribe();
  }

  /** Volta ao que está gravado (ou ao registro vazio). */
  reiniciar(): void {
    this.estado = estadoInicial(this.secao, this.registro);
    this.erros = {};
    this.erroGeral = null;
    this.tentou = false;
    this.retrato = JSON.stringify(montarForm(this.secao, this.estado, this.registro));
    if (this.sujo) {
      // Chamado na detecção de mudanças (entrada nova): o aviso sai depois dela
      this.sujo = false;
      Promise.resolve().then(() => this.alterado.emit(false));
    }
  }

  get novo(): boolean {
    return !this.registro;
  }

  get temObrigatorio(): boolean {
    return this.secao.Campos.some(c => c.Obrigatorio);
  }

  get listaErros(): ErroListado[] {
    return this.secao.Campos
      .filter(c => !!this.erros[c.Chave])
      .map(c => ({ chave: c.Chave, rotulo: c.Rotulo, mensagem: this.erros[c.Chave] }));
  }

  idDo(campo: PeCampoRegistro): string {
    return `${this.prefixoId}-${campo.Chave}`;
  }

  /** A célula do campo na grade, pela largura dele. */
  celula(campo: PeCampoRegistro): string {
    return CLASSE_CELULA[larguraNoFormulario(campo)];
  }

  valorDe(campo: PeCampoRegistro): unknown {
    return this.estado.valores[campo.Chave];
  }

  escolhidosDe(campo: PeCampoRegistro): PeVinculo[] {
    return this.estado.vinculos[campo.Chave] ?? SEM_VINCULOS;
  }

  erroDe(campo: PeCampoRegistro): string | null {
    return this.erros[campo.Chave] ?? null;
  }

  porChave(_: number, campo: PeCampoRegistro): string {
    return campo.Chave;
  }

  mudarValor(campo: PeCampoRegistro, valor: unknown): void {
    this.estado.valores[campo.Chave] = valor;
    this.depoisDeMudar(campo);
  }

  mudarEscolhidos(campo: PeCampoRegistro, escolhidos: PeVinculo[]): void {
    this.estado.vinculos[campo.Chave] = escolhidos;
    this.depoisDeMudar(campo);
  }

  /** Leva o foco ao campo (do resumo de erros). */
  focar(chave: string): void {
    this.focoPendente = `${this.prefixoId}-${chave}`;
  }

  cancelar(): void {
    this.cancelou.emit();
  }

  salvar(): void {
    if (this.salvando) return;
    this.tentou = true;
    this.erroGeral = null;
    this.erros = this.conferirTudo();
    if (this.listaErros.length) {
      this.focoPendente = `${this.prefixoId}-erros`;
      return;
    }
    const form = montarForm(this.secao, this.estado, this.registro);
    const pedido = this.registro
      ? this.fonte.atualizar(this.secao.Chave, this.registro.Id, form)
      : this.fonte.criar(this.secao.Chave, form);
    this.salvando = true;
    this.envio = pedido.subscribe({
      next: salvo => {
        this.salvando = false;
        this.marcarSujo(false);
        this.salvou.emit(salvo);
      },
      error: erro => {
        this.salvando = false;
        // 403: o interceptor já avisou e tirou a pessoa da tela
        const mensagem = mensagemErroPe(erro, 'Não foi possível salvar. Confira os dados e tente de novo.');
        if (mensagem === null) return;
        const status = (erro as { status?: number } | null)?.status;
        if (status === 409 && !this.registro) {
          this.conflito.emit(mensagem);
          return;
        }
        const doServidor = errosDoServidor(this.secao, erro);
        if (Object.keys(doServidor).length) {
          this.erros = { ...this.erros, ...doServidor };
          this.focoPendente = `${this.prefixoId}-erros`;
          // A mensagem geral só quando não repete a dos campos
          const repetida = Object.values(doServidor).includes(mensagem);
          this.erroGeral = repetida ? null : mensagem;
        } else {
          this.erroGeral = mensagem;
          this.focoPendente = `${this.prefixoId}-erro-geral`;
        }
      }
    });
  }

  private depoisDeMudar(campo: PeCampoRegistro): void {
    if (this.tentou) {
      const erro = erroDoCampo(campo, this.estado.valores[campo.Chave], this.estado.vinculos[campo.Chave]);
      const erros = { ...this.erros };
      if (erro) erros[campo.Chave] = erro;
      else delete erros[campo.Chave];
      this.erros = erros;
    }
    this.marcarSujo(JSON.stringify(montarForm(this.secao, this.estado, this.registro)) !== this.retrato);
  }

  private conferirTudo(): Record<string, string> {
    const erros: Record<string, string> = {};
    for (const campo of this.secao.Campos) {
      const erro = erroDoCampo(campo, this.estado.valores[campo.Chave], this.estado.vinculos[campo.Chave]);
      if (erro) erros[campo.Chave] = erro;
    }
    return erros;
  }

  private marcarSujo(sujo: boolean): void {
    if (sujo === this.sujo) return;
    this.sujo = sujo;
    this.alterado.emit(sujo);
  }
}
