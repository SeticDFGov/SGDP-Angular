import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { AuthRequest, AuthResponse, KeycloakTokenResponse, UserProfile } from '../../../api/auth/interface';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ModuloId, Modulos } from '../../core/modulos/modulos';

export type ResourceType = 'projeto' | 'etapa' | 'entregavel';

export const Perfis = {
  Admin: 'admin',
  Gestor: 'gestor',
  Basico: 'basico'
} as const;

// Papéis do módulo PGIA (campo Users.PapelPgia, paralelo ao Perfil)
export const PapeisPgia = {
  Orgao: 'pgia_orgao',
  Sgdi: 'pgia_sgdi',
  Cgtic: 'pgia_cgtic',
  Auditoria: 'pgia_auditoria'
} as const;

// Papel do módulo Supervisão Contínua das Contratações (campo Users.PapelContratacoes,
// paralelo ao Perfil e independente do PapelPgia). Valor único por enquanto.
export const PapeisContratacoes = {
  Analise: 'ctr_analise'
} as const;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<UserProfile | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router, @Inject(PLATFORM_ID) private platformId: Object) { }

  /**
   * Resposta do GET /api/Auth/me → UserProfile, guardado no localStorage e
   * publicado em `user$`. Fonte única do mapeamento (login, refresh do token,
   * refreshUser e modo local).
   */
  private guardarUsuario(meResponse: any): UserProfile {
    const user: UserProfile = {
      Id: meResponse.Id,
      Nome: meResponse.Nome,
      Email: meResponse.Email,
      Perfil: meResponse.Perfil,
      PapelPgia: meResponse.PapelPgia ?? null,
      AcessoPgia: !!meResponse.AcessoPgia,
      PapelContratacoes: meResponse.PapelContratacoes ?? null,
      Modulos: Array.isArray(meResponse.Modulos) ? meResponse.Modulos : [],
      Unidade: meResponse.Unidade ?? null
    };
    localStorage.setItem('user', JSON.stringify(user));
    this.userSubject.next(user);
    return user;
  }

  login(credencials: AuthRequest): Observable<AuthResponse> {
    return this.http.post<KeycloakTokenResponse>(`${SERVICE_API_URL}/api/Auth/token`, {
      Email: credencials.Email,
      Senha: credencials.Senha
    }).pipe(
      switchMap(keycloakResponse => {
        localStorage.setItem('token', keycloakResponse.access_token);
        localStorage.setItem('refreshToken', keycloakResponse.refresh_token);

        return this.http.get<any>(`${SERVICE_API_URL}/api/Auth/me`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${keycloakResponse.access_token}` })
        }).pipe(
          map(meResponse => {
            const user = this.guardarUsuario(meResponse);
            return { token: keycloakResponse.access_token, user } as AuthResponse;
          })
        );
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.router.navigate(['/auth']);
  }

  refreshToken(): Observable<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('Refresh token não encontrado'));

    return this.http.post<KeycloakTokenResponse>(`${SERVICE_API_URL}/api/Auth/refresh`, {
      RefreshToken: refreshToken
    }).pipe(
      switchMap(response => {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('refreshToken', response.refresh_token);
        return this.http.get<any>(`${SERVICE_API_URL}/api/Auth/me`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${response.access_token}` })
        }).pipe(
          map(meResponse => {
            this.guardarUsuario(meResponse);
          })
        );
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  isAuthenticate(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (this.isTokenExpired(token)) {
      localStorage.removeItem('token');
      return false;
    }
    return true;
  }

  isAdmin(): Observable<boolean> {
    return this.getUser().pipe(map(user => !!(user && user.Perfil === 'admin')));
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('refreshToken');
  }

  getUser(): Observable<UserProfile | null> {
    if (!isPlatformBrowser(this.platformId)) return of(null);
    const userJson = localStorage.getItem('user');
    if (!userJson) return of(null);
    try {
      return of(JSON.parse(userJson) as UserProfile);
    } catch {
      return of(null);
    }
  }

  /**
   * Busca o perfil atual direto do backend (GET /api/Auth/me), sem confiar no
   * cache do localStorage. Usar antes de liberar acesso a áreas sensíveis
   * (ex. admin): o perfil vem da role do Keycloak a cada requisição: se o
   * usuário foi rebaixado no Keycloak, o cache local ainda diria "admin".
   */
  refreshUser(): Observable<UserProfile | null> {
    if (!isPlatformBrowser(this.platformId)) return of(null);
    const token = this.getToken();
    if (!token) return of(null);

    return this.http.get<any>(`${SERVICE_API_URL}/api/Auth/me`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    }).pipe(
      map(meResponse => this.guardarUsuario(meResponse)),
      catchError(() => of(null))
    );
  }

  updateUserUnidade(unidade: any): void {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user: UserProfile = JSON.parse(userJson);
        user.Unidade = unidade;
        localStorage.setItem('user', JSON.stringify(user));
        this.userSubject.next(user);
      } catch { }
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      const decoded: { exp: number } = jwtDecode(token);
      return new Date(0).setUTCSeconds(decoded.exp) < new Date().valueOf();
    } catch {
      return true;
    }
  }

  getPerfil(): Observable<string | null> {
    return this.getUser().pipe(map(user => user?.Perfil ?? null));
  }

  canCreate(resource: ResourceType): Observable<boolean> {
    return this.getPerfil().pipe(map(perfil => {
      switch (perfil) {
        case Perfis.Admin:
        case Perfis.Gestor: return true;
        default: return false;
      }
    }));
  }

  canEdit(resource: ResourceType): Observable<boolean> {
    return this.getPerfil().pipe(map(perfil => {
      switch (perfil) {
        case Perfis.Admin:
        case Perfis.Gestor: return true;
        default: return false;
      }
    }));
  }

  canDelete(resource: ResourceType): Observable<boolean> {
    return this.getPerfil().pipe(map(perfil => {
      switch (perfil) {
        case Perfis.Admin:
        case Perfis.Gestor: return true;
        default: return false;
      }
    }));
  }

  isGestor(): Observable<boolean> {
    return this.getPerfil().pipe(map(perfil => perfil === Perfis.Gestor));
  }

  // ── Módulo PGIA (métodos novos, aditivos) ─────────────────────────────────

  getPapelPgia(): Observable<string | null> {
    return this.getUser().pipe(map(user => user?.PapelPgia ?? null));
  }

  hasPapelPgia(): Observable<boolean> {
    return this.getPapelPgia().pipe(map(papel => !!papel));
  }

  /**
   * Acesso à área /pgia: módulo "pgia" no `Modulos` do /me (role "pgia" do grupo
   * no Keycloak, papel PGIA, acesso concedido no sistema ou admin). A autorização
   * real é sempre do backend; aqui é só usabilidade.
   */
  canAccessPgia(): Observable<boolean> {
    return this.temModulo(Modulos.Pgia);
  }

  // ── Módulo Supervisão Contínua das Contratações (métodos novos, aditivos) ─

  getPapelContratacoes(): Observable<string | null> {
    return this.getUser().pipe(map(user => user?.PapelContratacoes ?? null));
  }

  /** Acesso à área /analises: módulo "contratacoes" no `Modulos` do /me */
  canAccessContratacoes(): Observable<boolean> {
    return this.temModulo(Modulos.Contratacoes);
  }

  // ── Isolamento entre módulos ──────────────────────────────────────────────

  /** Módulos que o usuário enxerga (vazio = nenhum). */
  getModulos(): Observable<string[]> {
    return this.getUser().pipe(map(user => user?.Modulos ?? []));
  }

  temModulo(modulo: ModuloId): Observable<boolean> {
    return this.getModulos().pipe(map(modulos => modulos.includes(modulo)));
  }

  // ── Modo local (execução independente, sem Keycloak, só testes) ──────────

  /**
   * Login do modo local: o backend (Auth:ModoLocal=true, só em Development)
   * emite um token com o mesmo formato dos do Keycloak; daqui em diante o
   * fluxo é idêntico ao login normal (/me, perfis, guards).
   */
  loginLocal(dados: {
    Email: string; Nome: string; Perfil: string;
    PapelPgia?: string | null; VincularAoOrgaoDeTeste?: boolean;
    PapelContratacoes?: string | null;
    ConcederModulos?: string[] | null;
  }): Observable<AuthResponse> {
    return this.http.post<KeycloakTokenResponse>(`${SERVICE_API_URL}/api/authlocal/token`, dados).pipe(
      switchMap(tokenResponse => {
        localStorage.setItem('token', tokenResponse.access_token);
        localStorage.setItem('refreshToken', tokenResponse.refresh_token);

        return this.http.get<any>(`${SERVICE_API_URL}/api/Auth/me`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${tokenResponse.access_token}` })
        }).pipe(
          map(meResponse => {
            const user = this.guardarUsuario(meResponse);
            return { token: tokenResponse.access_token, user } as AuthResponse;
          })
        );
      })
    );
  }
}
