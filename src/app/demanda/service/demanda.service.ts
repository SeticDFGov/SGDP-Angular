import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { DemandaDetalhada, DemandaForm, PagedResponse } from '../../../api/demanda/interface';

@Injectable({
  providedIn: 'root'
})
export class DemandaService {
  private http = inject(HttpClient);
  private apiUrl = `${SERVICE_API_URL}/api/demanda`;

  getDemandas(page: number = 1, pageSize: number = 20): Observable<PagedResponse<DemandaDetalhada>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PagedResponse<DemandaDetalhada>>(this.apiUrl, { params });
  }

  getDemandaById(id: number): Observable<DemandaDetalhada> {
    return this.http.get<DemandaDetalhada>(`${this.apiUrl}/${id}`);
  }

  createDemanda(demanda: DemandaForm): Observable<any> {
    return this.http.post(this.apiUrl, demanda);
  }
}
