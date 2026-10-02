import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { CtrPainelPublico } from '../../../api/contratacoes/interface';

/**
 * Painel público da Supervisão Contínua das Contratações. Como o da transparência da IA,
 * NÃO envia o header Authorization: o visitante é anônimo. Se houver sessão aberta, o
 * authInterceptor acrescenta o token por conta própria, e o backend ignora.
 */
@Injectable({
  providedIn: 'root'
})
export class CtrPublicoService {
  private apiUrl = `${SERVICE_API_URL}/api/contratacoes/publico`;

  constructor(private http: HttpClient) {}

  painel(): Observable<CtrPainelPublico> {
    return this.http.get<CtrPainelPublico>(`${this.apiUrl}/painel`);
  }
}
