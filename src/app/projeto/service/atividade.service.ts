import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Atividade,
  AtividadeForm,
  AtividadeCreateDTO,
  AtividadeUpdateDTO,
  AtividadeResponseDTO
} from '../../../api/atividade/interface';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';

@Injectable({
  providedIn: 'root'
})
export class AtividadeService {
  private apiUrl = `${SERVICE_API_URL}/api`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // ============================================================================
  // MÉTODOS LEGADOS (compatibilidade com Reports antigos)
  // ============================================================================

  getAtividadesByReportId(reportId: number): Observable<Atividade[]> {
    return this.http.get<Atividade[]>(`${this.apiUrl}/reports/${reportId}/atividades`, { headers: this.getHeaders() });
  }

  createAtividade(atividade: AtividadeForm, reportId: number): Observable<Atividade> {
    return this.http.post<Atividade>(`${this.apiUrl}/reports/${reportId}/atividades`, atividade, { headers: this.getHeaders() });
  }

  updateAtividade(atividadeId: number, atividade: AtividadeForm): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/atividades/${atividadeId}`, atividade, { headers: this.getHeaders() });
  }

  deleteAtividade(atividadeId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/atividades/${atividadeId}`, { headers: this.getHeaders() });
  }

  // ============================================================================
  // NOVOS MÉTODOS (após refatoração - vinculado a Etapas)
  // ============================================================================

  /**
   * Cria uma nova atividade vinculada a uma etapa
   */
  criar(dto: AtividadeCreateDTO): Observable<AtividadeResponseDTO> {
    return this.http.post<AtividadeResponseDTO>(`${this.apiUrl}/atividade`, dto, { headers: this.getHeaders() });
  }

  /**
   * Atualiza uma atividade existente (apenas campos editáveis)
   */
  atualizar(id: number, dto: AtividadeUpdateDTO): Observable<AtividadeResponseDTO> {
    return this.http.put<AtividadeResponseDTO>(`${this.apiUrl}/atividade/${id}`, dto, { headers: this.getHeaders() });
  }

  /**
   * Busca uma atividade por ID
   */
  buscarPorId(id: number): Observable<AtividadeResponseDTO> {
    return this.http.get<AtividadeResponseDTO>(`${this.apiUrl}/atividade/${id}`, { headers: this.getHeaders() });
  }

  /**
   * Lista todas as atividades de uma etapa
   */
  listarPorEtapa(etapaId: number): Observable<AtividadeResponseDTO[]> {
    return this.http.get<AtividadeResponseDTO[]>(`${this.apiUrl}/atividade/etapa/${etapaId}`, { headers: this.getHeaders() });
  }

  /**
   * Lista todas as atividades de um projeto (através das etapas)
   */
  listarPorProjeto(projetoId: number): Observable<AtividadeResponseDTO[]> {
    return this.http.get<AtividadeResponseDTO[]>(`${this.apiUrl}/atividade/projeto/${projetoId}`, { headers: this.getHeaders() });
  }

  /**
   * Deleta uma atividade
   */
  deletar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/atividade/${id}`, { headers: this.getHeaders() });
  }

  /**
   * Inicia uma atividade (seta DT_INICIO_REAL)
   */
  iniciar(id: number, dataInicio?: Date): Observable<AtividadeResponseDTO> {
    const body = dataInicio ? { DataInicio: dataInicio.toISOString() } : {};
    return this.http.put<AtividadeResponseDTO>(
      `${this.apiUrl}/atividade/${id}/iniciar`,
      body,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Conclui uma atividade (seta DT_TERMINO_REAL)
   */
  concluir(id: number, dataConclusao?: Date): Observable<AtividadeResponseDTO> {
    const body = dataConclusao ? { DataConclusao: dataConclusao.toISOString() } : {};
    return this.http.put<AtividadeResponseDTO>(
      `${this.apiUrl}/atividade/${id}/concluir`,
      body,
      { headers: this.getHeaders() }
    );
  }
}
