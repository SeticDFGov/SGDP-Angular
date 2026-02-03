import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Etapa } from './etapa.model';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';

@Injectable({
  providedIn: 'root'
})
export class EtapaService {

  private apiUrl = SERVICE_API_URL;

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getAllEtapas(projetoId: number): Observable<Etapa[]> {
    return this.http.get<Etapa[]>(`${this.apiUrl}/api/etapa/${projetoId}`, { headers: this.getHeaders() });
  }

  getPercent(projetoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/percentual/${projetoId}`, { headers: this.getHeaders() });
  }

  iniciarEtapa(etapaId: number, data: string): Observable<any> {
    const headers = this.getHeaders().set('Content-Type', 'application/json');
    return this.http.put(`${this.apiUrl}/api/etapa/iniciar/${etapaId}`, data, { headers: headers });
  }

  cadastrarEtapa(etapa: any): Observable<Etapa> {
    return this.http.post<Etapa>(`${this.apiUrl}/api/etapa`, etapa, { headers: this.getHeaders() });
  }

  getItemById(etapaId: number): Observable<Etapa> {
    return this.http.get<Etapa>(`${this.apiUrl}/api/etapa/api/byid/${etapaId}`, { headers: this.getHeaders() });
  }

  updateItem(etapaId: number, etapa: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/etapa/${etapaId}`, etapa, { headers: this.getHeaders() });
  }

  updateStatus(etapaId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${etapaId}/status`, { status }, { headers: this.getHeaders() });
  }
}
