import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { AuthService } from '../../auth/services/auth';
import {
  PgiaDocumento,
  PgiaDocumentoArquivo,
  PgiaDocumentoCreateForm
} from '../../../api/pgia/interface';

/** Extensões aceitas pelo servidor (a validação de verdade é dele). */
export const EXTENSOES_ANEXO = [
  'pdf', 'doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'csv', 'txt', 'png', 'jpg', 'jpeg'
];

/** Limite de 25 MB, igual ao do servidor. */
export const TAMANHO_MAXIMO_ANEXO = 25 * 1024 * 1024;

/** `accept` do input de arquivo, montado a partir das extensões aceitas. */
export const ACEITA_ANEXO = EXTENSOES_ANEXO.map(e => '.' + e).join(',');

/**
 * Nome original do arquivo, tirado do `Content-Disposition` da resposta.
 * Prefere o `filename*` (UTF-8, com acentos) e cai no `filename` simples.
 * Devolve `null` quando o cabeçalho não veio — em chamada cross-origin ele só
 * chega se o servidor o expuser em `Access-Control-Expose-Headers`.
 */
export function nomeDoContentDisposition(cabecalho: string | null): string | null {
  if (!cabecalho) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cabecalho);
  if (utf8) {
    try { return decodeURIComponent(utf8[1].trim()); } catch { /* cabeçalho malformado */ }
  }
  const simples = /filename="?([^";]+)"?/i.exec(cabecalho);
  return simples ? simples[1].trim() : null;
}

/** Tamanho em texto curto, para mostrar ao usuário. */
export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Confere extensão e tamanho antes de subir o arquivo. Devolve a mensagem do
 * problema, em linguagem simples, ou `null` quando o arquivo serve.
 */
export function validarArquivo(arquivo: File): string | null {
  const extensao = (arquivo.name.split('.').pop() ?? '').toLowerCase();
  if (!extensao || !EXTENSOES_ANEXO.includes(extensao)) {
    return `Este tipo de arquivo não é aceito. Envie um destes: ${EXTENSOES_ANEXO.join(', ')}.`;
  }
  if (arquivo.size > TAMANHO_MAXIMO_ANEXO) {
    return `O arquivo tem ${tamanhoLegivel(arquivo.size)} e o limite é 25 MB. Envie um arquivo menor.`;
  }
  if (arquivo.size === 0) {
    return 'O arquivo está vazio.';
  }
  return null;
}

/**
 * Anexos dos documentos do PGIA. O arquivo é sempre de um `pgia_documento` que
 * já existe: quem cria o documento é a tela do contexto (contrato, AIA,
 * deliberação...), e só depois o arquivo sobe.
 */
@Injectable({
  providedIn: 'root'
})
export class PgiaDocumentoService {
  private apiUrl = `${SERVICE_API_URL}/api/pgia/documento`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    // Sem Content-Type: o navegador precisa montar o boundary do multipart.
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  /**
   * Cria o documento que vai receber o arquivo. Sem `OrgaoId` nem `SistemaIaId`
   * o documento é central (a SGDI, o CGTIC e o admin podem).
   */
  criarDocumento(form: PgiaDocumentoCreateForm): Observable<PgiaDocumento> {
    return this.http.post<PgiaDocumento>(this.apiUrl, form, { headers: this.getHeaders() });
  }

  uploadArquivo(documentoId: number, arquivo: File): Observable<PgiaDocumentoArquivo> {
    const corpo = new FormData();
    corpo.append('arquivo', arquivo, arquivo.name);
    return this.http.post<PgiaDocumentoArquivo>(`${this.apiUrl}/${documentoId}/arquivo`, corpo,
      { headers: this.getHeaders() });
  }

  /**
   * Blob autorizado, com a resposta inteira: é do `Content-Disposition` que sai
   * o nome original do arquivo. O download é disparado no componente, em
   * handler de clique.
   */
  baixarArquivo(documentoId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/${documentoId}/arquivo`,
      { headers: this.getHeaders(), responseType: 'blob', observe: 'response' });
  }
}
