import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit {
  isLoggedIn = false;
  isAuthRoute = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService  // Inyectar para inicializar
  ) {}

  ngOnInit(): void {
    // Initialize theme service (applies saved dark mode preference)
    this.themeService.darkMode$.subscribe(() => {
      // Theme service automatically applies dark-mode class to html/body
    });

    // Check authentication status
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
    });

    // Check if current route is auth route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isAuthRoute = event.url.includes('/auth/');
      });
  }
}
