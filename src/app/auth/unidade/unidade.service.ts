import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Unidade } from '../../../api/auth/interface';
import { SERVICE_API_URL } from '../../../api/consts';
@Injectable({
  providedIn: 'root'
})
export class UnidadeService {

  constructor(private http: HttpClient) { }

  getAllUnidades(): Observable<Unidade[]> {
    return this.http.get<Unidade[]>(`${SERVICE_API_URL}/api/auth/unidades`);
  }
}
