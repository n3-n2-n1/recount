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
  private isLoggingIn = false;
  private isValidatingSession = false;
  private lastLoginAttempt = 0;
  private readonly LOGIN_COOLDOWN = 2000; // 2 seconds between login attempts
  private sessionValidationCache: { isValid: boolean; timestamp: number } | null = null;
  private readonly SESSION_CACHE_DURATION = 5000; // Cache validation for 5 seconds

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {
    // Load user from localStorage on service initialization
    this.initializeAuthFromStorage();
  }

  private async initializeAuthFromStorage(): Promise<void> {
    // Don't initialize if login is in progress
    if (this.isLoggingIn) {
      return;
    }

    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('authToken');

    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        // Validate that the stored token is still valid by checking profile
        this.apiService.setAuthToken(storedToken);
        this.currentUserSubject.next(user);

        // Validate the session in background (only if not already validating)
        if (!this.isValidatingSession) {
          this.validateCurrentSession().catch(() => {
            // If validation fails, force logout with reason
            console.warn('Stored session is invalid, forcing logout...');
            this.forceLogout('Your session has expired. Please log in again.');
          });
        }
      } catch (error) {
        console.warn('Error loading stored auth data:', error);
        this.clearAuthData();
      }
    }
  }

  private async validateCurrentSession(): Promise<void> {
    // Prevent multiple simultaneous validations
    if (this.isValidatingSession) {
      return;
    }

    this.isValidatingSession = true;
    try {
      await this.apiService.get('/auth/profile').toPromise();
    } catch (error) {
      throw error;
    } finally {
      this.isValidatingSession = false;
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
    // Prevent multiple simultaneous login attempts
    if (this.isLoggingIn) {
      const error = new Error('Login already in progress. Please wait.');
      error.name = 'AuthError';
      return throwError(() => error);
    }

    // Implement cooldown to prevent rapid-fire login attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastLoginAttempt;
    if (timeSinceLastAttempt < this.LOGIN_COOLDOWN) {
      const remainingTime = Math.ceil((this.LOGIN_COOLDOWN - timeSinceLastAttempt) / 1000);
      const error = new Error(`Please wait ${remainingTime} second(s) before trying again.`);
      error.name = 'AuthError';
      return throwError(() => error);
    }

    this.isLoggingIn = true;
    this.lastLoginAttempt = now;

    // Clear cache and any potentially corrupted auth data before attempting login
    this.sessionValidationCache = null;
    this.clearAuthData();

    return this.apiService.post<AuthResponse>('/auth/login', credentials).pipe(
      tap(response => {
        this.isLoggingIn = false;
        if (response.token && response.user) {
          this.apiService.setAuthToken(response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('authToken', response.token);
          this.currentUserSubject.next(response.user);
          // Clear validation cache and set new valid session
          this.sessionValidationCache = {
            isValid: true,
            timestamp: Date.now()
          };
          console.log('✅ Login successful for user:', response.user.email);
        } else {
          throw new Error('Invalid response format from server');
        }
      }),
      catchError(error => {
        this.isLoggingIn = false;
        // Ensure clean state on login failure
        this.clearAuthData();
        console.error('❌ Login failed:', error);

        // Provide more specific error messages
        let errorMessage = 'Login failed. Please check your credentials.';
        const status = error?.status || error?.originalError?.status;
        
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.originalError?.error?.message) {
          errorMessage = error.originalError.error.message;
        } else if (status === 401) {
          errorMessage = 'Email o contraseña incorrectos. Por favor verifica tus credenciales.';
        } else if (status === 429) {
          errorMessage = 'Demasiados intentos de inicio de sesión. Por favor espera unos minutos antes de intentar nuevamente.';
        } else if (status === 500) {
          errorMessage = 'Error del servidor. Por favor intenta más tarde.';
        } else if (!navigator.onLine) {
          errorMessage = 'Sin conexión a internet. Por favor verifica tu conexión.';
        } else if (error?.message && error.message !== 'An unknown error occurred') {
          errorMessage = error.message;
        }

        const enhancedError: any = new Error(errorMessage);
        enhancedError.name = 'AuthError';
        enhancedError.status = status;
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

    // Check cache first
    if (this.sessionValidationCache) {
      const now = Date.now();
      const cacheAge = now - this.sessionValidationCache.timestamp;
      if (cacheAge < this.SESSION_CACHE_DURATION) {
        // If cache is valid and very recent (less than 3 seconds), trust it completely
        // This prevents validation right after login
        if (this.sessionValidationCache.isValid && cacheAge < 3000) {
          return true;
        }
        // For older valid cache, still return it
        if (this.sessionValidationCache.isValid) {
          return true;
        }
        // If cache says invalid, clear it and revalidate
        this.sessionValidationCache = null;
      } else {
        // Cache expired, clear it
        this.sessionValidationCache = null;
      }
    }

    // Prevent multiple simultaneous validations
    if (this.isValidatingSession) {
      // If validation is already in progress, return cached value or true (optimistic)
      // We assume validation will succeed if it's in progress
      return (this.sessionValidationCache as { isValid: boolean } | null)?.isValid ?? true;
    }

    try {
      await this.validateCurrentSession();
      // Cache successful validation
      this.sessionValidationCache = {
        isValid: true,
        timestamp: Date.now()
      };
      return true;
    } catch (error: any) {
      // Only cache failed validation if it's not a rate limit or network error
      // Rate limit errors are temporary and shouldn't invalidate the session
      if (error?.status !== 429 && error?.status !== 0) {
        this.sessionValidationCache = {
          isValid: false,
          timestamp: Date.now()
        };
        console.warn('Session validation failed:', error);
        return false;
      } else {
        // For rate limit or network errors, don't invalidate the cache
        // Return true optimistically since we have a token and user
        console.warn('Session validation error (rate limit/network), allowing access');
        return true;
      }
    }
  }

  private clearAuthData(): void {
    try {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
      this.apiService.clearAuthToken();
      this.currentUserSubject.next(null);
      // Clear validation cache
      this.sessionValidationCache = null;
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