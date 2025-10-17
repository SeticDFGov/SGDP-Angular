import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Login } from './auth/login/login';
import { Sidebar } from './projeto/components/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Login,Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('SGDP-New-Front');
}
