import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { Unidade } from '../../../api/projeto/inteface';

@Injectable({
  providedIn: 'root'
})
export class UnidadeService {
  constructor(private http:HttpClient){}

  getUnidades(): Observable<Unidade[]> {
    return this.http.get<Unidade[]>(`${SERVICE_API_URL}/api/auth/unidades`);
  };


}
