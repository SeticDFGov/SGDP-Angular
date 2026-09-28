/**
 * Editor de texto rico (TipTap, licença MIT), carregado sob demanda: este é o
 * ÚNICO arquivo do projeto que importa o TipTap, e só o `pe-editor-texto-rico`
 * o chama, por `import()`, quando um campo `texto_rico` aparece na tela no
 * navegador. Assim o TipTap e o ProseMirror ficam num pacote próprio, fora do
 * inicial e do pacote comum do módulo. Não importar este arquivo de outro jeito.
 *
 * O esquema é a lista fechada do contrato (ver `pe-texto-rico-doc.ts`): parágrafo,
 * títulos 3 e 4, negrito, itálico, sublinhado, link http ou https, listas,
 * tabela, imagem de `pe_arquivo` e quebra de linha. O link e a imagem são
 * próprios (sem o linkify do pacote oficial; a imagem aparece baixada com o
 * token). O Tab não fica preso no editor (WCAG 2.1.2): listas e tabelas usam os
 * botões e os atalhos Ctrl+] e Ctrl+[ para o recuo, e as setas entre as células.
 * No documento do PDTIC (E5), os marcadores escritos no texto ("{orgao.nome}")
 * ficam em destaque (só decoração: o documento guarda o texto como está).
 */
import { Editor, Extension, Mark, Node, mergeAttributes } from '@tiptap/core';
import type { KeyboardShortcutCommand } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Heading } from '@tiptap/extension-heading';
import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';
import { Underline } from '@tiptap/extension-underline';
import { HardBreak } from '@tiptap/extension-hard-break';
import { BulletList } from '@tiptap/extension-list/bullet-list';
import { OrderedList } from '@tiptap/extension-list/ordered-list';
import { ListItem } from '@tiptap/extension-list/item';
import { Table } from '@tiptap/extension-table/table';
import { TableRow } from '@tiptap/extension-table/row';
import { TableHeader } from '@tiptap/extension-table/header';
import { TableCell } from '@tiptap/extension-table/cell';
import { UndoRedo } from '@tiptap/extensions/undo-redo';
import { Gapcursor } from '@tiptap/extensions/gap-cursor';
import { Dropcursor } from '@tiptap/extensions/drop-cursor';
import type { Node as NoProseMirror } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  CLASSES_TEXTO_RICO,
  ComandoTextoRico,
  CriarEditorTextoRico,
  ESTILO_IMAGEM,
  EditorTextoRico,
  EstadoFormatacao,
  OpcoesEditorTextoRico,
  REGEX_MARCADOR_NO_TEXTO,
  docVazio,
  hrefSeguro,
  idDaImagem,
  normalizarDocumento,
  srcDaImagem
} from './pe-texto-rico-doc';

/** Os marcadores de um documento em destaque (decoração: o texto guardado não muda). */
function decoracoesDosMarcadores(doc: NoProseMirror): DecorationSet {
  const decoracoes: Decoration[] = [];
  doc.descendants((no, posicao) => {
    if (!no.isText || !no.text) return;
    const regex = new RegExp(REGEX_MARCADOR_NO_TEXTO.source, 'g');
    let achado = regex.exec(no.text);
    while (achado) {
      decoracoes.push(Decoration.inline(posicao + achado.index, posicao + achado.index + achado[0].length, {
        class: CLASSES_TEXTO_RICO.marcador
      }));
      achado = regex.exec(no.text);
    }
  });
  return DecorationSet.create(doc, decoracoes);
}

/** Destaque dos marcadores ("{orgao.nome}") enquanto se escreve o texto do documento. */
const Marcadores = Extension.create({
  name: 'marcadores',
  addProseMirrorPlugins() {
    return [new Plugin<DecorationSet>({
      key: new PluginKey('marcadores'),
      state: {
        init: (_, estado) => decoracoesDosMarcadores(estado.doc),
        apply: (transacao, anteriores) => transacao.docChanged ? decoracoesDosMarcadores(transacao.doc) : anteriores
      },
      props: {
        decorations(estado) {
          return this.getState(estado);
        }
      }
    })];
  }
});

/** Tira o Tab e o Shift+Tab dos atalhos de uma extensão (o foco sai do editor normalmente). */
function semTab(atalhos: Record<string, KeyboardShortcutCommand> | undefined): Record<string, KeyboardShortcutCommand> {
  const copia = { ...(atalhos ?? {}) };
  delete copia['Tab'];
  delete copia['Shift-Tab'];
  return copia;
}

/** Item de lista: Enter continua a lista; o recuo vai pelos botões ou por Ctrl+] e Ctrl+[. */
const ItemDeLista = ListItem.extend({
  addKeyboardShortcuts() {
    return {
      ...semTab(this.parent?.()),
      'Mod-]': () => this.editor.commands.sinkListItem(this.name),
      'Mod-[': () => this.editor.commands.liftListItem(this.name)
    };
  }
});

/** Tabela sem redimensionar colunas e sem prender o Tab (as setas andam entre as células). */
const Tabela = Table.extend({
  addKeyboardShortcuts() {
    return semTab(this.parent?.());
  }
}).configure({ resizable: false, HTMLAttributes: { class: CLASSES_TEXTO_RICO.tabela } });

/** Títulos 3 e 4, cada um com a classe dele. */
const Titulo = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const quatro = node.attrs['level'] === 4;
    return [
      quatro ? 'h4' : 'h3',
      mergeAttributes(HTMLAttributes, { class: quatro ? CLASSES_TEXTO_RICO.subtitulo : CLASSES_TEXTO_RICO.titulo }),
      0
    ];
  }
}).configure({ levels: [3, 4] });

interface OpcoesLink {
  aoPedirLink: () => void;
}

/** Link só http e https, com o endereço como único atributo; Ctrl+K abre o painel da tela. */
const Link = Mark.create<OpcoesLink>({
  name: 'link',
  priority: 1000,
  inclusive: false,
  addOptions() {
    return { aoPedirLink: () => undefined };
  },
  addAttributes() {
    return { href: { default: null } };
  },
  parseHTML() {
    return [{
      tag: 'a[href]',
      getAttrs: elemento => {
        const href = hrefSeguro((elemento as HTMLElement).getAttribute('href'));
        return href ? { href } : false;
      }
    }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes, { class: CLASSES_TEXTO_RICO.link, rel: 'noopener noreferrer nofollow' }), 0];
  },
  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        this.options.aoPedirLink();
        return true;
      }
    };
  }
});

interface OpcoesImagem {
  resolverImagem: (id: number) => Promise<string>;
}

/**
 * Imagem de `pe_arquivo` (bloco): no documento fica o caminho da API; na tela,
 * o endereço local da imagem baixada com o token. Imagem de fora (colada de
 * outro site, ou em base64) não entra.
 */
const Imagem = Node.create<OpcoesImagem>({
  name: 'image',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addOptions() {
    return { resolverImagem: () => Promise.reject(new Error('sem resolvedor')) };
  },
  addAttributes() {
    return { src: { default: null }, alt: { default: null } };
  },
  parseHTML() {
    return [{
      tag: 'img[src]',
      getAttrs: elemento => {
        const el = elemento as HTMLElement;
        const id = idDaImagem(el.getAttribute('src'));
        return id ? { src: srcDaImagem(id), alt: el.getAttribute('alt') } : false;
      }
    }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { class: CLASSES_TEXTO_RICO.imagem, style: ESTILO_IMAGEM })];
  },
  addNodeView() {
    const resolver = this.options.resolverImagem;
    return ({ node }) => {
      const img = document.createElement('img');
      img.className = CLASSES_TEXTO_RICO.imagem;
      img.setAttribute('style', ESTILO_IMAGEM);
      let atual: NoProseMirror = node;
      let pedido = 0;
      const aplicar = (n: NoProseMirror): void => {
        const alt = typeof n.attrs['alt'] === 'string' && n.attrs['alt'].trim() ? n.attrs['alt'].trim() : 'Imagem sem descrição';
        img.alt = alt;
        const id = idDaImagem(n.attrs['src']);
        const meu = ++pedido;
        if (id === null) return;
        resolver(id).then(
          endereco => {
            if (meu === pedido) img.src = endereco;
          },
          () => {
            if (meu === pedido) img.alt = `${alt} (não foi possível carregar a imagem)`;
          }
        );
      };
      aplicar(node);
      return {
        dom: img,
        update: novo => {
          if (novo.type !== atual.type) return false;
          if (novo.attrs['src'] !== atual.attrs['src'] || novo.attrs['alt'] !== atual.attrs['alt']) aplicar(novo);
          atual = novo;
          return true;
        }
      };
    };
  }
});

/** Primeira linha da tabela onde está o cursor é de cabeçalho. */
function primeiraLinhaCabecalho(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let profundidade = $from.depth; profundidade > 0; profundidade--) {
    const no = $from.node(profundidade);
    if (no.type.name === 'table') return no.firstChild?.firstChild?.type.name === 'tableHeader';
  }
  return false;
}

function lerEstado(editor: Editor): EstadoFormatacao {
  const href = editor.getAttributes('link')['href'];
  const pode = editor.can();
  return {
    titulo: editor.isActive('heading', { level: 3 }),
    subtitulo: editor.isActive('heading', { level: 4 }),
    negrito: editor.isActive('bold'),
    italico: editor.isActive('italic'),
    sublinhado: editor.isActive('underline'),
    listaMarcadores: editor.isActive('bulletList'),
    listaNumerada: editor.isActive('orderedList'),
    link: editor.isActive('link'),
    hrefLink: typeof href === 'string' ? href : null,
    temSelecao: !editor.state.selection.empty,
    tabela: editor.isActive('table'),
    cabecalhoTabela: primeiraLinhaCabecalho(editor),
    podeAumentarRecuo: pode.sinkListItem('listItem'),
    podeDiminuirRecuo: pode.liftListItem('listItem'),
    podeDesfazer: pode.undo(),
    podeRefazer: pode.redo()
  };
}

/** O documento do editor já no recorte da lista fechada (null quando vazio). */
function documentoDe(editor: Editor): ReturnType<typeof normalizarDocumento> {
  const doc = normalizarDocumento(editor.getJSON());
  return doc && !docVazio(doc) ? doc : null;
}

/** Monta o editor no elemento e devolve os comandos que a barra de ferramentas usa. */
export const criarEditorTextoRico: CriarEditorTextoRico = (opcoes: OpcoesEditorTextoRico): EditorTextoRico => {
  let atributos = { ...opcoes.atributos };
  const propsDoEditor = () => ({ attributes: { ...atributos, class: CLASSES_TEXTO_RICO.raiz, style: 'min-height: 8rem; padding: 0.5rem 0.75rem;' } });

  const editor = new Editor({
    element: opcoes.elemento,
    content: opcoes.documento ?? '',
    extensions: [
      Document,
      Paragraph,
      Text,
      Titulo,
      Bold,
      Italic,
      Underline,
      HardBreak,
      BulletList.configure({ HTMLAttributes: { class: CLASSES_TEXTO_RICO.listaMarcadores } }),
      OrderedList.configure({ HTMLAttributes: { class: CLASSES_TEXTO_RICO.listaNumerada } }),
      ItemDeLista,
      Tabela,
      TableRow,
      TableHeader.configure({ HTMLAttributes: { class: CLASSES_TEXTO_RICO.cabecalho } }),
      TableCell.configure({ HTMLAttributes: { class: CLASSES_TEXTO_RICO.celula } }),
      Link.configure({ aoPedirLink: opcoes.aoPedirLink }),
      Imagem.configure({ resolverImagem: opcoes.resolverImagem }),
      UndoRedo,
      Gapcursor,
      Dropcursor,
      ...(opcoes.destacarMarcadores ? [Marcadores] : [])
    ],
    editorProps: propsDoEditor(),
    onUpdate: ({ editor: e }) => opcoes.aoMudar(documentoDe(e)),
    onTransaction: ({ editor: e }) => opcoes.aoMudarEstado(lerEstado(e)),
    onFocus: ({ editor: e }) => opcoes.aoMudarEstado(lerEstado(e))
  });

  const executar = (comando: ComandoTextoRico): void => {
    const c = editor.chain().focus();
    switch (comando) {
      case 'titulo': c.toggleHeading({ level: 3 }).run(); break;
      case 'subtitulo': c.toggleHeading({ level: 4 }).run(); break;
      case 'negrito': c.toggleBold().run(); break;
      case 'italico': c.toggleItalic().run(); break;
      case 'sublinhado': c.toggleUnderline().run(); break;
      case 'listaMarcadores': c.toggleBulletList().run(); break;
      case 'listaNumerada': c.toggleOrderedList().run(); break;
      case 'aumentarRecuo': c.sinkListItem('listItem').run(); break;
      case 'diminuirRecuo': c.liftListItem('listItem').run(); break;
      case 'desfazer': c.undo().run(); break;
      case 'refazer': c.redo().run(); break;
      case 'tirarLink': c.extendMarkRange('link').unsetMark('link').run(); break;
      case 'inserirTabela': c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
      case 'linhaAcima': c.addRowBefore().run(); break;
      case 'linhaAbaixo': c.addRowAfter().run(); break;
      case 'colunaAntes': c.addColumnBefore().run(); break;
      case 'colunaDepois': c.addColumnAfter().run(); break;
      case 'apagarLinha': c.deleteRow().run(); break;
      case 'apagarColuna': c.deleteColumn().run(); break;
      case 'cabecalhoTabela': c.toggleHeaderRow().run(); break;
      case 'apagarTabela': c.deleteTable().run(); break;
    }
  };

  return {
    executar,
    definirLink: href => {
      const seguro = hrefSeguro(href);
      if (!seguro) return;
      const c = editor.chain().focus();
      if (editor.isActive('link')) c.extendMarkRange('link').setMark('link', { href: seguro }).run();
      else if (editor.state.selection.empty) c.insertContent({ type: 'text', text: seguro, marks: [{ type: 'link', attrs: { href: seguro } }] }).run();
      else c.setMark('link', { href: seguro }).run();
    },
    inserirImagem: (src, alt) => {
      editor.chain().focus().insertContent({ type: 'image', attrs: { src, alt } }).run();
    },
    inserirTexto: texto => {
      if (texto) editor.chain().focus().insertContent({ type: 'text', text: texto }).run();
    },
    focar: () => {
      editor.commands.focus();
    },
    definirDocumento: doc => {
      editor.commands.setContent(doc ?? '', { emitUpdate: false });
      opcoes.aoMudarEstado(lerEstado(editor));
    },
    definirAtributos: novos => {
      atributos = { ...novos };
      editor.setOptions({ editorProps: propsDoEditor() });
    },
    destruir: () => editor.destroy()
  };
};
