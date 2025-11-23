import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Report, ReportForm } from '../../../api/report/interface';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import { ReportList } from '../etapa/export-manager/export.service';
@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${SERVICE_API_URL}/api`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
  getReportsByProjetoId(projetoId: number): Observable<ReportList[]> {
    return this.http.get<ReportList[]>(`${this.apiUrl}/reports/${projetoId}`, { headers: this.getHeaders() }).pipe(
      map(report => report),
      catchError(error => {
        if (error.status === 404) {
        }
        throw error; // Re-throw other errors
      })
    );
  }


  //corrt
  createReport(report: ReportForm): Observable<Report> {
    return this.http.post<Report>(`${this.apiUrl}/reports`, report, { headers: this.getHeaders() });
  }
}
