import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marca uma requisição de segundo plano que já tem sinal próprio na tela (o número
 * de pedidos de acesso, a bolinha dos passos da trilha, o "Salvando..." do texto,
 * a prévia do desenho do fluxo, a sugestão enquanto a pessoa digita). Ela não
 * acende a barra de carregamento do topo nem deixa ocupado o botão clicado.
 *
 * Uso: `this.http.get(url, { context: semCarregamento() })`, ou passar o contexto
 * para o método do serviço que aceita um (parâmetro `contexto`).
 */
export const SEM_CARREGAMENTO = new HttpContextToken<boolean>(() => false);

/** Contexto de requisição silenciosa (ver `SEM_CARREGAMENTO`). */
export function semCarregamento(): HttpContext {
  return new HttpContext().set(SEM_CARREGAMENTO, true);
}
