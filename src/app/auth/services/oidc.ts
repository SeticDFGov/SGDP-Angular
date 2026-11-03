import { jwtDecode } from 'jwt-decode';
import type { KeycloakTokenResponse } from '../../../api/auth/interface';

/** Configuração do login OIDC (environment.oidc); ausente = login antigo pela API. */
export interface OidcConfig {
  /** Endereço público do realm, igual ao emissor (iss) dos tokens */
  issuer: string;
  clientId: string;
}

// Chaves do sessionStorage durante a ida e a volta do Keycloak (só da aba atual)
const CHAVE_VERIFIER = 'oidc_code_verifier';
const CHAVE_STATE = 'oidc_state';
const CHAVE_NONCE = 'oidc_nonce';
const CHAVE_DESTINO = 'oidc_destino';

/*
 * Login no Keycloak pelo fluxo Authorization Code com PKCE (S256), sem biblioteca: o navegador
 * vai à tela de login do Keycloak, volta com um código em /auth/callback e troca o código pelo
 * token direto no Keycloak. A senha nunca passa pela API.
 *
 * Este arquivo é carregado sob demanda pelo AuthService (import dinâmico): só é baixado na hora
 * do login, da renovação do token ou do logout, fora do bundle inicial. Usa fetch (e não o
 * HttpClient) nas chamadas ao Keycloak, para os interceptors não porem o Bearer da API nem
 * contarem no indicador de carregamento. Só roda no navegador.
 */

function base(config: OidcConfig): string {
  return `${config.issuer.replace(/\/+$/, '')}/protocol/openid-connect`;
}

function redirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

/** Vai para a tela de login do Keycloak. `destino` é a rota para onde voltar depois. */
export async function iniciarLogin(config: OidcConfig, destino?: string): Promise<void> {
  const verifier = aleatorio(48);
  const state = aleatorio(24);
  const nonce = aleatorio(24);
  sessionStorage.setItem(CHAVE_VERIFIER, verifier);
  sessionStorage.setItem(CHAVE_STATE, state);
  sessionStorage.setItem(CHAVE_NONCE, nonce);
  if (destino) sessionStorage.setItem(CHAVE_DESTINO, destino);
  else sessionStorage.removeItem(CHAVE_DESTINO);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: await desafio(verifier),
    code_challenge_method: 'S256'
  });
  window.location.assign(`${base(config)}/auth?${params}`);
}

/**
 * Volta do Keycloak: confere o state, troca o código pelo token (com o code_verifier) e
 * confere o nonce do id_token. Devolve os tokens e a rota de destino guardada na ida.
 */
export async function concluirLogin(
  config: OidcConfig, query: URLSearchParams
): Promise<{ tokens: KeycloakTokenResponse; destino: string | null }> {
  const erro = query.get('error');
  if (erro) throw new Error(query.get('error_description') || erro);

  const code = query.get('code');
  const state = query.get('state');
  const verifier = sessionStorage.getItem(CHAVE_VERIFIER);
  const stateEsperado = sessionStorage.getItem(CHAVE_STATE);
  const nonceEsperado = sessionStorage.getItem(CHAVE_NONCE);
  const destino = sessionStorage.getItem(CHAVE_DESTINO);
  [CHAVE_VERIFIER, CHAVE_STATE, CHAVE_NONCE, CHAVE_DESTINO].forEach(c => sessionStorage.removeItem(c));

  if (!code || !verifier || !state || state !== stateEsperado) {
    throw new Error('A volta do login não confere. Entre de novo.');
  }

  const tokens = await pedirToken(config, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier
  });

  const nonce = tokens.id_token ? jwtDecode<{ nonce?: string }>(tokens.id_token).nonce : undefined;
  if (!nonce || nonce !== nonceEsperado) {
    throw new Error('O login não pôde ser confirmado. Entre de novo.');
  }
  return { tokens, destino };
}

/** Renova o access token pelo refresh token, direto no Keycloak. */
export function renovar(config: OidcConfig, refreshToken: string): Promise<KeycloakTokenResponse> {
  return pedirToken(config, { grant_type: 'refresh_token', refresh_token: refreshToken });
}

/** Endereço de saída do Keycloak (encerra a sessão lá também) e volta para /auth. */
export function urlLogout(config: OidcConfig, idToken: string | null): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    post_logout_redirect_uri: `${window.location.origin}/auth`
  });
  if (idToken) params.set('id_token_hint', idToken);
  return `${base(config)}/logout?${params}`;
}

async function pedirToken(config: OidcConfig, campos: Record<string, string>): Promise<KeycloakTokenResponse> {
  const resposta = await fetch(`${base(config)}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, ...campos })
  });
  if (!resposta.ok) {
    throw Object.assign(new Error(`Keycloak respondeu ${resposta.status}`), { status: resposta.status });
  }
  return resposta.json() as Promise<KeycloakTokenResponse>;
}

// ── PKCE (RFC 7636) ─────────────────────────────────────────────────────────────

function base64Url(bytes: Uint8Array): string {
  let texto = '';
  bytes.forEach(b => texto += String.fromCharCode(b));
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Texto aleatório seguro (crypto.getRandomValues), em base64url */
function aleatorio(bytes: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** code_challenge = base64url(SHA-256(code_verifier)) */
async function desafio(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(hash));
}
