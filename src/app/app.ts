import { Component, signal } from '@angular/core';
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
}
