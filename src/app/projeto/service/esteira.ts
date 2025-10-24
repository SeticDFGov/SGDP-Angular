import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Esteira } from '../../../api/projeto/inteface';
import { HttpClient } from '@angular/common/http';
import { SERVICE_API_URL } from '../../../api/consts';

@Injectable({
  providedIn: 'root'
})
export class EsteiraService {
  constructor(private http:HttpClient){}
  getEsteira(): Observable<Esteira[]> {
    return this.http.get<Esteira[]>(`${SERVICE_API_URL}/api/Esteira`);
  };


}
