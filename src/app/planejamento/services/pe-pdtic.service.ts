import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SERVICE_API_URL } from '../../../api/consts';
import { semCarregamento } from '../../core/carregamento/sem-carregamento';
import {
  PaginaPePdtics,
  PeAndamentoPdtic,
  PeComentario,
  PeComentarioForm,
  PeEncerrarForm,
  PeFormatoPlanilha,
  PeNaoSeAplicaForm,
  PePassoSituacao,
  PePdtic,
  PePdticNovoForm,
  PePdticsConsulta,
  PePreviaEnvio,
  PeRegistroExternoForm,
  PeRevisaoForm,
  PeSistemaIaPgia,
  PeTemasDoPdtic
} from '../../../api/planejamento/interface';

/**
 * PDTIC de cada órgão (api/planejamento/pdtic): o PDTIC atual, a abertura, a
 * situação dos passos, o "não se aplica", os temas das ações, os sistemas de IA
 * do PGIA, os comentários e as planilhas consolidadas. Os registros de cada
 * seção vão pelo `PeRegistrosService` (dono `pdtic`).
 *
 * E7 (caminho da aprovação): as versões do órgão, a prévia do envio, o envio ao
 * CGTIC, a publicação, o encerramento, a revisão e o PDTIC aprovado fora do
 * sistema. Todas devolvem o PDTIC como ficou (a revisão, o PDTIC novo).
 *
 * Quem pode: o papel de órgão lê o PDTIC do próprio órgão (a equipe edita, envia,
 * publica, encerra e abre a revisão); os papéis globais e o admin do SGDP leem o
 * de qualquer órgão (e só eles listam os PDTICs e baixam o consolidado); o
 * administrador do módulo e o admin do SGDP encerram quando a vigência terminou;
 * o admin do SGDP registra o PDTIC externo de qualquer órgão. O 403 tira a pessoa
 * do módulo (interceptor): as telas só chamam o que o papel dela pode.
 */
@Injectable({ providedIn: 'root' })
export class PePdticService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento`;

  /** O PDTIC atual do órgão (sem `orgaoId`, o do próprio órgão de quem chama), ou null (204: ainda não foi aberto). */
  atual(orgaoId?: number | null): Observable<PePdtic | null> {
    const params = orgaoId ? new HttpParams().set('orgaoId', orgaoId) : undefined;
    return this.http.get<PePdtic | null>(`${this.apiUrl}/pdtic/atual`, { params }).pipe(map(p => p ?? null));
  }

  /** Abre o PDTIC do órgão (versão 1.0, em elaboração). 409 se já há um atual. */
  abrir(orgaoId: number | null = null): Observable<PePdtic> {
    const corpo: PePdticNovoForm = { OrgaoId: orgaoId };
    return this.http.post<PePdtic>(`${this.apiUrl}/pdtic`, corpo);
  }

  obter(id: number): Observable<PePdtic> {
    return this.http.get<PePdtic>(`${this.apiUrl}/pdtic/${id}`);
  }

  /** Os PDTICs atuais de todos os órgãos (papéis globais e admin do SGDP). */
  listar(consulta: PePdticsConsulta): Observable<PaginaPePdtics> {
    let params = new HttpParams().set('Page', consulta.Page).set('PageSize', consulta.PageSize);
    if (consulta.Situacao) params = params.set('Situacao', consulta.Situacao);
    const filtro = consulta.Filtro?.trim();
    if (filtro) params = params.set('Filtro', filtro);
    return this.http.get<PaginaPePdtics>(`${this.apiUrl}/pdtic`, { params });
  }

  /**
   * Situação de cada passo, os avisos do guia e o próximo passo recomendado. Só a
   * trilha consulta, em segundo plano (a bolinha dos passos é o sinal): sem o
   * indicador de carregamento.
   */
  situacao(id: number): Observable<PeAndamentoPdtic> {
    return this.http.get<PeAndamentoPdtic>(`${this.apiUrl}/pdtic/${id}/situacao`, { context: semCarregamento() });
  }

  // ── E7 · Caminho da aprovação ─────────────────────────────────────────────

  /** As versões do PDTIC do órgão (sem `orgaoId`, o de quem chama), da mais nova para a mais antiga. */
  versoes(orgaoId?: number | null): Observable<PePdtic[]> {
    const params = orgaoId ? new HttpParams().set('orgaoId', orgaoId) : undefined;
    return this.http.get<PePdtic[] | null>(`${this.apiUrl}/pdtic/versoes`, { params }).pipe(map(lista => lista ?? []));
  }

  /** O que ainda falta para enviar ao CGTIC (a equipe do órgão chama, com o PDTIC em elaboração ou devolvido). */
  previaEnvio(id: number): Observable<PePreviaEnvio> {
    return this.http.get<PePreviaEnvio>(`${this.apiUrl}/pdtic/${id}/envio`);
  }

  /**
   * Envia ao CGTIC: gera o PDF, guarda a versão enviada e cria a deliberação; o
   * PDTIC fica em aprovação. Faltando algo, 400 com `Pendencias`.
   */
  enviar(id: number): Observable<PePdtic> {
    return this.http.post<PePdtic>(`${this.apiUrl}/pdtic/${id}/enviar`, {});
  }

  /** Registra a publicação (PDTIC aprovado; a seção da publicação com a data e o endereço, senão 400 com `Campos`). */
  publicar(id: number): Observable<PePdtic> {
    return this.http.post<PePdtic>(`${this.apiUrl}/pdtic/${id}/publicar`, {});
  }

  /** Encerra o PDTIC: a equipe pelo passo 7.4 (sem motivo); o administrador, com a vigência terminada, com o motivo. */
  encerrar(id: number, motivo: string | null): Observable<PePdtic> {
    const corpo: PeEncerrarForm = { Motivo: motivo };
    return this.http.post<PePdtic>(`${this.apiUrl}/pdtic/${id}/encerrar`, corpo);
  }

  /** Abre a revisão: devolve o PDTIC novo (versão seguinte, em elaboração). 409 se já há uma versão em elaboração. */
  abrirRevisao(id: number, justificativa: string | null): Observable<PePdtic> {
    const corpo: PeRevisaoForm = { Justificativa: justificativa };
    return this.http.post<PePdtic>(`${this.apiUrl}/pdtic/${id}/revisao`, corpo);
  }

  /** Registra o PDTIC já aprovado e publicado fora do sistema (o órgão sem PDTIC atual). */
  registrarExterno(form: PeRegistroExternoForm): Observable<PePdtic> {
    return this.http.post<PePdtic>(`${this.apiUrl}/pdtic/registrar-externo`, form);
  }

  /**
   * O PDF de uma versão do documento (o enviado ao CGTIC, o aprovado, o publicado),
   * com a resposta inteira (o nome sai do `Content-Disposition`). A mesma rota do
   * `PeDocumentoService.baixarVersao`, repetida aqui para a visão geral e a fila do
   * CGTIC não levarem o serviço do documento para o pacote delas.
   */
  pdfDoDocumento(pdticId: number, numero: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/pdtic/${pdticId}/documento/versoes/${numero}/arquivo`, { responseType: 'blob', observe: 'response' });
  }

  /** Marca "não se aplica" (só passo opcional no nível do órgão que aceita; travado nunca: 409). */
  marcarNaoSeAplica(id: number, passoId: number, justificativa: string): Observable<unknown> {
    const corpo: PeNaoSeAplicaForm = { Justificativa: justificativa };
    return this.http.put(`${this.apiUrl}/pdtic/${id}/passos/${passoId}/nao-se-aplica`, corpo);
  }

  desfazerNaoSeAplica(id: number, passoId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/pdtic/${id}/passos/${passoId}/nao-se-aplica`);
  }

  /**
   * F3 (B): marca o passo como validado pela equipe (a equipe do PDTIC e o admin do
   * SGDP, com o passo feito e editável; de novo, regrava quem e quando). Devolve a
   * situação do passo. 409 (1145) quando o passo não aceita ou não está feito.
   */
  validarPasso(id: number, passoId: number): Observable<PePassoSituacao> {
    return this.http.put<PePassoSituacao>(`${this.apiUrl}/pdtic/${id}/passos/${passoId}/validacao`, {});
  }

  /** F3 (B): desfaz a validação da equipe. Devolve a situação do passo. */
  desfazerValidacao(id: number, passoId: number): Observable<PePassoSituacao> {
    return this.http.delete<PePassoSituacao>(`${this.apiUrl}/pdtic/${id}/passos/${passoId}/validacao`);
  }

  /** As ações de cada tema do decreto (V, VI e IX) e a justificativa de quem ficou sem ação. */
  temas(id: number): Observable<PeTemasDoPdtic> {
    return this.http.get<PeTemasDoPdtic>(`${this.apiUrl}/pdtic/${id}/temas`);
  }

  /** O inventário de sistemas de IA do órgão no PGIA (só leitura). */
  sistemasIaPgia(id: number): Observable<PeSistemaIaPgia[]> {
    return this.http.get<PeSistemaIaPgia[]>(`${this.apiUrl}/pdtic/${id}/ia/pgia`);
  }

  /** Comentários de um passo (os de primeiro nível, cada um com as respostas). */
  comentarios(id: number, passoId: number): Observable<PeComentario[]> {
    const params = new HttpParams().set('passoId', passoId);
    return this.http.get<PeComentario[]>(`${this.apiUrl}/pdtic/${id}/comentarios`, { params });
  }

  comentar(id: number, form: PeComentarioForm): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/pdtic/${id}/comentarios`, form);
  }

  resolverComentario(comentarioId: number): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/comentarios/${comentarioId}/resolver`, {});
  }

  /**
   * E8: os dados de um passo num arquivo só (quem lê o PDTIC baixa): o XLSX com uma
   * aba por seção visível do passo e a aba Leia-me; o CSV simples quando o passo tem
   * uma seção, e um .zip com um CSV por seção quando tem mais. `cicloId` é
   * obrigatório no passo com seção por ciclo. O nome vem no `Content-Disposition`;
   * 404 quando o passo não tem seção visível.
   */
  planilhaDoPasso(id: number, passoChave: string, formato: PeFormatoPlanilha, cicloId: number | null = null): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('formato', formato);
    if (cicloId) params = params.set('cicloId', cicloId);
    return this.http.get(`${this.apiUrl}/pdtic/${id}/planilha/passo/${encodeURIComponent(passoChave)}`, {
      params,
      responseType: 'blob',
      observe: 'response'
    });
  }

  /** Uma seção com os registros de todos os PDTICs atuais (papéis globais e admin do SGDP). */
  consolidado(secaoChave: string, formato: PeFormatoPlanilha): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/consolidado/${encodeURIComponent(secaoChave)}`, {
      params: new HttpParams().set('formato', formato),
      responseType: 'blob',
      observe: 'response'
    });
  }

  /** Todas as seções num XLSX (uma aba por seção e a aba Leia-me). */
  consolidadoCompleto(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/consolidado`, {
      params: new HttpParams().set('formato', 'xlsx'),
      responseType: 'blob',
      observe: 'response'
    });
  }
}
