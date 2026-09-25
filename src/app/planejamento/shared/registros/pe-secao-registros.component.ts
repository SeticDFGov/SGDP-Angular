import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, TemplateRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PeFormatoPlanilha, PeRegistro, PeRegistrosDaSecao } from '../../../../api/planejamento/interface';
import { NotificationService } from '../../../core/services/notification.service';
import { PeFonteRegistros } from '../../services/pe-registros.service';
import { mensagemErroPe } from '../pe-erros';
import { mensagemErroDownload, salvarResposta } from '../pe-download';
import { PeFormularioSecaoComponent } from './pe-formulario-secao.component';
import { PeTabelaRegistrosComponent } from './pe-tabela-registros.component';

/**
 * Uma seção de dados de um dono, pronta para usar numa tela: busca a seção e os
 * registros (GET {dono}/secoes/{secaoChave}/registros), mostra o título, a ajuda
 * e os botões de planilha (CSV e XLSX, por blob, com o nome do servidor) e usa o
 * formulário ou a tabela, conforme o tipo da seção. Quem não pode editar lê.
 *
 * É o ponto de entrada dos componentes genéricos: a tela só diz a fonte (o dono)
 * e a chave da seção. Serve ao catálogo do DF, ao PETIC-DF e às seções do PDTIC
 * (a tela do passo do órgão).
 */
@Component({
  selector: 'app-pe-secao-registros',
  standalone: true,
  imports: [CommonModule, PeFormularioSecaoComponent, PeTabelaRegistrosComponent],
  templateUrl: './pe-secao-registros.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeSecaoRegistrosComponent implements OnChanges, OnDestroy {
  private readonly notificacoes = inject(NotificationService);

  @Input({ required: true }) fonte!: PeFonteRegistros;
  @Input({ required: true }) secaoChave!: string;
  /** Mostra os botões de planilha da seção. */
  @Input() planilha = true;
  /** Nome da planilha quando o servidor não manda o nome ("PETIC-DF_1.0_objetivos"). */
  @Input() nomePlanilha: string | null = null;
  /** Nome de um item da tabela ("princípio"): o botão diz "Incluir princípio". */
  @Input() rotuloItem = 'registro';
  /** Explica por que a pessoa só lê (ex.: "Só o rascunho muda."). Sem ele, um texto padrão. */
  @Input() avisoLeitura: string | null = null;
  /** Esconde o título (a tela já mostra o nome da seção). */
  @Input() semTitulo = false;
  /** Situação da seção para o dono (PDTIC: pelo nível do órgão): selo ao lado do título. */
  @Input() situacao: 'obrigatorio' | 'opcional' | null = null;
  /**
   * O que a tela oferece quando a tabela está vazia e a pessoa edita (E6: "Sugerir
   * o cronograma pelos fluxos"). Aparece entre o título e a tabela.
   */
  @Input() acaoVazia: TemplateRef<unknown> | null = null;
  /** Mudou: a seção é buscada de novo (a tela criou registros por fora, como na sugestão do cronograma). */
  @Input() recarga = 0;
  /** A lista mudou (inclusão, alteração, exclusão, ordem) ou o formulário foi salvo. */
  @Output() readonly mudou = new EventEmitter<void>();
  /** Há mudança não salva na seção. */
  @Output() readonly alterado = new EventEmitter<boolean>();
  /**
   * Os registros da seção depois de cada carga (terminada: o título da seção já
   * está na tela) e de cada mudança salva. A tela do passo lê a decisão das
   * aprovações (E7) e espera esta saída para levar o foco ao título depois de uma
   * recarga (o título é recriado quando a seção vem de novo).
   */
  @Output() readonly registros = new EventEmitter<PeRegistro[]>();

  dados: PeRegistrosDaSecao | null = null;
  carregando = false;
  erro: string | null = null;
  baixando: PeFormatoPlanilha | null = null;
  /** Quantos registros a seção tem agora (a tabela avisa a cada mudança). */
  quantidade = 0;
  private carga?: Subscription;
  private carregado = '';

  ngOnChanges(): void {
    const chave = `${this.fonte?.chave}|${this.secaoChave}|${this.recarga}`;
    if (chave === this.carregado) return;
    this.carregado = chave;
    // Outra seção (ou outro dono): a anterior sai da tela enquanto a nova carrega
    this.dados = null;
    this.carregar();
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
  }

  get idTitulo(): string {
    return `pe-secao-${this.secaoChave}-titulo`;
  }

  get prefixoId(): string {
    return `pe-${this.secaoChave}`;
  }

  carregar(): void {
    this.carga?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.carga = this.fonte.listar(this.secaoChave).subscribe({
      next: dados => {
        this.carregando = false;
        this.dados = dados;
        this.quantidade = dados.Registros?.length ?? 0;
        this.registros.emit(dados.Registros ?? []);
      },
      error: erro => {
        this.carregando = false;
        this.dados = null;
        const status = (erro as { status?: number } | null)?.status;
        const padrao = status === 404
          ? 'Esta seção não foi encontrada. Ela pode ter sido desligada ou apagada no modelo.'
          : 'Não foi possível carregar esta seção.';
        // 403: o interceptor já tirou a pessoa da tela
        this.erro = mensagemErroPe(erro, padrao);
      }
    });
  }

  aoMudar(registros: PeRegistro[] | PeRegistro): void {
    if (Array.isArray(registros)) this.quantidade = registros.length;
    this.mudou.emit();
    this.registros.emit(Array.isArray(registros) ? registros : [registros]);
  }

  /** A ação da tabela vazia aparece (quem edita, numa tabela sem registros). */
  get mostraAcaoVazia(): boolean {
    const d = this.dados;
    return !!this.acaoVazia && !!d && d.PodeEditar && d.Secao.Tipo === 'tabela' && this.quantidade === 0;
  }

  /** Planilha da seção por blob, com o nome do `Content-Disposition`. */
  baixarPlanilha(formato: PeFormatoPlanilha): void {
    if (this.baixando) return;
    this.baixando = formato;
    const reserva = `${this.nomePlanilha || this.secaoChave}.${formato}`;
    this.fonte.planilha(this.secaoChave, formato).subscribe({
      next: resposta => {
        this.baixando = null;
        salvarResposta(resposta, reserva);
      },
      error: erro => {
        this.baixando = null;
        mensagemErroDownload(erro, 'Não foi possível gerar a planilha. Tente de novo.').then(m => {
          if (m) this.notificacoes.error(m);
        });
      }
    });
  }
}
