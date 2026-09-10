import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import { CtrImportacaoPrevia, CtrImportacaoRelatorio } from '../../../api/contratacoes/interface';

/** Extensão aceita pelo endpoint de importação. */
export const EXTENSAO_PLANILHA = '.csv';
/** Limite do `[RequestSizeLimit]` do controller. */
export const TAMANHO_MAXIMO_PLANILHA = 5 * 1024 * 1024;

/**
 * Importação da planilha legada (`api/contratacoes/importacao`, multipart com o
 * campo `arquivo`).
 *
 * O header leva **só** o Authorization: definir Content-Type à mão impede o
 * navegador de montar o boundary do multipart (mesma armadilha do anexo do PGIA).
 */
@Injectable({
  providedIn: 'root'
})
export class CtrImportacaoService {
  private apiUrl = `${SERVICE_API_URL}/api/contratacoes/importacao`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private corpo(arquivo: File): FormData {
    const corpo = new FormData();
    corpo.append('arquivo', arquivo, arquivo.name);
    return corpo;
  }

  /** Interpreta o arquivo e devolve o que faria, sem gravar nada. */
  previa(arquivo: File): Observable<CtrImportacaoPrevia> {
    return this.http.post<CtrImportacaoPrevia>(`${this.apiUrl}/previa`, this.corpo(arquivo),
      { headers: this.getHeaders() });
  }

  /** Grava as linhas válidas; as rejeitadas voltam no relatório com o motivo. */
  importar(arquivo: File): Observable<CtrImportacaoRelatorio> {
    return this.http.post<CtrImportacaoRelatorio>(this.apiUrl, this.corpo(arquivo),
      { headers: this.getHeaders() });
  }
}

/** Checagem de extensão e tamanho antes do POST (o 500 sem corpo não explica). */
export function validarPlanilha(arquivo: File): string | null {
  const nome = arquivo.name.toLowerCase();
  if (!nome.endsWith(EXTENSAO_PLANILHA)) {
    return 'O arquivo precisa ser um CSV (.csv). No Excel, use "Salvar como" e escolha CSV separado por ponto e vírgula.';
  }
  if (arquivo.size > TAMANHO_MAXIMO_PLANILHA) {
    return 'O arquivo passa de 5 MB, que é o limite do envio.';
  }
  if (arquivo.size === 0) {
    return 'O arquivo está vazio.';
  }
  return null;
}
