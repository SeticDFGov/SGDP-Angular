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
import { EstadoRegistro, erroDoCampo, errosDoServidor, estadoInicial, montarForm } from './pe-valores';

interface ErroListado {
  chave: string;
  rotulo: string;
  mensagem: string;
}

const SEM_VINCULOS: PeVinculo[] = [];

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
 */
@Component({
  selector: 'app-pe-registro-edicao',
  standalone: true,
  imports: [CommonModule, FormsModule, PeCampoComponent],
  templateUrl: './pe-registro-edicao.component.html'
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
