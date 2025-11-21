import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../../api/consts';
const API_BASE_URL = SERVICE_API_URL;
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
    return this.http.get(`${API_BASE_URL}/api/reports/${projectId}`);
  }

  listExports(projectId: number): Observable<Export[]> {
    return this.http.get<Export[]>(`${API_BASE_URL}/api/atividades/export/list/${projectId}`);
  }

  createExport(projectId: number): Observable<any> {
    return this.http.post(`${API_BASE_URL}/api/atividades/export/create/${projectId}`, {});
  }

  getDownloadUrl(exportId: number): string {
    return `${API_BASE_URL}/api/atividades/export/${exportId}`;
  }
}
