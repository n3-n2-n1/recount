import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ExchangeRateService } from '../../services/exchange-rate.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { ExchangeRate, ExchangeRateHistory } from '../../models';
import { CurrencyType } from '../../models/transaction.model';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
  show: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  // User preferences
  preferredCurrency: CurrencyType = 'DÓLAR';
  availableCurrencies: CurrencyType[] = [];

  // Exchange rates
  exchangeRates: ExchangeRate[] = [];
  rateHistory: ExchangeRateHistory[] = [];
  editingRates: { [key: string]: number } = {};
  
  // Loading states
  loadingRates = false;
  loadingHistory = false;
  savingRates = false;

  // UI state
  showHistory = false;
  toasts: Toast[] = [];
  private toastIdCounter = 0;

  // User role
  canEditRates = false;

  constructor(
    private exchangeRateService: ExchangeRateService,
    private settingsService: SettingsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserPreferences();
    this.loadExchangeRates();
    this.checkPermissions();
  }

  private checkPermissions(): void {
    const user = this.authService.currentUser;
    this.canEditRates = user?.role === 'super_admin' || user?.role === 'reviewer';
  }

  private loadUserPreferences(): void {
    this.preferredCurrency = this.settingsService.getPreferredCurrency();
    this.availableCurrencies = this.settingsService.getAvailableCurrencies();
  }

  loadExchangeRates(): void {
    this.loadingRates = true;
    this.exchangeRateService.getExchangeRates().subscribe({
      next: (response) => {
        this.exchangeRates = response.rates;
        // Initialize editing rates
        this.exchangeRates.forEach(rate => {
          this.editingRates[rate.currency] = rate.rateToUSD;
        });
        this.loadingRates = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading exchange rates:', error);
        this.showError('Error al cargar las tasas de cambio');
        this.loadingRates = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadHistory(): void {
    if (this.rateHistory.length > 0) {
      this.showHistory = !this.showHistory;
      return;
    }

    this.loadingHistory = true;
    this.showHistory = true;
    this.exchangeRateService.getHistory().subscribe({
      next: (response) => {
        this.rateHistory = response.history;
        this.loadingHistory = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading rate history:', error);
        this.showError('Error al cargar el historial de tasas');
        this.loadingHistory = false;
        this.cdr.detectChanges();
      }
    });
  }

  onPreferredCurrencyChange(): void {
    this.settingsService.setPreferredCurrency(this.preferredCurrency);
    this.showSuccess('Moneda de visualización actualizada');
  }

  updateRate(currency: CurrencyType): void {
    const newRate = this.editingRates[currency];
    
    if (!newRate || newRate <= 0) {
      this.showError('La tasa debe ser mayor a 0');
      return;
    }

    this.savingRates = true;
    this.exchangeRateService.updateExchangeRate(currency, newRate).subscribe({
      next: (response) => {
        this.showSuccess(response.message);
        this.loadExchangeRates();
        // Reload history if it's visible
        if (this.showHistory) {
          this.rateHistory = []; // Clear to force reload
          this.loadHistory();
        }
        this.savingRates = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error updating rate:', error);
        this.showError('Error al actualizar la tasa');
        this.savingRates = false;
        this.cdr.detectChanges();
      }
    });
  }

  hasRateChanged(currency: CurrencyType): boolean {
    const currentRate = this.exchangeRates.find(r => r.currency === currency);
    if (!currentRate) return false;
    return this.editingRates[currency] !== currentRate.rateToUSD;
  }

  resetRate(currency: CurrencyType): void {
    const currentRate = this.exchangeRates.find(r => r.currency === currency);
    if (currentRate) {
      this.editingRates[currency] = currentRate.rateToUSD;
    }
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getUpdatedByName(rate: ExchangeRate): string {
    if (typeof rate.updatedBy === 'object' && rate.updatedBy.name) {
      return rate.updatedBy.name;
    }
    return 'Sistema';
  }

  getChangedByName(historyItem: ExchangeRateHistory): string {
    return historyItem.changedBy?.name || 'Sistema';
  }

  private showSuccess(message: string): void {
    this.addToast(message, 'success');
  }

  private showError(message: string): void {
    this.addToast(message, 'error');
  }

  private addToast(message: string, type: 'success' | 'error'): void {
    const id = this.toastIdCounter++;
    const toast: Toast = { id, message, type, show: false };
    
    this.toasts.push(toast);
    
    setTimeout(() => {
      const toastIndex = this.toasts.findIndex(t => t.id === id);
      if (toastIndex !== -1) {
        this.toasts[toastIndex].show = true;
        this.cdr.detectChanges();
      }
    }, 10);
    
    setTimeout(() => {
      this.removeToast(id);
    }, 4000);
  }

  removeToast(id: number): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      this.toasts[index].show = false;
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.cdr.detectChanges();
      }, 300);
    }
  }
}
