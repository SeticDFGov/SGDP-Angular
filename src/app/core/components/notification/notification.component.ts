import { Component, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { animate, style, transition, trigger } from '@angular/animations';

/**
 * Componente de notificações toast
 * Exibe notificações no canto superior direito da tela, logo abaixo da barra de
 * acessibilidade quando ela está à vista (sem cobrir os botões de tema e de texto).
 * A região é `aria-live`: o leitor de tela lê cada aviso que aparece. A animação de
 * entrada sai quando o sistema ou a página de acessibilidade pedem menos movimento.
 */
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-md" role="region" aria-label="Avisos" aria-live="polite"
         [style.top]="topo" [@.disabled]="semAnimacao">
      @for (notification of notifications$ | async; track notification.id) {
        <div
          [@slideIn]
          [ngClass]="getClasses(notification.type)"
          class="p-4 rounded-lg shadow-lg flex items-start gap-3 min-w-[300px] cursor-pointer hover:shadow-xl transition-shadow"
          (click)="dismiss(notification.id)"
        >
          <!-- Ícone -->
          <div class="flex-shrink-0">
            @switch (notification.type) {
              @case ('success') {
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
              }
              @case ('error') {
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
              }
              @case ('warning') {
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
              }
              @case ('info') {
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
              }
            }
          </div>

          <!-- Mensagem -->
          <div class="flex-1 text-sm font-medium">
            {{ notification.message }}
          </div>

          <!-- Botão fechar -->
          <button
            type="button"
            class="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            (click)="dismiss(notification.id); $event.stopPropagation()"
            aria-label="Fechar aviso" title="Fechar aviso"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class NotificationComponent {
  private notificationService = inject(NotificationService);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  notifications$ = this.notificationService.notifications$;

  /**
   * Distância do topo, medida quando chega um aviso: logo abaixo da barra de
   * acessibilidade quando ela está à vista; com a página rolada, a de sempre (1rem).
   */
  topo: string | null = null;

  constructor() {
    // O componente vive o tempo todo do app: a assinatura não precisa ser desfeita
    if (this.noNavegador) this.notifications$.subscribe(lista => { if (lista.length) this.topo = this.medirTopo(); });
  }

  private medirTopo(): string | null {
    const barra = document.querySelector('app-barra-acessibilidade > div');
    const fim = barra ? barra.getBoundingClientRect().bottom : 0;
    return fim > 8 ? `${Math.round(fim) + 8}px` : null;
  }

  getClasses(type: string): string {
    const baseClasses = 'border-l-4';

    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-50 border-green-500 text-green-900`;
      case 'error':
        return `${baseClasses} bg-red-50 border-red-500 text-red-900`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 border-yellow-500 text-yellow-900`;
      case 'info':
        return `${baseClasses} bg-blue-50 border-blue-500 text-blue-900`;
      default:
        return `${baseClasses} bg-gray-50 border-gray-500 text-gray-900`;
    }
  }

  /** Sem animação quando o sistema pede menos movimento ou a pessoa escolheu isso no SGDP. */
  get semAnimacao(): boolean {
    if (!this.noNavegador) return true;
    return document.documentElement.classList.contains('sem-animacoes')
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }
}
