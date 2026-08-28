import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import {
  AtribuirPapelPgiaForm,
  PgiaOrgao,
  PgiaOrgaoCreateForm,
  PgiaOrgaoUpdateForm
} from '../../../api/pgia/interface';

@Injectable({
  providedIn: 'root'
})
export class PgiaAdminService {
  private apiUrl = `${SERVICE_API_URL}/api/pgia/admin`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getPapeis(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/papeis`, { headers: this.getHeaders() });
  }

  atribuirPapel(form: AtribuirPapelPgiaForm): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/papel`, form, { headers: this.getHeaders() });
  }

  listarOrgaos(): Observable<PgiaOrgao[]> {
    return this.http.get<PgiaOrgao[]>(`${this.apiUrl}/orgaos`, { headers: this.getHeaders() });
  }

  criarOrgao(form: PgiaOrgaoCreateForm): Observable<PgiaOrgao> {
    return this.http.post<PgiaOrgao>(`${this.apiUrl}/orgao`, form, { headers: this.getHeaders() });
  }

  editarOrgao(id: number, form: PgiaOrgaoUpdateForm): Observable<PgiaOrgao> {
    return this.http.put<PgiaOrgao>(`${this.apiUrl}/orgao/${id}`, form, { headers: this.getHeaders() });
  }
}
