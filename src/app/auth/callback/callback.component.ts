import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Volta do login no Keycloak (/auth/callback?code=...&state=...): troca o código pelo token,
 * carrega o /me e segue para a rota guardada na ida (ou a tela inicial). Em erro, volta para
 * /auth com a mensagem.
 */
@Component({
  selector: 'app-auth-callback',
  template: `
    <main id="conteudo" tabindex="-1" class="min-h-screen flex items-center justify-center bg-gray-100">
      <p class="text-gray-700" role="status" aria-live="polite">Entrando...</p>
    </main>
  `
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    // No SSR/prerender não há a volta do Keycloak para tratar
    if (!isPlatformBrowser(this.platformId)) return;

    const query = new URLSearchParams(window.location.search);
    this.authService.concluirLoginOidc(query).subscribe({
      next: destino => {
        // Só rotas internas: o destino veio do sessionStorage, mas não se confia em URL externa
        const rota = destino && destino.startsWith('/') && !destino.startsWith('//') ? destino : '/inicio';
        this.router.navigateByUrl(rota, { replaceUrl: true });
      },
      error: (err: { message?: string }) => {
        this.router.navigate(['/auth'], {
          replaceUrl: true,
          queryParams: { erro: err?.message || 'Não foi possível entrar. Tente de novo.' }
        });
      }
    });
  }
}
