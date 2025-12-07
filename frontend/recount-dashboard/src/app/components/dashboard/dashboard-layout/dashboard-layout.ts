import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { User } from '../../../models';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-layout',
  standalone: false,
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout implements OnInit, OnDestroy {
  currentUser: User | null = null;
  currentRoute = '';
  isDarkMode = false;
  
  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService, 
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      })
    );

    this.subscriptions.add(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          this.currentRoute = event.url;
        })
    );

    this.subscriptions.add(
      this.themeService.darkMode$.subscribe(isDark => {
        this.isDarkMode = isDark;
      })
    );

    this.currentRoute = this.router.url;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute.includes(route);
  }

  getCurrentPageTitle(): string {
    if (this.currentRoute.includes('/movements')) return 'Movimientos';
    if (this.currentRoute.includes('/users')) return 'Cuentas';
    if (this.currentRoute.includes('/history')) return 'Historial';
    if (this.currentRoute.includes('/team')) return 'Equipo';
    if (this.currentRoute.includes('/settings')) return 'Configuración';
    return 'Dashboard';
  }

  goToMovements(): void {
    this.router.navigate(['/movements']);
  }

  goToUsers(): void {
    this.router.navigate(['/users']);
  }

  goToHistory(): void {
    this.router.navigate(['/history']);
  }

  goToTeam(): void {
    this.router.navigate(['/team']);
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  isSuperAdmin(): boolean {
    return this.currentUser?.role === 'super_admin';
  }

  logout(): void {
    this.authService.logout();
  }

  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }
}
