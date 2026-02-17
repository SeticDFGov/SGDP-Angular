import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PagedResponse,
  ProjetoResponseDTO,
  ProjetoDetalhado,
  ProjetoInterfaceForm
} from '../../../api/projeto/inteface';

@Injectable({
  providedIn: 'root'
})
export class ProjetoService {
  private http = inject(HttpClient);
  private apiUrl = `${SERVICE_API_URL}/api/projeto`;

  /**
   * Obtém projetos paginados (novo endpoint)
   */
  getProjetosPaged(
    unidade: string,
    page: number = 1,
    pageSize: number = 20,
    orderBy: string = 'NM_PROJETO',
    orderDirection: string = 'asc'
  ): Observable<PagedResponse<ProjetoResponseDTO>> {
    const params = new HttpParams()
      .set('unidade', unidade)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('orderBy', orderBy)
      .set('orderDirection', orderDirection);

    return this.http.get<PagedResponse<ProjetoResponseDTO>>(
      `${this.apiUrl}/paged`,
      { params }
    );
  }

  /**
   * Obtém todos os projetos (endpoint antigo - sem paginação)
   * Mantido para compatibilidade reversa
   */
  getProjetos(unidade: string): Observable<ProjetoDetalhado[]> {
    const params = new HttpParams().set('unidade', unidade);
    return this.http.get<ProjetoDetalhado[]>(this.apiUrl, { params });
  }

  /**
   * Obtém um projeto por ID
   */
  getProjetoById(id: number): Observable<ProjetoDetalhado> {
    return this.http.get<ProjetoDetalhado>(`${this.apiUrl}/${id}`);
  }

  /**
   * Cria um novo projeto
   */
  createProjeto(projeto: ProjetoInterfaceForm): Observable<any> {
    return this.http.post(this.apiUrl, projeto);
  }

  /**
   * Mapeia ProjetoResponseDTO para ProjetoDetalhado (para compatibilidade)
   * Útil para manter componentes existentes funcionando
   */
  mapToProjetoDetalhado(dto: any): ProjetoDetalhado {
    // O backend retorna 'projetoId' (minúsculo) mas o DTO espera 'ProjetoId' (maiúsculo)
    // Aceita ambos os formatos para compatibilidade
    return {
      projetoId: dto.ProjetoId || dto.projetoId,
      NM_PROJETO: dto.NM_PROJETO,
      GERENTE_PROJETO: dto.GERENTE_PROJETO,
      SITUACAO: dto.SITUACAO,
      NR_PROCESSO_SEI: dto.NR_PROCESSO_SEI,
      ANO: dto.ANO,
      TEMPLATE: dto.TEMPLATE,
      PROFISCOII: dto.PROFISCOII,
      PDTIC2427: dto.PDTIC2427,
      PTD2427: dto.PTD2427,
      valorEstimado: dto.ValorEstimado || dto.valorEstimado,
      AREA_DEMANDANTE: {
        AreaDemandanteID: dto.AreaDemandanteId || dto.AREA_DEMANDANTE?.AreaDemandanteID || 0,
        NM_DEMANDANTE: dto.AreaDemandanteNome || dto.AREA_DEMANDANTE?.NM_DEMANDANTE || '',
        NM_SIGLA: dto.AreaDemandanteSigla || dto.AREA_DEMANDANTE?.NM_SIGLA || ''
      },
      Unidade: {
        id: dto.UnidadeId || dto.Unidade?.id || '',
        Nome: dto.UnidadeNome || dto.Unidade?.Nome || ''
      },
      Esteira: {
        EsteiraId: dto.EsteiraId || dto.Esteira?.EsteiraId || '',
        Nome: dto.EsteiraNome || dto.Esteira?.Nome || ''
      }
    };
  }

  /**
   * Obtém projetos paginados e mapeia para formato antigo
   * Facilita migração gradual dos componentes
   */
  getProjetosPagedCompat(
    unidade: string,
    page: number = 1,
    pageSize: number = 20
  ): Observable<{ projetos: ProjetoDetalhado[], pagination: PagedResponse<ProjetoResponseDTO> }> {
    return this.getProjetosPaged(unidade, page, pageSize).pipe(
      map(pagedResponse => ({
        projetos: pagedResponse.Items.map(dto => this.mapToProjetoDetalhado(dto)),
        pagination: pagedResponse
      }))
    );
  }
}
