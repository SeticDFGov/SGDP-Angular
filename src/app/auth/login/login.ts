import { Component, signal } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';
import { AuthRequest } from '../../../api/auth/interface';
import { CommonModule } from '@angular/common';
import { error } from 'console';
@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
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
    this.authService.login(credentials).subscribe({
      next: () => this.router.navigate(['/projetos']),
      error: (err) => this.mensagem = `problemas internos com o servidor cod: ${err.status}`
    })

  }
}
