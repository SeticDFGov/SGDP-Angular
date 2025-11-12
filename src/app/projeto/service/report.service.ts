import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Report, ReportForm } from '../../../api/report/interface';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';

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

  getReportByProjetoId(projetoId: number): Observable<Report | null> {
    return this.http.get<Report>(`${this.apiUrl}/reports/${projetoId}`, { headers: this.getHeaders() }).pipe(
      map(report => report),
      catchError(error => {
        if (error.status === 404) {
          return of(null); // Report not found
        }
        throw error; // Re-throw other errors
      })
    );
  }

  createReport(report: ReportForm): Observable<Report> {
    return this.http.post<Report>(`${this.apiUrl}/reports`, report, { headers: this.getHeaders() });
  }
}
