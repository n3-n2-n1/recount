import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { LoginRequest } from '../../../models';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  email = '';
  password = '';
  loading = false;
  error = '';
  isDarkMode = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Subscribe to dark mode changes
    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.error = 'Please enter both email and password';
      return;
    }

    this.loading = true;
    this.error = '';

    const credentials: LoginRequest = {
      email: this.email,
      password: this.password
    };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.loading = false;
        console.log('✅ Login exitoso, redirigiendo a /movements');
        this.router.navigate(['/movements']);
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Login failed. Please check your credentials.';
      }
    });
  }
}
