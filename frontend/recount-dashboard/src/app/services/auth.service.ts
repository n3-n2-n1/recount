import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { User, UserRole, LoginRequest, AuthResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {
    // Load user from localStorage on service initialization
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('authToken');

    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (error) {
        this.clearAuthData();
      }
    }
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser && !!localStorage.getItem('authToken');
  }

  get userRole(): UserRole | null {
    return this.currentUser?.role || null;
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>('/auth/login', credentials).pipe(
      tap(response => {
        this.apiService.setAuthToken(response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>('/auth/register', userData).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  getProfile(): Observable<User> {
    return this.apiService.get<User>('/auth/profile').pipe(
      tap(user => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  private clearAuthData(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    this.apiService.clearAuthToken();
    this.currentUserSubject.next(null);
  }

  hasRole(requiredRoles: UserRole[]): boolean {
    const userRole = this.userRole;
    return userRole ? requiredRoles.includes(userRole) : false;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.userRole;
    return userRole ? roles.includes(userRole) : false;
  }

  isSuperAdmin(): boolean {
    return this.userRole === 'super_admin';
  }

  canEdit(): boolean {
    return ['super_admin', 'reviewer'].includes(this.userRole || '');
  }

  canView(): boolean {
    return !!this.userRole;
  }

  canDelete(): boolean {
    return this.userRole === 'super_admin';
  }

  getAllUsers(): Observable<any> {
    return this.apiService.get('/auth/users');
  }

  updateUser(userId: string, userData: any): Observable<any> {
    return this.apiService.put(`/auth/users/${userId}`, userData).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  deleteUser(userId: string): Observable<any> {
    return this.apiService.delete(`/auth/users/${userId}`).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }
}