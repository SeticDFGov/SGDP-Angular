import { Component, inject, signal } from '@angular/core';
import { PlatformLocation } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NotificationComponent } from './core/components/notification/notification.component';
import { BarraAcessibilidadeComponent } from './core/acessibilidade/barra-acessibilidade.component';
import { BarraCarregamentoComponent } from './core/carregamento/barra-carregamento.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationComponent, BarraAcessibilidadeComponent, BarraCarregamentoComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('SGDP-New-Front');

  /**
   * Painel público da Supervisão incorporado em outro site (iframe): a página vai sem a barra
   * de acessibilidade, que é a do site de fora. A barra carregaria as preferências salvas e
   * desfaria o tema pedido no endereço (o index.html aplica o ?tema= antes da primeira pintura).
   */
  protected readonly incorporado = inject(PlatformLocation).pathname.startsWith('/transparencia-contratacoes/incorporar');
}
