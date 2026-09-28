import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PaginaPeHistorico,
  PeCampoForm,
  PeCampoModelo,
  PeCampoNovoForm,
  PeEtapaForm,
  PeEtapaModelo,
  PeHistoricoConsulta,
  PeModelo,
  PeModoNiveis,
  PeModoNiveisForm,
  PeModoNiveisResposta,
  PeNivel,
  PeNivelForm,
  PeOpcaoForm,
  PeOpcaoModelo,
  PeOrdemForm,
  PePassoForm,
  PePassoModelo,
  PePassoNovoForm,
  PeSecaoForm,
  PeSecaoModelo,
  PeSecaoNovaForm,
  PeSituacoesForm,
  PeTrilhaOrgao
} from '../../../api/planejamento/interface';

/** Itens do modelo que têm situação por nível, ordem e exclusão lógica. */
export type PeTipoItemModelo = 'passos' | 'secoes' | 'campos';

/**
 * F3: o modo dos níveis e os níveis ativos (na ordem; o primeiro é o nível base),
 * para as telas que precisam só disso (a conformidade, a lista dos órgãos).
 */
export interface PeInfoNiveis {
  modo: PeModoNiveis;
  niveis: PeNivel[];
}

/**
 * Modelo configurável da Governança Estratégica (api/planejamento/modelo). O
 * token vai pelo interceptor. Ler (GET modelo e a trilha) serve a qualquer papel
 * do módulo; a trilha de outro órgão, só aos papéis globais e ao admin do SGDP;
 * alterar, só ao administrador do módulo e ao admin do SGDP. Quem não pode
 * recebe 403, e o interceptor tira a pessoa do módulo: as telas só chamam depois
 * de o `meu-papel` mostrar o papel certo.
 */
@Injectable({ providedIn: 'root' })
export class PeModeloService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento/modelo`;
  /** F3: o modo e os níveis do último GET modelo (guardados na sessão; o PUT do modo os atualiza). */
  private info: PeInfoNiveis | null = null;

  /** O catálogo inteiro; `incluirExcluidos` só para o administrador. Guarda o modo e os níveis (F3). */
  modelo(incluirExcluidos = false): Observable<PeModelo> {
    const params = incluirExcluidos ? new HttpParams().set('incluirExcluidos', 'true') : undefined;
    return this.http.get<PeModelo>(this.apiUrl, { params }).pipe(map(modelo => {
      this.lembrar(modelo);
      return modelo;
    }));
  }

  /** Trilha resolvida do órgão. Sem `orgaoId`, a do órgão de quem está logado. */
  trilha(orgaoId?: number | null): Observable<PeTrilhaOrgao> {
    const params = orgaoId ? new HttpParams().set('orgaoId', orgaoId) : undefined;
    return this.http.get<PeTrilhaOrgao>(`${this.apiUrl}/trilha`, { params });
  }

  // ── F3 · Modo dos níveis ──────────────────────────────────────────────────

  /**
   * O modo dos níveis e os níveis ativos: os guardados, ou os do GET modelo (uma
   * vez por sessão). Quem chama trata o erro (sem a resposta, vale o modo definido).
   */
  infoNiveis(): Observable<PeInfoNiveis> {
    if (this.info) return of(this.info);
    return this.modelo().pipe(map(modelo => this.lembrar(modelo)));
  }

  /** O modo guardado (null enquanto nenhum GET modelo respondeu nesta sessão). */
  get modoConhecido(): PeModoNiveis | null {
    return this.info?.modo ?? null;
  }

  /**
   * Troca o modo dos níveis (o administrador do módulo e o admin do SGDP; o servidor
   * grava no histórico do modelo). Sem a versão 8 do modelo carregada, 409 com a mensagem.
   */
  definirModoNiveis(modo: PeModoNiveis): Observable<PeModoNiveisResposta> {
    const corpo: PeModoNiveisForm = { Modo: modo };
    return this.http.put<PeModoNiveisResposta>(`${this.apiUrl}/modo-niveis`, corpo).pipe(map(resposta => {
      const gravado: PeModoNiveis = resposta?.ModoNiveis === 'livre' || resposta?.ModoNiveis === 'definido' ? resposta.ModoNiveis : modo;
      if (this.info) this.info = { ...this.info, modo: gravado };
      return { ModoNiveis: gravado };
    }));
  }

  private lembrar(modelo: PeModelo): PeInfoNiveis {
    const niveis = [...(modelo?.Niveis ?? [])].filter(n => n.Ativo).sort((a, b) => a.Ordem - b.Ordem || a.Id - b.Id);
    this.info = { modo: modelo?.ModoNiveis === 'livre' ? 'livre' : 'definido', niveis };
    return this.info;
  }

  // ── Níveis ────────────────────────────────────────────────────────────────

  criarNivel(form: PeNivelForm): Observable<PeNivel> {
    return this.http.post<PeNivel>(`${this.apiUrl}/niveis`, form);
  }

  /** Nome, descrição e se está ativo (nível em uso por órgão não se apaga: desativa). */
  atualizarNivel(id: number, form: PeNivelForm): Observable<PeNivel> {
    return this.http.put<PeNivel>(`${this.apiUrl}/niveis/${id}`, form);
  }

  ordenarNiveis(ids: number[]): Observable<unknown> {
    const corpo: PeOrdemForm = { Ids: ids };
    return this.http.put(`${this.apiUrl}/niveis/ordem`, corpo);
  }

  // ── Etapas (sem criar nem apagar nesta entrega) ───────────────────────────

  atualizarEtapa(id: number, form: PeEtapaForm): Observable<PeEtapaModelo> {
    return this.http.put<PeEtapaModelo>(`${this.apiUrl}/etapas/${id}`, form);
  }

  // ── Passos, seções e campos ───────────────────────────────────────────────

  criarPasso(form: PePassoNovoForm): Observable<PePassoModelo> {
    return this.http.post<PePassoModelo>(`${this.apiUrl}/passos`, form);
  }

  atualizarPasso(id: number, form: PePassoForm): Observable<PePassoModelo> {
    return this.http.put<PePassoModelo>(`${this.apiUrl}/passos/${id}`, form);
  }

  criarSecao(form: PeSecaoNovaForm): Observable<PeSecaoModelo> {
    return this.http.post<PeSecaoModelo>(`${this.apiUrl}/secoes`, form);
  }

  atualizarSecao(id: number, form: PeSecaoForm): Observable<PeSecaoModelo> {
    return this.http.put<PeSecaoModelo>(`${this.apiUrl}/secoes/${id}`, form);
  }

  criarCampo(form: PeCampoNovoForm): Observable<PeCampoModelo> {
    return this.http.post<PeCampoModelo>(`${this.apiUrl}/campos`, form);
  }

  atualizarCampo(id: number, form: PeCampoForm): Observable<PeCampoModelo> {
    return this.http.put<PeCampoModelo>(`${this.apiUrl}/campos/${id}`, form);
  }

  /** Situação em cada nível (ou a situação geral, fora do PDTIC). Devolve o item atualizado. */
  definirSituacoes<T>(tipo: PeTipoItemModelo, id: number, corpo: PeSituacoesForm): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${tipo}/${id}/niveis`, corpo);
  }

  /** Só o que o administrador criou; exclusão lógica (os dados dos órgãos ficam guardados). */
  apagar(tipo: PeTipoItemModelo, id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${tipo}/${id}`);
  }

  /** Nova ordem dos irmãos (os ids na ordem em que devem ficar). */
  ordenar(tipo: PeTipoItemModelo, ids: number[]): Observable<unknown> {
    const corpo: PeOrdemForm = { Ids: ids };
    return this.http.put(`${this.apiUrl}/${tipo}/ordem`, corpo);
  }

  // ── Opções das listas ─────────────────────────────────────────────────────

  criarOpcao(campoId: number, form: PeOpcaoForm): Observable<PeOpcaoModelo> {
    return this.http.post<PeOpcaoModelo>(`${this.apiUrl}/campos/${campoId}/opcoes`, form);
  }

  atualizarOpcao(id: number, form: PeOpcaoForm): Observable<PeOpcaoModelo> {
    return this.http.put<PeOpcaoModelo>(`${this.apiUrl}/opcoes/${id}`, form);
  }

  /** Opção do sistema (ou em uso) só é desativada. */
  apagarOpcao(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/opcoes/${id}`);
  }

  // ── Histórico ─────────────────────────────────────────────────────────────

  historico(consulta: PeHistoricoConsulta): Observable<PaginaPeHistorico> {
    let params = new HttpParams().set('page', consulta.Page);
    if (consulta.Entidade) params = params.set('entidade', consulta.Entidade);
    if (consulta.EntidadeId) params = params.set('entidadeId', consulta.EntidadeId);
    return this.http.get<PaginaPeHistorico>(`${this.apiUrl}/historico`, { params });
  }
}
