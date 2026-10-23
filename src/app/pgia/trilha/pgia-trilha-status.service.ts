import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PgiaOrgaoService } from '../services/pgia-orgao.service';
import { PgiaSistemaService } from '../services/pgia-sistema.service';
import { PgiaGovernancaService } from '../services/pgia-governanca.service';
import { PgiaOperacaoService } from '../services/pgia-operacao.service';
import { PedidosAcessoService } from '../../core/acessos/pedidos-acesso.service';
import { PgiaDesignacao, PgiaPrazo } from '../../../api/pgia/interface';
import { semCarregamento } from '../../core/carregamento/sem-carregamento';
import { ChaveStatus, PerfilTrilha } from './pgia-trilhas';

/**
 * feito: cumprido · pendente: há o que fazer, dentro do prazo · atrasado: prazo
 * vencido · atencao: fila com itens esperando · continuo: sem prazo (rotina).
 */
export type EstadoPasso = 'feito' | 'pendente' | 'atrasado' | 'atencao' | 'continuo';

export interface StatusPasso {
  estado: EstadoPasso;
  texto: string;
}

export interface SituacaoTrilha {
  status: Partial<Record<ChaveStatus, StatusPasso>>;
  /** Prazos do decreto que aparecem na visão geral (do órgão ou centrais). */
  prazos: PgiaPrazo[];
  orgaoSigla: string | null;
  orgaoNome: string | null;
}

const VAZIA: SituacaoTrilha = { status: {}, prazos: [], orgaoSigla: null, orgaoNome: null };

/** Trecho da obrigação-modelo (seed de pgia_prazo_conformidade) de cada passo com prazo. */
const OBRIGACAO: Partial<Record<ChaveStatus, string>> = {
  responsavel: 'Responsável de IA',
  encarregado: 'Encarregado de Dados',
  inventario: 'inventário inicial',
  capacitacao: 'ProCapIA',
  legados: 'atos e contratos anteriores',
  aia: 'AIA dos sistemas',
  guia: 'Guia de Contratações',
  anual: 'Relatório Anual'
};

/** "2026-10-01" → "01/10/2026" (data pura, sem fuso). */
function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.substring(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function statusDoPrazo(prazo: PgiaPrazo | undefined): StatusPasso | undefined {
  if (!prazo) return undefined;
  if (prazo.CumpridoEm) return { estado: 'feito', texto: `Cumprido em ${dataBr(prazo.CumpridoEm)}` };
  if (prazo.Situacao === 'Vencida') return { estado: 'atrasado', texto: `Prazo vencido em ${dataBr(prazo.DataLimite)}` };
  return { estado: 'pendente', texto: `Prazo: ${dataBr(prazo.DataLimite)}` };
}

function prazoDe(prazos: PgiaPrazo[], chave: ChaveStatus): PgiaPrazo | undefined {
  const trecho = OBRIGACAO[chave];
  return trecho ? prazos.find(p => p.Obrigacao.includes(trecho)) : undefined;
}

/**
 * Situação de uma designação pelo titular vigente (o principal) e o suplente.
 * Ato importado da planilha da SGDI ainda a completar pede atenção.
 */
function statusDesignacao(titular: PgiaDesignacao | null | undefined,
                          suplente: PgiaDesignacao | null | undefined): StatusPasso | undefined {
  if (!titular) return undefined;
  const partes = [`Titular: ${titular.AgenteNome}`, suplente ? `Suplente: ${suplente.AgenteNome}` : 'sem suplente'];
  const pendente = !!titular.AtoPendente || !!suplente?.AtoPendente;
  if (pendente) partes.push('ato a completar');
  return { estado: pendente ? 'atencao' : 'feito', texto: partes.join(' · ') };
}

function fila(quantidade: number | null, singular: string, plural: string, vazia: string): StatusPasso | undefined {
  if (quantidade === null) return undefined;
  return quantidade > 0
    ? { estado: 'atencao', texto: `${quantidade} ${quantidade === 1 ? singular : plural}` }
    : { estado: 'feito', texto: vazia };
}

/**
 * Situação de cada passo da trilha, calculada com as MESMAS consultas que as telas
 * do papel já fazem, nunca uma que o backend negaria ao papel (o 403 tira o
 * usuário da tela). Falha de uma consulta só deixa o passo sem status.
 *
 * As consultas são de segundo plano (a bolinha dos passos é o sinal delas): vão
 * com `semCarregamento()` e não acendem o indicador de carregamento.
 */
@Injectable({ providedIn: 'root' })
export class PgiaTrilhaStatusService {
  private readonly orgaoService = inject(PgiaOrgaoService);
  private readonly sistemaService = inject(PgiaSistemaService);
  private readonly governancaService = inject(PgiaGovernancaService);
  private readonly operacaoService = inject(PgiaOperacaoService);
  private readonly pedidosAcesso = inject(PedidosAcessoService);

  carregar(perfil: PerfilTrilha): Observable<SituacaoTrilha> {
    switch (perfil) {
      case 'orgao': return this.doOrgao();
      case 'sgdi': return this.daSgdi();
      case 'cgtic': return this.doCgtic();
      case 'auditoria': return this.daAuditoria();
      default: return this.doAgente();
    }
  }

  private doOrgao(): Observable<SituacaoTrilha> {
    return this.orgaoService.getMeuOrgao(semCarregamento()).pipe(
      catchError(() => of(null)),
      switchMap(meu => {
        const orgao = meu?.Orgao ?? null;
        if (!orgao) return of({ ...VAZIA });

        return forkJoin({
          prazos: this.orgaoService.listarPrazos(orgao.Id, semCarregamento()).pipe(catchError(() => of([] as PgiaPrazo[]))),
          sistemas: this.sistemaService.listarSistemas(orgao.Id, 1, 1, semCarregamento()).pipe(
            map(pagina => pagina.TotalItems), catchError(() => of(null)))
        }).pipe(map(({ prazos, sistemas }) => {
          const status: Partial<Record<ChaveStatus, StatusPasso>> = {};

          status.responsavel = statusDesignacao(meu?.ResponsavelIaVigente, meu?.ResponsavelIaSuplenteVigente)
            ?? statusDoPrazo(prazoDe(prazos, 'responsavel')) ?? { estado: 'pendente', texto: 'Ainda não designado' };
          status.encarregado = statusDesignacao(meu?.EncarregadoDadosVigente, meu?.EncarregadoDadosSuplenteVigente)
            ?? statusDoPrazo(prazoDe(prazos, 'encarregado')) ?? { estado: 'pendente', texto: 'Ainda não designado' };
          // O Curador de Dados de Negócio não tem prazo no decreto. Resposta antiga sem o
          // campo (undefined): o passo fica sem situação.
          if (meu && meu.CuradorDadosVigente !== undefined) {
            status.curador = statusDesignacao(meu.CuradorDadosVigente, meu.CuradorDadosSuplenteVigente)
              ?? { estado: 'pendente', texto: 'Ainda não designado' };
          }

          // Inventário: o prazo diz se a remessa inicial foi cumprida; a contagem ajuda a ler
          const prazoInventario = statusDoPrazo(prazoDe(prazos, 'inventario'));
          if (prazoInventario || sistemas !== null) {
            const qtd = sistemas === null ? '' : `${sistemas} ${sistemas === 1 ? 'sistema registrado' : 'sistemas registrados'}`;
            status.inventario = {
              estado: prazoInventario?.estado ?? (sistemas ? 'feito' : 'pendente'),
              texto: [qtd, prazoInventario?.texto].filter(Boolean).join(' · ')
            };
          }

          for (const chave of ['capacitacao', 'legados', 'aia'] as ChaveStatus[]) {
            const s = statusDoPrazo(prazoDe(prazos, chave));
            if (s) status[chave] = s;
          }

          return { status, prazos, orgaoSigla: orgao.Sigla, orgaoNome: orgao.Nome };
        }));
      })
    );
  }

  private daSgdi(): Observable<SituacaoTrilha> {
    return forkJoin({
      fila: this.governancaService.listarHomologacoes('Aguardando avaliação da SGDI', semCarregamento()).pipe(
        map(itens => itens.length), catchError(() => of(null))),
      incidentes: this.operacaoService.listarIncidentesComunicados(undefined, semCarregamento()).pipe(
        map(itens => itens.filter(i => i.StatusApuracao === 'Recebida' || i.StatusApuracao === 'Em apuração').length),
        catchError(() => of(null))),
      prazos: this.orgaoService.listarPrazosCentrais(semCarregamento()).pipe(catchError(() => of([] as PgiaPrazo[]))),
      // Só os pedidos do PGIA (o admin, que também vê esta trilha, decide os de todos os módulos)
      pedidos: this.pedidosAcesso.contarPendentes('pgia').pipe(
        map(resposta => resposta.Total), catchError(() => of(null)))
    }).pipe(map(({ fila: naFila, incidentes, prazos, pedidos }) => {
      const status: Partial<Record<ChaveStatus, StatusPasso>> = {};
      const p = fila(pedidos, 'pedido de acesso aguardando', 'pedidos de acesso aguardando', 'Nenhum pedido de acesso aguardando');
      if (p) status['pedidos-acesso'] = p;
      const f = fila(naFila, 'sistema aguardando avaliação', 'sistemas aguardando avaliação', 'Fila em dia');
      if (f) status['fila-sgdi'] = f;
      const a = fila(incidentes, 'incidente a apurar', 'incidentes a apurar', 'Nenhum incidente pendente');
      if (a) status.apuracao = a;
      for (const chave of ['guia', 'anual'] as ChaveStatus[]) {
        const s = statusDoPrazo(prazoDe(prazos, chave));
        if (s) status[chave] = s;
      }
      return { status, prazos, orgaoSigla: null, orgaoNome: null };
    }));
  }

  private doCgtic(): Observable<SituacaoTrilha> {
    return this.governancaService.listarHomologacoes('Aguardando deliberação do CGTIC', semCarregamento()).pipe(
      map(itens => itens.length),
      catchError(() => of(null)),
      map(casos => {
        const s = fila(casos, 'caso aguardando o comitê', 'casos aguardando o comitê', 'Nenhum caso pendente');
        return { ...VAZIA, status: s ? { 'casos-cgtic': s } : {} };
      })
    );
  }

  private daAuditoria(): Observable<SituacaoTrilha> {
    return this.governancaService.listarMinhasAuditorias(semCarregamento()).pipe(
      map(itens => itens.filter(a => !a.Parecer).length),
      catchError(() => of(null)),
      map(pendentes => {
        const s = fila(pendentes, 'auditoria sem parecer', 'auditorias sem parecer', 'Pareceres em dia');
        return { ...VAZIA, status: s ? { auditorias: s } : {} };
      })
    );
  }

  private doAgente(): Observable<SituacaoTrilha> {
    // O agente só usa as fontes do registro de uso: a sigla do órgão vem de lá
    return this.operacaoService.listarFontesUso(semCarregamento()).pipe(
      map(fontes => ({ ...VAZIA, orgaoSigla: fontes.OrgaoSigla ?? null })),
      catchError(() => of({ ...VAZIA }))
    );
  }
}
