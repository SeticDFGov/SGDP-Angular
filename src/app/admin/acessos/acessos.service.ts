import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import {
  AcessosConsulta,
  AcessoUsuarioForm,
  PaginaUsuariosAcesso,
  UsuarioAcesso
} from '../../../api/acessos/interface';

/** Gestão de acessos por módulo (api/acessos, só admin). */
@Injectable({
  providedIn: 'root'
})
export class AcessosService {
  private apiUrl = `${SERVICE_API_URL}/api/acessos`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  listarUsuarios(consulta: AcessosConsulta): Observable<PaginaUsuariosAcesso> {
    let params = new HttpParams()
      .set('Page', consulta.Page)
      .set('PageSize', consulta.PageSize);
    if (consulta.Filtro?.trim()) params = params.set('Filtro', consulta.Filtro.trim());
    if (consulta.Modulo) params = params.set('Modulo', consulta.Modulo);

    return this.http.get<PaginaUsuariosAcesso>(`${this.apiUrl}/usuarios`, { headers: this.getHeaders(), params });
  }

  definirAcessos(userId: string, form: AcessoUsuarioForm): Observable<UsuarioAcesso> {
    return this.http.put<UsuarioAcesso>(`${this.apiUrl}/usuario/${userId}`, form, { headers: this.getHeaders() });
  }

  /** Troca a unidade de um usuário (endpoint de admin já existente). */
  alterarUnidade(email: string, unidadeId: string): Observable<unknown> {
    return this.http.put(`${SERVICE_API_URL}/api/auth/modificar-unidade`, { email, unidadeId },
      { headers: this.getHeaders(), responseType: 'text' });
  }
}
