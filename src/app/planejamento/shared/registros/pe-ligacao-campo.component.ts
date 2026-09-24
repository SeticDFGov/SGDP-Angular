import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PeCampoRegistro, PeVinculo } from '../../../../api/planejamento/interface';
import { CATALOGO_PGIA, PeFonteRegistros } from '../../services/pe-registros.service';
import { mensagemErroPe } from '../pe-erros';
import { rotuloCatalogo } from '../pe-modelo-rotulos';
import { resumoDoRegistro } from './pe-valores';

/** Um item que pode ser ligado: registro de outra seção do mesmo dono ou item de um catálogo. */
interface OpcaoLigacao {
  Id: number;
  Codigo: string | null;
  Rotulo: string;
  /** Código e texto sem acento e em minúsculas, para a busca. */
  busca: string;
}

/** Com até tantos itens, a lista aparece inteira, sem a caixa de busca. */
const LIMITE_SEM_BUSCA = 8;

/** Itens mostrados de uma vez (o resto aparece refinando a busca). */
const LIMITE_LISTA = 50;

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Campo de ligação (`ligacao_secao` e `ligacao_catalogo`): os escolhidos como
 * etiquetas com o botão "Tirar", e a lista do que pode ser escolhido, com caixa
 * de busca quando é longa (código ou parte do texto). Uma escolha ou várias,
 * pela configuração do campo. Tudo por teclado: a lista é de caixas de marcar (ou
 * botões de opção), sem combobox.
 *
 * As opções da ligação com seção vêm da própria fonte (outra seção do mesmo
 * dono); as do catálogo, de GET catalogos/{catalogo}, também pela fonte (o
 * PDTIC diz o órgão dos sistemas de IA do PGIA). O registro em edição não
 * aparece na lista da própria seção.
 */
@Component({
  selector: 'app-pe-ligacao-campo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pe-ligacao-campo.component.html'
})
export class PeLigacaoCampoComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) campo!: PeCampoRegistro;
  @Input({ required: true }) fonte!: PeFonteRegistros;
  @Input() escolhidos: PeVinculo[] = [];
  /** O registro em edição: não se liga a si mesmo. */
  @Input() registroId: number | null = null;
  @Input({ required: true }) idBase!: string;
  @Input() erro: string | null = null;
  /** Texto de ajuda do campo (o jeito de responder vem daqui). */
  @Input() ajuda: string | null = null;
  @Output() readonly escolhidosChange = new EventEmitter<PeVinculo[]>();

  opcoes: OpcaoLigacao[] = [];
  carregando = false;
  falhou = false;
  /** O que não dá para escolher agora (catálogo que chega depois, seção não definida). */
  indisponivel: string | null = null;
  /** Nome da seção ligada ou do catálogo. */
  alvo = '';
  busca = '';
  private carga?: Subscription;
  private carregado = '';

  ngOnChanges(): void {
    const chave = `${this.fonte?.chave}|${this.campo?.Tipo}|${this.campo?.Config?.secao ?? ''}|${this.campo?.Config?.catalogo ?? ''}|${this.registroId ?? ''}`;
    if (chave === this.carregado) return;
    this.carregado = chave;
    this.carregar();
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
  }

  get multipla(): boolean {
    return !!this.campo.Config?.multipla;
  }

  get comBusca(): boolean {
    return this.opcoes.length > LIMITE_SEM_BUSCA;
  }

  get descritores(): string {
    return this.erro ? `${this.idBase}-ajuda ${this.idBase}-erro` : `${this.idBase}-ajuda`;
  }

  /** "Escolha um ou mais objetivos..." (o jeito de responder, antes da ajuda do modelo). */
  get dica(): string {
    const onde = this.alvo ? ` de "${this.alvo}"` : '';
    return this.multipla ? `Escolha um ou mais itens${onde}.` : `Escolha um item${onde}.`;
  }

  get filtradas(): OpcaoLigacao[] {
    const termo = normalizar(this.busca.trim());
    const lista = termo ? this.opcoes.filter(o => o.busca.includes(termo)) : this.opcoes;
    return lista.slice(0, LIMITE_LISTA);
  }

  get contagem(): string {
    const termo = this.busca.trim();
    const total = termo ? this.opcoes.filter(o => o.busca.includes(normalizar(termo))).length : this.opcoes.length;
    if (termo && total === 0) return 'Nada encontrado com essa busca.';
    if (total > LIMITE_LISTA) return `Mostrando ${LIMITE_LISTA} de ${total}. Escreva mais da busca para achar o item.`;
    return total === 1 ? '1 item.' : `${total} itens.`;
  }

  /** Mensagem da lista vazia. */
  get semOpcoes(): string {
    const catalogo = this.campo.Config?.catalogo ?? '';
    if (this.campo.Tipo === 'ligacao_catalogo' && catalogo.startsWith('petic_')) {
      return 'Ainda não há itens: a lista vem do PETIC-DF vigente, e nenhuma versão foi aprovada pelo CGTIC. '
        + 'Enquanto não houver versão vigente, a ligação com o PETIC-DF fica opcional.';
    }
    if (this.campo.Tipo === 'ligacao_catalogo' && catalogo === CATALOGO_PGIA) {
      return 'O órgão ainda não tem sistemas de IA no inventário do PGIA (Governança de IA).';
    }
    return this.campo.Tipo === 'ligacao_secao'
      ? `"${this.alvo || 'A seção ligada'}" ainda não tem registros. Inclua lá primeiro e volte aqui.`
      : 'Ainda não há itens neste catálogo.';
  }

  escolhido(o: OpcaoLigacao): boolean {
    return this.escolhidos.some(e => e.RegistroId === o.Id);
  }

  /** Texto do escolhido: o da lista, quando ela já chegou, senão o que o registro trouxe. */
  resumo(v: PeVinculo): string {
    return this.opcoes.find(o => o.Id === v.RegistroId)?.Rotulo ?? v.Resumo ?? '';
  }

  nomeDoEscolhido(v: PeVinculo): string {
    return v.Codigo || this.resumo(v) || `registro nº ${v.RegistroId}`;
  }

  alternar(o: OpcaoLigacao, marcado: boolean): void {
    const sem = this.escolhidos.filter(e => e.RegistroId !== o.Id);
    this.escolhidosChange.emit(marcado ? [...sem, this.vinculo(o)] : sem);
  }

  escolherUnico(o: OpcaoLigacao): void {
    this.escolhidosChange.emit([this.vinculo(o)]);
  }

  tirar(v: PeVinculo): void {
    this.escolhidosChange.emit(this.escolhidos.filter(e => e.RegistroId !== v.RegistroId));
  }

  recarregar(): void {
    this.carregar();
  }

  porId(_: number, o: OpcaoLigacao): number {
    return o.Id;
  }

  porRegistro(_: number, v: PeVinculo): number {
    return v.RegistroId;
  }

  private vinculo(o: OpcaoLigacao): PeVinculo {
    return { RegistroId: o.Id, Codigo: o.Codigo, Resumo: o.Rotulo };
  }

  private carregar(): void {
    this.carga?.unsubscribe();
    this.opcoes = [];
    this.falhou = false;
    this.indisponivel = null;
    this.busca = '';
    const config = this.campo.Config;

    if (this.campo.Tipo === 'ligacao_secao') {
      const secao = config?.secao ?? '';
      this.alvo = '';
      if (!secao) {
        this.indisponivel = 'A seção ligada ainda não foi escolhida no modelo. Fale com o administrador do módulo.';
        return;
      }
      this.carregando = true;
      this.carga = this.fonte.listar(secao).subscribe({
        next: resposta => {
          this.carregando = false;
          this.alvo = resposta.Secao.Titulo;
          this.opcoes = resposta.Registros
            .filter(r => r.Id !== this.registroId)
            .map(r => this.opcao(r.Id, r.Codigo, resumoDoRegistro(resposta.Secao, r)));
        },
        error: erro => {
          this.carregando = false;
          // 403: o interceptor já tirou a pessoa da tela
          this.falhou = mensagemErroPe(erro, '') !== null;
        }
      });
      return;
    }

    const catalogo = config?.catalogo ?? '';
    this.alvo = rotuloCatalogo(catalogo);
    if (!this.fonte.aceitaCatalogo(catalogo)) {
      this.indisponivel = catalogo === CATALOGO_PGIA
        ? 'Os sistemas de IA vêm do inventário do órgão no PGIA: a escolha só existe no PDTIC de um órgão.'
        : 'Este catálogo não está disponível. Fale com o administrador do módulo.';
      return;
    }
    this.carregando = true;
    this.carga = this.fonte.catalogo(catalogo).subscribe({
      next: itens => {
        this.carregando = false;
        this.opcoes = itens.map(i => this.opcao(i.Id, i.Codigo, i.Rotulo));
      },
      error: erro => {
        this.carregando = false;
        this.falhou = mensagemErroPe(erro, '') !== null;
      }
    });
  }

  private opcao(id: number, codigo: string | null, rotulo: string): OpcaoLigacao {
    return { Id: id, Codigo: codigo, Rotulo: rotulo, busca: normalizar(`${codigo ?? ''} ${rotulo}`) };
  }
}
