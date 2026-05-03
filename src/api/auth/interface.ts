export interface AuthRequest {
  Email: string;
  Senha: string;
}

export interface Unidade {
  id: string;
  Nome: string;
}

export interface UserProfile {
  Id: string;
  Nome: string;
  Email: string;
  Perfil: string;
  Unidade: Unidade | null;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface KeycloakTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  scope: string;
}

export interface UserRequest {
  email: string;
}

export interface UserResponse {
  Id: string;
  Nome: string;
  Email: string;
}
