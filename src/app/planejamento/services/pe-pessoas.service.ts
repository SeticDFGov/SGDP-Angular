import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PaginaPePessoas,
  PeCandidata,
  PeMeuPapel,
  PePapelForm,
  PePessoa,
  PePessoasConsulta
} from '../../../api/planejamento/interface';

/**
 * Papéis e pessoas da Governança Estratégica (api/planejamento). O token vai pelo
 * interceptor. `meuPapel` serve a qualquer pessoa com o módulo; as demais só ao
 * administrador do módulo e ao admin do SGDP. Os outros recebem 403, e o
 * interceptor manda todo 403 para /inicio: só chame as demais depois de o
 * `meuPapel` mostrar `pe_admin` ou `EhAdminGeral` (`PeTrilhaEstadoService.podeGerirPessoas`).
 */
@Injectable({ providedIn: 'root' })
export class PePessoasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento`;

  /** Papel e órgão de quem está logado. Só para quem tem o módulo. */
  meuPapel(): Observable<PeMeuPapel> {
    return this.http.get<PeMeuPapel>(`${this.apiUrl}/meu-papel`);
  }

  listarPessoas(consulta: PePessoasConsulta): Observable<PaginaPePessoas> {
    let params = new HttpParams()
      .set('Page', consulta.Page)
      .set('PageSize', consulta.PageSize);
    if (consulta.Filtro?.trim()) params = params.set('Filtro', consulta.Filtro.trim());
    if (consulta.Papel) params = params.set('Papel', consulta.Papel);
    return this.http.get<PaginaPePessoas>(`${this.apiUrl}/pessoas`, { params });
  }

  /** Até 20 usuários sem papel no módulo; menos de 3 letras volta lista vazia. */
  candidatas(filtro: string): Observable<PeCandidata[]> {
    const params = new HttpParams().set('Filtro', filtro.trim());
    return this.http.get<PeCandidata[]>(`${this.apiUrl}/pessoas/candidatas`, { params });
  }

  /**
   * Dá ou troca o papel (e o acesso ao módulo); `null` tira os dois. Responde
   * sempre 200 com a pessoa completa (sem papel, ao tirar).
   */
  definirPapel(userId: string, papel: string | null): Observable<PePessoa> {
    const corpo: PePapelForm = { Papel: papel };
    return this.http.put<PePessoa>(`${this.apiUrl}/pessoas/${userId}/papel`, corpo);
  }
}
