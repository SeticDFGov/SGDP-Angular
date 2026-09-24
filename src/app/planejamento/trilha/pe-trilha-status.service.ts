import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PedidosAcessoService } from '../../core/acessos/pedidos-acesso.service';
import { Modulos } from '../../core/modulos/modulos';
import { ChaveStatusPe, PerfilTrilhaPe } from './pe-trilhas';

/**
 * feito: nada esperando · atencao: fila com itens esperando · pendente: há o que
 * fazer · atrasado: prazo vencido (os dois últimos chegam com o PDTIC, na E4).
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
 * fazer (o 403 tira a pessoa da tela). Nesta entrega só o passo "Responda aos
 * pedidos e defina os papéis" do administrador tem situação: os pedidos de acesso
 * ao módulo esperando decisão. A trilha do administrador só aparece para o
 * administrador do módulo e para o admin do SGDP, que decidem esses pedidos.
 * Falha da consulta só deixa o passo sem situação.
 */
@Injectable({ providedIn: 'root' })
export class PeTrilhaStatusService {
  private readonly pedidosAcesso = inject(PedidosAcessoService);

  carregar(perfil: PerfilTrilhaPe): Observable<SituacaoTrilhaPe> {
    if (perfil !== 'admin') return of(VAZIA);
    return this.pedidosAcesso.contarPendentes(Modulos.Planejamento).pipe(
      map(resposta => ({
        status: {
          'pedidos-acesso': fila(resposta.Total, 'pedido de acesso aguardando', 'pedidos de acesso aguardando',
            'Nenhum pedido de acesso aguardando')
        }
      })),
      catchError(() => of(VAZIA))
    );
  }
}
