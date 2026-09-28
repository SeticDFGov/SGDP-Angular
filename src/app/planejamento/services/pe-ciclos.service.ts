import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PeAcaoCiclo, PeAcaoCicloForm, PeAcoesCicloForm, PeCiclo, PeCicloNovoForm, PeMedicaoCiclo, PeMedicaoCicloForm,
  PeMedicoesCicloForm, PePainelAcompanhamento, PeRegistrosDaSecao, PeResumoCiclo, PeTipoCiclo
} from '../../../api/planejamento/interface';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';
import {
  ResumoAvaliacao, SECAO_ANALISE_INTERMEDIARIA, SECAO_AVALIACAO_DO_COMITE, SECAO_RESULTADOS_INTERMEDIARIOS
} from '../shared/pe-ciclos-rotulos';

/**
 * Acompanhamento do PDTIC (E7 rodada B): os ciclos de monitoramento (que o
 * servidor cria sozinho pela periodicidade, ao listar) e de avaliação
 * intermediária (que a equipe abre), o fechamento e a reabertura, as grades da
 * situação das ações e das medições de um ciclo e o painel do PDTIC (AC-PDTIC).
 * O token vai pelo interceptor.
 *
 * Quem pode: quem lê o PDTIC lê os ciclos, as grades e o painel; a equipe do
 * órgão, com o PDTIC publicado ou em acompanhamento, grava nas grades (só com o
 * ciclo aberto), abre a avaliação, fecha e reabre. O 403 tira a pessoa do módulo
 * (interceptor): as telas só chamam o que o papel dela pode.
 */
@Injectable({ providedIn: 'root' })
export class PeCiclosService {
  private readonly http = inject(HttpClient);
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento`;
  /** O ciclo escolhido em cada PDTIC e tipo: o passo seguinte (5.1 e 5.2) mostra o mesmo ciclo. */
  private readonly escolhas = new Map<string, number>();

  /** Os ciclos do tipo, na ordem (os de monitoramento que faltam o servidor cria ao listar). */
  listar(pdticId: number, tipo: PeTipoCiclo): Observable<PeCiclo[]> {
    const params = new HttpParams().set('tipo', tipo);
    return this.http.get<PeCiclo[] | null>(`${this.apiUrl}/pdtic/${pdticId}/ciclos`, { params }).pipe(map(lista => lista ?? []));
  }

  /** Abre uma avaliação intermediária (uma aberta por vez: 409 se já há). */
  abrirAvaliacao(pdticId: number, rotulo: string | null): Observable<PeCiclo> {
    const corpo: PeCicloNovoForm = { Tipo: 'avaliacao', Rotulo: rotulo };
    return this.http.post<PeCiclo>(`${this.apiUrl}/pdtic/${pdticId}/ciclos`, corpo);
  }

  /** Fecha o ciclo (400 com `Pendencias` quando falta algo); no monitoramento, o servidor gera o RA em minuta. */
  fechar(cicloId: number): Observable<PeCiclo> {
    return this.http.post<PeCiclo>(`${this.apiUrl}/ciclos/${cicloId}/fechar`, {});
  }

  reabrir(cicloId: number): Observable<PeCiclo> {
    return this.http.post<PeCiclo>(`${this.apiUrl}/ciclos/${cicloId}/reabrir`, {});
  }

  /** Todas as ações do PDTIC com o registro do ciclo e os valores do ciclo anterior. */
  acoes(cicloId: number): Observable<PeAcaoCiclo[]> {
    return this.http.get<PeAcaoCiclo[] | null>(`${this.apiUrl}/ciclos/${cicloId}/acoes`).pipe(map(lista => lista ?? []));
  }

  /** Grava a grade (pelo motor, com a validação do nível) e devolve a lista; 400 com `Campos` "<AcaoId>.<campo>". */
  salvarAcoes(cicloId: number, itens: PeAcaoCicloForm[]): Observable<PeAcaoCiclo[]> {
    const corpo: PeAcoesCicloForm = { Itens: itens };
    return this.http.put<PeAcaoCiclo[] | null>(`${this.apiUrl}/ciclos/${cicloId}/acoes`, corpo).pipe(map(lista => lista ?? []));
  }

  /** Os indicadores de monitoramento com a medição do ciclo e a do ciclo anterior. */
  medicoes(cicloId: number): Observable<PeMedicaoCiclo[]> {
    return this.http.get<PeMedicaoCiclo[] | null>(`${this.apiUrl}/ciclos/${cicloId}/medicoes`).pipe(map(lista => lista ?? []));
  }

  salvarMedicoes(cicloId: number, itens: PeMedicaoCicloForm[]): Observable<PeMedicaoCiclo[]> {
    const corpo: PeMedicoesCicloForm = { Itens: itens };
    return this.http.put<PeMedicaoCiclo[] | null>(`${this.apiUrl}/ciclos/${cicloId}/medicoes`, corpo).pipe(map(lista => lista ?? []));
  }

  /** O painel do PDTIC (AC-PDTIC); sem ciclo, o servidor usa o último com dado. */
  painel(pdticId: number, cicloId: number | null): Observable<PePainelAcompanhamento> {
    const params = cicloId ? new HttpParams().set('cicloId', cicloId) : undefined;
    return this.http.get<PePainelAcompanhamento>(`${this.apiUrl}/pdtic/${pdticId}/painel-acompanhamento`, { params });
  }

  /**
   * F1 (I04 e C23): o que uma avaliação intermediária já tem, pelas seções dela no
   * ciclo: quantos resultados das metas, se a análise está preenchida e a decisão
   * do comitê. Seção que o nível do órgão não liga (404) ou que falhou fica nula
   * (a tela não fala dela).
   */
  resumoDaAvaliacao(pdticId: number, cicloId: number, resumo?: PeResumoCiclo | null): Observable<ResumoAvaliacao> {
    // O servidor já manda o resumo da avaliação junto com o ciclo (F1): sem consulta. A seção que o nível
    // do órgão não liga (fora da trilha à vista) fica nula, como no caminho pelas seções
    if (resumo && resumo.ResultadosMetas !== undefined) {
      const naTrilha = this.secoesNaTrilha();
      const tem = (chave: string) => !naTrilha || naTrilha.has(chave);
      const decisao = resumo.DecisaoComiteRotulo?.trim() || resumo.DecisaoComite?.trim() || '';
      return of({
        resultados: tem(SECAO_RESULTADOS_INTERMEDIARIOS) ? resumo.ResultadosMetas ?? 0 : null,
        analise: tem(SECAO_ANALISE_INTERMEDIARIA) ? !!resumo.AnaliseRegistrada : null,
        decisao: tem(SECAO_AVALIACAO_DO_COMITE) ? decisao : null
      });
    }
    const params = new HttpParams().set('cicloId', cicloId);
    const secao = (chave: string): Observable<PeRegistrosDaSecao | null> =>
      this.http.get<PeRegistrosDaSecao>(`${this.apiUrl}/pdtic/${pdticId}/secoes/${chave}/registros`, { params })
        .pipe(catchError(() => of(null)));
    return forkJoin({
      resultados: secao(SECAO_RESULTADOS_INTERMEDIARIOS),
      analise: secao(SECAO_ANALISE_INTERMEDIARIA),
      comite: secao(SECAO_AVALIACAO_DO_COMITE)
    }).pipe(map(({ resultados, analise, comite }) => {
      const decisao = comite?.Registros?.[0] ?? null;
      const rotulo = decisao?.Rotulos?.['decisao'];
      const valor = decisao?.Dados?.['decisao'];
      return {
        resultados: resultados ? resultados.Registros?.length ?? 0 : null,
        analise: analise ? (analise.Registros?.length ?? 0) > 0 : null,
        decisao: comite
          ? (typeof rotulo === 'string' && rotulo.trim() ? rotulo.trim() : typeof valor === 'string' && valor ? valor : '')
          : null
      };
    }));
  }

  /** As seções dos passos da trilha à vista (a do órgão); nulo sem trilha de órgão. */
  private secoesNaTrilha(): Set<string> | null {
    const passos = this.estadoService.atual?.passos ?? [];
    const chaves = passos.flatMap(p => (p.doOrgao?.Secoes ?? []).map(s => s.Chave));
    return chaves.length ? new Set(chaves) : null;
  }

  /** Guarda o ciclo escolhido (o passo seguinte do mesmo tipo começa por ele). */
  lembrar(pdticId: number, tipo: PeTipoCiclo, cicloId: number): void {
    this.escolhas.set(`${pdticId}:${tipo}`, cicloId);
  }

  lembrado(pdticId: number, tipo: PeTipoCiclo): number | null {
    return this.escolhas.get(`${pdticId}:${tipo}`) ?? null;
  }
}
