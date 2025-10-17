export interface AuthRequest {
  Email:string
  Senha:string
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
  Unidade: Unidade;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface UserRequest{
  email:string
}

export interface UserResponse{
  Id:string
  Nome:string
  Email:string

}

