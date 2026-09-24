import { HttpErrorResponse } from '@angular/common/http';

/**
 * Mensagem de um erro da API do módulo (`{ Code, Message }`) em linguagem
 * simples, ou a padrão quando o servidor não mandou mensagem (rede fora, 500).
 * No 403 devolve null: o interceptor já avisou e levou a pessoa para o início.
 */
export function mensagemErroPe(erro: unknown, padrao: string): string | null {
  const e = erro as HttpErrorResponse | null;
  if (e?.status === 403) return null;
  const mensagem = e?.error?.Message;
  return typeof mensagem === 'string' && mensagem.trim() ? mensagem.trim() : padrao;
}
