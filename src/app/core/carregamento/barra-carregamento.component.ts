import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CarregamentoService } from './carregamento.service';

/**
 * Barra fina presa ao topo de todas as páginas, fora do conteúdo das rotas (fica no
 * componente raiz). Aparece enquanto uma página nova carrega ou uma requisição está
 * em andamento, se a espera passar de 150 ms, e fica pelo menos 300 ms (as regras
 * moram no `CarregamentoService`).
 *
 * Progresso indeterminado: uma faixa que corre. Com "Reduzir animações" (classe
 * `sem-animacoes` no `<html>`) ou o pedido do sistema, as regras de menos movimento
 * do `styles.css` param a animação e fica a barra inteira, parada.
 * A cor vem de `--carregando`, que cada tema redefine como o `--foco`: a cor
 * principal no claro (o padrão, no CSS do componente), azul claro no escuro e
 * amarelo no alto contraste (`scripts/temas/gerar-temas.mjs`).
 */
@Component({
  selector: 'app-barra-carregamento',
  template: '',
  // Estilos num arquivo .css: o Tailwind lê as strings dos .ts e geraria classes com as palavras do CSS
  styleUrl: './barra-carregamento.component.css',
  host: {
    role: 'progressbar',
    'aria-label': 'Carregando',
    '[attr.hidden]': 'carregamento.visivel() ? null : ""'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarraCarregamentoComponent {
  protected readonly carregamento = inject(CarregamentoService);
}
