import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PeDocBloco,
  PeDocBlocoForm,
  PeDocBlocoModeloForm,
  PeDocBlocoModeloNovoForm,
  PeDocCapitulo,
  PeDocCapituloForm,
  PeDocCapituloModeloForm,
  PeDocCapituloModeloNovoForm,
  PeDocModelo,
  PeDocModeloBloco,
  PeDocModeloCapitulo,
  PeDocTextoRico,
  PeDocVersao,
  PeDocumento,
  PeOrdemForm
} from '../../../api/planejamento/interface';

/**
 * Documento do PDTIC (E5): a prévia resolvida de um PDTIC (capítulos, blocos,
 * textos e dados), o texto do órgão em cada bloco, o título e o "esconder" de
 * cada capítulo, o PDF com as versões e, para o administrador do módulo, o
 * modelo do documento (capítulos e blocos).
 *
 * Quem pode: quem lê o PDTIC lê o documento e baixa as versões; a equipe do
 * órgão edita (o `PodeEditar` da resposta diz); o modelo é do administrador do
 * módulo e do admin do SGDP. O 403 tira a pessoa do módulo (interceptor): as
 * telas só chamam o que o papel dela pode.
 */
@Injectable({ providedIn: 'root' })
export class PeDocumentoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento`;

  private base(pdticId: number): string {
    return `${this.apiUrl}/pdtic/${pdticId}/documento`;
  }

  // ── Documento de um PDTIC ─────────────────────────────────────────────────

  documento(pdticId: number): Observable<PeDocumento> {
    return this.http.get<PeDocumento>(this.base(pdticId));
  }

  /** Grava o texto do órgão num bloco (com os marcadores como texto) e devolve o bloco resolvido. */
  salvarBloco(pdticId: number, blocoId: number, texto: PeDocTextoRico): Observable<PeDocBloco> {
    const corpo: PeDocBlocoForm = { Texto: texto };
    return this.http.put<PeDocBloco>(`${this.base(pdticId)}/blocos/${blocoId}`, corpo);
  }

  /** Apaga o texto do órgão: o bloco volta a seguir o texto do modelo. Devolve o bloco resolvido. */
  voltarAoModelo(pdticId: number, blocoId: number): Observable<PeDocBloco> {
    return this.http.delete<PeDocBloco>(`${this.base(pdticId)}/blocos/${blocoId}`);
  }

  /** Esconde ou mostra o capítulo e grava o título próprio (null volta ao do modelo). Travado não se esconde (409). */
  salvarCapitulo(pdticId: number, capituloId: number, form: PeDocCapituloForm): Observable<PeDocCapitulo> {
    return this.http.put<PeDocCapitulo>(`${this.base(pdticId)}/capitulos/${capituloId}`, form);
  }

  /** Gera o PDF e guarda a versão (minuta). Devolve a versão; o arquivo sai de `baixarVersao`. */
  gerarPdf(pdticId: number): Observable<PeDocVersao> {
    return this.http.post<PeDocVersao>(`${this.base(pdticId)}/pdf`, {});
  }

  versoes(pdticId: number): Observable<PeDocVersao[]> {
    return this.http.get<PeDocVersao[]>(`${this.base(pdticId)}/versoes`);
  }

  /** O PDF de uma versão, com a resposta inteira: o nome sai do `Content-Disposition`. */
  baixarVersao(pdticId: number, numero: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base(pdticId)}/versoes/${numero}/arquivo`, { responseType: 'blob', observe: 'response' });
  }

  // ── Modelo do documento (administrador do módulo e admin do SGDP) ────────────

  private get baseModelo(): string {
    return `${this.apiUrl}/modelo/documento`;
  }

  modelo(tipo = 'pdtic'): Observable<PeDocModelo> {
    return this.http.get<PeDocModelo>(this.baseModelo, { params: new HttpParams().set('tipo', tipo) });
  }

  criarCapitulo(form: PeDocCapituloModeloNovoForm): Observable<PeDocModeloCapitulo> {
    return this.http.post<PeDocModeloCapitulo>(`${this.baseModelo}/capitulos`, form);
  }

  atualizarCapitulo(id: number, form: PeDocCapituloModeloForm): Observable<PeDocModeloCapitulo> {
    return this.http.put<PeDocModeloCapitulo>(`${this.baseModelo}/capitulos/${id}`, form);
  }

  /** Capítulo do modelo da SGDI ou travado: 409 com `Message`. */
  apagarCapitulo(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseModelo}/capitulos/${id}`);
  }

  /** Os ids de todos os irmãos (mesmo capítulo de cima), na ordem nova. */
  ordenarCapitulos(ids: number[]): Observable<unknown> {
    const corpo: PeOrdemForm = { Ids: ids };
    return this.http.put(`${this.baseModelo}/capitulos/ordem`, corpo);
  }

  criarBloco(form: PeDocBlocoModeloNovoForm): Observable<PeDocModeloBloco> {
    return this.http.post<PeDocModeloBloco>(`${this.baseModelo}/blocos`, form);
  }

  atualizarBloco(id: number, form: PeDocBlocoModeloForm): Observable<PeDocModeloBloco> {
    return this.http.put<PeDocModeloBloco>(`${this.baseModelo}/blocos/${id}`, form);
  }

  apagarBloco(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseModelo}/blocos/${id}`);
  }

  /** Os ids de todos os blocos do capítulo, na ordem nova. */
  ordenarBlocos(ids: number[]): Observable<unknown> {
    const corpo: PeOrdemForm = { Ids: ids };
    return this.http.put(`${this.baseModelo}/blocos/ordem`, corpo);
  }
}
