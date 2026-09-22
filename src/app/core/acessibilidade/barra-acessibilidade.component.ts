import { DOCUMENT, NgClass, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AcessibilidadeService, TEMAS } from './acessibilidade.service';

/**
 * Barra de acessibilidade no topo de TODAS as páginas (padrão dos sítios do
 * governo, eMAG): atalhos "Ir para o conteúdo" (1), "Ir para o menu" (2) e a
 * página Acessibilidade (3), com as teclas de acesso do navegador (Alt+número no
 * Chrome e no Edge, Alt+Shift+número no Firefox); tema claro, escuro ou de alto
 * contraste; e o tamanho do texto.
 *
 * Carrega sob demanda (`@defer` no `app.html`). Também cuida da troca de página
 * para quem usa leitor de tela: leva o foco ao título da tela nova ou, quando o
 * foco já está no conteúdo, lê o título dela em voz alta.
 *
 * Destinos dos atalhos: `id="conteudo"` (o `<main>` de cada moldura, com
 * `tabindex="-1"`) e `id="menu"` (o cabeçalho do MainLayout). Página sem
 * cabeçalho de navegação não mostra o atalho do menu.
 */
@Component({
  selector: 'app-barra-acessibilidade',
  standalone: true,
  imports: [NgClass, RouterLink],
  template: `
    <div role="region" aria-label="Barra de acessibilidade"
         class="bg-gray-100 border-b border-gray-200 text-gray-700 text-xs">
      <div class="min-h-9 px-4 md:px-6 py-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <nav aria-label="Atalhos de teclado" class="hidden md:flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href="#conteudo" accesskey="1" (click)="irPara($event, 'conteudo')"
             class="inline-flex items-center gap-1.5 whitespace-nowrap hover:underline">
            Ir para o conteúdo <kbd class="px-1 rounded border border-gray-300 bg-white font-mono">1</kbd>
          </a>
          @if (temMenu()) {
            <a href="#menu" accesskey="2" (click)="irPara($event, 'menu')"
               class="inline-flex items-center gap-1.5 whitespace-nowrap hover:underline">
              Ir para o menu <kbd class="px-1 rounded border border-gray-300 bg-white font-mono">2</kbd>
            </a>
          }
          <a routerLink="/acessibilidade" accesskey="3" class="inline-flex items-center gap-1.5 whitespace-nowrap hover:underline">
            Acessibilidade <kbd class="px-1 rounded border border-gray-300 bg-white font-mono">3</kbd>
          </a>
        </nav>
        <a routerLink="/acessibilidade" class="md:hidden inline-flex items-center gap-1 whitespace-nowrap hover:underline"
           title="Recursos de acessibilidade">
          <span class="material-icons text-base" aria-hidden="true">accessibility_new</span>
          Acessibilidade
        </a>

        <div class="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
          <div role="group" aria-label="Tema" class="flex items-center gap-1">
            <span class="hidden lg:inline mr-1" aria-hidden="true">Tema</span>
            @for (t of temas; track t.valor) {
              <button type="button" (click)="acessibilidade.escolherTema(t.valor)"
                      [attr.aria-pressed]="acessibilidade.tema() === t.valor"
                      [attr.aria-label]="'Tema ' + t.rotulo.toLowerCase()"
                      [title]="'Tema ' + t.rotulo.toLowerCase()"
                      class="h-7 inline-flex items-center gap-1 px-1.5 rounded border whitespace-nowrap transition-colors"
                      [ngClass]="acessibilidade.tema() === t.valor
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 hover:bg-gray-50'">
                <span class="material-icons text-base" aria-hidden="true">{{ t.icone }}</span>
                <span class="hidden xl:inline">{{ t.rotulo }}</span>
              </button>
            }
          </div>

          <div role="group" aria-label="Tamanho do texto" class="flex items-center gap-1">
            <span class="hidden lg:inline mr-1" aria-hidden="true">Texto</span>
            <button type="button" (click)="acessibilidade.diminuirTexto()" [disabled]="!acessibilidade.podeDiminuir()"
                    aria-label="A- diminuir o texto" title="Diminuir o texto"
                    class="h-7 min-w-7 px-1 rounded border border-gray-300 bg-white hover:bg-gray-50 font-semibold disabled:opacity-50">A-</button>
            <button type="button" (click)="acessibilidade.textoPadrao()" [disabled]="acessibilidade.fonte() === 100"
                    aria-label="A texto no tamanho padrão" title="Texto no tamanho padrão"
                    class="h-7 min-w-7 px-1 rounded border border-gray-300 bg-white hover:bg-gray-50 font-semibold disabled:opacity-50">A</button>
            <button type="button" (click)="acessibilidade.aumentarTexto()" [disabled]="!acessibilidade.podeAumentar()"
                    aria-label="A+ aumentar o texto" title="Aumentar o texto"
                    class="h-7 min-w-7 px-1 rounded border border-gray-300 bg-white hover:bg-gray-50 font-semibold disabled:opacity-50">A+</button>
            <span class="hidden sm:inline w-12 text-right tabular-nums" aria-hidden="true">{{ acessibilidade.rotuloTexto() }}</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BarraAcessibilidadeComponent implements OnInit {
  readonly acessibilidade = inject(AcessibilidadeService);
  private readonly router = inject(Router);
  private readonly documento = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly temas = TEMAS;
  readonly temMenu = signal(false);

  private caminhoAtual = '';

  ngOnInit(): void {
    if (!this.noNavegador) return;
    this.caminhoAtual = this.caminho(this.router.url);
    this.depoisDoRender(() => this.conferirMenu());

    this.router.events
      .pipe(filter(evento => evento instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(evento => {
        const caminho = this.caminho((evento as NavigationEnd).urlAfterRedirects);
        // Filtros da lista na URL (mesmo caminho, outros parâmetros) não são troca de página
        const trocouDePagina = caminho !== this.caminhoAtual;
        this.caminhoAtual = caminho;
        this.depoisDoRender(() => {
          this.conferirMenu();
          if (trocouDePagina) this.anunciarPaginaNova();
        });
      });
  }

  irPara(evento: Event, id: 'conteudo' | 'menu'): void {
    // O href="#..." com <base href="/"> levaria à raiz do site
    evento.preventDefault();
    const alvo = this.documento.getElementById(id) ?? (id === 'conteudo' ? this.documento.querySelector('main') : null);
    if (!(alvo instanceof HTMLElement)) return;
    if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
    alvo.focus();
    alvo.scrollIntoView({ block: 'start' });
  }

  private conferirMenu(): void {
    this.temMenu.set(!!this.documento.getElementById('menu'));
  }

  /**
   * Página nova: foco no título dela, para o leitor de tela começar dali. Se o foco
   * já está dentro do conteúdo (a própria tela o pôs num campo, ou o botão clicado
   * continua na tela), não mexe e só lê o título.
   */
  private anunciarPaginaNova(): void {
    const conteudo = this.documento.getElementById('conteudo') ?? this.documento.querySelector('main');
    const ativo = this.documento.activeElement;
    const nome = this.documento.title.replace(/ · SGDP$/, '');
    if (!conteudo || (ativo && ativo !== this.documento.body && conteudo.contains(ativo))) {
      this.acessibilidade.anunciar(`Página: ${nome}`);
      return;
    }
    const titulo = conteudo.querySelector<HTMLElement>('h1') ?? conteudo.querySelector<HTMLElement>('h2');
    const alvo = titulo ?? (conteudo as HTMLElement);
    if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
    alvo.focus({ preventScroll: true });
    if (!titulo) this.acessibilidade.anunciar(`Página: ${nome}`);
  }

  /** As telas lazy terminam de desenhar depois do NavigationEnd. */
  private depoisDoRender(acao: () => void): void {
    setTimeout(acao, 150);
  }

  private caminho(url: string): string {
    return url.split('#')[0].split('?')[0];
  }
}
