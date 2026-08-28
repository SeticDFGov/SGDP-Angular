import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { AuthRequest, AuthResponse, KeycloakTokenResponse, UserProfile } from '../../../api/auth/interface';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { SERVICE_API_URL } from '../../../api/consts';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { map, catchError, switchMap } from 'rxjs/operators';

export type ResourceType = 'projeto' | 'etapa' | 'entregavel';

export const Perfis = {
  Admin: 'admin',
  Gestor: 'gestor',
  CentralIT: 'centralit',
  Parceiro: 'parceiro',
  Basico: 'basico'
} as const;

// Papéis do módulo PGIA (campo Users.PapelPgia, paralelo ao Perfil)
export const PapeisPgia = {
  Orgao: 'pgia_orgao',
  Sgdi: 'pgia_sgdi',
  Cgtic: 'pgia_cgtic',
  Auditoria: 'pgia_auditoria'
} as const;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<UserProfile | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router, @Inject(PLATFORM_ID) private platformId: Object) { }

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
            const user: UserProfile = {
              Id: meResponse.Id,
              Nome: meResponse.Nome,
              Email: meResponse.Email,
              Perfil: meResponse.Perfil,
              PapelPgia: meResponse.PapelPgia ?? null,
              Unidade: meResponse.Unidade ?? null
            };
            localStorage.setItem('user', JSON.stringify(user));
            this.userSubject.next(user);
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
            const user: UserProfile = {
              Id: meResponse.Id,
              Nome: meResponse.Nome,
              Email: meResponse.Email,
              Perfil: meResponse.Perfil,
              PapelPgia: meResponse.PapelPgia ?? null,
              Unidade: meResponse.Unidade ?? null
            };
            localStorage.setItem('user', JSON.stringify(user));
            this.userSubject.next(user);
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

  isHaveUnidade(): Observable<boolean> {
    if (!this.isAuthenticate()) return of(false);
    return this.getUser().pipe(map(user => !!(user && user.Unidade)));
  }

  isUserFullyConfigured(): Observable<boolean> {
    return this.getUser().pipe(
      map(user => {
        if (!user) return false;
        // Mesma definição do userConfiguredGuard: unidade e (perfil válido OU papel PGIA).
        // Usada também pelo fluxo de login; sem o PapelPgia aqui, o Responsável de IA
        // com perfil 'basico' ficaria preso no /pending-approval a cada login.
        const hasPerfil = !!user.Perfil && user.Perfil !== 'basico';
        const hasPapelPgia = !!user.PapelPgia;
        const hasUnidade = !!user.Unidade;
        return (hasPerfil || hasPapelPgia) && hasUnidade;
      })
    );
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
        case Perfis.CentralIT: return resource === 'etapa' || resource === 'entregavel';
        default: return false;
      }
    }));
  }

  canEdit(resource: ResourceType): Observable<boolean> {
    return this.getPerfil().pipe(map(perfil => {
      switch (perfil) {
        case Perfis.Admin:
        case Perfis.Gestor: return true;
        case Perfis.CentralIT: return resource === 'etapa' || resource === 'entregavel';
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

  isReadOnly(): Observable<boolean> {
    return this.getPerfil().pipe(map(perfil => perfil === Perfis.Parceiro));
  }

  isCentralIT(): Observable<boolean> {
    return this.getPerfil().pipe(map(perfil => perfil === Perfis.CentralIT));
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

  /** Acesso à área /pgia: quem tem papel PGIA ou é admin do SGDP */
  canAccessPgia(): Observable<boolean> {
    return this.getUser().pipe(
      map(user => !!user && (!!user.PapelPgia || user.Perfil === Perfis.Admin))
    );
  }

  // ── Modo local (execução independente, sem Keycloak — só testes) ──────────

  /**
   * Login do modo local: o backend (Auth:ModoLocal=true, só em Development)
   * emite um token com o mesmo formato dos do Keycloak; daqui em diante o
   * fluxo é idêntico ao login normal (/me, perfis, guards).
   */
  loginLocal(dados: {
    Email: string; Nome: string; Perfil: string;
    PapelPgia?: string | null; VincularAoOrgaoDeTeste?: boolean;
  }): Observable<AuthResponse> {
    return this.http.post<KeycloakTokenResponse>(`${SERVICE_API_URL}/api/authlocal/token`, dados).pipe(
      switchMap(tokenResponse => {
        localStorage.setItem('token', tokenResponse.access_token);
        localStorage.setItem('refreshToken', tokenResponse.refresh_token);

        return this.http.get<any>(`${SERVICE_API_URL}/api/Auth/me`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${tokenResponse.access_token}` })
        }).pipe(
          map(meResponse => {
            const user: UserProfile = {
              Id: meResponse.Id,
              Nome: meResponse.Nome,
              Email: meResponse.Email,
              Perfil: meResponse.Perfil,
              PapelPgia: meResponse.PapelPgia ?? null,
              Unidade: meResponse.Unidade ?? null
            };
            localStorage.setItem('user', JSON.stringify(user));
            this.userSubject.next(user);
            return { token: tokenResponse.access_token, user } as AuthResponse;
          })
        );
      })
    );
  }
}
