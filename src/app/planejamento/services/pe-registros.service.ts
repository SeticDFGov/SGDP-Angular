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
}

/** Catálogos que a API da E3 responde (os de ligação com catálogo; `pgia_sistema` chega na E4). */
export const CATALOGOS_DISPONIVEIS: ReadonlySet<string> = new Set(['petic_objetivo', 'petic_eixo', 'principio']);

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
   */
  fonte(dono: PeDono, estado?: string): PeFonteRegistros {
    const caminho = caminhoDono(dono);
    const chave = estado ? `${caminho}:${estado}` : caminho;
    const base = `${this.apiUrl}/${caminho}`;
    const registros = (secao: string) => `${base}/secoes/${encodeURIComponent(secao)}/registros`;
    return {
      chave,
      listar: secao => this.http.get<PeRegistrosDaSecao>(registros(secao)),
      criar: (secao, form) => this.http.post<PeRegistro>(registros(secao), form),
      atualizar: (secao, id, form) => this.http.put<PeRegistro>(`${registros(secao)}/${id}`, form),
      apagar: (secao, id) => this.http.delete(`${registros(secao)}/${id}`),
      ordenar: (secao, ids) => {
        const corpo: PeOrdemForm = { Ids: ids };
        return this.http.put(`${registros(secao)}/ordem`, corpo);
      },
      planilha: (secao, formato) => this.http.get(`${base}/planilha/${encodeURIComponent(secao)}`, {
        params: new HttpParams().set('formato', formato),
        responseType: 'blob',
        observe: 'response'
      })
    };
  }

  /** Planilha completa de um PETIC (e, na E4, de um PDTIC): um XLSX com uma aba por seção e a aba Leia-me. */
  planilhaCompleta(dono: Exclude<PeDono, { tipo: 'df' }>): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/${caminhoDono(dono)}/planilha`, {
      params: new HttpParams().set('formato', 'xlsx'),
      responseType: 'blob',
      observe: 'response'
    });
  }

  /** Itens de um catálogo (`petic_objetivo` e `petic_eixo` da versão vigente; `principio` do DF). */
  catalogo(catalogo: string): Observable<PeItemCatalogo[]> {
    return this.http.get<PeItemCatalogo[]>(`${this.apiUrl}/catalogos/${encodeURIComponent(catalogo)}`);
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
