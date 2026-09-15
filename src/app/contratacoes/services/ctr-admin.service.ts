import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import { AtribuirPapelContratacoesForm } from '../../../api/contratacoes/interface';

/**
 * Papel do módulo Supervisão Contínua das Contratações (`api/contratacoes/admin`), no mesmo
 * desenho do `PgiaAdminService`. Só o `admin` do SGDP chama estes endpoints; o
 * `Perfil` do usuário nunca é tocado por aqui.
 */
@Injectable({
  providedIn: 'root'
})
export class CtrAdminService {
  private apiUrl = `${SERVICE_API_URL}/api/contratacoes/admin`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getPapeis(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/papeis`, { headers: this.getHeaders() });
  }

  /** `PapelContratacoes` nulo remove o papel. */
  atribuirPapel(form: AtribuirPapelContratacoesForm): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/papel`, form, { headers: this.getHeaders() });
  }
}
