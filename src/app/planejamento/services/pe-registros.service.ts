import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PeArquivo,
  PeFormatoPlanilha,
  PeItemCatalogo,
  PeOrdemForm,
  PeRegistro,
  PeRegistroForm,
  PeRegistrosDaSecao
} from '../../../api/planejamento/interface';

/**
 * Dono dos registros: o catálogo do DF (princípios e diretrizes do ciclo), uma
 * versão do PETIC-DF ou, a partir da E4, o PDTIC de um órgão.
 */
export type PeDono =
  | { tipo: 'df' }
  | { tipo: 'petic'; id: number }
  | { tipo: 'pdtic'; id: number };

/** Caminho do dono sob api/planejamento: "df", "petic/3", "pdtic/12". */
export function caminhoDono(dono: PeDono): string {
  return dono.tipo === 'df' ? 'df' : `${dono.tipo}/${dono.id}`;
}

/**
 * O que os componentes genéricos de registros (formulário, tabela e os campos de
 * ligação) usam para ler e gravar, sem saber quem é o dono. Cada tela monta a sua
 * com `PeRegistrosService.fonte(dono)` e passa aos componentes.
 */
export interface PeFonteRegistros {
  /** Identifica o dono ("df", "petic/3"): mudou a chave, os componentes recarregam. */
  readonly chave: string;
  listar(secao: string): Observable<PeRegistrosDaSecao>;
  /** Formulário que já tem registro: 409 (use `atualizar`). */
  criar(secao: string, form: PeRegistroForm): Observable<PeRegistro>;
  atualizar(secao: string, id: number, form: PeRegistroForm): Observable<PeRegistro>;
  /** 204; registro ligado por outro ou do sistema: 409 com `Message` dizendo o motivo. */
  apagar(secao: string, id: number): Observable<unknown>;
  /** Todos os registros da seção, na ordem nova. */
  ordenar(secao: string, ids: number[]): Observable<unknown>;
  /** Planilha da seção, com o nome do arquivo no `Content-Disposition`. */
  planilha(secao: string, formato: PeFormatoPlanilha): Observable<HttpResponse<Blob>>;
  /** Itens de um catálogo para os campos de ligação (no PDTIC, `pgia_sistema` traz os sistemas do órgão dele). */
  catalogo(catalogo: string): Observable<PeItemCatalogo[]>;
  /** O catálogo existe para este dono (`pgia_sistema` só no PDTIC, que diz de qual órgão). */
  aceitaCatalogo(catalogo: string): boolean;
}

/**
 * E7 rodada B: o ciclo das seções por ciclo do PDTIC (o `?cicloId=` das rotas de
 * registros e da planilha da seção). `daSecao` devolve null na seção que não é
 * por ciclo (o parâmetro não vai) e quando não há ciclo escolhido.
 */
export interface CiclosDaFonte {
  /** Entra na chave da fonte: trocou o ciclo, os componentes buscam de novo. */
  readonly chave: string;
  daSecao(secao: string): number | null;
}

/** Catálogos que a API responde (os de ligação com catálogo). */
export const CATALOGOS_DISPONIVEIS: ReadonlySet<string> = new Set(['petic_objetivo', 'petic_eixo', 'principio', 'pgia_sistema']);

/** Catálogo que depende do órgão do PDTIC (GET catalogos/pgia_sistema?pdticId=). */
export const CATALOGO_PGIA = 'pgia_sistema';

/**
 * Motor de registros da Governança Estratégica (api/planejamento): registros de
 * uma seção de um dono, catálogos para os campos de ligação, arquivos e
 * planilhas. O token vai pelo interceptor. Ler serve a qualquer papel do módulo
 * (o PDTIC, na E4, só ao próprio órgão e aos papéis globais); gravar, a quem a
 * resposta do GET diz `PodeEditar`. O 403 tira a pessoa do módulo (interceptor).
 */
@Injectable({ providedIn: 'root' })
export class PeRegistrosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento`;

  /**
   * Fonte dos registros de um dono, para os componentes genéricos. `estado` entra
   * na chave (ex.: a situação da versão do PETIC): quando o dono muda de estado,
   * a chave muda e os componentes buscam de novo (e o `PodeEditar` vem atualizado).
   * E7 rodada B: `ciclos` põe o `?cicloId=` nas seções por ciclo do PDTIC (a chave
   * dele também entra na da fonte).
   */
  fonte(dono: PeDono, estado?: string, ciclos?: CiclosDaFonte | null): PeFonteRegistros {
    const caminho = caminhoDono(dono);
    const chave = (estado ? `${caminho}:${estado}` : caminho) + (ciclos ? `|${ciclos.chave}` : '');
    const base = `${this.apiUrl}/${caminho}`;
    const registros = (secao: string) => `${base}/secoes/${encodeURIComponent(secao)}/registros`;
    /** O `?cicloId=` da seção por ciclo (nas demais, nada). */
    const doCiclo = (secao: string, params = new HttpParams()): HttpParams => {
      const cicloId = ciclos?.daSecao(secao) ?? null;
      return cicloId ? params.set('cicloId', cicloId) : params;
    };
    return {
      chave,
      listar: secao => this.http.get<PeRegistrosDaSecao>(registros(secao), { params: doCiclo(secao) }),
      criar: (secao, form) => this.http.post<PeRegistro>(registros(secao), form, { params: doCiclo(secao) }),
      atualizar: (secao, id, form) => this.http.put<PeRegistro>(`${registros(secao)}/${id}`, form, { params: doCiclo(secao) }),
      apagar: (secao, id) => this.http.delete(`${registros(secao)}/${id}`, { params: doCiclo(secao) }),
      ordenar: (secao, ids) => {
        const corpo: PeOrdemForm = { Ids: ids };
        return this.http.put(`${registros(secao)}/ordem`, corpo, { params: doCiclo(secao) });
      },
      planilha: (secao, formato) => this.http.get(`${base}/planilha/${encodeURIComponent(secao)}`, {
        params: doCiclo(secao, new HttpParams().set('formato', formato)),
        responseType: 'blob',
        observe: 'response'
      }),
      catalogo: catalogo => this.catalogo(catalogo, dono.tipo === 'pdtic' ? dono.id : null),
      aceitaCatalogo: catalogo => CATALOGOS_DISPONIVEIS.has(catalogo) && (catalogo !== CATALOGO_PGIA || dono.tipo === 'pdtic')
    };
  }

  /** Planilha completa de um PETIC ou de um PDTIC: um XLSX com uma aba por seção e a aba Leia-me. */
  planilhaCompleta(dono: Exclude<PeDono, { tipo: 'df' }>): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/${caminhoDono(dono)}/planilha`, {
      params: new HttpParams().set('formato', 'xlsx'),
      responseType: 'blob',
      observe: 'response'
    });
  }

  /**
   * Itens de um catálogo (`petic_objetivo` e `petic_eixo` da versão vigente;
   * `principio` do DF; `pgia_sistema`, os sistemas de IA do órgão do PDTIC).
   */
  catalogo(catalogo: string, pdticId: number | null = null): Observable<PeItemCatalogo[]> {
    const params = catalogo === CATALOGO_PGIA && pdticId ? new HttpParams().set('pdticId', pdticId) : undefined;
    return this.http.get<PeItemCatalogo[]>(`${this.apiUrl}/catalogos/${encodeURIComponent(catalogo)}`, { params });
  }

  /**
   * Envia um arquivo (multipart, campo `arquivo`). O `Content-Type` fica com o
   * navegador, que monta o boundary; o token vai pelo interceptor.
   */
  enviarArquivo(arquivo: File): Observable<PeArquivo> {
    const corpo = new FormData();
    corpo.append('arquivo', arquivo, arquivo.name);
    return this.http.post<PeArquivo>(`${this.apiUrl}/arquivos`, corpo);
  }

  /** O arquivo, com a resposta inteira: o nome sai do `Content-Disposition`. */
  baixarArquivo(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/arquivos/${id}`, { responseType: 'blob', observe: 'response' });
  }
}
