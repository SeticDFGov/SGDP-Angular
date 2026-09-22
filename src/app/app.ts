import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationComponent } from './core/components/notification/notification.component';
import { BarraAcessibilidadeComponent } from './core/acessibilidade/barra-acessibilidade.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationComponent, BarraAcessibilidadeComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('SGDP-New-Front');
}
