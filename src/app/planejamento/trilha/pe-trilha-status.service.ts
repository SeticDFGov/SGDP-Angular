import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PedidosAcessoService } from '../../core/acessos/pedidos-acesso.service';
import { Modulos } from '../../core/modulos/modulos';
import { PeDeliberacoesService, PePeticService } from '../services/pe-petic.service';
import { statusDoPetic } from '../shared/pe-referenciais-rotulos';
import { ChaveStatusPe, PerfilTrilhaPe } from './pe-trilhas';

/**
 * feito: nada esperando · atencao: fila com itens esperando ou algo devolvido ·
 * pendente: há o que fazer · atrasado: prazo vencido (chega com o PDTIC, na E4).
 */
export type EstadoPassoPe = 'feito' | 'atencao' | 'pendente' | 'atrasado';

export interface StatusPassoPe {
  estado: EstadoPassoPe;
  texto: string;
}

export interface SituacaoTrilhaPe {
  status: Partial<Record<ChaveStatusPe, StatusPassoPe>>;
}

const VAZIA: SituacaoTrilhaPe = { status: {} };

function fila(quantidade: number, singular: string, plural: string, vazia: string): StatusPassoPe {
  return quantidade > 0
    ? { estado: 'atencao', texto: `${quantidade} ${quantidade === 1 ? singular : plural}` }
    : { estado: 'feito', texto: vazia };
}

/**
 * Situação dos passos da trilha, calculada só com consultas que o papel já pode
 * fazer (o 403 tira a pessoa da tela):
 *
 * - Administrador do módulo (trilha do administrador: ele e o admin do SGDP): os
 *   pedidos de acesso ao módulo esperando decisão e a situação do PETIC-DF.
 * - Secretaria do CGTIC (trilha da Secretaria: ela e o admin do SGDP): o que
 *   espera a decisão do comitê.
 *
 * Falha de uma consulta só deixa o passo dela sem situação.
 */
@Injectable({ providedIn: 'root' })
export class PeTrilhaStatusService {
  private readonly pedidosAcesso = inject(PedidosAcessoService);
  private readonly peticService = inject(PePeticService);
  private readonly deliberacoesService = inject(PeDeliberacoesService);

  carregar(perfil: PerfilTrilhaPe): Observable<SituacaoTrilhaPe> {
    if (perfil === 'admin') {
      return forkJoin({
        pedidos: this.pedidosAcesso.contarPendentes(Modulos.Planejamento).pipe(
          map(resposta => fila(resposta.Total, 'pedido de acesso aguardando', 'pedidos de acesso aguardando',
            'Nenhum pedido de acesso aguardando')),
          catchError(() => of(null))
        ),
        petic: this.peticService.listar().pipe(map(statusDoPetic), catchError(() => of(null)))
      }).pipe(map(({ pedidos, petic }) => {
        const status: SituacaoTrilhaPe['status'] = {};
        if (pedidos) status['pedidos-acesso'] = pedidos;
        if (petic) status.petic = petic;
        return { status };
      }));
    }
    if (perfil === 'cgtic') {
      return this.deliberacoesService.contarAguardando().pipe(
        map(total => ({
          status: { deliberacoes: fila(total, 'envio aguardando a decisão', 'envios aguardando a decisão', 'Nada aguardando o comitê') }
        })),
        catchError(() => of(VAZIA))
      );
    }
    return of(VAZIA);
  }
}
