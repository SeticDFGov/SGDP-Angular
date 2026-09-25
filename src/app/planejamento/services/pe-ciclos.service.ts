import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PeAcaoCiclo, PeAcaoCicloForm, PeAcoesCicloForm, PeCiclo, PeCicloNovoForm, PeMedicaoCiclo, PeMedicaoCicloForm,
  PeMedicoesCicloForm, PePainelAcompanhamento, PeTipoCiclo
} from '../../../api/planejamento/interface';

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

  /** Guarda o ciclo escolhido (o passo seguinte do mesmo tipo começa por ele). */
  lembrar(pdticId: number, tipo: PeTipoCiclo, cicloId: number): void {
    this.escolhas.set(`${pdticId}:${tipo}`, cicloId);
  }

  lembrado(pdticId: number, tipo: PeTipoCiclo): number | null {
    return this.escolhas.get(`${pdticId}:${tipo}`) ?? null;
  }
}
