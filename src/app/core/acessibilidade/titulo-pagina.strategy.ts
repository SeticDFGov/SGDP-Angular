import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * Título da aba do navegador por tela (WCAG 2.4.2): junta os `title` das rotas,
 * da mais específica para a mais geral, e termina em "SGDP". Exemplo:
 * "Lista de processos · Supervisão Contínua das Contratações · SGDP".
 * É o primeiro texto que o leitor de tela lê numa página nova.
 */
@Injectable()
export class TituloPaginaStrategy extends TitleStrategy {
  private readonly titulo = inject(Title);

  override updateTitle(estado: RouterStateSnapshot): void {
    const partes: string[] = [];
    for (let rota: ActivatedRouteSnapshot | null = estado.root; rota; rota = rota.firstChild) {
      const parte = rota.title;
      if (parte && !partes.includes(parte)) partes.unshift(parte);
    }
    this.titulo.setTitle([...partes, 'SGDP'].join(' · '));
  }
}
