export const environment = {
  production: true,
  serviceApiUrl: 'https://subgd-api.df.gov.br',
  // Login direto no Keycloak (Authorization Code + PKCE): a senha não passa pela API
  oidc: {
    issuer: 'https://subgd-api.df.gov.br/keycloak/realms/SISTEMA_GEDE',
    clientId: 'client-subgd'
  }
};
