import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  public darkMode$ = this.darkModeSubject.asObservable();

  constructor() {
    // Load saved preference
    const savedTheme = localStorage.getItem('darkMode');
    const isDark = savedTheme === 'true';
    this.setDarkMode(isDark, false);
  }

  toggleDarkMode(): void {
    const newValue = !this.darkModeSubject.value;
    this.setDarkMode(newValue, true);
  }

  private setDarkMode(isDark: boolean, save: boolean = true): void {
    this.darkModeSubject.next(isDark);
    
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }

    if (save) {
      localStorage.setItem('darkMode', isDark.toString());
    }
  }

  isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }
}
