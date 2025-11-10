import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Etapa } from './etapa.model';
import { SERVICE_API_URL } from '../../../api/consts';

@Injectable({
  providedIn: 'root'
})
export class EtapaService {

  private apiUrl = SERVICE_API_URL;

  constructor(private http: HttpClient) { }

  getAllEtapas(projetoId: number): Observable<Etapa[]> {
    return this.http.get<Etapa[]>(`${this.apiUrl}/projeto/${projetoId}`);
  }

  getPercent(projetoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/percentual/${projetoId}`);
  }

  iniciarEtapa(etapaId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/iniciar/${etapaId}`, {});
  }

  cadastrarEtapa(etapa: any): Observable<Etapa> {
    return this.http.post<Etapa>(this.apiUrl, etapa);
  }

  getItemById(etapaId: number): Observable<Etapa> {
    return this.http.get<Etapa>(`${this.apiUrl}/${etapaId}`);
  }

  updateItem(etapaId: number, etapa: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${etapaId}`, etapa);
  }

  updateStatus(etapaId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${etapaId}/status`, { status });
  }
}
