import { Component, OnInit, signal } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthRequest } from '../../../api/auth/interface';
import { CommonModule } from '@angular/common';
import { timeout } from 'rxjs/operators';
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
export class Login implements OnInit {
  // Link do modo local (sem Keycloak): só aparece fora do build de produção
  modoLocalDisponivel = !environment.production;
  loginForm = new FormGroup({
    Email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    Senha: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
  })
  carregando = false;
  mensagem: string | null = null;
  // Login direto no Keycloak (environment.oidc): a senha é digitada na tela do Keycloak
  readonly oidcAtivo: boolean;
  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.oidcAtivo = this.authService.loginOidcAtivo;
  }

  ngOnInit(): void {
    // Erro na volta do Keycloak (/auth/callback manda para cá com ?erro=)
    const erro = this.route.snapshot.queryParamMap.get('erro');
    if (erro) this.mensagem = erro;
  }

  entrarComKeycloak(): void {
    this.carregando = true;
    this.mensagem = null;
    const destino = this.route.snapshot.queryParamMap.get('destino') ?? undefined;
    this.authService.entrarComKeycloak(destino).catch(() => {
      this.carregando = false;
      this.mensagem = 'Não foi possível abrir a tela de login. Tente de novo.';
    });
  }
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
      timeout(15000) // Timeout total de 15 segundos
    ).subscribe({
      next: () => {
        this.carregando = false;
        // Todo mundo entra pela tela inicial, com os cards dos módulos: os
        // liberados ficam ativos e os demais em cinza (isolamento entre módulos)
        this.router.navigate(['/inicio']);
      },
      error: (err) => {
        if (err.name === 'TimeoutError') {
          this.mensagem = 'Timeout: A operação demorou muito. Tente novamente.';
        } else if (err.status === 401) {
          this.mensagem = 'E-mail ou senha inválidos.';
        } else {
          this.mensagem = `Problemas internos com o servidor cod: ${err.status || 'desconhecido'}`;
        }

        this.carregando = false;
      }
    });
  }
}
