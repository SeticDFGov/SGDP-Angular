import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Atividade, AtividadeForm } from '../../../api/atividade/interface';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';

@Injectable({
  providedIn: 'root'
})
export class AtividadeService {
  private apiUrl = `${SERVICE_API_URL}/api`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getAtividadesByReportId(reportId: number): Observable<Atividade[]> {
    return this.http.get<Atividade[]>(`${this.apiUrl}/reports/${reportId}/atividades`, { headers: this.getHeaders() });
  }

  createAtividade(atividade: AtividadeForm): Observable<Atividade> {
    return this.http.post<Atividade>(`${this.apiUrl}/reports/${atividade.reportId}/atividades`, atividade, { headers: this.getHeaders() });
  }

  updateAtividade(atividadeId: number, atividade: Atividade): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/atividades/${atividadeId}`, atividade, { headers: this.getHeaders() });
  }

  deleteAtividade(atividadeId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/atividades/${atividadeId}`, { headers: this.getHeaders() });
  }
}
