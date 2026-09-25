import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams, HttpResponse } from '@angular/common/http';
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
  PeOrdemForm,
  PeTipoDocumento
} from '../../../api/planejamento/interface';
import { AlvoDocumento, caminhoDocumento } from '../shared/pe-documento-rotulos';

/**
 * Documento do PDTIC (E5): a prévia resolvida de um PDTIC (capítulos, blocos,
 * textos e dados), o texto do órgão em cada bloco, o título e o "esconder" de
 * cada capítulo, o PDF com as versões e, para o administrador do módulo, o
 * modelo do documento (capítulos e blocos).
 *
 * E7 rodada B: o mesmo motor monta os relatórios do acompanhamento, com as mesmas
 * sub-rotas e formas: o relatório de acompanhamento de um ciclo (RA, em
 * pdtic/{id}/ciclos/{cicloId}/relatorio) e o de resultados (RR, em
 * pdtic/{id}/relatorio-resultados). Cada chamada recebe o alvo (`AlvoDocumento`);
 * o modelo tem os três tipos (pdtic, ra e rr).
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

  private base(alvo: AlvoDocumento): string {
    return `${this.apiUrl}/${caminhoDocumento(alvo)}`;
  }

  // ── Documento de um PDTIC (ou um relatório do acompanhamento) ─────────────────

  documento(alvo: AlvoDocumento): Observable<PeDocumento> {
    return this.http.get<PeDocumento>(this.base(alvo));
  }

  /**
   * Grava o texto do órgão num bloco (com os marcadores como texto) e devolve o bloco
   * resolvido. `contexto`: o salvamento do texto na prévia vai em segundo plano (sem o
   * indicador de carregamento).
   */
  salvarBloco(alvo: AlvoDocumento, blocoId: number, texto: PeDocTextoRico, contexto?: HttpContext): Observable<PeDocBloco> {
    const corpo: PeDocBlocoForm = { Texto: texto };
    return this.http.put<PeDocBloco>(`${this.base(alvo)}/blocos/${blocoId}`, corpo, { context: contexto });
  }

  /** Apaga o texto do órgão: o bloco volta a seguir o texto do modelo. Devolve o bloco resolvido. */
  voltarAoModelo(alvo: AlvoDocumento, blocoId: number): Observable<PeDocBloco> {
    return this.http.delete<PeDocBloco>(`${this.base(alvo)}/blocos/${blocoId}`);
  }

  /** Esconde ou mostra o capítulo e grava o título próprio (null volta ao do modelo). Travado não se esconde (409). */
  salvarCapitulo(alvo: AlvoDocumento, capituloId: number, form: PeDocCapituloForm): Observable<PeDocCapitulo> {
    return this.http.put<PeDocCapitulo>(`${this.base(alvo)}/capitulos/${capituloId}`, form);
  }

  /** Gera o PDF e guarda a versão (minuta). Devolve a versão; o arquivo sai de `baixarVersao`. */
  gerarPdf(alvo: AlvoDocumento): Observable<PeDocVersao> {
    return this.http.post<PeDocVersao>(`${this.base(alvo)}/pdf`, {});
  }

  versoes(alvo: AlvoDocumento): Observable<PeDocVersao[]> {
    return this.http.get<PeDocVersao[]>(`${this.base(alvo)}/versoes`);
  }

  /** O PDF de uma versão, com a resposta inteira: o nome sai do `Content-Disposition`. */
  baixarVersao(alvo: AlvoDocumento, numero: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base(alvo)}/versoes/${numero}/arquivo`, { responseType: 'blob', observe: 'response' });
  }

  // ── Modelo do documento (administrador do módulo e admin do SGDP) ────────────

  private get baseModelo(): string {
    return `${this.apiUrl}/modelo/documento`;
  }

  /**
   * O modelo de um dos três documentos (pdtic, ra ou rr), com os marcadores que os
   * textos dele podem usar. `contexto`: a prévia pede os marcadores em segundo plano
   * (sem o indicador de carregamento).
   */
  modelo(tipo: PeTipoDocumento = 'pdtic', contexto?: HttpContext): Observable<PeDocModelo> {
    return this.http.get<PeDocModelo>(this.baseModelo, { params: new HttpParams().set('tipo', tipo), context: contexto });
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
