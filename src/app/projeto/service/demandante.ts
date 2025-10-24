import { Injectable } from '@angular/core';
import { AuthService } from '../../auth/services/auth';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AreaDemandante } from '../../../api/projeto/inteface';

@Injectable({
  providedIn: 'root'
})
export class DemandanteService {

  constructor(private authService:AuthService, private http:HttpClient){}

  getDemandantes(): Observable<AreaDemandante[]> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`)
    return this.http.get<AreaDemandante[]>(`${SERVICE_API_URL}/api/Demandante`, { headers:headers});
  };


}
