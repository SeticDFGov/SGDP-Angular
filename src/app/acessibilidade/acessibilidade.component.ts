import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcessibilidadeService, TEMAS, Tema } from '../core/acessibilidade/acessibilidade.service';

/**
 * Página de acessibilidade (eMAG): o que o SGDP oferece, os atalhos de teclado,
 * o VLibras, as preferências da pessoa neste navegador e como relatar uma
 * barreira. Aberta, sem login (`/acessibilidade`, fora do MainLayout), porque a
 * barra de acessibilidade aponta para ela em todas as páginas, inclusive no login.
 */
@Component({
  selector: 'app-acessibilidade',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './acessibilidade.component.html'
})
export class AcessibilidadeComponent {
  readonly acessibilidade = inject(AcessibilidadeService);
  private readonly location = inject(Location);

  readonly temas = TEMAS;

  readonly atalhos = [
    { tecla: '1', acao: 'Ir para o conteúdo da página' },
    { tecla: '2', acao: 'Ir para o menu (cabeçalho com a navegação do módulo)' },
    { tecla: '3', acao: 'Abrir esta página de acessibilidade' }
  ];

  readonly teclas = [
    { tecla: 'Tab', acao: 'Avança para o próximo link, botão ou campo.' },
    { tecla: 'Shift + Tab', acao: 'Volta para o item anterior.' },
    { tecla: 'Enter', acao: 'Abre o link ou aciona o botão em foco.' },
    { tecla: 'Espaço', acao: 'Marca ou desmarca a caixa em foco e aciona botões.' },
    { tecla: 'Setas', acao: 'Escolhem a opção em listas e em grupos de opções.' },
    { tecla: 'Esc', acao: 'Fecha janelas, menus e painéis abertos.' }
  ];

  temaMarcado(valor: Tema | 'sistema'): boolean {
    const escolhido = this.acessibilidade.temaEscolhido();
    return valor === 'sistema' ? escolhido === null : escolhido === valor;
  }

  escolher(valor: Tema | 'sistema'): void {
    if (valor === 'sistema') this.acessibilidade.seguirTemaDoSistema();
    else this.acessibilidade.escolherTema(valor);
  }

  alternarAnimacoes(evento: Event): void {
    this.acessibilidade.definirReducaoDeAnimacoes((evento.target as HTMLInputElement).checked);
  }

  voltar(): void {
    this.location.back();
  }
}
