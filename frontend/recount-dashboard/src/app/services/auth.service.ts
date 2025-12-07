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
    this.initializeAuthFromStorage();
  }

  private async initializeAuthFromStorage(): Promise<void> {
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('authToken');

    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        // Validate that the stored token is still valid by checking profile
        this.apiService.setAuthToken(storedToken);
        this.currentUserSubject.next(user);

        // Validate the session in background
        this.validateCurrentSession().catch(() => {
          // If validation fails, force logout with reason
          console.warn('Stored session is invalid, forcing logout...');
          this.forceLogout('Your session has expired. Please log in again.');
        });
      } catch (error) {
        console.warn('Error loading stored auth data:', error);
        this.clearAuthData();
      }
    }
  }

  private async validateCurrentSession(): Promise<void> {
    try {
      await this.apiService.get('/auth/profile').toPromise();
    } catch (error) {
      throw error;
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
    // Clear any potentially corrupted auth data before attempting login
    this.clearAuthData();

    return this.apiService.post<AuthResponse>('/auth/login', credentials).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.apiService.setAuthToken(response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('authToken', response.token);
          this.currentUserSubject.next(response.user);
          console.log('✅ Login successful for user:', response.user.email);
        } else {
          throw new Error('Invalid response format from server');
        }
      }),
      catchError(error => {
        // Ensure clean state on login failure
        this.clearAuthData();
        console.error('❌ Login failed:', error);

        // Provide more specific error messages
        let errorMessage = 'Login failed. Please check your credentials.';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.status === 401) {
          errorMessage = 'Invalid email or password.';
        } else if (error?.status === 429) {
          errorMessage = 'Too many login attempts. Please try again later.';
        } else if (error?.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (!navigator.onLine) {
          errorMessage = 'No internet connection. Please check your connection.';
        }

        const enhancedError = new Error(errorMessage);
        enhancedError.name = 'AuthError';
        return throwError(() => enhancedError);
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
        if (user) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      }),
      catchError(error => {
        // Only logout on authentication errors (401/403), not on network errors
        if (error?.status === 401 || error?.status === 403) {
          console.warn('Profile fetch failed due to authentication error, logging out...');
          this.logout();
        } else {
          console.warn('Profile fetch failed:', error);
        }
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    console.log('🚪 Logging out user...');
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Force logout - clears all auth data and redirects to login
   * Use this when detecting corrupted sessions or security issues
   */
  forceLogout(reason?: string): void {
    console.log(`🚨 Force logout${reason ? `: ${reason}` : ''}`);
    this.clearAuthData();
    this.router.navigate(['/auth/login'], {
      queryParams: reason ? { message: reason } : {}
    });
  }

  /**
   * Check if current session is valid by making a test request to the server
   */
  async isSessionValid(): Promise<boolean> {
    if (!this.currentUser || !localStorage.getItem('authToken')) {
      return false;
    }

    try {
      await this.validateCurrentSession();
      return true;
    } catch (error) {
      console.warn('Session validation failed:', error);
      return false;
    }
  }

  private clearAuthData(): void {
    try {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
      this.apiService.clearAuthToken();
      this.currentUserSubject.next(null);
      console.log('🧹 Auth data cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
      // Force clear even if localStorage fails
      try {
        localStorage.clear();
      } catch (e) {
        console.error('❌ Could not clear localStorage:', e);
      }
    }
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