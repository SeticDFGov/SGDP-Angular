import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // Duração em ms (padrão: 5000)
  autoDismiss?: boolean; // Auto-fechar após duração (padrão: true)
}

/**
 * Serviço centralizado de notificações
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public readonly notifications$: Observable<Notification[]> = this.notificationsSubject.asObservable();

  private idCounter = 0;

  /**
   * Exibe notificação de sucesso
   */
  success(message: string, duration = 5000): void {
    this.show({
      id: this.generateId(),
      type: 'success',
      message,
      duration,
      autoDismiss: true
    });
  }

  /**
   * Exibe notificação de erro
   */
  error(message: string, duration = 7000): void {
    this.show({
      id: this.generateId(),
      type: 'error',
      message,
      duration,
      autoDismiss: true
    });
  }

  /**
   * Exibe notificação de aviso
   */
  warning(message: string, duration = 6000): void {
    this.show({
      id: this.generateId(),
      type: 'warning',
      message,
      duration,
      autoDismiss: true
    });
  }

  /**
   * Exibe notificação informativa
   */
  info(message: string, duration = 5000): void {
    this.show({
      id: this.generateId(),
      type: 'info',
      message,
      duration,
      autoDismiss: true
    });
  }

  /**
   * Exibe notificação customizada
   */
  show(notification: Notification): void {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([...current, notification]);

    // Auto-dismiss se configurado
    if (notification.autoDismiss !== false) {
      setTimeout(() => {
        this.dismiss(notification.id);
      }, notification.duration || 5000);
    }
  }

  /**
   * Remove notificação específica
   */
  dismiss(id: string): void {
    const current = this.notificationsSubject.value;
    const updated = current.filter(n => n.id !== id);
    this.notificationsSubject.next(updated);
  }

  /**
   * Remove todas as notificações
   */
  clear(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * Gera ID único para notificação
   */
  private generateId(): string {
    return `notification-${++this.idCounter}-${Date.now()}`;
  }
}
