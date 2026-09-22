import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, EventEmitter, HostListener, OnDestroy, Output, PLATFORM_ID, inject } from '@angular/core';

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), '
  + 'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Janela modal acessível (WCAG 2.1.2 e 2.4.3). Vai no elemento da janela (não no
 * véu escuro): marca `role="dialog"` e `aria-modal`, leva o foco para dentro ao
 * abrir (o primeiro campo ou botão, a não ser que a tela já tenha posto o foco lá
 * dentro), prende o Tab na janela, fecha no Esc pelo `(fechar)` e, quando a janela
 * some (`*ngIf`), devolve o foco ao botão que a abriu.
 *
 * Uso: `<div appDialogo aria-labelledby="id-do-titulo" (fechar)="fecharJanela()">`.
 */
@Directive({
  selector: '[appDialogo]',
  standalone: true,
  host: { role: 'dialog', 'aria-modal': 'true', tabindex: '-1' }
})
export class DialogoDirective implements AfterViewInit, OnDestroy {
  @Output() readonly fechar = new EventEmitter<void>();

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private origem: HTMLElement | null = null;

  ngAfterViewInit(): void {
    if (!this.noNavegador) return;
    this.origem = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Depois do render: a tela pode pôr o foco num campo dela (ViewChild), e isso vale
    setTimeout(() => {
      const janela = this.elemento.nativeElement;
      if (janela.contains(document.activeElement)) return;
      (this.focaveis()[0] ?? janela).focus();
    });
  }

  ngOnDestroy(): void {
    if (this.noNavegador && this.origem?.isConnected) this.origem.focus();
  }

  @HostListener('document:keydown', ['$event'])
  aoTeclar(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      this.fechar.emit();
      return;
    }
    if (evento.key !== 'Tab') return;
    const focaveis = this.focaveis();
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const ativo = document.activeElement;
    if (evento.shiftKey && (ativo === primeiro || ativo === this.elemento.nativeElement)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && ativo === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  private focaveis(): HTMLElement[] {
    return Array.from(this.elemento.nativeElement.querySelectorAll<HTMLElement>(FOCAVEIS))
      .filter(el => el.offsetParent !== null || el === document.activeElement);
  }
}
