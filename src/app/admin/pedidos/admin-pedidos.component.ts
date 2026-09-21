import { Component } from '@angular/core';
import { PedidosAcessoFilaComponent } from '../../core/acessos/pedidos-acesso-fila.component';

/**
 * Pedidos de acesso na Administração: a fila de todos os módulos que o sistema
 * libera. Quem não tem acesso pede pelo card do módulo na tela inicial; aprovar
 * libera na hora e recusar exige motivo. Os pedidos do PGIA também aparecem para
 * a SGDI, na tela Pessoas e acessos do módulo.
 */
@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [PedidosAcessoFilaComponent],
  templateUrl: './admin-pedidos.component.html'
})
export class AdminPedidosComponent { }
