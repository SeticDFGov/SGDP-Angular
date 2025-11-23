import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../../api/consts';
import { Projeto } from '../../projeto';
const API_BASE_URL = SERVICE_API_URL;
export interface ReportList {
  ReportId: number;
  NM_PROJETO: null;
  descricao: string;
  fase: string;
  Atividades: null;
  Data_criacao: string;
  Data_fim: string
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(private http: HttpClient) { }

  checkReportExists(projectId: number): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/reports/${projectId}`);
  }

  getDownloadUrl(exportId: number): string {
    return `${API_BASE_URL}/api/atividades/export/${exportId}`;
  }
}
