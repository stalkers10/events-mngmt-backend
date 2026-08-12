import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, VerifyOtpResponse, DecodedToken, RoleType } from '../models/auth.model';

const TOKEN_KEY = 'elite_events_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Reactive signal so components (e.g. nav bar) can react to login state changes.
  readonly currentUser = signal<DecodedToken | null>(this.decodeStoredToken());

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
      username,
      password,
    }).pipe(
      tap((res) => {
        // Gate Staff gets a token immediately; Admin must still verify OTP.
        if (!res.otpRequired && res.token) {
          this.setToken(res.token);
        }
      })
    );
  }

  verifyOtp(code: string): Observable<VerifyOtpResponse> {
    return this.http
      .post<VerifyOtpResponse>(`${environment.apiUrl}/auth/verify-otp`, { code })
      .pipe(tap((res) => this.setToken(res.token)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  hasRole(...roles: RoleType[]): boolean {
    const user = this.currentUser();
    return !!user && roles.includes(user.role);
  }

  isSuperAdmin(): boolean {
    return this.hasRole(RoleType.SUPER_ADMIN);
  }

  isClientAdmin(): boolean {
    return this.hasRole(RoleType.CLIENT_ADMIN);
  }

  isAdmin(): boolean {
    return this.hasRole(RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN, RoleType.ADMIN);
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.currentUser.set(this.decodeToken(token));
  }

  private decodeStoredToken(): DecodedToken | null {
    const token = this.getToken();
    return token ? this.decodeToken(token) : null;
  }

  private decodeToken(token: string): DecodedToken | null {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded) as DecodedToken;
    } catch {
      return null;
    }
  }
}
