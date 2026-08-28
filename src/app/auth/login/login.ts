import { Component, signal } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth';
import { Router, RouterModule } from '@angular/router';
import { AuthRequest } from '../../../api/auth/interface';
import { CommonModule } from '@angular/common';
import { switchMap, timeout, catchError } from 'rxjs/operators';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  // Link do modo local (sem Keycloak): só aparece fora do build de produção
  modoLocalDisponivel = !environment.production;
  loginForm = new FormGroup({
    Email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    Senha: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
  })
  carregando = false;
  mensagem: string | null = null;
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }
  showPassword = signal(false);

  togglePasswordVisibility() {
    this.showPassword.update((valorAtual) => !valorAtual);
  }
  onSubmit() {
    if (this.loginForm.invalid) {
      this.mensagem = "Preencha os campos corretamente";
      return;
    };

    this.carregando = true;
    this.mensagem = null;

    const credentials: AuthRequest = this.loginForm.getRawValue();
    this.authService.login(credentials).pipe(
      timeout(10000), // 10 segundos de timeout
      switchMap(() => {
        return this.authService.isUserFullyConfigured();
      }),
      switchMap((isConfigured) => {

        if (!isConfigured) {
          this.carregando = false;
          this.router.navigate(['/pending-approval']);
          throw new Error('User not configured');
        }

        return this.authService.getPerfil();
      }),
      timeout(15000) // Timeout total de 15 segundos
    ).subscribe({
      next: (perfil) => {
        this.carregando = false;

        if (perfil === 'centralit') {
          this.router.navigate(['/centralit']);
        } else if (perfil === 'parceiro') {
          this.router.navigate(['/parceiro']);
        } else {
          this.router.navigate(['/demandas']);
        }
      },
      error: (err) => {

        // Não mostra erro se for apenas "User not configured"
        if (err.message === 'User not configured') {
          // Usuário já redirecionado para pending-approval
        } else if (err.name === 'TimeoutError') {
          this.mensagem = 'Timeout: A operação demorou muito. Tente novamente.';
        } else {
          this.mensagem = `Problemas internos com o servidor cod: ${err.status || 'desconhecido'}`;
        }

        this.carregando = false;
      }
    });
  }
}
