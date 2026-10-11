/**
 * Mensagem de erro de uma chamada à API do PGIA. Desde a revisão dos achados do manual
 * (2026-10-08), as regras de negócio recusadas pelo servidor voltam 400 com o corpo
 * `{ Code, Message }` (antes, 500 sem corpo): a tela mostra a `Message`, que diz o que
 * corrigir. Sem ela (falha de rede, 500), vale a mensagem padrão da tela.
 */
export function mensagemDoErro(erro: unknown, padrao: string): string {
  const corpo = (erro as { error?: unknown } | null)?.error;
  if (corpo && typeof corpo === 'object') {
    const mensagem = (corpo as { Message?: unknown }).Message;
    if (typeof mensagem === 'string' && mensagem.trim()) return mensagem.trim();
  }
  return padrao;
}
