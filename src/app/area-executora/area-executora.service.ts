import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../api/consts';
import { AreaExecutora } from '../../api/area-executora/interface';

@Injectable({
  providedIn: 'root'
})
export class AreaExecutoraService {
  private http = inject(HttpClient);
  private apiUrl = `${SERVICE_API_URL}/api/area-executora`;

  getAll(): Observable<AreaExecutora[]> {
    return this.http.get<AreaExecutora[]>(this.apiUrl);
  }

  getById(id: number): Observable<AreaExecutora> {
    return this.http.get<AreaExecutora>(`${this.apiUrl}/${id}`);
  }

  create(nome: string): Observable<AreaExecutora> {
    return this.http.post<AreaExecutora>(this.apiUrl, { Nome: nome });
  }

  update(id: number, nome: string): Observable<AreaExecutora> {
    return this.http.put<AreaExecutora>(`${this.apiUrl}/${id}`, { Nome: nome });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
