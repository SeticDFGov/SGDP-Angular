import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PeAndamentoPdtic } from '../../../api/planejamento/interface';
import { PedidosAcessoService } from '../../core/acessos/pedidos-acesso.service';
import { semCarregamento } from '../../core/carregamento/sem-carregamento';
import { Modulos } from '../../core/modulos/modulos';
import { PeDeliberacoesService, PePeticService } from '../services/pe-petic.service';
import { PePdticService } from '../services/pe-pdtic.service';
import { statusDoPassoPdtic } from '../shared/pe-pdtic-rotulos';
import { statusDoPetic } from '../shared/pe-referenciais-rotulos';
import { ChaveStatusPe, PerfilTrilhaPe } from './pe-trilhas';

/**
 * feito: nada esperando · atencao: fila com itens esperando, algo devolvido ou
 * comentário aberto · pendente: há o que fazer · atrasado: prazo vencido ·
 * nao_se_aplica: passo do PDTIC que o órgão marcou como não se aplica · E7:
 * aguardando (depende de outra coisa antes) e externo (feito fora do sistema).
 */
export type EstadoPassoPe = 'feito' | 'atencao' | 'pendente' | 'atrasado' | 'nao_se_aplica' | 'aguardando' | 'externo';

export interface StatusPassoPe {
  estado: EstadoPassoPe;
  /** Texto curto do selo ("Pendente · 2 avisos", "Aguardando"). */
  texto: string;
  /** O porquê, em texto, ao lado do selo (E7: aguardando, atrasado, externo). */
  motivo?: string | null;
}

export interface SituacaoTrilhaPe {
  /** Trilhas centrais: situação pela chave de status do passo. */
  status: Partial<Record<ChaveStatusPe, StatusPassoPe>>;
  /** Trilha de um órgão com PDTIC: a situação de cada passo (GET pdtic/{id}/situacao). */
  andamento?: PeAndamentoPdtic | null;
  /** Situação de cada passo do órgão pela chave do passo (feita a partir do `andamento`). */
  passosOrgao?: Record<string, StatusPassoPe>;
  /** A situação do PDTIC não veio do servidor (a trilha fica sem as bolinhas). */
  erroAndamento?: boolean;
}

const VAZIA: SituacaoTrilhaPe = { status: {} };

function fila(quantidade: number, singular: string, plural: string, vazia: string): StatusPassoPe {
  return quantidade > 0
    ? { estado: 'atencao', texto: `${quantidade} ${quantidade === 1 ? singular : plural}` }
    : { estado: 'feito', texto: vazia };
}

/** Situação dos passos do órgão, pela chave do passo. */
function porPasso(andamento: PeAndamentoPdtic): Record<string, StatusPassoPe> {
  const mapa: Record<string, StatusPassoPe> = {};
  for (const passo of andamento.Passos ?? []) {
    const status = statusDoPassoPdtic(passo);
    if (status) mapa[passo.Chave] = status;
  }
  return mapa;
}

/**
 * Situação dos passos da trilha, calculada só com consultas que o papel já pode
 * fazer (o 403 tira a pessoa da tela):
 *
 * - Administrador do módulo (trilha do administrador: ele e o admin do SGDP): os
 *   pedidos de acesso ao módulo esperando decisão e a situação do PETIC-DF.
 * - Secretaria do CGTIC (trilha da Secretaria: ela e o admin do SGDP): o que
 *   espera a decisão do comitê.
 * - Trilha de um órgão com PDTIC aberto: a situação real de cada passo, os
 *   avisos do guia e o próximo passo recomendado, do servidor (quem vê a trilha
 *   pode ler o PDTIC: o próprio órgão, os papéis globais e o admin do SGDP).
 *
 * Falha de uma consulta só deixa o passo dela sem situação. As consultas são de
 * segundo plano (a bolinha dos passos é o sinal delas): não acendem o indicador de
 * carregamento (os pedidos, a deliberação e a situação do PDTIC já saem assim dos
 * serviços; a lista do PETIC vai com `semCarregamento()`).
 */
@Injectable({ providedIn: 'root' })
export class PeTrilhaStatusService {
  private readonly pedidosAcesso = inject(PedidosAcessoService);
  private readonly peticService = inject(PePeticService);
  private readonly deliberacoesService = inject(PeDeliberacoesService);
  private readonly pdticService = inject(PePdticService);

  carregar(perfil: PerfilTrilhaPe, pdticId: number | null = null): Observable<SituacaoTrilhaPe> {
    if (perfil === 'admin') {
      return forkJoin({
        pedidos: this.pedidosAcesso.contarPendentes(Modulos.Planejamento).pipe(
          map(resposta => fila(resposta.Total, 'pedido de acesso aguardando', 'pedidos de acesso aguardando',
            'Nenhum pedido de acesso aguardando')),
          catchError(() => of(null))
        ),
        petic: this.peticService.listar(semCarregamento()).pipe(map(statusDoPetic), catchError(() => of(null)))
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
    if (perfil === 'orgao' && pdticId) {
      return this.pdticService.situacao(pdticId).pipe(
        map(andamento => ({ status: {}, andamento, passosOrgao: porPasso(andamento) })),
        catchError(() => of({ status: {}, andamento: null, passosOrgao: {}, erroAndamento: true }))
      );
    }
    return of(VAZIA);
  }
}
