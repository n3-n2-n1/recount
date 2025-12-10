import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
    private route: ActivatedRoute,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to dark mode changes
    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    // Check for messages from query params (e.g., from force logout)
    this.route.queryParams.subscribe(params => {
      if (params['message']) {
        this.error = params['message'];
      }
    });

    // Clear any error messages and reset form on component init (only if no query param message)
    if (!this.route.snapshot.queryParams['message']) {
      this.error = '';
    }
  }

  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  onSubmit(): void {
    // Reset previous errors
    this.error = '';

    // Validate input
    if (!this.email?.trim()) {
      this.error = 'Por favor ingresa tu email';
      return;
    }

    if (!this.password?.trim()) {
      this.error = 'Por favor ingresa tu contraseña';
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email.trim())) {
      this.error = 'Por favor ingresa un email válido';
      return;
    }

    this.loading = true;

    const credentials: LoginRequest = {
      email: this.email.trim().toLowerCase(),
      password: this.password
    };

    console.log('🔐 Attempting login for:', credentials.email);

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.loading = false;

        // Clear form after successful login
        this.email = '';
        this.password = '';

        this.router.navigate(['/users']);
      },
      error: (error: any) => {
        this.loading = false;

        // Handle different error types
        if (error.name === 'AuthError') {
          this.error = error.message || 'Error al iniciar sesión. Por favor intenta nuevamente.';
        } else if (error.status === 401) {
          this.error = 'Email o contraseña incorrectos. Por favor verifica tus credenciales.';
        } else if (error.status === 429) {
          this.error = 'Demasiados intentos de inicio de sesión. Por favor espera unos minutos antes de intentar nuevamente.';
        } else if (error.status >= 500) {
          this.error = 'Error del servidor. Por favor intenta más tarde.';
        } else if (!navigator.onLine) {
          this.error = 'Sin conexión a internet. Por favor verifica tu conexión y intenta nuevamente.';
        } else {
          this.error = error.message || 'Error al iniciar sesión. Por favor intenta nuevamente.';
        }

        console.error('❌ Login error:', error);

        // Clear password on error for security
        this.password = '';
        
        // Force change detection to ensure error message is displayed
        this.cdr.detectChanges();
      }
    });
  }
}
