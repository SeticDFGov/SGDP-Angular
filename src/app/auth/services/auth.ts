import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { AuthRequest, AuthResponse, UserProfile } from '../../../api/auth/interface';
import { BehaviorSubject, Observable, tap, of } from 'rxjs';
import { AUTH_API_URL, SERVICE_API_URL } from '../../../api/consts';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { map } from 'rxjs/operators';

export type ResourceType = 'projeto' | 'etapa' | 'atividade';

export const Perfis = {
  Admin: 'admin',
  Gestor: 'gestor',
  CentralIT: 'centralit',
  Parceiro: 'parceiro',
  Basico: 'basico'
} as const;
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<UserProfile | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router, @Inject(PLATFORM_ID) private platformId: Object) { }

  login(credencials: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${SERVICE_API_URL}/api/Auth`, credencials).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));

      })
    );


  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.router.navigate(['/auth']);
  }
  isAuthenticate(): boolean {

    const token = this.getToken();
    if (!token) return false;
    if (this.isTokenExpired(token)) {
      localStorage.removeItem('token');
      return false;
    };
    return true;
  };

  isAdmin(): Observable<boolean> {

    return this.getUser().pipe(
      map((user: UserProfile | null) => {
        return !!(user && user.Perfil == "admin");
      })
    );
  }
  isHaveUnidade(): Observable<boolean> {
    if (!this.isAuthenticate()) {
      return of(false);
    }

    return this.getUser().pipe(
      map((user: UserProfile | null) => {
        return !!(user && user.Unidade);
      })
    );
  }
  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('token');
  }

  getUser(): Observable<UserProfile | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(null);
    }
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      return of(null);
    }
    try {
      const user: UserProfile = JSON.parse(userJson);
      return of(user);
    } catch (error) {
      console.error('Erro ao decodificar os dados do usuário', error);
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
      } catch (error) {
        console.error('Erro ao atualizar a unidade do usuário', error);
      }
    }
  }


  isTokenExpired(token: string): boolean {
    try {
      const decode: { exp: number } = jwtDecode(token);
      const expirationDate = new Date(0);
      expirationDate.setUTCSeconds(decode.exp);

      return expirationDate.valueOf() < new Date().valueOf();

    } catch (error) {
      return true;
    }
  }

  /**
   * Retorna o perfil do usuário atual
   */
  getPerfil(): Observable<string | null> {
    return this.getUser().pipe(
      map((user: UserProfile | null) => user?.Perfil ?? null)
    );
  }

  /**
   * Verifica se o usuário pode criar o recurso especificado
   */
  canCreate(resource: ResourceType): Observable<boolean> {
    return this.getPerfil().pipe(
      map(perfil => {
        switch (perfil) {
          case Perfis.Admin:
          case Perfis.Gestor:
            return true;
          case Perfis.CentralIT:
            return resource === 'etapa' || resource === 'atividade';
          case Perfis.Parceiro:
            return false;
          default:
            return false;
        }
      })
    );
  }

  /**
   * Verifica se o usuário pode editar o recurso especificado
   */
  canEdit(resource: ResourceType): Observable<boolean> {
    return this.getPerfil().pipe(
      map(perfil => {
        switch (perfil) {
          case Perfis.Admin:
          case Perfis.Gestor:
            return true;
          case Perfis.CentralIT:
            return resource === 'etapa' || resource === 'atividade';
          case Perfis.Parceiro:
            return false;
          default:
            return false;
        }
      })
    );
  }

  /**
   * Verifica se o usuário pode excluir o recurso especificado
   */
  canDelete(resource: ResourceType): Observable<boolean> {
    return this.getPerfil().pipe(
      map(perfil => {
        switch (perfil) {
          case Perfis.Admin:
          case Perfis.Gestor:
            return true;
          case Perfis.CentralIT:
            return false; // CentralIT NUNCA pode excluir
          case Perfis.Parceiro:
            return false;
          default:
            return false;
        }
      })
    );
  }

  /**
   * Verifica se o usuário é somente leitura (parceiro)
   */
  isReadOnly(): Observable<boolean> {
    return this.getPerfil().pipe(
      map(perfil => perfil === Perfis.Parceiro)
    );
  }

  /**
   * Verifica se o perfil é CentralIT
   */
  isCentralIT(): Observable<boolean> {
    return this.getPerfil().pipe(
      map(perfil => perfil === Perfis.CentralIT)
    );
  }

  /**
   * Verifica se o perfil é Gestor
   */
  isGestor(): Observable<boolean> {
    return this.getPerfil().pipe(
      map(perfil => perfil === Perfis.Gestor)
    );
  }
}
