import { HttpErrorResponse, HttpResponse } from '@angular/common/http';

/**
 * Downloads por blob da Governança Estratégica (planilhas e arquivos), no padrão
 * do PDF da Supervisão Contínua: o arquivo chega pela API autorizada e a tela o
 * salva num handler de clique (só no navegador).
 */

/**
 * Nome do arquivo tirado do `Content-Disposition` (o CORS da API já o expõe).
 * Prefere o `filename*` (UTF-8, com acentos) e cai no `filename` simples.
 * O mesmo desenho do `nomeDoContentDisposition` do PGIA, copiado para o módulo
 * não depender do serviço de documentos do PGIA.
 */
export function nomeDoContentDisposition(cabecalho: string | null): string | null {
  if (!cabecalho) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cabecalho);
  if (utf8) {
    try { return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, '')); } catch { /* cabeçalho malformado */ }
  }
  const simples = /filename="?([^";]+)"?/i.exec(cabecalho);
  return simples ? simples[1].trim() : null;
}

/**
 * Salva a resposta como arquivo, com o nome do servidor (ou a reserva, se o
 * cabeçalho não veio). Devolve o nome usado.
 */
export function salvarResposta(resposta: HttpResponse<Blob>, reserva: string): string {
  const nome = nomeDoContentDisposition(resposta.headers.get('Content-Disposition')) ?? reserva;
  const url = URL.createObjectURL(resposta.body ?? new Blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  // Revogar na hora corre com o início do download em alguns navegadores
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return nome;
}

/**
 * Mensagem do erro de um download: o corpo chega como Blob e precisa ser lido
 * para achar o `{ Code, Message }`. null no 403 (o interceptor já avisou e levou
 * a pessoa ao início). Sem async/await de propósito: o rebaixamento para o zone.js
 * traria um ajudante novo para o pacote.
 */
export function mensagemErroDownload(erro: unknown, padrao: string): Promise<string | null> {
  const e = erro as HttpErrorResponse | null;
  if (e?.status === 403) return Promise.resolve(null);
  const bruto: unknown = e?.error;
  const lido: Promise<unknown> = bruto instanceof Blob
    ? bruto.text().then(texto => {
      try {
        return JSON.parse(texto) as unknown;
      } catch {
        return null;
      }
    }, () => null)
    : Promise.resolve(bruto);
  return lido.then(corpo => {
    const mensagem = (corpo as { Message?: unknown } | null)?.Message;
    return typeof mensagem === 'string' && mensagem.trim() ? mensagem.trim() : padrao;
  });
}
