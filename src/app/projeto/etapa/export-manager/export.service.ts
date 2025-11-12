import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_BASE_URL = 'http://localhost:5148/api';

export interface Export {
  Id: number;
  Data_criacao: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(private http: HttpClient) { }

  checkReportExists(projectId: number): Observable<any> {
    return this.http.get(`${API_BASE_URL}/reports/${projectId}`);
  }

  listExports(projectId: number): Observable<Export[]> {
    return this.http.get<Export[]>(`${API_BASE_URL}/atividades/export/list/${projectId}`);
  }

  createExport(projectId: number): Observable<any> {
    return this.http.post(`${API_BASE_URL}/atividades/export/create/${projectId}`, {});
  }

  getDownloadUrl(exportId: number): string {
    return `${API_BASE_URL}/atividades/export/${exportId}`;
  }
}
