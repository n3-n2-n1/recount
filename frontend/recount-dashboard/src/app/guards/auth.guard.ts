import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    // First check basic login state
    if (!this.authService.isLoggedIn) {
      console.log('🔒 AuthGuard: User not logged in');
      this.router.navigate(['/auth/login']);
      return false;
    }

    try {
      // Validate session with server
      const isValid = await this.authService.isSessionValid();
      if (isValid) {
        return true;
      } else {
        console.log('🔒 AuthGuard: Session invalid, redirecting to login');
        this.authService.forceLogout('Your session has expired. Please log in again.');
        return false;
      }
    } catch (error) {
      console.warn('🔒 AuthGuard: Session validation failed:', error);
      // On validation error, redirect to login to be safe
      this.authService.forceLogout('Session validation failed. Please log in again.');
      return false;
    }
  }
}