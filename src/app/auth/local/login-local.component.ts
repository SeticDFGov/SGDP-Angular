import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';
import { NotificationService } from '../../core/services/notification.service';

interface PersonaLocal {
  Email: string;
  Nome: string;
  Perfil: string;
  Descricao: string;
}

/**
 * MODO LOCAL (execução independente, sem Keycloak) — somente testes.
 * Só funciona quando o backend sobe com Auth:ModoLocal=true (Development);
 * fora disso o endpoint devolve 404 e esta tela avisa.
 */
@Component({
  selector: 'app-login-local',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login-local.component.html'
})
export class LoginLocalComponent {
  personas: PersonaLocal[] = [
    { Email: 'admin@local.teste', Nome: 'Ana Admin', Perfil: 'admin', Descricao: 'Administra unidades, órgãos e papéis PGIA' },
    { Email: 'gestor@local.teste', Nome: 'Gabriel Gestor', Perfil: 'gestor', Descricao: 'Perfil gestor do SGDP' },
    { Email: 'centralit@local.teste', Nome: 'Carla CentralIT', Perfil: 'centralit', Descricao: 'Página dedicada /centralit' },
    { Email: 'parceiro@local.teste', Nome: 'Paulo Parceiro', Perfil: 'parceiro', Descricao: 'Página dedicada /parceiro' },
    { Email: 'basico@local.teste', Nome: 'Bruna Básico', Perfil: 'basico', Descricao: 'Sem perfil válido: cai no pending-approval até ganhar papel PGIA' }
  ];

  perfis = ['admin', 'gestor', 'centralit', 'parceiro', 'basico'];

  form = { Email: '', Nome: '', Perfil: 'gestor' };
  entrando = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  entrarComo(persona: PersonaLocal): void {
    this.form = { Email: persona.Email, Nome: persona.Nome, Perfil: persona.Perfil };
    this.entrar();
  }

  entrar(): void {
    if (!this.form.Email.trim() || !this.form.Nome.trim()) {
      this.notificationService.warning('Informe e-mail e nome do usuário de teste.');
      return;
    }
    this.entrando = true;
    this.authService.loginLocal(this.form).subscribe({
      next: () => {
        this.entrando = false;
        const perfil = this.form.Perfil;
        if (perfil === 'centralit') this.router.navigate(['/centralit']);
        else if (perfil === 'parceiro') this.router.navigate(['/parceiro']);
        else this.router.navigate(['/demandas']);
      },
      error: (err) => {
        this.entrando = false;
        if (err?.status === 404) {
          this.notificationService.error('O modo local está desligado no backend. Suba a API com Auth__ModoLocal=true (só em Development).');
        } else {
          this.notificationService.error('Não foi possível entrar no modo local. A API está rodando em http://localhost:5148?');
        }
      }
    });
  }
}
