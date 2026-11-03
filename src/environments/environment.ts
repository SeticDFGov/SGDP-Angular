export const environment = {
  production: false,
  serviceApiUrl: 'http://localhost:5148',
  // Sem oidc, a tela de login usa o formulário antigo (POST api/Auth/token) e o modo local.
  // Para testar o login OIDC localmente, preencha com o realm (o client precisa aceitar
  // http://localhost:4200/auth/callback como redirect URI).
  oidc: null as { issuer: string; clientId: string } | null
};
