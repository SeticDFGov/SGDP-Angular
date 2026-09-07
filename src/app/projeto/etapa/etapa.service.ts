import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import { Entregavel, EntregavelCreateForm, EntregavelUpdatePercentForm, EntregavelUpdateBasicoForm } from '../../../api/demanda/interface';

@Injectable({
  providedIn: 'root'
})
export class EtapaService {
  private apiUrl = `${SERVICE_API_URL}/api/entregavel`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getAllEtapas(demandaId: number): Observable<Entregavel[]> {
    return this.http.get<Entregavel[]>(`${this.apiUrl}/${demandaId}`, { headers: this.getHeaders() });
  }

  getItemById(id: number): Observable<Entregavel> {
    return this.http.get<Entregavel>(`${this.apiUrl}/byid/${id}`, { headers: this.getHeaders() });
  }

  cadastrarEtapa(entregavel: EntregavelCreateForm): Observable<any> {
    return this.http.post(this.apiUrl, entregavel, { headers: this.getHeaders() });
  }

  updateItem(id: number, entregavel: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, entregavel, { headers: this.getHeaders() });
  }

  updateEntregavelBasico(id: number, data: EntregavelUpdateBasicoForm): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/basico`, data, { headers: this.getHeaders() });
  }

  updatePercentual(id: number, data: EntregavelUpdatePercentForm): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/percentual`, data, { headers: this.getHeaders() });
  }

  deleteEntregavel(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
