import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PgiaPagedResponse,
  PgiaRegistroPublicoItem,
  PgiaSolicitacaoForm,
  PgiaSolicitacaoPublica
} from '../../../api/pgia/interface';

/**
 * Transparência pública (arts. 23 e 24). Diferente dos demais serviços do PGIA,
 * este NÃO injeta o AuthService nem envia o header Authorization: o visitante é
 * anônimo. Se houver sessão aberta, o authInterceptor acrescenta o token por
 * conta própria, e o backend ignora.
 */
@Injectable({
  providedIn: 'root'
})
export class PgiaPublicoService {
  private apiUrl = `${SERVICE_API_URL}/api/pgia/publico`;

  constructor(private http: HttpClient) {}

  listarRegistroPublico(page: number = 1, pageSize: number = 20): Observable<PgiaPagedResponse<PgiaRegistroPublicoItem>> {
    return this.http.get<PgiaPagedResponse<PgiaRegistroPublicoItem>>(
      `${this.apiUrl}/registro?Page=${page}&PageSize=${pageSize}`);
  }

  enviarSolicitacao(form: PgiaSolicitacaoForm): Observable<{ Protocolo: string }> {
    return this.http.post<{ Protocolo: string }>(`${this.apiUrl}/solicitacao`, form);
  }

  consultarProtocolo(protocolo: string): Observable<PgiaSolicitacaoPublica> {
    return this.http.get<PgiaSolicitacaoPublica>(`${this.apiUrl}/solicitacao/${encodeURIComponent(protocolo)}`);
  }
}
