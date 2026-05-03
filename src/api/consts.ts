import { environment } from '../environments/environment.prod';

export const SERVICE_API_URL: string = environment.serviceApiUrl;
export const AUTH_API_URL = 'https://subgd-api.df.gov.br/api/auth';
export const KEYCLOAK_TOKEN_URL = 'http://keycloak.10.233.159.150.nip.io/realms/SISTEMA_GEDE/protocol/openid-connect/token';
export const KEYCLOAK_CLIENT_ID = 'client-subgd';
