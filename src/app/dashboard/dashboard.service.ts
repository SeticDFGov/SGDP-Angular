import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../api/consts';
import { DemandaDetalhada } from '../../api/demanda/interface';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${SERVICE_API_URL}/api/dashboard`;

  getDashboardData(): Observable<DemandaDetalhada[]> {
    return this.http.get<DemandaDetalhada[]>(this.apiUrl);
  }
}
