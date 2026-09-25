import {
  AfterViewChecked, AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output,
  PLATFORM_ID, SimpleChanges, ViewChild, ViewEncapsulation, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeDocMarcador, PeDocTextoRico } from '../../../../api/planejamento/interface';
import { PeRegistrosService } from '../../services/pe-registros.service';
import { mensagemErroPe } from '../pe-erros';
import { PeImagensService } from './pe-imagens.service';
import {
  ComandoTextoRico, EXTENSOES_IMAGEM, ESTADO_FORMATACAO_VAZIO, EditorTextoRico, EstadoFormatacao,
  MAX_DESCRICAO_IMAGEM, MAX_MB_IMAGEM_TEXTO, hrefSeguro, normalizarDocumento, normalizarEndereco, srcDaImagem
} from './pe-texto-rico-doc';

/** Um botão da barra de ferramentas. */
interface BotaoBarra {
  id: string;
  rotulo: string;
  /** Ícone (Material Icons) ou, sem ele, o texto do botão. */
  icone?: string;
  texto?: string;
  /** Atalho como aparece na dica ("Ctrl+B") e para o leitor de tela (`aria-keyshortcuts`). */
  atalho?: string;
  teclas?: string;
  /** Liga e desliga (tem `aria-pressed`). */
  alterna?: boolean;
  /** Começa um grupo novo (separador antes). */
  separa?: boolean;
}

const BOTOES: BotaoBarra[] = [
  { id: 'titulo', rotulo: 'Título', texto: 'Título', atalho: 'Ctrl+Alt+3', teclas: 'Control+Alt+3', alterna: true },
  { id: 'subtitulo', rotulo: 'Subtítulo', texto: 'Subtítulo', atalho: 'Ctrl+Alt+4', teclas: 'Control+Alt+4', alterna: true },
  { id: 'negrito', rotulo: 'Negrito', icone: 'format_bold', atalho: 'Ctrl+B', teclas: 'Control+B', alterna: true, separa: true },
  { id: 'italico', rotulo: 'Itálico', icone: 'format_italic', atalho: 'Ctrl+I', teclas: 'Control+I', alterna: true },
  { id: 'sublinhado', rotulo: 'Sublinhado', icone: 'format_underlined', atalho: 'Ctrl+U', teclas: 'Control+U', alterna: true },
  { id: 'listaMarcadores', rotulo: 'Lista com marcadores', icone: 'format_list_bulleted', atalho: 'Ctrl+Shift+8', teclas: 'Control+Shift+8', alterna: true, separa: true },
  { id: 'listaNumerada', rotulo: 'Lista numerada', icone: 'format_list_numbered', atalho: 'Ctrl+Shift+7', teclas: 'Control+Shift+7', alterna: true },
  { id: 'diminuirRecuo', rotulo: 'Diminuir o recuo do item da lista', icone: 'format_indent_decrease', atalho: 'Ctrl+[', teclas: 'Control+[' },
  { id: 'aumentarRecuo', rotulo: 'Aumentar o recuo do item da lista', icone: 'format_indent_increase', atalho: 'Ctrl+]', teclas: 'Control+]' },
  { id: 'link', rotulo: 'Link', icone: 'link', atalho: 'Ctrl+K', teclas: 'Control+K', alterna: true, separa: true },
  { id: 'imagem', rotulo: 'Inserir imagem', icone: 'image' },
  { id: 'inserirTabela', rotulo: 'Inserir tabela', icone: 'table_chart' },
  { id: 'desfazer', rotulo: 'Desfazer', icone: 'undo', atalho: 'Ctrl+Z', teclas: 'Control+Z', separa: true },
  { id: 'refazer', rotulo: 'Refazer', icone: 'redo', atalho: 'Ctrl+Y', teclas: 'Control+Y' }
];

/** Com a lista de marcadores (documento do PDTIC): "Inserir marcador" antes do desfazer. */
const BOTOES_COM_MARCADOR: BotaoBarra[] = [
  ...BOTOES.filter(b => b.id !== 'desfazer' && b.id !== 'refazer'),
  { id: 'marcador', rotulo: 'Inserir marcador', icone: 'data_object', separa: true },
  ...BOTOES.filter(b => b.id === 'desfazer' || b.id === 'refazer')
];

/** Ações da tabela: aparecem com o cursor numa tabela. */
const BOTOES_TABELA: BotaoBarra[] = [
  { id: 'linhaAcima', rotulo: 'Incluir linha acima', texto: 'Linha acima' },
  { id: 'linhaAbaixo', rotulo: 'Incluir linha abaixo', texto: 'Linha abaixo' },
  { id: 'colunaAntes', rotulo: 'Incluir coluna à esquerda', texto: 'Coluna à esquerda' },
  { id: 'colunaDepois', rotulo: 'Incluir coluna à direita', texto: 'Coluna à direita' },
  { id: 'apagarLinha', rotulo: 'Apagar a linha', texto: 'Apagar a linha' },
  { id: 'apagarColuna', rotulo: 'Apagar a coluna', texto: 'Apagar a coluna' },
  { id: 'cabecalhoTabela', rotulo: 'Primeira linha como cabeçalho', texto: 'Cabeçalho', alterna: true },
  { id: 'apagarTabela', rotulo: 'Apagar a tabela', texto: 'Apagar a tabela' }
];

type Painel = 'link' | 'imagem' | 'marcador';

/**
 * Campo de texto rico (títulos, negrito, itálico, sublinhado, listas, link,
 * tabela e imagem), com barra de ferramentas própria e acessível:
 *
 * - A barra é um `role="toolbar"` com um ponto só no Tab (as setas, Home e End
 *   andam entre os botões); cada botão tem nome, dica com o atalho e
 *   `aria-keyshortcuts`, e os que ligam e desligam têm `aria-pressed`.
 * - O texto é um `role="textbox"` de várias linhas, com o rótulo, a ajuda, o
 *   erro e o obrigatório ligados. O Tab sai do editor (nada prende o foco).
 * - Link e imagem abrem um painel na própria barra (sem `prompt`), com os erros
 *   no campo. A imagem vai para POST api/planejamento/arquivos (PNG ou JPEG até
 *   5 MB) e pede a descrição (texto alternativo).
 *
 * O editor (TipTap) só é carregado no navegador, por import dinâmico, quando o
 * campo aparece: fica num pacote próprio, fora do inicial e do pacote comum do
 * módulo. Guarda o JSON do TipTap já no recorte da lista fechada (null vazio).
 * O `idBase` é do elemento que recebe o foco pelo resumo de erros (ele passa o
 * foco ao texto).
 *
 * Documento do PDTIC (E5): com `marcadores`, a barra ganha "Inserir marcador"
 * (um painel com a lista, que põe "{orgao.nome}" no ponto do cursor) e os
 * marcadores escritos ficam em destaque; `focarAoCarregar` põe o cursor no texto
 * assim que o editor chega (o bloco da prévia abre o editor no clique). O
 * `data-sem-dica` impede a dica de norma de mexer no texto que se edita.
 */
@Component({
  selector: 'app-pe-editor-texto-rico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pe-editor-texto-rico.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' },
  encapsulation: ViewEncapsulation.None,
  // Só o que as classes não fazem: a imagem e as células selecionadas, com a cor do foco
  // de cada tema, e as colunas iguais da tabela enquanto se edita
  styles: [`
    .pe-editor-rico .ProseMirror-selectednode { box-shadow: 0 0 0 3px var(--foco, #2b7fff); }
    .pe-editor-rico .selectedCell { background-color: color-mix(in srgb, var(--foco, #2b7fff) 18%, transparent); }
    .pe-editor-rico .ProseMirror table { table-layout: fixed; }
    .pe-editor-rico .ProseMirror-gapcursor:after { border-top-color: currentColor; }
  `]
})
export class PeEditorTextoRicoComponent implements OnChanges, AfterViewInit, AfterViewChecked, OnDestroy {
  private readonly zona = inject(NgZone);
  private readonly registrosService = inject(PeRegistrosService);
  private readonly imagens = inject(PeImagensService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input() valor: unknown = null;
  /** Id do elemento que recebe o foco pelo resumo de erros (passa o foco ao texto). */
  @Input({ required: true }) idBase!: string;
  /** Id do rótulo visível do campo. */
  @Input({ required: true }) idRotulo!: string;
  @Input() rotulo = '';
  /** Ids da ajuda e do erro do campo (`aria-describedby`). */
  @Input() descritores: string | null = null;
  @Input() invalido = false;
  @Input() obrigatorio = false;
  /** Marcadores que o texto pode usar (documento do PDTIC); sem eles, a barra não tem "Inserir marcador". */
  @Input() marcadores: readonly PeDocMarcador[] | null = null;
  /** O cursor vai para o texto assim que o editor chega. */
  @Input() focarAoCarregar = false;
  @Output() readonly valorChange = new EventEmitter<PeDocTextoRico | null>();

  @ViewChild('hospedeiro', { static: true }) hospedeiro!: ElementRef<HTMLElement>;
  @ViewChild('barra') barra?: ElementRef<HTMLElement>;

  readonly botoesTabela = BOTOES_TABELA;
  readonly maxDescricao = MAX_DESCRICAO_IMAGEM;
  readonly aceitaImagem = EXTENSOES_IMAGEM.map(e => `.${e}`).join(',');

  situacao: 'carregando' | 'pronto' | 'falhou' = 'carregando';
  estado: EstadoFormatacao = ESTADO_FORMATACAO_VAZIO;
  painel: Painel | null = null;

  hrefLink = '';
  erroLink: string | null = null;

  arquivoImagem: File | null = null;
  descricaoImagem = '';
  erroArquivoImagem: string | null = null;
  erroDescricaoImagem: string | null = null;
  erroEnvioImagem: string | null = null;
  enviandoImagem = false;
  private tentouImagem = false;

  /** Botão da barra que fica no Tab (os demais, pelas setas). */
  private botaoAtivo = 'titulo';
  private editor: EditorTextoRico | null = null;
  /** O documento que o editor tem (JSON), para não reescrever o que ele mesmo mandou. */
  private atual = 'null';
  private focoPendente: string | null = null;
  private destruido = false;

  get idEditavel(): string {
    return `${this.idBase}-editor`;
  }

  get idAtalhos(): string {
    return `${this.idBase}-atalhos`;
  }

  /** Os botões da barra (com "Inserir marcador" quando há marcadores). */
  get botoes(): BotaoBarra[] {
    return this.marcadores?.length ? BOTOES_COM_MARCADOR : BOTOES;
  }

  ngOnChanges(mudancas: SimpleChanges): void {
    if (!this.editor) return;
    if (mudancas['valor']) {
      const doc = normalizarDocumento(this.valor);
      const texto = JSON.stringify(doc);
      if (texto !== this.atual) {
        this.atual = texto;
        this.editor.definirDocumento(doc);
      }
    }
    if (mudancas['descritores'] || mudancas['invalido'] || mudancas['obrigatorio'] || mudancas['idRotulo']) {
      this.editor.definirAtributos(this.atributos());
    }
  }

  ngAfterViewInit(): void {
    if (this.noNavegador) this.carregar();
  }

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.editor?.destruir();
    this.editor = null;
  }

  /** Carrega o pacote do editor (só no navegador) e monta o editor no hospedeiro. */
  carregar(): void {
    this.situacao = 'carregando';
    import('./pe-editor-tiptap').then(
      modulo => {
        if (this.destruido) return;
        const doc = normalizarDocumento(this.valor);
        this.atual = JSON.stringify(doc);
        this.zona.runOutsideAngular(() => {
          this.editor = modulo.criarEditorTextoRico({
            elemento: this.hospedeiro.nativeElement,
            documento: doc,
            atributos: this.atributos(),
            resolverImagem: id => this.imagens.endereco(id),
            aoMudar: novo => this.zona.run(() => {
              this.atual = JSON.stringify(novo);
              this.valorChange.emit(novo);
            }),
            aoMudarEstado: estado => this.zona.run(() => {
              this.estado = estado;
            }),
            aoPedirLink: () => this.zona.run(() => this.abrirLink()),
            destacarMarcadores: !!this.marcadores?.length
          });
        });
        this.situacao = 'pronto';
        if (this.focarAoCarregar) this.editor?.focar();
      },
      () => {
        this.situacao = 'falhou';
      }
    );
  }

  /** O foco que chega ao hospedeiro (resumo de erros, clique no rótulo) vai para o texto. */
  focarEditor(): void {
    this.editor?.focar();
  }

  private atributos(): Record<string, string> {
    const atributos: Record<string, string> = {
      id: this.idEditavel,
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-labelledby': this.idRotulo,
      'aria-describedby': [this.descritores, this.idAtalhos].filter(Boolean).join(' ')
    };
    if (this.obrigatorio) atributos['aria-required'] = 'true';
    if (this.invalido) atributos['aria-invalid'] = 'true';
    return atributos;
  }

  // ── Barra de ferramentas ──────────────────────────────────────────────────

  pressionado(b: BotaoBarra): boolean | null {
    if (!b.alterna) return null;
    switch (b.id) {
      case 'titulo': return this.estado.titulo;
      case 'subtitulo': return this.estado.subtitulo;
      case 'negrito': return this.estado.negrito;
      case 'italico': return this.estado.italico;
      case 'sublinhado': return this.estado.sublinhado;
      case 'listaMarcadores': return this.estado.listaMarcadores;
      case 'listaNumerada': return this.estado.listaNumerada;
      case 'link': return this.estado.link;
      case 'cabecalhoTabela': return this.estado.cabecalhoTabela;
      default: return false;
    }
  }

  desligado(b: BotaoBarra): boolean {
    if (this.situacao !== 'pronto') return true;
    switch (b.id) {
      case 'diminuirRecuo': return !this.estado.podeDiminuirRecuo;
      case 'aumentarRecuo': return !this.estado.podeAumentarRecuo;
      case 'desfazer': return !this.estado.podeDesfazer;
      case 'refazer': return !this.estado.podeRefazer;
      case 'inserirTabela': return this.estado.tabela;
      default: return false;
    }
  }

  dica(b: BotaoBarra): string {
    return b.atalho ? `${b.rotulo} (${b.atalho})` : b.rotulo;
  }

  /** Um ponto só no Tab: o último botão usado, ou o primeiro que funciona. */
  tabindexDe(b: BotaoBarra): number {
    return b.id === this.botaoDoTab() ? 0 : -1;
  }

  private botaoDoTab(): string {
    const visiveis = this.estado.tabela ? [...this.botoes, ...BOTOES_TABELA] : this.botoes;
    const ativos = visiveis.filter(b => !this.desligado(b));
    return ativos.some(b => b.id === this.botaoAtivo) ? this.botaoAtivo : (ativos[0]?.id ?? '');
  }

  porId(_: number, b: BotaoBarra): string {
    return b.id;
  }

  aoFocarBotao(b: BotaoBarra): void {
    this.botaoAtivo = b.id;
  }

  /** Setas, Home e End andam entre os botões da barra (padrão de barra de ferramentas). */
  aoTeclarBarra(evento: KeyboardEvent): void {
    const teclas = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!teclas.includes(evento.key) || !this.barra) return;
    const botoes = Array.from(this.barra.nativeElement.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    if (!botoes.length) return;
    const atual = botoes.indexOf(document.activeElement as HTMLButtonElement);
    let destino: number;
    if (evento.key === 'Home') destino = 0;
    else if (evento.key === 'End') destino = botoes.length - 1;
    else if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') destino = atual < 0 ? 0 : (atual + 1) % botoes.length;
    else destino = atual <= 0 ? botoes.length - 1 : atual - 1;
    evento.preventDefault();
    botoes[destino].focus();
  }

  usar(b: BotaoBarra): void {
    if (!this.editor || this.desligado(b)) return;
    this.botaoAtivo = b.id;
    if (b.id === 'link') {
      this.abrirLink();
      return;
    }
    if (b.id === 'imagem') {
      this.abrirImagem();
      return;
    }
    if (b.id === 'marcador') {
      this.abrirMarcadores();
      return;
    }
    this.painel = null;
    this.editor.executar(b.id as ComandoTextoRico);
  }

  // ── Marcador ──────────────────────────────────────────────────────────────

  abrirMarcadores(): void {
    if (!this.editor || !this.marcadores?.length) return;
    this.painel = 'marcador';
    this.focoPendente = `${this.idBase}-marcador-0`;
  }

  /** "{orgao.nome}", como fica no texto. */
  textoDoMarcador(m: PeDocMarcador): string {
    return `{${m.Chave}}`;
  }

  porChave(_: number, m: PeDocMarcador): string {
    return m.Chave;
  }

  /** O marcador entra no ponto onde estava o cursor, e o foco volta ao texto. */
  inserirMarcador(m: PeDocMarcador): void {
    this.painel = null;
    this.editor?.inserirTexto(this.textoDoMarcador(m));
  }

  // ── Link ──────────────────────────────────────────────────────────────────

  abrirLink(): void {
    if (!this.editor) return;
    this.painel = 'link';
    // Começa vazio (o exemplo fica no texto de apoio): com "https://" pronto, o endereço colado ficava repetido (F1, B02)
    this.hrefLink = this.estado.hrefLink ?? '';
    this.erroLink = null;
    this.focoPendente = `${this.idBase}-link-endereco`;
  }

  aplicarLink(): void {
    this.hrefLink = normalizarEndereco(this.hrefLink);
    const href = hrefSeguro(this.hrefLink);
    if (!href) {
      this.erroLink = 'Use um endereço completo, que comece com http:// ou https://. Exemplo: https://www.df.gov.br.';
      this.focoPendente = `${this.idBase}-link-endereco`;
      return;
    }
    this.painel = null;
    this.editor?.definirLink(href);
  }

  tirarLink(): void {
    this.painel = null;
    this.editor?.executar('tirarLink');
  }

  // ── Imagem ────────────────────────────────────────────────────────────────

  abrirImagem(): void {
    this.painel = 'imagem';
    this.arquivoImagem = null;
    this.descricaoImagem = '';
    this.erroArquivoImagem = null;
    this.erroDescricaoImagem = null;
    this.erroEnvioImagem = null;
    this.tentouImagem = false;
    this.focoPendente = `${this.idBase}-imagem-arquivo`;
  }

  escolherImagem(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    this.arquivoImagem = entrada.files?.[0] ?? null;
    this.erroEnvioImagem = null;
    if (this.tentouImagem) this.conferirImagem();
  }

  aoMudarDescricao(): void {
    if (this.tentouImagem) this.conferirImagem();
  }

  private conferirImagem(): boolean {
    const arquivo = this.arquivoImagem;
    this.erroArquivoImagem = null;
    if (!arquivo) {
      this.erroArquivoImagem = 'Escolha a imagem.';
    } else {
      const extensao = (arquivo.name.split('.').pop() ?? '').toLowerCase();
      if (!EXTENSOES_IMAGEM.includes(extensao)) this.erroArquivoImagem = 'Use uma imagem PNG ou JPEG.';
      else if (arquivo.size === 0) this.erroArquivoImagem = 'O arquivo está vazio.';
      else if (arquivo.size > MAX_MB_IMAGEM_TEXTO * 1024 * 1024) {
        this.erroArquivoImagem = `A imagem passa de ${MAX_MB_IMAGEM_TEXTO} MB. Envie uma imagem menor.`;
      }
    }
    const descricao = this.descricaoImagem.trim();
    this.erroDescricaoImagem = !descricao
      ? 'Descreva a imagem: o leitor de tela lê essa descrição para quem não enxerga.'
      : descricao.length > MAX_DESCRICAO_IMAGEM ? `Escreva até ${MAX_DESCRICAO_IMAGEM} caracteres.` : null;
    return !this.erroArquivoImagem && !this.erroDescricaoImagem;
  }

  /** A ajuda do campo da imagem e os erros dele: o da conferência daqui e o do envio (F2, B-N2). */
  get descritoresArquivoImagem(): string {
    const ids = [`${this.idBase}-imagem-arquivo-ajuda`];
    if (this.erroArquivoImagem) ids.push(`${this.idBase}-imagem-arquivo-erro`);
    if (this.erroEnvioImagem) ids.push(`${this.idBase}-imagem-envio-erro`);
    return ids.join(' ');
  }

  inserirImagem(): void {
    if (this.enviandoImagem || !this.editor) return;
    this.tentouImagem = true;
    this.erroEnvioImagem = null;
    if (!this.conferirImagem()) {
      this.focoPendente = this.erroArquivoImagem ? `${this.idBase}-imagem-arquivo` : `${this.idBase}-imagem-descricao`;
      return;
    }
    const arquivo = this.arquivoImagem!;
    const descricao = this.descricaoImagem.trim();
    this.enviandoImagem = true;
    this.registrosService.enviarArquivo(arquivo).subscribe({
      next: enviado => {
        this.enviandoImagem = false;
        this.painel = null;
        this.editor?.inserirImagem(srcDaImagem(enviado.Id), descricao);
      },
      error: erro => {
        this.enviandoImagem = false;
        this.erroEnvioImagem = mensagemErroPe(erro, 'Não foi possível enviar a imagem. Tente de novo.');
        // O foco vai para o campo da imagem, que diz o erro (F2, B-N2)
        if (this.erroEnvioImagem) this.focoPendente = `${this.idBase}-imagem-arquivo`;
      }
    });
  }

  // ── Painéis ───────────────────────────────────────────────────────────────

  /** Esc fecha só o painel (não a janela em volta) e o foco volta ao texto. */
  fecharPainel(evento?: Event): void {
    evento?.stopPropagation();
    if (this.enviandoImagem) return;
    this.painel = null;
    this.editor?.focar();
  }
}
