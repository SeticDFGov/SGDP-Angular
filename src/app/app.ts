import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Login } from './auth/login/login';
import { Sidebar } from './projeto/components/sidebar/sidebar';
import { NotificationComponent } from './core/components/notification/notification.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Login, Sidebar, NotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('SGDP-New-Front');
}
