import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

/**
 * /auth: o login é só pelo Keycloak (OIDC com PKCE). A tela leva direto à tela de login do
 * Keycloak (tema sgdp do k8s-manifests, com o mesmo visual desta), e só fica à vista quando a
 * volta do login falhou (?erro=, vindo do /auth/callback) ou quando não dá para abrir.
 */
@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  // Link do modo local (sem Keycloak): só aparece fora do build de produção
  modoLocalDisponivel = !environment.production;
  // Sem environment.oidc (desenvolvimento) não há login pelo Keycloak: só o modo local
  readonly oidcConfigurado = !!environment.oidc;
  carregando = this.oidcConfigurado;
  mensagem: string | null = null;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Erro na volta do Keycloak (/auth/callback manda para cá com ?erro=): fica na tela, para
    // não voltar ao Keycloak em laço
    const erro = this.route.snapshot.queryParamMap.get('erro');
    if (erro) {
      this.mensagem = erro;
      this.carregando = false;
      return;
    }
    // No navegador, segue direto para a tela de login do Keycloak (no SSR, só a moldura)
    if (this.authService.loginOidcAtivo) this.entrarComKeycloak();
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
}
