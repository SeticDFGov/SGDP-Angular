import { Directive, ElementRef, Input, OnChanges, PLATFORM_ID, Renderer2, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PeNoTextoRico } from '../../../../api/planejamento/interface';
import { CLASSES_TEXTO_RICO, ESTILO_IMAGEM, docVazio, idDaImagem, normalizarDocumento } from './pe-texto-rico-doc';
import { PeImagensService } from './pe-imagens.service';

/**
 * Mostra um texto rico para ler, sem carregar o editor: monta os elementos a
 * partir do JSON, só com a lista fechada de nós e marcas (texto sempre como
 * texto, nunca HTML), com as mesmas classes do editor. Links abrem em outra aba
 * (o leitor de tela ouve o aviso); imagens chegam pela API com o token.
 * Tabela larga fica numa região com rolagem, alcançável pelo teclado.
 *
 * Uso: `<div [appPeTextoRico]="registro.Dados['diagnostico']"></div>`.
 */
@Directive({
  selector: '[appPeTextoRico]',
  standalone: true
})
export class PeTextoRicoLeituraDirective implements OnChanges {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly r = inject(Renderer2);
  private readonly imagens = inject(PeImagensService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  @Input('appPeTextoRico') documento: unknown = null;
  /** Nome do campo, para o rótulo das tabelas ("Tabela 1 de Diagnóstico"). */
  @Input() rotuloTexto = '';

  private desenho = 0;
  private tabelas = 0;

  ngOnChanges(): void {
    this.desenhar();
  }

  private desenhar(): void {
    const raiz = this.elemento.nativeElement;
    while (raiz.firstChild) this.r.removeChild(raiz, raiz.firstChild);
    this.desenho++;
    this.tabelas = 0;
    const doc = normalizarDocumento(this.documento);
    if (!doc || docVazio(doc)) {
      this.r.appendChild(raiz, this.r.createText('-'));
      return;
    }
    const conteudo = this.criar('div', CLASSES_TEXTO_RICO.raiz);
    this.blocos(conteudo, doc.content);
    this.r.appendChild(raiz, conteudo);
  }

  private criar(tag: string, classes?: string): HTMLElement {
    const el = this.r.createElement(tag) as HTMLElement;
    if (classes) this.r.setAttribute(el, 'class', classes);
    return el;
  }

  private blocos(pai: HTMLElement, nos: PeNoTextoRico[] | undefined): void {
    for (const no of nos ?? []) {
      const el = this.bloco(no);
      if (el) this.r.appendChild(pai, el);
    }
  }

  private bloco(no: PeNoTextoRico): HTMLElement | null {
    switch (no.type) {
      case 'paragraph': {
        const p = this.criar('p');
        this.emLinha(p, no.content);
        return p;
      }
      case 'heading': {
        const quatro = no.attrs?.['level'] === 4;
        const h = this.criar(quatro ? 'h4' : 'h3', quatro ? CLASSES_TEXTO_RICO.subtitulo : CLASSES_TEXTO_RICO.titulo);
        this.emLinha(h, no.content);
        return h;
      }
      case 'bulletList':
      case 'orderedList': {
        const numerada = no.type === 'orderedList';
        const lista = this.criar(numerada ? 'ol' : 'ul', numerada ? CLASSES_TEXTO_RICO.listaNumerada : CLASSES_TEXTO_RICO.listaMarcadores);
        const inicio = no.attrs?.['start'];
        if (numerada && typeof inicio === 'number' && inicio > 1) this.r.setAttribute(lista, 'start', String(inicio));
        for (const item of no.content ?? []) {
          const li = this.criar('li');
          this.blocos(li, item.content);
          this.r.appendChild(lista, li);
        }
        return lista;
      }
      case 'table':
        return this.tabela(no);
      case 'image':
        return this.imagem(no);
      default:
        return null;
    }
  }

  private tabela(no: PeNoTextoRico): HTMLElement {
    this.tabelas++;
    // Região com rolagem e foco pelo teclado (WCAG 2.1.1), com o nome da tabela
    const regiao = this.criar('div', 'overflow-x-auto');
    this.r.setAttribute(regiao, 'tabindex', '0');
    this.r.setAttribute(regiao, 'role', 'region');
    const nome = `Tabela ${this.tabelas}${this.rotuloTexto ? ' de ' + this.rotuloTexto : ' do texto'}`;
    this.r.setAttribute(regiao, 'aria-label', nome);
    const tabela = this.criar('table', CLASSES_TEXTO_RICO.tabela);
    const corpo = this.criar('tbody');
    for (const linha of no.content ?? []) {
      const tr = this.criar('tr');
      for (const celula of linha.content ?? []) {
        const cabecalho = celula.type === 'tableHeader';
        const td = this.criar(cabecalho ? 'th' : 'td', cabecalho ? CLASSES_TEXTO_RICO.cabecalho : CLASSES_TEXTO_RICO.celula);
        const colspan = celula.attrs?.['colspan'];
        const rowspan = celula.attrs?.['rowspan'];
        if (typeof colspan === 'number' && colspan > 1) this.r.setAttribute(td, 'colspan', String(colspan));
        if (typeof rowspan === 'number' && rowspan > 1) this.r.setAttribute(td, 'rowspan', String(rowspan));
        if (cabecalho) this.r.setAttribute(td, 'scope', 'col');
        this.blocos(td, celula.content);
        this.r.appendChild(tr, td);
      }
      this.r.appendChild(corpo, tr);
    }
    this.r.appendChild(tabela, corpo);
    this.r.appendChild(regiao, tabela);
    return regiao;
  }

  private imagem(no: PeNoTextoRico): HTMLElement | null {
    const id = idDaImagem(no.attrs?.['src']);
    if (id === null) return null;
    const alt = typeof no.attrs?.['alt'] === 'string' ? no.attrs['alt'] as string : '';
    const img = this.criar('img', CLASSES_TEXTO_RICO.imagem);
    this.r.setAttribute(img, 'alt', alt || 'Imagem sem descrição');
    this.r.setAttribute(img, 'style', ESTILO_IMAGEM);
    if (this.noNavegador) {
      const desenho = this.desenho;
      this.imagens.endereco(id).then(
        endereco => {
          if (desenho === this.desenho) this.r.setAttribute(img, 'src', endereco);
        },
        () => {
          if (desenho === this.desenho) this.r.setAttribute(img, 'alt', `${alt || 'Imagem'} (não foi possível carregar a imagem)`);
        }
      );
    }
    return img;
  }

  private emLinha(pai: HTMLElement, nos: PeNoTextoRico[] | undefined): void {
    for (const no of nos ?? []) {
      if (no.type === 'hardBreak') {
        this.r.appendChild(pai, this.criar('br'));
        continue;
      }
      if (no.type !== 'text' || !no.text) continue;
      let alvo: HTMLElement = pai;
      const embrulhar = (tag: string, classes?: string): void => {
        const el = this.criar(tag, classes);
        this.r.appendChild(alvo, el);
        alvo = el;
      };
      let href: string | null = null;
      for (const marca of no.marks ?? []) {
        if (marca.type === 'bold') embrulhar('strong');
        else if (marca.type === 'italic') embrulhar('em');
        else if (marca.type === 'underline') embrulhar('u');
        else if (marca.type === 'link' && typeof marca.attrs?.['href'] === 'string') href = marca.attrs['href'] as string;
      }
      if (href) {
        embrulhar('a', CLASSES_TEXTO_RICO.link);
        this.r.setAttribute(alvo, 'href', href);
        this.r.setAttribute(alvo, 'target', '_blank');
        this.r.setAttribute(alvo, 'rel', 'noopener noreferrer');
        this.r.appendChild(alvo, this.r.createText(no.text));
        const aviso = this.criar('span', 'sr-only');
        this.r.appendChild(aviso, this.r.createText(' (abre em outra aba)'));
        this.r.appendChild(alvo, aviso);
      } else {
        this.r.appendChild(alvo, this.r.createText(no.text));
      }
    }
  }
}
